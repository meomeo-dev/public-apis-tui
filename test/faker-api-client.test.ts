import assert from 'node:assert/strict'
import test from 'node:test'
import { listFakerApiCompanies, listFakerApiPersons } from '../src/application/usecases/fakerApi.js'
import { FakerApiClient, normalizeFakerApiCommonInput } from '../src/infrastructure/openApis/fakerApiClient.js'
import { RuntimeFailure } from '../src/shared/errors/runtimeFailure.js'

test('FakerAPI client reads persons and companies with rate metadata', async () => {
  const client = new FakerApiClient({
    fetchImpl: (async input => {
      const url = new URL(String(input))
      assert.equal(url.searchParams.get('_quantity'), '2')
      assert.equal(url.searchParams.get('_locale'), 'en_US')
      assert.equal(url.searchParams.get('_seed'), '123')
      const data = url.pathname.endsWith('/persons') ? [createPersonFixture(1), createPersonFixture(2)] : [createCompanyFixture(1), createCompanyFixture(2)]
      return new Response(JSON.stringify({ status: 'OK', code: 200, total: 2, data }), {
        status: 200,
        headers: { 'content-type': 'application/json', 'x-ratelimit-limit': '60', 'x-ratelimit-remaining': '59' },
      })
    }) as typeof fetch,
  })

  const persons = await client.listPersons({ quantity: 2, locale: 'en_US', seed: 123 })
  assert.equal(persons.data[0]?.firstName, 'Ada')
  assert.equal(persons.rateLimit.limit, '60')

  const companies = await client.listCompanies({ quantity: 2, locale: 'en_US', seed: 123 })
  assert.equal(companies.data[0]?.name, 'Ada Labs 1')
  assert.equal(companies.data[0]?.contact?.lastName, 'Lovelace')
})

test('FakerAPI usecases project TUI-ready JSON', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async input => {
    const url = new URL(String(input))
    const data = url.pathname.endsWith('/persons') ? [createPersonFixture(1)] : [createCompanyFixture(1)]
    return new Response(JSON.stringify({ status: 'OK', code: 200, total: 1, data }), {
      status: 200,
      headers: { 'content-type': 'application/json', 'x-ratelimit-limit': '60', 'x-ratelimit-remaining': '58' },
    })
  }) as typeof fetch

  try {
    const persons = await listFakerApiPersons({ quantity: 1, locale: 'en_US', seed: 123 })
    assert.equal(persons.kind, 'fakerapi.persons')
    assert.equal(persons.api.authentication, 'none')
    assert.equal(persons.api.usesBrowserClickstream, false)
    assert.equal(persons.pagination.limit, 1)
    assert.equal(persons.persons[0]?.email, 'ada1@example.com')

    const companies = await listFakerApiCompanies({ quantity: 1, locale: 'en_US', seed: 123 })
    assert.equal(companies.kind, 'fakerapi.companies')
    assert.equal(companies.api.authentication, 'none')
    assert.equal(companies.api.usesBrowserClickstream, false)
    assert.equal(companies.companies[0]?.addresses[0]?.countryCode, 'US')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('FakerAPI normalizers enforce bounded CLI parameters', () => {
  assert.deepEqual(normalizeFakerApiCommonInput({}), { quantity: 10 })
  assert.deepEqual(normalizeFakerApiCommonInput({ quantity: 100, locale: 'it_IT', seed: 0 }), { quantity: 100, locale: 'it_IT', seed: 0 })
  assert.throws(() => normalizeFakerApiCommonInput({ quantity: 101 }), RuntimeFailure)
  assert.throws(() => normalizeFakerApiCommonInput({ locale: 'en-us' }), RuntimeFailure)
  assert.throws(() => normalizeFakerApiCommonInput({ seed: -1 }), RuntimeFailure)
})

function createPersonFixture(id: number): Record<string, unknown> {
  return {
    id,
    firstname: 'Ada',
    lastname: 'Lovelace',
    email: `ada${id}@example.com`,
    phone: '+12025550123',
    birthday: '1815-12-10',
    gender: 'female',
    address: {
      id,
      street: '1 Computing Way',
      streetName: 'Computing Way',
      buildingNumber: '1',
      city: 'London',
      zipcode: 'SW1A 1AA',
      country: 'United States',
      country_code: 'US',
      latitude: 38.9,
      longitude: -77.0,
    },
    website: 'https://example.com',
    image: 'https://example.com/ada.jpg',
  }
}

function createCompanyFixture(id: number): Record<string, unknown> {
  return {
    id,
    name: `Ada Labs ${id}`,
    email: `hello${id}@adalabs.example`,
    vat: '123456789',
    phone: '+12025550124',
    country: 'United States',
    addresses: [createPersonFixture(id).address],
    website: 'https://adalabs.example',
    image: 'https://example.com/company.jpg',
    contact: createPersonFixture(id),
  }
}
