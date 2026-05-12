import assert from 'node:assert/strict'
import test from 'node:test'
import { listVoidlyIncidents } from '../src/application/usecases/voidly.js'
import {
  VoidlyClient,
  normalizeVoidlyIncidentsInput,
} from '../src/infrastructure/openApis/voidlyClient.js'
import { RuntimeFailure } from '../src/shared/errors/runtimeFailure.js'

test('Voidly client reads incidents JSON', async () => {
  const client = new VoidlyClient({
    fetchImpl: (async input => {
      const url = new URL(String(input))
      assert.equal(url.hostname, 'api.voidly.ai')
      assert.equal(url.pathname, '/data/incidents')
      assert.equal(url.searchParams.get('country'), 'IR')
      assert.equal(url.searchParams.get('limit'), '20')
      assert.equal(url.searchParams.get('offset'), '0')
      return jsonResponse(createIncidentsFixture(), {
        'x-ratelimit-remaining': '99',
        'x-ratelimit-reset': '1778290111',
      })
    }) as typeof fetch,
  })

  const result = await client.listIncidents({ country: 'IR', limit: 20, offset: 0 })
  assert.equal(result.count, 1)
  assert.equal(result.total, 12)
  assert.equal(result.datasetVersion, '2026.05.09')
  assert.equal(result.rateLimit.remaining, '99')
  assert.equal(result.incidents[0]?.id, 'IR-2026-0195')
  assert.equal(result.incidents[0]?.countryName, 'Iran')
})

test('Voidly usecase projects TUI-ready JSON', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async () =>
    jsonResponse(createIncidentsFixture())) as typeof fetch

  try {
    const result = await listVoidlyIncidents({ country: 'ir' })
    assert.equal(result.kind, 'voidly.incidents')
    assert.equal(result.api.provider, 'voidly')
    assert.equal(result.api.authentication, 'none')
    assert.equal(result.api.usesBrowserClickstream, false)
    assert.equal(result.pagination.maxLimit, 100)
    assert.equal(result.pagination.maxOffset, 1000)
    assert.equal(result.incidents[0]?.title, 'Internet connectivity disruption in Iran')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('Voidly normalizer enforces curated bounds', () => {
  assert.deepEqual(normalizeVoidlyIncidentsInput({}), { limit: 20, offset: 0 })
  assert.deepEqual(
    normalizeVoidlyIncidentsInput({ country: ' ir ', limit: 3, offset: 2 }),
    { country: 'IR', limit: 3, offset: 2 },
  )
  assert.throws(() => normalizeVoidlyIncidentsInput({ country: 'IRN' }), RuntimeFailure)
  assert.throws(() => normalizeVoidlyIncidentsInput({ limit: 101 }), RuntimeFailure)
  assert.throws(() => normalizeVoidlyIncidentsInput({ offset: 1001 }), RuntimeFailure)
})

test('Voidly client surfaces Cloudflare challenge HTML', async () => {
  const client = new VoidlyClient({
    fetchImpl: (async () =>
      new Response('<!DOCTYPE html><title>Just a moment...</title>', {
        status: 403,
        headers: {
          'content-type': 'text/html; charset=UTF-8',
          server: 'cloudflare',
          'cf-mitigated': 'challenge',
        },
      })) as typeof fetch,
  })

  await assert.rejects(
    () => client.listIncidents({ country: 'IR', limit: 20, offset: 0 }),
    /Cloudflare challenge HTML page/u,
  )
})

function jsonResponse(
  value: unknown,
  headers: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(value), {
    status: 200,
    headers: { 'content-type': 'application/json', ...headers },
  })
}

function createIncidentsFixture(): Record<string, unknown> {
  return {
    count: 1,
    total: 12,
    dataset_version: '2026.05.09',
    generated_at_utc: '2026-05-09T01:27:31.444135Z',
    incidents: [
      {
        id: 'IR-2026-0195',
        readableId: 'IR-2026-0195',
        hashId: '8916bd0c6fbb',
        country: 'IR',
        countryName: 'Iran',
        flag: '🇮🇷',
        title: 'Internet connectivity disruption in Iran',
        description: 'IODA detected significant connectivity drop in Iran.',
        severity: 'critical',
        status: 'active',
        incidentType: 'disruption',
        confidence: 0.7,
        anomalyRate: 0.54,
        measurementCount: 5,
        startTime: '2026-05-03T20:50:00Z',
        updatedAt: '2026-05-04T00:00:11.485768',
        sources: ['ioda'],
        affectedDomains: [],
        affectedServices: [],
        reportUrl:
          'https://api.voidly.ai/data/incidents/8916bd0c6fbb/report' +
          '?format=markdown',
      },
    ],
  }
}
