import assert from 'node:assert/strict'
import test from 'node:test'
import { convertFrankfurter, getFrankfurterRates, listFrankfurterCurrencies } from '../src/application/usecases/frankfurter.js'
import { FrankfurterClient, normalizeFrankfurterConvertInput, normalizeFrankfurterCurrenciesInput, normalizeFrankfurterRatesInput } from '../src/infrastructure/openApis/frankfurterClient.js'
import { RuntimeFailure } from '../src/shared/errors/runtimeFailure.js'

test('Frankfurter client reads currencies, rates, and single pair rates without auth', async () => {
  const seen: string[] = []
  const client = new FrankfurterClient({
    fetchImpl: (async input => {
      const url = new URL(String(input))
      seen.push(`${url.pathname}${url.search}`)
      if (url.pathname.endsWith('/currencies')) return jsonResponse(createCurrenciesFixture())
      if (url.pathname.includes('/rate/')) return jsonResponse({ date: '2026-05-05', base: 'USD', quote: 'EUR', rate: 0.85387 })
      return jsonResponse([
        { date: '2026-05-05', base: 'USD', quote: 'EUR', rate: 0.85387 },
        { date: '2026-05-05', base: 'USD', quote: 'EUR', rate: 0.85387 },
        { date: '2026-05-05', base: 'USD', quote: 'GBP', rate: 0.73812 },
      ])
    }) as typeof fetch,
  })

  const currencies = await client.currencies(normalizeFrankfurterCurrenciesInput({ scope: 'all', search: 'dollar', limit: 1 }))
  const rates = await client.rates(normalizeFrankfurterRatesInput({ base: 'usd', quotes: 'eur,gbp', date: '2026-05-05', limit: 2 }))
  const conversion = await client.convert(normalizeFrankfurterConvertInput({ base: 'usd', quote: 'eur', amount: 100, date: '2026-05-05' }))

  assert.deepEqual(seen, [
    '/v2/currencies?scope=all',
    '/v2/rates?base=USD&quotes=EUR%2CGBP&from=2026-05-05&to=2026-05-05',
    '/v2/rate/USD/EUR?date=2026-05-05',
  ])
  assert.equal(currencies[0]?.code, 'USD')
  assert.equal(rates.length, 2)
  assert.deepEqual(rates.map(rate => rate.quote), ['EUR', 'GBP'])
  assert.equal(rates[1]?.quote, 'GBP')
  assert.equal(conversion.converted, 85.387)
})

test('Frankfurter usecases project no-auth TUI-ready metadata', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async input => {
    const url = new URL(String(input))
    if (url.pathname.endsWith('/currencies')) return jsonResponse(createCurrenciesFixture())
    if (url.pathname.includes('/rate/')) return jsonResponse({ date: '2026-05-05', base: 'EUR', quote: 'USD', rate: 1.1711 })
    return jsonResponse([{ date: '2026-05-05', base: 'EUR', quote: 'USD', rate: 1.1711 }])
  }) as typeof fetch
  try {
    const currencies = await listFrankfurterCurrencies({})
    const rates = await getFrankfurterRates({ quotes: 'USD' })
    const conversion = await convertFrankfurter({ amount: 2 })
    assert.equal(currencies.kind, 'frankfurter.currencies')
    assert.equal(currencies.api.authentication, 'none')
    assert.equal(currencies.api.usesBrowserClickstream, false)
    assert.equal(currencies.pagination.maxLimit, 200)
    assert.equal(rates.kind, 'frankfurter.rates')
    assert.equal(rates.rates[0]?.quote, 'USD')
    assert.equal(conversion.kind, 'frankfurter.convert')
    assert.equal(conversion.conversion.converted, 2.3422)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('Frankfurter normalizers enforce curated scope, code, date, amount, and limit bounds', () => {
  assert.equal(normalizeFrankfurterCurrenciesInput({}).limit, 200)
  assert.deepEqual(normalizeFrankfurterRatesInput({ base: 'usd', quotes: 'eur,eur' }).quotes, ['EUR'])
  assert.equal(normalizeFrankfurterConvertInput({ amount: 10 }).amount, 10)
  assert.throws(() => normalizeFrankfurterCurrenciesInput({ scope: 'current' }), RuntimeFailure)
  assert.throws(() => normalizeFrankfurterRatesInput({ base: 'US' }), RuntimeFailure)
  assert.throws(() => normalizeFrankfurterRatesInput({ date: '05/05/2026' }), RuntimeFailure)
  assert.throws(() => normalizeFrankfurterRatesInput({ limit: 201 }), RuntimeFailure)
  assert.throws(() => normalizeFrankfurterConvertInput({ amount: 0 }), RuntimeFailure)
  assert.throws(() => normalizeFrankfurterConvertInput({ base: 'USD', quote: 'USD' }), RuntimeFailure)
})

function jsonResponse(value: unknown): Response {
  return new Response(JSON.stringify(value), { status: 200, headers: { 'content-type': 'application/json' } })
}

function createCurrenciesFixture(): Array<Record<string, string>> {
  return [
    { iso_code: 'USD', iso_numeric: '840', name: 'United States Dollar', symbol: '$', start_date: '1792-04-02', end_date: '2026-05-05' },
    { iso_code: 'EUR', iso_numeric: '978', name: 'Euro', symbol: '€', start_date: '1999-01-04', end_date: '2026-05-05' },
  ]
}
