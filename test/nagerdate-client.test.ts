import assert from 'node:assert/strict'
import test from 'node:test'
import { listNagerDateCountries, listNagerDateHolidays } from '../src/application/usecases/nagerDate.js'
import { NagerDateClient, getNagerDateDefaultYear, normalizeNagerDateCountriesQuery, normalizeNagerDateHolidaysQuery } from '../src/infrastructure/openApis/nagerDateClient.js'

const countriesFixture = [
  { countryCode: 'US', name: 'United States' },
  { countryCode: 'CA', name: 'Canada' },
  { countryCode: 'DE', name: 'Germany' },
]

const holidaysFixture = [
  {
    date: '2026-01-01',
    localName: "New Year's Day",
    name: "New Year's Day",
    countryCode: 'US',
    fixed: false,
    global: true,
    counties: null,
    launchYear: null,
    types: ['Public', 'Bank'],
  },
  {
    date: '2026-03-31',
    localName: 'Cesar Chavez Day',
    name: 'Cesar Chavez Day',
    countryCode: 'US',
    fixed: true,
    global: false,
    counties: ['US-CA'],
    launchYear: 2000,
    types: ['Public'],
  },
]

test('Nager.Date client lists available countries with filter and cap', async () => {
  let requestedUrl: URL | undefined
  const client = new NagerDateClient('https://date.nager.at/api/v3', (async input => {
    requestedUrl = new URL(String(input))
    return jsonResponse(countriesFixture)
  }) as typeof fetch)

  const countries = await client.listCountries({ query: 'united', limit: 10 })

  assert.equal(requestedUrl?.href, 'https://date.nager.at/api/v3/availablecountries')
  assert.deepEqual(countries, [{ countryCode: 'US', name: 'United States' }])
})

test('Nager.Date client fetches public holidays and applies county/type filters', async () => {
  let requestedUrl: URL | undefined
  const client = new NagerDateClient('https://date.nager.at/api/v3', (async input => {
    requestedUrl = new URL(String(input))
    return jsonResponse(holidaysFixture)
  }) as typeof fetch)

  const holidays = await client.listPublicHolidays({ year: 2026, countryCode: 'US', county: 'US-CA', type: 'Public' })

  assert.equal(requestedUrl?.href, 'https://date.nager.at/api/v3/publicholidays/2026/US')
  assert.equal(holidays.length, 2)
  assert.equal(holidays[1]?.counties[0], 'US-CA')
})

test('Nager.Date usecases project no-auth metadata and defaults', async () => {
  const originalFetch = globalThis.fetch
  const defaultYear = getNagerDateDefaultYear()
  globalThis.fetch = (async input => {
    const url = new URL(String(input))
    if (url.pathname.endsWith('/availablecountries')) {
      return jsonResponse(countriesFixture)
    }
    assert.equal(url.pathname, `/api/v3/publicholidays/${defaultYear}/US`)
    return jsonResponse(holidaysFixture)
  }) as typeof fetch

  try {
    const countries = await listNagerDateCountries()
    assert.equal(countries.kind, 'nagerdate.countries')
    assert.equal((countries.api as Record<string, unknown>).authentication, 'none')
    assert.equal((countries.api as Record<string, unknown>).usesBrowserClickstream, false)
    assert.equal((countries.query as Record<string, unknown>).limit, 250)

    const holidays = await listNagerDateHolidays()
    assert.equal(holidays.kind, 'nagerdate.holidays')
    assert.equal((holidays.query as Record<string, unknown>).year, defaultYear)
    assert.equal((holidays.query as Record<string, unknown>).countryCode, 'US')
    assert.equal((holidays.holidays as Array<Record<string, unknown>>)[0]?.name, "New Year's Day")
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('Nager.Date normalizers enforce curated CLI bounds', () => {
  assert.equal(getNagerDateDefaultYear(new Date('2030-06-01T00:00:00.000Z')), 2030)
  assert.equal(normalizeNagerDateHolidaysQuery({}).year, getNagerDateDefaultYear())
  assert.throws(() => normalizeNagerDateCountriesQuery({ limit: 251 }), /between 1 and 250/)
  assert.throws(() => normalizeNagerDateHolidaysQuery({ year: 1899 }), /between 1900 and 9999/)
  assert.throws(() => normalizeNagerDateHolidaysQuery({ countryCode: 'USA' }), /two-letter/)
})

function jsonResponse(value: unknown): Response {
  return new Response(JSON.stringify(value), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })
}
