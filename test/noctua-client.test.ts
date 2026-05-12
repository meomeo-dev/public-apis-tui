import assert from 'node:assert/strict'
import test from 'node:test'
import {
  getNoctuaSource,
  getNoctuaStats,
  normalizeNoctuaSourceInput,
  normalizeNoctuaSourceName,
} from '../src/application/usecases/noctua.js'
import { NoctuaClient } from '../src/infrastructure/openApis/noctuaClient.js'

test('Noctua client calls documented skysource stats endpoint', async () => {
  let requestedUrl: URL | undefined
  const client = new NoctuaClient(
    'https://api.noctuasky.com/api/v1',
    (async input => {
      requestedUrl = new URL(String(input))
      return jsonResponse({
        nb_skysources: 5851320,
        by_types: [
          { _id: 'star', count: 2167661 },
          { _id: 'jpl_sso', count: 64 },
        ],
      })
    }) as typeof fetch,
  )

  const stats = await client.stats()

  assert.equal(requestedUrl?.origin, 'https://api.noctuasky.com')
  assert.equal(requestedUrl?.pathname, '/api/v1/skysources/stats/')
  assert.equal(stats.total, 5851320)
  assert.deepEqual(stats.byTypes[0], { type: 'star', count: 2167661 })
})

test('Noctua client calls exact-name skysource endpoint', async () => {
  let requestedUrl: URL | undefined
  const client = new NoctuaClient(
    'https://api.noctuasky.com/api/v1',
    (async input => {
      requestedUrl = new URL(String(input))
      return jsonResponse(createMarsPayload())
    }) as typeof fetch,
  )

  const source = await client.sourceByName('NAME Mars')

  assert.equal(requestedUrl?.pathname, '/api/v1/skysources/name/NAME%20Mars')
  assert.equal(source.shortName, 'Mars')
  assert.equal(source.model, 'jpl_sso')
  assert.deepEqual(source.types, ['Pla', 'SSO'])
  assert.equal(source.modelData.jpl_horizon_id, 499)
})

test('Noctua usecases project no-auth skysource metadata', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async input => {
    const url = new URL(String(input))
    if (url.pathname.endsWith('/stats/')) {
      return jsonResponse({
        nb_skysources: 10,
        by_types: [{ _id: 'star', count: 7 }],
      })
    }
    return jsonResponse(createMarsPayload())
  }) as typeof fetch

  try {
    const stats = await getNoctuaStats()
    assert.equal(stats.kind, 'noctua.stats')
    assert.equal(stats.api.authentication, 'none')
    assert.equal(stats.stats.byTypes[0]?.type, 'star')

    const source = await getNoctuaSource({ name: 'Mars' })
    assert.equal(source.kind, 'noctua.source')
    assert.equal(source.api.provider, 'noctua')
    assert.equal(source.api.usesBrowserClickstream, false)
    assert.equal(source.query.name, 'Mars')
    assert.equal(source.source.modelData.jplHorizonId, 499)
    assert.match(String(source.source.modelData.orbitPreview), /horizons/u)
    assert.match(source.api.boundary, /Read-only skysources/u)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('Noctua normalizers enforce exact-name lookup guardrails', () => {
  assert.deepEqual(normalizeNoctuaSourceInput({}), { name: 'Mars' })
  assert.equal(normalizeNoctuaSourceName('  M 31  '), 'M 31')
  assert.throws(
    () => normalizeNoctuaSourceName(''),
    /name must be between 1 and 80 characters/u,
  )
  assert.throws(
    () => normalizeNoctuaSourceName('../users/me'),
    /no slash or URL control characters/u,
  )
})

test('Noctua client rejects upstream errors and malformed payloads', async () => {
  const failingClient = new NoctuaClient(
    'https://api.noctuasky.com/api/v1',
    (async () => jsonResponse({
      message: 'Unknown skysource name',
      status: '404 Not Found',
    }, 404)) as typeof fetch,
  )
  await assert.rejects(
    () => failingClient.sourceByName('DefinitelyNotASkySource12345'),
    /Unknown skysource name/u,
  )

  const malformedClient = new NoctuaClient(
    'https://api.noctuasky.com/api/v1',
    (async () => jsonResponse({ by_types: [] })) as typeof fetch,
  )
  await assert.rejects(() => malformedClient.stats(), /skysource counts/u)
})

test('Noctua client rejects Cloudflare challenge HTML clearly', async () => {
  const client = new NoctuaClient(
    'https://api.noctuasky.com/api/v1',
    (async () => {
      return new Response('<!DOCTYPE html><title>Just a moment...</title>', {
        status: 429,
        statusText: 'Too Many Requests',
        headers: {
          'cf-mitigated': 'challenge',
          'content-type': 'text/html; charset=UTF-8',
          server: 'cloudflare',
        },
      })
    }) as typeof fetch,
  )

  await assert.rejects(
    () => client.stats(),
    /Cloudflare challenge HTML/u,
  )
})

function createMarsPayload(): Record<string, unknown> {
  return {
    interest: 4.95,
    match: 'NAME Mars',
    model: 'jpl_sso',
    model_data: {
      albedo: '0.15',
      jpl_horizon_id: 499,
      orbit: 'horizons:2458545.500000000, A.D. 2019-Mar-03 00:00:00.0000',
      parent: 'NAME Sun',
      radius: '3394',
    },
    names: ['NAME Mars'],
    short_name: 'Mars',
    types: ['Pla', 'SSO'],
  }
}

function jsonResponse(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}
