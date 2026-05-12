import assert from 'node:assert/strict'
import test from 'node:test'
import { translateHelloSalut } from '../src/application/usecases/helloSalut.js'
import { HelloSalutClient, normalizeHelloSalutInput } from '../src/infrastructure/openApis/helloSalutClient.js'

test('HelloSalut client fetches JSON translation for a language code', async () => {
  const requests: string[] = []
  const client = new HelloSalutClient({
    baseUrl: 'https://hellosalut.test',
    fetchImpl: (async input => {
      const url = new URL(String(input))
      requests.push(url.href)
      return jsonResponse({ code: 'fr', hello: 'Salut' })
    }) as typeof fetch,
  })

  const translation = await client.translate({ language: 'fr' })
  assert.deepEqual(translation, { code: 'fr', hello: 'Salut', matched: true })
  assert.deepEqual(requests, ['https://hellosalut.test/?lang=fr'])
})

test('HelloSalut usecase projects no-auth metadata and defaults', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async () => jsonResponse({ code: 'fr', hello: 'Salut' })) as typeof fetch
  try {
    const result = await translateHelloSalut()
    assert.equal(result.kind, 'hellosalut.translate')
    assert.equal(result.api.providerId, 'hellosalut')
    assert.equal(result.api.authentication, 'none')
    assert.equal(result.api.usesBrowserClickstream, false)
    assert.equal(result.query.language, 'fr')
    assert.equal(result.translation.hello, 'Salut')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('HelloSalut normalizer validates curated language codes', () => {
  assert.deepEqual(normalizeHelloSalutInput({}), { language: 'fr' })
  assert.deepEqual(normalizeHelloSalutInput({ language: ' EN ' }), { language: 'en' })
  assert.deepEqual(normalizeHelloSalutInput({ language: 'pt-BR' }), { language: 'pt-br' })
  assert.throws(() => normalizeHelloSalutInput({ language: 'english' }), /language code/u)
  assert.throws(() => normalizeHelloSalutInput({ language: '../fr' }), /language code/u)
})

test('HelloSalut client marks unsupported language fallback', async () => {
  const client = new HelloSalutClient({
    fetchImpl: (async () => jsonResponse({ code: 'none', hello: 'Hello' })) as typeof fetch,
  })
  const translation = await client.translate({ language: 'zz' })
  assert.equal(translation.matched, false)
  assert.equal(translation.code, 'none')
})

test('HelloSalut client rejects non-JSON provider errors', async () => {
  const client = new HelloSalutClient({
    fetchImpl: (async () => new Response('<html>not json</html>', { status: 502, headers: { 'content-type': 'text/html' } })) as typeof fetch,
  })
  await assert.rejects(() => client.translate({ language: 'fr' }), /non-JSON/u)
})

test('HelloSalut client explains Cloudflare HTML challenges', async () => {
  const client = new HelloSalutClient({
    fetchImpl: (async () => new Response('<!DOCTYPE html><title>Just a moment...</title>', {
      status: 403,
      headers: { 'content-type': 'text/html; charset=UTF-8', 'server': 'cloudflare', 'cf-mitigated': 'challenge' },
    })) as typeof fetch,
  })

  await assert.rejects(
    () => client.translate({ language: 'fr' }),
    /Cloudflare challenge HTML page/u,
  )
})

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
}
