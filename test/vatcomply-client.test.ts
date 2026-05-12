import assert from 'node:assert/strict'
import test from 'node:test'
import { geolocateVatComply, getVatComplyRates, listVatComplyVatRates, validateVatComplyVat } from '../src/application/usecases/vatComply.js'
import { VatComplyClient, normalizeVatComplyRatesInput, normalizeVatComplyVatInput, normalizeVatComplyVatRatesInput } from '../src/infrastructure/openApis/vatComplyClient.js'

test('VATComply client reads documented JSON endpoints without auth', async () => {
  const client = new VatComplyClient({ fetchImpl: createFetchFixture() })
  const rates = await client.rates(normalizeVatComplyRatesInput({ base: 'USD', symbols: 'EUR,GBP', limit: 2 }))
  assert.equal(rates.base, 'USD')
  assert.deepEqual(rates.rates.map(rate => rate.code), ['EUR', 'GBP'])

  const vatRates = await client.vatRates(normalizeVatComplyVatRatesInput({ countryCode: 'DE', limit: 1 }))
  assert.equal(vatRates[0]?.countryCode, 'DE')
  assert.equal(vatRates[0]?.standardRate, 19)

  const location = await client.geolocate()
  assert.equal(location.countryCode, 'US')
  assert.equal(location.currency, 'USD')

  const vat = await client.vat(normalizeVatComplyVatInput({ vatNumber: 'DE123456789' }))
  assert.equal(vat.valid, false)
  assert.equal(vat.countryCode, 'DE')
})

test('VATComply usecases project no-auth TUI-ready metadata', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = createFetchFixture()
  try {
    const rates = await getVatComplyRates({ base: 'USD', symbols: 'EUR', limit: 1 })
    assert.equal(rates.kind, 'vatcomply.rates')
    assert.equal(rates.api.authentication, 'none')
    assert.equal(rates.api.usesBrowserClickstream, false)
    assert.equal(rates.pagination.maxLimit, 33)

    const vatRates = await listVatComplyVatRates({ countryCode: 'DE', limit: 1 })
    assert.equal(vatRates.kind, 'vatcomply.vatRates')
    assert.equal(vatRates.rates[0]?.countryName, 'Germany')

    const geolocate = await geolocateVatComply()
    assert.equal(geolocate.kind, 'vatcomply.geolocate')
    assert.equal(geolocate.location.name, 'United States')

    const vat = await validateVatComplyVat({ vatNumber: 'DE123456789' })
    assert.equal(vat.kind, 'vatcomply.vat')
    assert.equal(vat.validation.valid, false)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('VATComply normalizers enforce curated bounds and required VAT number', () => {
  assert.deepEqual(normalizeVatComplyRatesInput({ base: 'usd', symbols: 'eur,gbp,eur', date: '2024-01-02', limit: 2 }), {
    base: 'USD',
    symbols: ['EUR', 'GBP'],
    date: '2024-01-02',
    limit: 2,
  })
  assert.deepEqual(normalizeVatComplyVatRatesInput({ countryCode: 'de', limit: 1 }), { countryCode: 'DE', limit: 1 })
  assert.deepEqual(normalizeVatComplyVatInput({ vatNumber: 'ie 6388047v' }), { vatNumber: 'IE6388047V' })
  assert.throws(() => normalizeVatComplyRatesInput({ base: 'US' }), /three-letter ISO/)
  assert.throws(() => normalizeVatComplyRatesInput({ date: '20240102' }), /YYYY-MM-DD/)
  assert.throws(() => normalizeVatComplyVatRatesInput({ countryCode: 'DEU' }), /two-letter ISO/)
  assert.throws(() => normalizeVatComplyVatInput({ vatNumber: '' }), /--vat-number/)
})

function createFetchFixture(): typeof fetch {
  return (async (input: string | URL | Request): Promise<Response> => {
    const url = new URL(input instanceof Request ? input.url : String(input))
    if (url.pathname === '/rates') {
      return jsonResponse({ date: url.searchParams.get('date') ?? '2026-04-16', base: url.searchParams.get('base') ?? 'EUR', rates: { EUR: 0.848752, GBP: 0.738355, JPY: 158.9798 } })
    }
    if (url.pathname === '/vat_rates') {
      return jsonResponse([{ country_code: 'DE', country_name: 'Germany', standard_rate: 19, reduced_rates: [7], super_reduced_rate: null, parking_rate: null, currency: 'EUR', member_state: true, rate_comments: { '7.0': ['Reduced rate note'] }, rate_categories: { food: ['Food'] } }])
    }
    if (url.pathname === '/geolocate') {
      return jsonResponse({ iso2: 'US', iso3: 'USA', country_code: 'US', name: 'United States', numeric_code: 840, phone_code: '1', capital: 'Washington', currency: 'USD', tld: '.us', region: 'Americas', subregion: 'Northern America', latitude: 38, longitude: -97, emoji: '🇺🇸', ip: '203.0.113.10' })
    }
    if (url.pathname === '/vat') {
      return jsonResponse({ valid: false, vat_number: '123456789', country_code: 'DE', name: '---', address: '---' })
    }
    return jsonResponse({ error: 'not found' }, 404)
  }) as typeof fetch
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
}
