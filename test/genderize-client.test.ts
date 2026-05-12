import assert from 'node:assert/strict'
import test from 'node:test'
import { predictGenderize } from '../src/application/usecases/genderize.js'
import { GenderizeClient, normalizeGenderizeQuery } from '../src/infrastructure/openApis/genderizeClient.js'

test('Genderize client predicts gender and captures rate-limit headers', async () => {
  let requestedUrl: URL | undefined
  const client = new GenderizeClient('https://api.genderize.io', (async input => {
    requestedUrl = new URL(String(input))
    return jsonResponse({ count: 62805, name: 'kim', gender: 'female', probability: 0.94, country_id: 'US' }, {
      'x-rate-limit-limit': '100',
      'x-rate-limit-remaining': '99',
      'x-rate-limit-reset': '3600',
    })
  }) as typeof fetch)

  const prediction = await client.predict({ name: 'kim', countryId: 'US' })

  assert.equal(requestedUrl?.href, 'https://api.genderize.io/?name=kim&country_id=US')
  assert.equal(prediction.gender, 'female')
  assert.equal(prediction.probability, 0.94)
  assert.equal(prediction.count, 62805)
  assert.equal(prediction.countryId, 'US')
  assert.equal(prediction.rateLimit.limit, '100')
})

test('Genderize usecase projects no-auth metadata and defaults', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async () => jsonResponse({ count: 298219, name: 'michael', gender: 'male', probability: 0.99 })) as typeof fetch
  try {
    const result = await predictGenderize()
    assert.equal(result.kind, 'genderize.predict')
    assert.equal(result.api.authentication, 'none')
    assert.equal(result.api.usesBrowserClickstream, false)
    assert.equal(result.api.batchSupport, 'documented but intentionally not exposed in CLI to preserve free quota')
    assert.equal(result.query.name, 'michael')
    assert.equal(result.prediction.gender, 'male')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('Genderize normalizer enforces curated CLI bounds', () => {
  assert.deepEqual(normalizeGenderizeQuery({ name: 'Anna', countryId: 'us' }), { name: 'Anna', countryId: 'US' })
  assert.throws(() => normalizeGenderizeQuery({ name: 'a'.repeat(81) }), /between 1 and 80/)
  assert.throws(() => normalizeGenderizeQuery({ name: 'anna123' }), /letters/)
  assert.throws(() => normalizeGenderizeQuery({ countryId: 'USA' }), /two-letter/)
})

function jsonResponse(value: unknown, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(value), {
    status: 200,
    headers: { 'content-type': 'application/json', ...headers },
  })
}
