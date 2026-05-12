import assert from 'node:assert/strict'
import test from 'node:test'
import { getEconomiaAwesomeDaily, getEconomiaAwesomeLatest } from '../src/application/usecases/economiaAwesome.js'
import { EconomiaAwesomeClient, normalizeEconomiaAwesomeDailyInput, normalizeEconomiaAwesomeLatestInput } from '../src/infrastructure/openApis/economiaAwesomeClient.js'
import { RuntimeFailure } from '../src/shared/errors/runtimeFailure.js'

test('Economia.Awesome client reads latest and daily JSON without auth', async () => {
  const seen: string[] = []
  const client = new EconomiaAwesomeClient({
    fetchImpl: (async input => {
      const url = new URL(String(input))
      seen.push(url.pathname)
      if (url.pathname.startsWith('/json/daily/')) return jsonResponse([createQuote('USD', 'BRL'), { ...createQuote('USD', 'BRL', '4.9000'), code: undefined, codein: undefined, name: undefined, create_date: undefined }])
      return jsonResponse({ USDBRL: createQuote('USD', 'BRL'), EURBRL: createQuote('EUR', 'BRL', '5.8000') })
    }) as typeof fetch,
  })

  const latest = await client.latest(normalizeEconomiaAwesomeLatestInput({ pairs: 'usd-brl,eur-brl' }))
  const daily = await client.daily(normalizeEconomiaAwesomeDailyInput({ pair: 'usd-brl', days: 2 }))

  assert.deepEqual(seen, ['/json/last/USD-BRL,EUR-BRL', '/json/daily/USD-BRL/2'])
  assert.equal(latest[0]?.pair, 'EUR-BRL')
  assert.equal(latest[1]?.bid, 4.9842)
  assert.equal(daily.length, 2)
  assert.equal(daily[1]?.pair, 'USD-BRL')
  assert.equal(daily[1]?.code, 'USD')
  assert.equal(daily[1]?.codeIn, 'BRL')
  assert.equal(daily[1]?.name, 'USD/BRL')
  assert.equal(daily[1]?.timestamp, 1777954229)
})

test('Economia.Awesome usecases project no-auth TUI-ready metadata', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async input => {
    const url = new URL(String(input))
    if (url.pathname.startsWith('/json/daily/')) return jsonResponse([createQuote('USD', 'BRL')])
    return jsonResponse({ USDBRL: createQuote('USD', 'BRL') })
  }) as typeof fetch
  try {
    const latest = await getEconomiaAwesomeLatest({ pairs: 'USD-BRL' })
    const daily = await getEconomiaAwesomeDaily({ pair: 'USD-BRL', days: 1 })
    assert.equal(latest.kind, 'economiaawesome.latest')
    assert.equal(latest.api.authentication, 'none')
    assert.equal(latest.api.usesBrowserClickstream, false)
    assert.equal(latest.pagination.maxPairs, 20)
    assert.equal(daily.kind, 'economiaawesome.daily')
    assert.equal(daily.pagination.maxDays, 360)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('Economia.Awesome normalizers enforce curated pair and day bounds', () => {
  assert.deepEqual(normalizeEconomiaAwesomeLatestInput({ pairs: 'usd-brl,usd-brl' }).pairs, ['USD-BRL'])
  assert.equal(normalizeEconomiaAwesomeDailyInput({}).days, 360)
  assert.throws(() => normalizeEconomiaAwesomeLatestInput({ pairs: 'USDBRL' }), RuntimeFailure)
  assert.throws(() => normalizeEconomiaAwesomeDailyInput({ pair: 'USD/BRL' }), RuntimeFailure)
  assert.throws(() => normalizeEconomiaAwesomeDailyInput({ days: 361 }), RuntimeFailure)
})

function jsonResponse(value: unknown): Response {
  return new Response(JSON.stringify(value), { status: 200, headers: { 'content-type': 'application/json' } })
}

function createQuote(code: string, codein: string, bid = '4.9842'): Record<string, string> {
  return {
    code,
    codein,
    name: `${code}/${codein}`,
    high: '4.9850',
    low: '4.9780',
    varBid: '-0.0007',
    pctChange: '-0.0140',
    bid,
    ask: '4.9872',
    timestamp: '1777954229',
    create_date: '2026-05-05 01:10:29',
  }
}
