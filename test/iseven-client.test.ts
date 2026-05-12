import assert from 'node:assert/strict'
import test from 'node:test'
import { checkIsEven } from '../src/application/usecases/isEven.js'
import {
  IsEvenClient,
  normalizeIsEvenQuery,
} from '../src/infrastructure/openApis/isEvenClient.js'

test('isEven client calls documented free-range JSON endpoint', async () => {
  let requestedUrl: URL | undefined
  const client = new IsEvenClient('https://api.isevenapi.xyz/api', (async input => {
    requestedUrl = new URL(String(input))
    return jsonResponse({
      iseven: true,
      ad: 'Buy isEvenCoin, the hottest new cryptocurrency!',
    })
  }) as typeof fetch)

  const response = await client.check({ number: 6 })

  assert.equal(requestedUrl?.href, 'https://api.isevenapi.xyz/api/iseven/6/')
  assert.equal(response.isEven, true)
  assert.equal(response.ad, 'Buy isEvenCoin, the hottest new cryptocurrency!')
})

test(
  'isEven client rejects Cloudflare challenge HTML as upstream blocker',
  async () => {
    const client = new IsEvenClient('https://api.isevenapi.xyz/api', (async () => {
      return new Response('<!DOCTYPE html><title>Just a moment...</title>', {
        status: 403,
        statusText: 'Forbidden',
        headers: {
          'cf-mitigated': 'challenge',
          'content-type': 'text/html; charset=UTF-8',
          server: 'cloudflare',
        },
      })
    }) as typeof fetch)

    await assert.rejects(
      () => client.check({ number: 6 }),
      /Cloudflare challenge HTML/u,
    )
  },
)

test('isEven usecase projects no-auth metadata and ad boundary', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async () => jsonResponse({
    iseven: false,
    ad: 'Provider supplied ad text.',
  })) as typeof fetch
  try {
    const result = await checkIsEven({ number: 7 })
    assert.equal(result.kind, 'iseven.check')
    assert.equal(result.api.provider, 'iseven')
    assert.equal(result.api.authentication, 'none')
    assert.equal(result.api.usesBrowserClickstream, false)
    assert.equal(result.api.freeRange.max, 999999)
    assert.match(result.api.boundary, /Read-only JSON parity check/u)
    assert.equal(result.query.number, 7)
    assert.equal(result.result.parity, 'odd')
    assert.equal(result.upstream.ad, 'Provider supplied ad text.')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('isEven normalizer enforces documented public free range', () => {
  assert.deepEqual(normalizeIsEvenQuery({}), { number: 6 })
  assert.deepEqual(normalizeIsEvenQuery({ number: 0 }), { number: 0 })
  assert.deepEqual(normalizeIsEvenQuery({ number: 999999 }), { number: 999999 })
  assert.throws(() => normalizeIsEvenQuery({ number: -1 }), /between 0 and 999999/)
  assert.throws(() => normalizeIsEvenQuery({ number: 1000000 }), /between 0 and 999999/)
  assert.throws(() => normalizeIsEvenQuery({ number: 2.5 }), /must be an integer/)
})

function jsonResponse(value: unknown, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(value), {
    status: 200,
    headers: { 'content-type': 'application/json', ...headers },
  })
}
