import assert from 'node:assert/strict'
import test from 'node:test'
import { getCloudflareTrace, normalizeCloudflareTraceInput } from '../src/application/usecases/cloudflareTrace.js'
import { CloudflareTraceClient, parseCloudflareTrace } from '../src/infrastructure/openApis/cloudflareTraceClient.js'

const traceText = [
  'fl=119f149',
  'h=cloudflare.com',
  'ip=203.0.113.10',
  'ts=1777820156.179',
  'visit_scheme=https',
  'uag=public-apis-tui test',
  'colo=PDX',
  'sliver=none',
  'http=http/2',
  'loc=US',
  'tls=TLSv1.3',
  'sni=plaintext',
  'warp=off',
  'gateway=off',
  'rbi=off',
  'kex=X25519',
].join('\n')

test('Cloudflare Trace client fetches and parses text/plain key-value trace', async () => {
  let requestedUrl: URL | undefined
  const client = new CloudflareTraceClient({
    fetchImpl: (async input => {
      requestedUrl = new URL(String(input))
      return new Response(traceText, { status: 200, headers: { 'content-type': 'text/plain' } })
    }) as typeof fetch,
  })

  const trace = await client.getTrace({ endpoint: 'cloudflare.com' })

  assert.equal(requestedUrl?.href, 'https://cloudflare.com/cdn-cgi/trace')
  assert.equal(trace.fields.ip, '203.0.113.10')
  assert.equal(trace.fields.colo, 'PDX')
  assert.equal(trace.raw, traceText)
})

test('Cloudflare Trace usecase projects no-auth metadata and hides raw by default', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async () => new Response(traceText, { status: 200, headers: { 'content-type': 'text/plain' } })) as typeof fetch
  try {
    const result = await getCloudflareTrace({ endpoint: 'cloudflare.com' })
    assert.equal(result.kind, 'cloudflaretrace.trace')
    assert.equal(result.api.authentication, 'none')
    assert.equal(result.api.usesBrowserClickstream, false)
    assert.equal(result.api.transport, 'HTTPS text/plain key-value')
    assert.equal(result.trace.ip, '203.0.113.10')
    assert.equal(result.raw, undefined)

    const rawResult = await getCloudflareTrace({ endpoint: 'cloudflare.com', includeRaw: true })
    assert.equal(rawResult.raw, traceText)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('Cloudflare Trace normalizer accepts aliases and rejects unsafe URLs', () => {
  assert.deepEqual(normalizeCloudflareTraceInput({}), {
    endpoint: 'one.one.one.one',
    url: 'https://one.one.one.one/cdn-cgi/trace',
    includeRaw: false,
  })
  assert.equal(normalizeCloudflareTraceInput({ endpoint: 'https://example.com/cdn-cgi/trace' }).url, 'https://example.com/cdn-cgi/trace')
  assert.throws(() => normalizeCloudflareTraceInput({ endpoint: 'http://example.com/cdn-cgi/trace' }), /Cloudflare Trace endpoint/)
  assert.throws(() => normalizeCloudflareTraceInput({ endpoint: 'https://example.com/nope' }), /cdn-cgi\/trace/)
  assert.throws(() => parseCloudflareTrace('not-key-value'), /key=value/)
})
