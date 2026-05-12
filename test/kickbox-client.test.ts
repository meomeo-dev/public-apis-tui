import assert from 'node:assert/strict'
import test from 'node:test'
import { checkKickboxDisposable } from '../src/application/usecases/kickbox.js'
import {
  KickboxClient,
  normalizeKickboxDisposableInput,
} from '../src/infrastructure/openApis/kickboxClient.js'

test('Kickbox client calls open disposable endpoint', async () => {
  const requests: string[] = []
  const client = new KickboxClient({
    baseUrl: 'https://kickbox.test',
    fetchImpl: (async input => {
      const url = new URL(String(input))
      requests.push(url.href)
      assert.equal(url.pathname, '/v1/disposable/gmail.com')
      return jsonResponse({ disposable: false })
    }) as typeof fetch,
  })

  const result = await client.checkDisposable({ target: 'gmail.com' })

  assert.deepEqual(requests, ['https://kickbox.test/v1/disposable/gmail.com'])
  assert.equal(result.disposable, false)
})

test('Kickbox usecase projects TUI-ready no-auth JSON', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async input => {
    const url = new URL(String(input))
    assert.equal(url.href, 'https://open.kickbox.com/v1/disposable/mailinator.com')
    return jsonResponse({ disposable: true })
  }) as typeof fetch
  try {
    const result = await checkKickboxDisposable({ target: 'mailinator.com' })
    assert.equal(result.kind, 'kickbox.disposable')
    assert.equal(result.api.authentication, 'none')
    assert.equal(result.api.usesBrowserClickstream, false)
    assert.equal(result.query.target, 'mailinator.com')
    assert.equal(result.result.disposable, true)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('Kickbox normalizer accepts email or domain targets', () => {
  assert.deepEqual(normalizeKickboxDisposableInput({ target: ' Gmail.COM ' }), { target: 'gmail.com' })
  assert.deepEqual(normalizeKickboxDisposableInput({ target: ' Test@Mailinator.COM ' }), { target: 'test@mailinator.com' })
  assert.throws(() => normalizeKickboxDisposableInput({ target: 'not-a-domain' }), /--target/u)
  assert.throws(() => normalizeKickboxDisposableInput({ target: 'bad@' }), /--target/u)
})

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}
