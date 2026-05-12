import assert from 'node:assert/strict'
import test from 'node:test'
import { getHttpbin, getHttpbinUuid } from '../src/application/usecases/httpbin.js'
import { HttpbinClient, normalizeHttpbinGetQuery } from '../src/infrastructure/openApis/httpbinClient.js'

test('Httpbin client calls documented GET and UUID JSON endpoints', async () => {
  const requests: string[] = []
  const client = new HttpbinClient('https://httpbin.test', (async input => {
    const url = new URL(String(input))
    requests.push(url.href)
    if (url.pathname === '/uuid') {
      return jsonResponse({ uuid: '123e4567-e89b-12d3-a456-426614174000' })
    }
    return jsonResponse({
      args: { hello: 'world' },
      headers: { 'User-Agent': 'public-apis-tui test' },
      origin: '203.0.113.10',
      url: url.href,
    })
  }) as typeof fetch)

  const get = await client.get({ query: 'hello=world' })
  const uuid = await client.uuid()

  assert.deepEqual(requests, ['https://httpbin.test/get?hello=world', 'https://httpbin.test/uuid'])
  assert.equal(get.args.hello, 'world')
  assert.equal(get.origin, '203.0.113.10')
  assert.equal(uuid.uuid, '123e4567-e89b-12d3-a456-426614174000')
})

test('Httpbin usecases project no-auth metadata', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async input => {
    const url = new URL(String(input))
    if (url.pathname === '/uuid') {
      return jsonResponse({ uuid: '123e4567-e89b-12d3-a456-426614174000' })
    }
    return jsonResponse({
      args: { hello: 'world' },
      headers: { 'User-Agent': 'public-apis-tui test' },
      origin: '203.0.113.10',
      url: url.href,
    })
  }) as typeof fetch
  try {
    const get = await getHttpbin({ query: 'hello=world' })
    assert.equal(get.kind, 'httpbin.get')
    assert.equal(get.api.authentication, 'none')
    assert.equal(get.api.usesBrowserClickstream, false)
    assert.equal(get.query.query, 'hello=world')
    assert.equal(get.request.args.hello, 'world')

    const uuid = await getHttpbinUuid()
    assert.equal(uuid.kind, 'httpbin.uuid')
    assert.equal(uuid.api.provider, 'httpbin')
    assert.equal(uuid.uuid, '123e4567-e89b-12d3-a456-426614174000')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('Httpbin query normalizer enforces curated bounds', () => {
  assert.deepEqual(normalizeHttpbinGetQuery({ query: 'hello=world&debug=true' }), { query: 'hello=world&debug=true' })
  assert.deepEqual(normalizeHttpbinGetQuery({ query: '   ' }), {})
  assert.throws(() => normalizeHttpbinGetQuery({ query: 'bad key=value' }), /URL-safe/u)
  assert.throws(() => normalizeHttpbinGetQuery({ query: `ok=${'a'.repeat(121)}` }), /120 characters/u)
  assert.throws(() => normalizeHttpbinGetQuery({ query: Array.from({ length: 11 }, (_, index) => `k${index}=v`).join('&') }), /at most 10/u)
})

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}
