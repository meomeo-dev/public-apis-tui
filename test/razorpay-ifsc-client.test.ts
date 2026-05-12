import assert from 'node:assert/strict'
import test from 'node:test'
import { lookupRazorpayIfsc } from '../src/application/usecases/razorpayIfsc.js'
import { RazorpayIfscClient, normalizeRazorpayIfscLookupInput } from '../src/infrastructure/openApis/razorpayIfscClient.js'
import { RuntimeFailure } from '../src/shared/errors/runtimeFailure.js'

test('Razorpay IFSC client reads bank branch JSON', async () => {
  const client = new RazorpayIfscClient({
    fetchImpl: (async input => {
      const url = new URL(String(input))
      assert.equal(url.pathname, '/HDFC0CAGSBK')
      return jsonResponse(createBranchFixture())
    }) as typeof fetch,
  })

  const branch = await client.lookup({ ifsc: 'HDFC0CAGSBK' })
  assert.equal(branch.ifsc, 'HDFC0CAGSBK')
  assert.equal(branch.bank, 'HDFC Bank')
  assert.equal(branch.branch, 'THE AGS EMPLOYEES COOP BANK LTD')
  assert.equal(branch.upi, true)
  assert.equal(branch.neft, true)
})

test('Razorpay IFSC usecase projects TUI-ready JSON', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async () => jsonResponse(createBranchFixture())) as typeof fetch

  try {
    const result = await lookupRazorpayIfsc({ ifsc: 'hdfc0cagsbk' })
    assert.equal(result.kind, 'razorpayifsc.lookup')
    assert.equal(result.api.provider, 'razorpayifsc')
    assert.equal(result.api.authentication, 'none')
    assert.equal(result.api.usesBrowserClickstream, false)
    assert.equal(result.query.ifsc, 'HDFC0CAGSBK')
    assert.equal(result.branch.bankCode, 'HDFC')
    assert.equal(result.paymentRails.imps, true)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('Razorpay IFSC normalizer enforces documented code format', () => {
  assert.deepEqual(normalizeRazorpayIfscLookupInput({}), { ifsc: 'HDFC0CAGSBK' })
  assert.deepEqual(normalizeRazorpayIfscLookupInput({ ifsc: ' yesb0dnb002 ' }), { ifsc: 'YESB0DNB002' })
  assert.throws(() => normalizeRazorpayIfscLookupInput({ ifsc: 'HDFC123' }), RuntimeFailure)
  assert.throws(() => normalizeRazorpayIfscLookupInput({ ifsc: '12345678901' }), RuntimeFailure)
})

test('Razorpay IFSC client explains not-found codes without raw provider payload', async () => {
  const client = new RazorpayIfscClient({
    fetchImpl: (async () => jsonResponse('Not Found', { status: 404 })) as typeof fetch,
  })

  await assert.rejects(
    () => client.lookup({ ifsc: 'HDFC0ZZZZZZ' }),
    /No Razorpay IFSC branch found for HDFC0ZZZZZZ/u,
  )
})

function jsonResponse(value: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(value), { ...init, headers: { 'content-type': 'application/json', ...init.headers } })
}

function createBranchFixture(): Record<string, unknown> {
  return {
    MICR: '560226263',
    BRANCH: 'THE AGS EMPLOYEES COOP BANK LTD',
    ADDRESS: 'SANGMESH BIRADAR BANGALORE',
    STATE: 'KARNATAKA',
    CONTACT: '+918022265658',
    UPI: true,
    RTGS: true,
    CITY: 'BANGALORE URBAN',
    CENTRE: 'BANGALORE',
    DISTRICT: 'BANGALORE',
    NEFT: true,
    IMPS: true,
    SWIFT: 'HDFCINBB',
    ISO3166: 'IN-KA',
    BANK: 'HDFC Bank',
    BANKCODE: 'HDFC',
    IFSC: 'HDFC0CAGSBK',
  }
}
