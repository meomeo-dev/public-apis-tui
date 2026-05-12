import assert from 'node:assert/strict'
import test from 'node:test'
import { listRestCountriesRegion, lookupRestCountriesAlpha, searchRestCountriesByName } from '../src/application/usecases/restCountries.js'
import { RestCountriesClient, normalizeRestCountriesAlphaInput, normalizeRestCountriesNameInput, normalizeRestCountriesRegionInput } from '../src/infrastructure/openApis/restCountriesClient.js'

const germany = {
  flags: { png: 'https://flagcdn.com/w320/de.png', svg: 'https://flagcdn.com/de.svg', alt: 'Flag of Germany' },
  name: { common: 'Germany', official: 'Federal Republic of Germany' },
  currencies: { EUR: { name: 'euro', symbol: '€' } },
  languages: { deu: 'German' },
  cca2: 'DE',
  cca3: 'DEU',
  capital: ['Berlin'],
  region: 'Europe',
  subregion: 'Western Europe',
  area: 357114,
  population: 83491249,
}

test('REST Countries client sends selected-field name, alpha, and region requests', async () => {
  const requests: string[] = []
  const client = new RestCountriesClient({
    baseUrl: 'https://restcountries.test',
    fetchImpl: (async input => {
      requests.push(String(input))
      return jsonResponse(requests.length === 2 ? germany : [germany])
    }) as typeof fetch,
  })
  assert.equal((await client.byName({ name: 'peru', limit: 1 }))[0]?.commonName, 'Germany')
  assert.equal((await client.byAlpha({ code: 'DE' }))?.cca3, 'DEU')
  assert.equal((await client.byRegion({ region: 'europe', limit: 1 }))[0]?.capital[0], 'Berlin')
  assert.deepEqual(requests, [
    'https://restcountries.test/v3.1/name/peru?fields=name%2Ccca2%2Ccca3%2Ccapital%2Cregion%2Csubregion%2Cpopulation%2Carea%2Clanguages%2Ccurrencies%2Cflags',
    'https://restcountries.test/v3.1/alpha/DE?fields=name%2Ccca2%2Ccca3%2Ccapital%2Cregion%2Csubregion%2Cpopulation%2Carea%2Clanguages%2Ccurrencies%2Cflags',
    'https://restcountries.test/v3.1/region/europe?fields=name%2Ccca2%2Ccca3%2Ccapital%2Cregion%2Csubregion%2Cpopulation%2Carea%2Clanguages%2Ccurrencies%2Cflags',
  ])
})

test('REST Countries usecases project no-auth metadata and bounded collections', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async input => jsonResponse(String(input).includes('/alpha/') ? germany : [germany, { ...germany, cca2: 'AT', cca3: 'AUT', name: { common: 'Austria' } }])) as typeof fetch
  try {
    const alpha = await lookupRestCountriesAlpha({ code: 'de' })
    assert.equal(alpha.kind, 'restcountries.alpha')
    assert.equal(alpha.api.authentication, 'none')
    assert.equal(alpha.country?.commonName, 'Germany')

    const name = await searchRestCountriesByName({ name: 'ger', limit: 1 })
    assert.equal(name.countries.length, 1)
    assert.equal(name.pagination.maxLimit, 60)

    const region = await listRestCountriesRegion({ region: 'Europe', limit: 1 })
    assert.equal(region.countries[0]?.cca2, 'DE')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('REST Countries normalizers enforce bounds', () => {
  assert.deepEqual(normalizeRestCountriesNameInput({}), { name: 'peru', limit: 10 })
  assert.deepEqual(normalizeRestCountriesAlphaInput({ code: 'deu' }), { code: 'DEU' })
  assert.deepEqual(normalizeRestCountriesRegionInput({ region: 'Europe', limit: 2 }), { region: 'europe', limit: 2 })
  assert.throws(() => normalizeRestCountriesNameInput({ name: 'a' }), /--name/u)
  assert.throws(() => normalizeRestCountriesAlphaInput({ code: 'D' }), /--code/u)
  assert.throws(() => normalizeRestCountriesRegionInput({ region: 'eu/rope' }), /--region/u)
  assert.throws(() => normalizeRestCountriesRegionInput({ limit: 61 }), /between 1 and 60/u)
})

test('REST Countries client maps not found to empty results and rejects non-JSON', async () => {
  const notFound = new RestCountriesClient({
    baseUrl: 'https://restcountries.test',
    fetchImpl: (async () => jsonResponse({ status: 404, message: 'Not Found' }, 404)) as typeof fetch,
  })
  assert.deepEqual(await notFound.byName({ name: 'missing', limit: 1 }), [])
  assert.equal(await notFound.byAlpha({ code: 'ZZ' }), undefined)

  const html = new RestCountriesClient({
    baseUrl: 'https://restcountries.test',
    fetchImpl: (async () => new Response('<html>error</html>', { status: 502, headers: { 'content-type': 'text/html' } })) as typeof fetch,
  })
  await assert.rejects(() => html.byRegion({ region: 'europe', limit: 1 }), /non-JSON/u)
})

test('REST Countries client surfaces Cloudflare challenge HTML clearly', async () => {
  const client = new RestCountriesClient({
    baseUrl: 'https://restcountries.test',
    fetchImpl: (async () =>
      new Response('<!DOCTYPE html><title>Just a moment...</title>', {
        status: 403,
        headers: {
          'content-type': 'text/html; charset=UTF-8',
          server: 'cloudflare',
          'cf-mitigated': 'challenge',
        },
      })) as typeof fetch,
  })
  await assert.rejects(() => client.byName({ name: 'peru', limit: 1 }), /Cloudflare challenge HTML page/u)
})

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
}
