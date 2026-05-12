import assert from 'node:assert/strict'
import test from 'node:test'
import { predictNationalize } from '../src/application/usecases/nationalize.js'
import { NationalizeClient, normalizeNationalizeQuery } from '../src/infrastructure/openApis/nationalizeClient.js'

test('Nationalize client predicts country probabilities and captures rate-limit headers', async () => {
  const client = new NationalizeClient('https://api.nationalize.test', (async input => {
    const url = new URL(String(input))
    assert.equal(url.searchParams.get('name'), 'kim')
    return jsonResponse({
      count: 383585,
      name: 'kim',
      country: [
        { country_id: 'KR', probability: 0.5227 },
        { country_id: 'US', probability: 0.0264 },
      ],
    }, {
      'x-rate-limit-limit': '100',
      'x-rate-limit-remaining': '99',
      'x-rate-limit-reset': '3600',
    })
  }) as typeof fetch)

  const prediction = await client.predict({ name: 'kim' })

  assert.equal(prediction.name, 'kim')
  assert.equal(prediction.count, 383585)
  assert.deepEqual(prediction.countries[0], { countryId: 'KR', probability: 0.5227 })
  assert.equal(prediction.rateLimit.limit, '100')
})

test('Nationalize usecase projects no-auth metadata and defaults', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async () => jsonResponse({
    count: 129385,
    name: 'michael',
    country: [{ country_id: 'NG', probability: 0.08 }],
  })) as typeof fetch
  try {
    const result = await predictNationalize()
    assert.equal(result.kind, 'nationalize.predict')
    assert.equal(result.api.authentication, 'none')
    assert.equal(result.api.usesBrowserClickstream, false)
    assert.equal(result.api.batchSupport, 'documented/live-supported but intentionally not exposed in CLI to preserve free quota')
    assert.equal(result.query.name, 'michael')
    assert.equal(result.prediction.topCountry?.countryId, 'NG')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('Nationalize normalizer enforces curated CLI bounds', () => {
  assert.deepEqual(normalizeNationalizeQuery({ name: 'Anna' }), { name: 'Anna' })
  assert.throws(() => normalizeNationalizeQuery({ name: 'a'.repeat(81) }), /between 1 and 80/u)
  assert.throws(() => normalizeNationalizeQuery({ name: 'anna123' }), /letters/u)
})

function jsonResponse(value: unknown, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(value), {
    status: 200,
    headers: { 'content-type': 'application/json', ...headers },
  })
}
