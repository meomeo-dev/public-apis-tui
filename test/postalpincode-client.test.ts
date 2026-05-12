import assert from 'node:assert/strict'
import test from 'node:test'
import { lookupPostalPinCodePincode, lookupPostalPinCodePostOffice } from '../src/application/usecases/postalPinCode.js'
import {
  PostalPinCodeClient,
  normalizePostalPinCodePincodeInput,
  normalizePostalPinCodePostOfficeInput,
} from '../src/infrastructure/openApis/postalPinCodeClient.js'
import { RuntimeFailure } from '../src/shared/errors/runtimeFailure.js'

test('PostalPinCode client looks up post offices by pincode', async () => {
  const client = new PostalPinCodeClient({
    fetchImpl: (async input => {
      const url = new URL(String(input))
      assert.equal(url.href, 'https://api.postalpincode.in/pincode/110001')
      return jsonResponse(createPostalPinCodeFixture())
    }) as typeof fetch,
  })

  const response = await client.lookupPincode({ pincode: '110001', limit: 1 })
  assert.equal(response.status, 'Success')
  assert.equal(response.upstreamCount, 2)
  assert.equal(response.postOffices.length, 1)
  assert.equal(response.postOffices[0]?.name, 'Connaught Place')
  assert.equal(response.postOffices[0]?.pincode, '110001')
})

test('PostalPinCode client looks up post offices by branch name', async () => {
  const client = new PostalPinCodeClient({
    fetchImpl: (async input => {
      const url = new URL(String(input))
      assert.equal(url.href, 'https://api.postalpincode.in/postoffice/Connaught%20Place')
      return jsonResponse(createPostalPinCodeFixture())
    }) as typeof fetch,
  })

  const response = await client.lookupPostOffice({ name: 'Connaught Place', limit: 10 })
  assert.equal(response.status, 'Success')
  assert.equal(response.postOffices[0]?.district, 'Central Delhi')
})

test('PostalPinCode usecases project TUI-ready JSON', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async () => jsonResponse(createPostalPinCodeFixture())) as typeof fetch

  try {
    const pincode = await lookupPostalPinCodePincode({ pincode: '110001', limit: 2 })
    assert.equal(pincode.kind, 'postalpincode.pincode')
    assert.equal(pincode.api.authentication, 'none')
    assert.equal(pincode.api.usesBrowserClickstream, false)
    assert.match(pincode.api.detailPolicy, /not scraped/)
    assert.equal(pincode.pagination.upstreamCount, 2)
    assert.equal(pincode.postOffices[0]?.name, 'Connaught Place')

    const postOffice = await lookupPostalPinCodePostOffice({ name: 'Connaught Place', limit: 2 })
    assert.equal(postOffice.kind, 'postalpincode.postOffice')
    assert.equal(postOffice.api.provider, 'postalpincode')
    assert.equal(postOffice.postOffices[0]?.pincode, '110001')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('PostalPinCode normalizers enforce bounded queries', () => {
  assert.deepEqual(normalizePostalPinCodePincodeInput({}), { pincode: '110001', limit: 10 })
  assert.deepEqual(normalizePostalPinCodePincodeInput({ pincode: ' 560001 ', limit: 1 }), { pincode: '560001', limit: 1 })
  assert.deepEqual(normalizePostalPinCodePostOfficeInput({}), { name: 'Connaught Place', limit: 10 })
  assert.deepEqual(normalizePostalPinCodePostOfficeInput({ name: '  New   Delhi ', limit: 50 }), { name: 'New Delhi', limit: 50 })
  assert.throws(() => normalizePostalPinCodePincodeInput({ pincode: 'abc' }), RuntimeFailure)
  assert.throws(() => normalizePostalPinCodePostOfficeInput({ name: 'a' }), RuntimeFailure)
  assert.throws(() => normalizePostalPinCodePincodeInput({ limit: 51 }), RuntimeFailure)
})

test('PostalPinCode client rejects oversized upstream bodies', async () => {
  const client = new PostalPinCodeClient({
    fetchImpl: (async () => new Response('x'.repeat(1_000_001), { status: 200, headers: { 'content-type': 'application/json' } })) as typeof fetch,
  })

  await assert.rejects(
    () => client.lookupPostOffice({ name: 'New Delhi', limit: 10 }),
    (error: unknown) => error instanceof RuntimeFailure && /too large/u.test(error.message),
  )
})

function jsonResponse(value: unknown): Response {
  return new Response(JSON.stringify(value), { status: 200, headers: { 'content-type': 'application/json' } })
}

function createPostalPinCodeFixture(): Array<Record<string, unknown>> {
  return [
    {
      Message: 'Number of Post office(s) found:2',
      Status: 'Success',
      PostOffice: [
        {
          Name: 'Connaught Place',
          Description: null,
          BranchType: 'Sub Post Office',
          DeliveryStatus: 'Non-Delivery',
          Circle: 'Delhi',
          District: 'Central Delhi',
          Division: 'New Delhi Central',
          Region: 'Delhi',
          Block: 'New Delhi',
          State: 'Delhi',
          Country: 'India',
          Pincode: '110001',
        },
        {
          Name: 'New Delhi',
          Description: null,
          BranchType: 'Head Post Office',
          DeliveryStatus: 'Delivery',
          Circle: 'Delhi',
          District: 'New Delhi',
          Division: 'New Delhi GPO',
          Region: 'Delhi',
          State: 'Delhi',
          Country: 'India',
          Pincode: '110001',
        },
      ],
    },
  ]
}
