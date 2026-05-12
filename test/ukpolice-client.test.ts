import assert from 'node:assert/strict'
import test from 'node:test'
import { listUkPoliceStreetCrimes } from '../src/application/usecases/ukPolice.js'
import {
  normalizeUkPoliceStreetCrimesInput,
  UkPoliceClient,
} from '../src/infrastructure/openApis/ukPoliceClient.js'
import { RuntimeFailure } from '../src/shared/errors/runtimeFailure.js'

test('UK Police client queries bounded street-crime records', async () => {
  const client = new UkPoliceClient({
    fetchImpl: (async input => {
      const url = new URL(String(input))
      assert.equal(url.hostname, 'data.police.uk')
      assert.equal(url.pathname, '/api/crimes-street/vehicle-crime')
      assert.equal(url.searchParams.get('lat'), '52.629729')
      assert.equal(url.searchParams.get('lng'), '-1.131592')
      assert.equal(url.searchParams.get('date'), '2024-01')
      return jsonResponse(createStreetCrimesFixture())
    }) as typeof fetch,
  })

  const result = await client.listStreetCrimes({
    latitude: 52.629729,
    longitude: -1.131592,
    date: '2024-01',
    category: 'vehicle-crime',
    limit: 1,
  })
  assert.equal(result.meta.returned, 1)
  assert.equal(result.meta.totalAvailable, 2)
  assert.equal(result.meta.truncated, true)
  assert.equal(result.meta.latestKnownDate, '2024-01')
  assert.equal(result.crimes[0]?.id, 111)
  assert.equal(result.crimes[0]?.category, 'vehicle-crime')
  assert.equal(result.crimes[0]?.location?.streetName, 'On or near High Street')
  assert.equal(result.crimes[0]?.persistentIdPresent, true)
})

test('UK Police usecase projects TUI-ready no-auth JSON', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async () =>
    jsonResponse(createStreetCrimesFixture())) as typeof fetch

  try {
    const result = await listUkPoliceStreetCrimes({
      category: 'anti-social-behaviour',
      limit: 2,
    })
    assert.equal(result.kind, 'ukpolice.streetCrimes')
    assert.equal(result.api.provider, 'ukpolice')
    assert.equal(result.api.authentication, 'none')
    assert.equal(result.api.usesBrowserClickstream, false)
    assert.equal(result.pagination.maxLimit, 100)
    assert.equal(result.count, 2)
    assert.match(result.api.safety, /Read-only public street-level crime records/)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('UK Police normalizer enforces curated bounds', () => {
  assert.deepEqual(normalizeUkPoliceStreetCrimesInput({}), {
    latitude: 52.629729,
    longitude: -1.131592,
    date: undefined,
    category: 'all-crime',
    limit: 25,
  })
  assert.deepEqual(
    normalizeUkPoliceStreetCrimesInput({
      latitude: 51.5,
      longitude: -0.12,
      date: '2024-01',
      category: 'burglary',
      limit: 3,
    }),
    {
      latitude: 51.5,
      longitude: -0.12,
      date: '2024-01',
      category: 'burglary',
      limit: 3,
    },
  )
  assert.throws(
    () => normalizeUkPoliceStreetCrimesInput({ latitude: 91 }),
    RuntimeFailure,
  )
  assert.throws(
    () => normalizeUkPoliceStreetCrimesInput({ longitude: -181 }),
    RuntimeFailure,
  )
  assert.throws(
    () => normalizeUkPoliceStreetCrimesInput({ date: '2024-13' }),
    RuntimeFailure,
  )
  assert.throws(
    () => normalizeUkPoliceStreetCrimesInput({ category: 'free-form' as never }),
    RuntimeFailure,
  )
  assert.throws(
    () => normalizeUkPoliceStreetCrimesInput({ limit: 101 }),
    RuntimeFailure,
  )
})

test('UK Police client surfaces Cloudflare challenge HTML clearly', async () => {
  const client = new UkPoliceClient({
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
    () => client.listStreetCrimes({
      latitude: 52.629729,
      longitude: -1.131592,
      category: 'all-crime',
      limit: 1,
    }),
    /Cloudflare challenge HTML page/u,
  )
})

function jsonResponse(value: unknown): Response {
  return new Response(JSON.stringify(value), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })
}

function createStreetCrimesFixture(): unknown {
  return [
    {
      category: 'vehicle-crime',
      location_type: 'Force',
      location: {
        latitude: '52.635488',
        longitude: '-1.129413',
        street: { id: 884227, name: 'On or near High Street' },
      },
      context: '',
      outcome_status: {
        category: 'Investigation complete; no suspect identified',
        date: '2024-02',
      },
      persistent_id: 'abc123',
      id: 111,
      location_subtype: '',
      month: '2024-01',
    },
    {
      category: 'vehicle-crime',
      location_type: 'Force',
      location: {
        latitude: '52.630000',
        longitude: '-1.130000',
        street: { id: 884228, name: 'On or near Market Street' },
      },
      context: '',
      outcome_status: null,
      persistent_id: '',
      id: 112,
      location_subtype: '',
      month: '2024-01',
    },
  ]
}
