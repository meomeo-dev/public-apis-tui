import assert from 'node:assert/strict'
import test from 'node:test'
import { validateDisifyDomain, validateDisifyEmail } from '../src/application/usecases/disify.js'
import {
  DisifyClient,
  normalizeDisifyDomainInput,
  normalizeDisifyEmailInput,
} from '../src/infrastructure/openApis/disifyClient.js'

test('Disify client calls documented email and domain endpoints', async () => {
  const requests: string[] = []
  const client = new DisifyClient({
    baseUrl: 'https://disify.test',
    fetchImpl: (async input => {
      const url = new URL(String(input))
      requests.push(url.href)
      assert.equal(url.origin, 'https://disify.test')
      if (url.pathname === '/api/email/test%40example.com') {
        return jsonResponse(createValidationBody({ domain: 'example.com', disposable: true }), 200, { 'x-ratelimit-limit': '30', 'x-ratelimit-remaining': '29' })
      }
      if (url.pathname === '/api/domain/gmail.com') {
        return jsonResponse(createValidationBody({ domain: 'gmail.com', disposable: false, whitelist: true, free: true }), 200, { 'x-ratelimit-limit': '30', 'x-ratelimit-remaining': '28' })
      }
      return jsonResponse({ error: 'unexpected' }, 404)
    }) as typeof fetch,
  })

  const email = await client.validateEmail({ email: 'test@example.com' })
  const domain = await client.validateDomain({ domain: 'gmail.com' })

  assert.deepEqual(requests, ['https://disify.test/api/email/test%40example.com', 'https://disify.test/api/domain/gmail.com'])
  assert.equal(email.disposable, true)
  assert.equal(email.rateLimit.limit, '30')
  assert.equal(domain.whitelist, true)
  assert.equal(domain.free, true)
})

test('Disify usecases project TUI-ready validation JSON', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async input => {
    const url = new URL(String(input))
    return jsonResponse(createValidationBody({
      domain: url.pathname.includes('/domain/') ? 'gmail.com' : 'example.com',
      disposable: url.pathname.includes('/email/'),
      free: url.pathname.includes('/domain/'),
    }), 200, { 'x-ratelimit-limit': '30', 'x-ratelimit-remaining': '27' })
  }) as typeof fetch
  try {
    const email = await validateDisifyEmail({ email: 'test@example.com' })
    assert.equal(email.kind, 'disify.email')
    assert.equal(email.api.authentication, 'none')
    assert.equal(email.api.usesBrowserClickstream, false)
    assert.equal(email.query.email, 'test@example.com')
    assert.equal(email.validation.disposable, true)

    const domain = await validateDisifyDomain({ domain: 'gmail.com' })
    assert.equal(domain.kind, 'disify.domain')
    assert.equal(domain.api.authentication, 'none')
    assert.equal(domain.query.domain, 'gmail.com')
    assert.equal(domain.validation.free, true)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('Disify normalizers enforce curated query bounds', () => {
  assert.deepEqual(normalizeDisifyEmailInput({ email: ' TEST@Example.COM ' }), { email: 'test@example.com' })
  assert.deepEqual(normalizeDisifyDomainInput({ domain: ' Gmail.COM ' }), { domain: 'gmail.com' })
  assert.throws(() => normalizeDisifyEmailInput({ email: 'not-an-email' }), /--email/u)
  assert.throws(() => normalizeDisifyDomainInput({ domain: '-bad.example' }), /--domain/u)
})

function createValidationBody(input: { domain: string; disposable: boolean; whitelist?: boolean | undefined; free?: boolean | undefined }) {
  return {
    format: true,
    domain: input.domain,
    disposable: input.disposable,
    dns: true,
    confidence: input.disposable ? 100 : 0,
    signals: input.disposable ? ['blacklist_exact'] : [],
    domain_info: {
      tld: input.domain.split('.').at(-1),
      is_subdomain: false,
      parent_domain: null,
    },
    mx_info: ['mx.example.com'],
    role: false,
    free: input.free ?? false,
    ...(input.whitelist !== undefined ? { whitelist: input.whitelist } : {}),
  }
}

function jsonResponse(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...headers },
  })
}
