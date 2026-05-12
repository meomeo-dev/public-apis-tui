import assert from 'node:assert/strict'
import test from 'node:test'
import { lookupZiptastic } from '../src/application/usecases/ziptastic.js'
import { ZiptasticClient, normalizeZiptasticLookupInput } from '../src/infrastructure/openApis/ziptasticClient.js'

const fixture = { country: 'US', state: 'CA', city: 'BEVERLY HILLS' }

test('Ziptastic client parses JSON body despite text/html content-type', async () => {
  const client = new ZiptasticClient({
    fetchImpl: (async input => {
      assert.equal(String(input), 'https://ziptasticapi.com/90210')
      return jsonTextResponse(fixture)
    }) as typeof fetch,
  })

  assert.deepEqual(await client.lookup({ zip: '90210' }), fixture)
})

test('Ziptastic usecase projects no-auth JSON-body metadata', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async () => jsonTextResponse(fixture)) as typeof fetch
  try {
    const result = await lookupZiptastic({ zip: '90210' })
    assert.equal(result.kind, 'ziptastic.lookup')
    assert.equal(result.api.authentication, 'none')
    assert.equal(result.api.usesBrowserClickstream, false)
    assert.match(result.api.transport, /text\/html/u)
    assert.equal(result.address?.city, 'BEVERLY HILLS')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('Ziptastic normalizer enforces path-safe ZIP values', () => {
  assert.deepEqual(normalizeZiptasticLookupInput({}), { zip: '90210' })
  assert.deepEqual(normalizeZiptasticLookupInput({ zip: ' 01001 ' }), { zip: '01001' })
  assert.throws(() => normalizeZiptasticLookupInput({ zip: '9' }), /--zip/u)
  assert.throws(() => normalizeZiptasticLookupInput({ zip: '90/210' }), /--zip/u)
})

test('Ziptastic maps provider error JSON to empty lookups', async () => {
  const client = new ZiptasticClient({
    fetchImpl: (async () => jsonTextResponse({ error: 'Zip Code not found!' })) as typeof fetch,
  })
  assert.equal(await client.lookup({ zip: '99999' }), undefined)
})

test('Ziptastic rejects real HTML bodies', async () => {
  const client = new ZiptasticClient({
    fetchImpl: (async () => new Response('<html>not json</html>', { status: 200, headers: { 'content-type': 'text/html' } })) as typeof fetch,
  })
  await assert.rejects(() => client.lookup({ zip: '90210' }), /non-JSON response body/u)
})

test('Ziptastic client surfaces Cloudflare challenge HTML clearly', async () => {
  const client = new ZiptasticClient({
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
  await assert.rejects(() => client.lookup({ zip: '90210' }), /Cloudflare challenge HTML page/u)
})

function jsonTextResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'text/html;charset=UTF-8' } })
}
