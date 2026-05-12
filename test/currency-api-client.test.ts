import assert from 'node:assert/strict'
import test from 'node:test'
import { getCurrencyApiRates, listCurrencyApiCurrencies } from '../src/application/usecases/currencyApi.js'
import { CurrencyApiClient, normalizeCurrencyApiCurrenciesInput, normalizeCurrencyApiRatesInput } from '../src/infrastructure/openApis/currencyApiClient.js'
import { RuntimeFailure } from '../src/shared/errors/runtimeFailure.js'

test('Currency-api client reads currencies and rates with documented URLs', async () => {
  const seen: string[] = []
  const client = new CurrencyApiClient({
    fetchImpl: (async input => {
      const url = new URL(String(input))
      seen.push(url.href)
      if (url.pathname.endsWith('/currencies.json')) return jsonResponse({ usd: 'US Dollar', eur: 'Euro', jpy: 'Japanese Yen', btc: 'Bitcoin' })
      return jsonResponse({ date: '2026-05-04', usd: { eur: 0.85, jpy: 157.23, btc: 0.000012 } })
    }) as typeof fetch,
  })

  const currencies = await client.currencies(normalizeCurrencyApiCurrenciesInput({ search: 'u', limit: 1 }))
  const rates = await client.rates(normalizeCurrencyApiRatesInput({ base: 'USD', symbols: 'eur,btc', limit: 2 }))

  assert.match(seen[0] ?? '', /@latest\/v1\/currencies\.json$/)
  assert.match(seen[1] ?? '', /@latest\/v1\/currencies\/usd\.json$/)
  assert.deepEqual(currencies, [{ code: 'usd', name: 'US Dollar' }])
  assert.deepEqual(rates.rates, [{ code: 'eur', rate: 0.85 }, { code: 'btc', rate: 0.000012 }])
})

test('Currency-api usecases project TUI-ready metadata', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async input => {
    const url = new URL(String(input))
    return url.pathname.endsWith('/currencies.json')
      ? jsonResponse({ usd: 'US Dollar', eur: 'Euro', jpy: 'Japanese Yen' })
      : jsonResponse({ date: '2026-05-04', usd: { eur: 0.85, jpy: 157.23 } })
  }) as typeof fetch
  try {
    const currencies = await listCurrencyApiCurrencies({})
    const rates = await getCurrencyApiRates({ symbols: 'eur' })
    assert.equal(currencies.kind, 'currencyapi.currencies')
    assert.equal(currencies.api.authentication, 'none')
    assert.equal(currencies.api.usesBrowserClickstream, false)
    assert.equal(currencies.pagination.maxLimit, 301)
    assert.equal(rates.kind, 'currencyapi.rates')
    assert.equal(rates.rates[0]?.code, 'eur')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('Currency-api normalizers enforce curated code, date, and limit bounds', () => {
  assert.equal(normalizeCurrencyApiCurrenciesInput({}).limit, 301)
  assert.equal(normalizeCurrencyApiRatesInput({ base: 'BTC', date: '2026-05-04' }).base, 'btc')
  assert.throws(() => normalizeCurrencyApiRatesInput({ base: '$' }), RuntimeFailure)
  assert.throws(() => normalizeCurrencyApiRatesInput({ date: '05/04/2026' }), RuntimeFailure)
  assert.throws(() => normalizeCurrencyApiRatesInput({ limit: 302 }), RuntimeFailure)
})

function jsonResponse(value: unknown): Response {
  return new Response(JSON.stringify(value), { status: 200, headers: { 'content-type': 'application/json' } })
}
