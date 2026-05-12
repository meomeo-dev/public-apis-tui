import assert from 'node:assert/strict'
import test from 'node:test'
import { predictAgifyAge } from '../src/application/usecases/agify.js'
import { AgifyClient, normalizeAgifyQuery } from '../src/infrastructure/openApis/agifyClient.js'

const fixture = { count: 108496, name: 'michael', age: 58, country_id: 'US' }

test('Agify client predicts age and captures rate-limit headers', async () => {
  let requestedUrl: URL | undefined
  const client = new AgifyClient('https://api.agify.io', (async input => {
    requestedUrl = new URL(String(input))
    return jsonResponse(fixture, {
      'x-rate-limit-limit': '100',
      'x-rate-limit-remaining': '99',
      'x-rate-limit-reset': '3600',
    })
  }) as typeof fetch)

  const prediction = await client.predict({ name: 'michael', countryId: 'US' })

  assert.equal(requestedUrl?.href, 'https://api.agify.io/?name=michael&country_id=US')
  assert.equal(prediction.age, 58)
  assert.equal(prediction.count, 108496)
  assert.equal(prediction.countryId, 'US')
  assert.equal(prediction.rateLimit.limit, '100')
})

test('Agify usecase projects no-auth metadata and defaults', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async () => jsonResponse({ count: 298219, name: 'michael', age: 65 })) as typeof fetch
  try {
    const result = await predictAgifyAge()
    assert.equal(result.kind, 'agify.age')
    assert.equal(result.api.authentication, 'none')
    assert.equal(result.api.usesBrowserClickstream, false)
    assert.equal(result.query.name, 'michael')
    assert.equal(result.prediction.age, 65)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('Agify normalizer enforces curated CLI bounds', () => {
  assert.deepEqual(normalizeAgifyQuery({ name: 'Anna', countryId: 'us' }), { name: 'Anna', countryId: 'US' })
  assert.throws(() => normalizeAgifyQuery({ name: 'a'.repeat(81) }), /between 1 and 80/)
  assert.throws(() => normalizeAgifyQuery({ name: 'anna123' }), /letters/)
  assert.throws(() => normalizeAgifyQuery({ countryId: 'USA' }), /two-letter/)
})

function jsonResponse(value: unknown, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(value), {
    status: 200,
    headers: { 'content-type': 'application/json', ...headers },
  })
}
