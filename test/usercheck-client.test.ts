import assert from 'node:assert/strict'
import test from 'node:test'
import { checkUserCheckEmail } from '../src/application/usecases/usercheck.js'
import {
  UserCheckClient,
  normalizeUserCheckEmailInput,
} from '../src/infrastructure/openApis/usercheckClient.js'

test('UserCheck client calls email endpoint and maps validation fields', async () => {
  const requests: string[] = []
  const client = new UserCheckClient({
    baseUrl: 'https://usercheck.test',
    fetchImpl: (async input => {
      const url = new URL(String(input))
      requests.push(url.href)
      assert.equal(url.pathname, '/email/test%40example.com')
      return jsonResponse(createEmailFixture(), 200, { 'x-ratelimit-limit': '5', 'x-ratelimit-remaining': '4' })
    }) as typeof fetch,
  })

  const result = await client.checkEmail({ email: 'test@example.com' })

  assert.deepEqual(requests, ['https://usercheck.test/email/test%40example.com'])
  assert.equal(result.email, 'test@example.com')
  assert.equal(result.mx, false)
  assert.equal(result.roleAccount, true)
  assert.equal(result.rateLimit.limit, '5')
})

test('UserCheck usecase projects TUI-ready no-auth JSON', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async input => {
    const url = new URL(String(input))
    assert.equal(url.href, 'https://api.usercheck.com/email/test%40example.com')
    return jsonResponse(createEmailFixture(), 200, { 'x-ratelimit-limit': '5', 'x-ratelimit-remaining': '3' })
  }) as typeof fetch
  try {
    const result = await checkUserCheckEmail({ email: 'test@example.com' })
    assert.equal(result.kind, 'usercheck.email')
    assert.equal(result.api.authentication, 'none')
    assert.equal(result.api.usesBrowserClickstream, false)
    assert.equal(result.query.email, 'test@example.com')
    assert.equal(result.validation.domain, 'example.com')
    assert.equal(result.rateLimit.remaining, '3')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('UserCheck normalizer enforces email input bounds', () => {
  assert.deepEqual(normalizeUserCheckEmailInput({ email: ' TEST@Example.COM ' }), { email: 'test@example.com' })
  assert.throws(() => normalizeUserCheckEmailInput({ email: 'bad' }), /--email/u)
  assert.throws(() => normalizeUserCheckEmailInput({ email: 'bad@' }), /--email/u)
})

function createEmailFixture(): Record<string, unknown> {
  return {
    status: 200,
    email: 'test@example.com',
    normalized_email: 'test@example.com',
    domain: 'example.com',
    domain_age_in_days: 11220,
    mx: false,
    mx_records: [],
    mx_providers: [],
    disposable: false,
    public_domain: false,
    relay_domain: false,
    alias: false,
    role_account: true,
    spam: false,
    did_you_mean: null,
  }
}

function jsonResponse(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...headers },
  })
}
