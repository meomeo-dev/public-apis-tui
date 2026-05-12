import assert from 'node:assert/strict'
import test from 'node:test'
import {
  getWorldBankIndicator,
  listWorldBankCountries,
  normalizeWorldBankCountriesInput,
  normalizeWorldBankIndicatorInput,
} from '../src/application/usecases/worldBank.js'
import {
  normalizeWorldBankCountry,
  normalizeWorldBankDate,
  normalizeWorldBankIndicator,
  normalizeWorldBankPage,
  normalizeWorldBankPerPage,
  WorldBankClient,
} from '../src/infrastructure/openApis/worldBankClient.js'

test('World Bank client calls documented country endpoint as JSON', async () => {
  let requestedUrl: URL | undefined
  const client = new WorldBankClient('https://api.worldbank.org/v2', (
    async input => {
      requestedUrl = new URL(String(input))
      return jsonResponse([
        { page: 2, pages: 99, per_page: 3, total: 296, sourceid: '2' },
        [
          {
            id: 'US',
            iso2Code: 'US',
            name: 'United States',
            region: { id: 'NAC', value: 'North America' },
            adminregion: { id: '', value: '' },
            incomeLevel: { id: 'HIC', value: 'High income' },
            lendingType: { id: 'LNX', value: 'Not classified' },
            capitalCity: 'Washington D.C.',
            longitude: '-77.032',
            latitude: '38.8895',
          },
        ],
      ])
    }
  ) as typeof fetch)

  const response = await client.listCountries({ page: 2, perPage: 3 })

  assert.equal(
    requestedUrl?.href,
    'https://api.worldbank.org/v2/country?format=json&page=2&per_page=3',
  )
  assert.equal(response.pagination.page, 2)
  assert.equal(response.pagination.total, 296)
  assert.equal(response.countries[0]?.id, 'US')
  assert.equal(response.countries[0]?.capitalCity, 'Washington D.C.')
  assert.equal(response.countries[0]?.longitude, -77.032)
})

test('World Bank usecase projects indicator data and metadata', async () => {
  const originalFetch = globalThis.fetch
  const requestedUrls: string[] = []
  globalThis.fetch = (async input => {
    const url = new URL(String(input))
    requestedUrls.push(url.href)
    if (url.pathname === '/v2/country/US/indicator/SP.POP.TOTL') {
      return jsonResponse([
        { page: 1, pages: 1, per_page: 3, total: 3, lastupdated: '2025-12-16' },
        [
          {
            indicator: { id: 'SP.POP.TOTL', value: 'Population, total' },
            country: { id: 'US', value: 'United States' },
            countryiso3code: 'USA',
            date: '2022',
            value: 333287557,
            unit: '',
            obs_status: '',
            decimal: 0,
          },
        ],
      ])
    }
    if (url.pathname === '/v2/indicator/SP.POP.TOTL') {
      return jsonResponse([
        { page: 1, pages: 1, per_page: 1, total: 1 },
        [
          {
            id: 'SP.POP.TOTL',
            name: 'Population, total',
            source: { id: '2', value: 'World Development Indicators' },
            sourceNote: 'Total population is based on the de facto definition.',
            sourceOrganization: 'World Bank',
            topics: [{ id: '19', value: 'Climate Change' }],
          },
        ],
      ])
    }
    return jsonResponse({ error: 'unexpected url' }, 404)
  }) as typeof fetch

  try {
    const result = await getWorldBankIndicator({
      country: 'us',
      indicator: 'sp.pop.totl',
      date: '2020:2022',
      perPage: 3,
    })

    assert.deepEqual(requestedUrls, [
      [
        'https://api.worldbank.org/v2/country/US/indicator/',
        'SP.POP.TOTL?format=json&date=2020%3A2022&page=1&per_page=3',
      ].join(''),
      'https://api.worldbank.org/v2/indicator/SP.POP.TOTL?format=json&per_page=1',
    ])
    assert.equal(result.kind, 'worldbank.indicator')
    assert.equal(result.api.provider, 'worldbank')
    assert.equal(result.api.authentication, 'none')
    assert.equal(result.api.usesBrowserClickstream, false)
    assert.equal(result.query.country, 'US')
    assert.equal(result.query.indicator, 'SP.POP.TOTL')
    assert.equal(result.indicator?.name, 'Population, total')
    assert.equal(result.points[0]?.value, 333287557)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('World Bank usecase projects country metadata', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async () => jsonResponse([
    { page: 1, pages: 1, per_page: 2, total: 1 },
    [
      {
        id: 'WLD',
        iso2Code: '1W',
        name: 'World',
        region: { id: 'NA', value: 'Aggregates' },
        incomeLevel: { id: 'NA', value: 'Aggregates' },
        lendingType: { id: 'NA', value: 'Aggregates' },
      },
    ],
  ])) as typeof fetch

  try {
    const result = await listWorldBankCountries({ perPage: 2 })

    assert.equal(result.kind, 'worldbank.countries')
    assert.equal(result.api.endpoint, 'GET /country')
    assert.equal(result.query.page, 1)
    assert.equal(result.query.perPage, 2)
    assert.equal(result.countries[0]?.name, 'World')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('World Bank client rejects provider message payloads', async () => {
  const client = new WorldBankClient('https://api.worldbank.org/v2', (
    async () => jsonResponse([{
      message: [{ key: 'Invalid value', value: 'Bad country' }],
    }])
  ) as typeof fetch)

  await assert.rejects(
    () => client.listCountries({ page: 1, perPage: 3 }),
    /Invalid value: Bad country/,
  )
})

test('World Bank client surfaces challenge HTML clearly', async () => {
  const client = new WorldBankClient('https://api.worldbank.example/v2', (
    async () => new Response(
      '<!DOCTYPE html><title>Just a moment...</title>',
      {
        status: 403,
        headers: {
          'content-type': 'text/html; charset=UTF-8',
          server: 'cloudflare',
          'cf-mitigated': 'challenge',
        },
      },
    )
  ) as typeof fetch)

  await assert.rejects(
    () => client.listCountries({ page: 1, perPage: 3 }),
    /challenge HTML page/u,
  )
})

test('World Bank normalizers enforce country, indicator, date, and bounds', () => {
  assert.equal(normalizeWorldBankCountry('us'), 'US')
  assert.equal(normalizeWorldBankIndicator('sp.pop.totl'), 'SP.POP.TOTL')
  assert.equal(normalizeWorldBankDate('2020:2022'), '2020:2022')
  assert.equal(normalizeWorldBankPage(undefined), 1)
  assert.equal(normalizeWorldBankPerPage(undefined), 20)
  assert.deepEqual(normalizeWorldBankCountriesInput({}), { page: 1, perPage: 20 })
  assert.deepEqual(normalizeWorldBankIndicatorInput({ country: 'wld', perPage: 3 }), {
    country: 'WLD',
    indicator: 'SP.POP.TOTL',
    date: '2020:2022',
    page: 1,
    perPage: 3,
  })
  assert.throws(() => normalizeWorldBankCountry('united-states'), /--country/)
  assert.throws(() => normalizeWorldBankIndicator('../bad'), /--indicator/)
  assert.throws(() => normalizeWorldBankDate('1900:2022'), /range up to 60 years/)
  assert.throws(() => normalizeWorldBankPage(1001), /between 1 and 1000/)
  assert.throws(() => normalizeWorldBankPerPage(101), /between 1 and 100/)
})

function jsonResponse(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { 'content-type': 'application/json;charset=utf-8' },
  })
}
