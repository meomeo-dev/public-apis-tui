import assert from 'node:assert/strict'
import test from 'node:test'
import { searchPostalCodes } from '../src/application/usecases/postalCodes.js'
import { PostalCodesClient, normalizePostalCodesSearchInput } from '../src/infrastructure/openApis/postalCodesClient.js'

const fixture = [
  { type: 'Postal Code', text: 'Beverly Hills (90210)', sub: 'United States', url: '/postal-codes/united-states/code/90210' },
]

test('PostalCodes.info client sends lightweight search query', async () => {
  const requests: string[] = []
  const client = new PostalCodesClient({
    baseUrl: 'https://postalcodes.test',
    fetchImpl: (async input => {
      requests.push(String(input))
      return jsonResponse(fixture)
    }) as typeof fetch,
  })
  const suggestions = await client.search({ query: '90210', country: 'US', limit: 10 })
  assert.deepEqual(requests, ['https://postalcodes.test/search?q=90210&country=US'])
  assert.equal(suggestions[0]?.text, 'Beverly Hills (90210)')
})

test('PostalCodes.info usecase projects no-auth and download boundary metadata', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async () => jsonResponse(fixture)) as typeof fetch
  try {
    const result = await searchPostalCodes({ query: '90210', country: 'us', limit: 1 })
    assert.equal(result.kind, 'postalcodes.search')
    assert.equal(result.api.authentication, 'none')
    assert.equal(result.api.usesBrowserClickstream, false)
    assert.match(result.api.downloadBoundary, /download\.php/u)
    assert.equal(result.suggestions[0]?.absoluteUrl, 'https://postalcodes.info/postal-codes/united-states/code/90210')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('PostalCodes.info normalizer enforces bounds', () => {
  assert.deepEqual(normalizePostalCodesSearchInput({}), { query: '90210', country: 'US', limit: 10 })
  assert.deepEqual(normalizePostalCodesSearchInput({ query: ' madrid ', country: 'es', limit: 2 }), { query: 'madrid', country: 'ES', limit: 2 })
  assert.throws(() => normalizePostalCodesSearchInput({ query: 'a' }), /at least 2/u)
  assert.throws(() => normalizePostalCodesSearchInput({ country: 'usa' }), /--country/u)
  assert.throws(() => normalizePostalCodesSearchInput({ limit: 26 }), /between 1 and 25/u)
})

test('PostalCodes.info client rejects non-JSON provider failures', async () => {
  const client = new PostalCodesClient({
    baseUrl: 'https://postalcodes.test',
    fetchImpl: (async () => new Response('<html>download token required</html>', { status: 403, headers: { 'content-type': 'text/html' } })) as typeof fetch,
  })
  await assert.rejects(() => client.search({ query: '90210', country: 'US', limit: 1 }), /non-JSON/u)
})

test('PostalCodes.info client explains Cloudflare HTML challenges', async () => {
  const client = new PostalCodesClient({
    baseUrl: 'https://postalcodes.test',
    fetchImpl: (async () => new Response('<!DOCTYPE html><title>Just a moment...</title>', {
      status: 403,
      headers: { 'content-type': 'text/html; charset=UTF-8', 'server': 'cloudflare', 'cf-mitigated': 'challenge' },
    })) as typeof fetch,
  })

  await assert.rejects(
    () => client.search({ query: '90210', country: 'US', limit: 1 }),
    /Cloudflare challenge HTML page/u,
  )
})

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
}
