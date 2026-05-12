import assert from 'node:assert/strict'
import test from 'node:test'
import { getBnmExchangeRates, getBnmKijangEmas, getBnmOpr } from '../src/application/usecases/bankNegaraMalaysia.js'
import {
  BNM_ACCEPT_HEADER,
  BankNegaraMalaysiaClient,
  normalizeBnmExchangeRatesInput,
} from '../src/infrastructure/openApis/bankNegaraMalaysiaClient.js'
import { RuntimeFailure } from '../src/shared/errors/runtimeFailure.js'

test('Bank Negara Malaysia client reads OPR, exchange rates, and Kijang Emas JSON', async () => {
  const client = new BankNegaraMalaysiaClient({
    fetchImpl: (async (input, init) => {
      const url = new URL(String(input))
      assert.equal((init?.headers as Record<string, string>).accept, BNM_ACCEPT_HEADER)
      if (url.pathname === '/public/opr') return jsonResponse(createOprFixture())
      if (url.pathname === '/public/kijang-emas') return jsonResponse(createKijangEmasFixture())
      return jsonResponse(url.pathname.endsWith('/USD') ? createUsdExchangeRateFixture() : createExchangeRatesFixture())
    }) as typeof fetch,
  })

  const opr = await client.getOpr()
  assert.equal(opr.data.newOprLevel, 2.75)
  const rates = await client.getExchangeRates({ limit: 2 })
  assert.equal(rates.data.length, 2)
  const usd = await client.getExchangeRates({ currencyCode: 'USD', limit: 27 })
  assert.equal(usd.data[0]?.currencyCode, 'USD')
  const gold = await client.getKijangEmas()
  assert.equal(gold.data.oneOz?.selling, 19149)
})

test('Bank Negara Malaysia usecases project TUI-ready JSON', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async input => {
    const url = new URL(String(input))
    if (url.pathname === '/public/opr') return jsonResponse(createOprFixture())
    if (url.pathname === '/public/kijang-emas') return jsonResponse(createKijangEmasFixture())
    return jsonResponse(createExchangeRatesFixture())
  }) as typeof fetch

  try {
    const opr = await getBnmOpr()
    assert.equal(opr.kind, 'banknegaramalaysia.opr')
    assert.equal(opr.api.authentication, 'none')
    assert.equal(opr.api.usesBrowserClickstream, false)

    const rates = await getBnmExchangeRates({ limit: 2 })
    assert.equal(rates.kind, 'banknegaramalaysia.exchangeRates')
    assert.equal(rates.pagination.maxLimit, 27)
    assert.equal(rates.rates.length, 2)

    const gold = await getBnmKijangEmas()
    assert.equal(gold.kind, 'banknegaramalaysia.kijangEmas')
    assert.equal(gold.kijangEmas.effectiveDate, '2026-04-30')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('Bank Negara Malaysia normalizer validates currency and limit', () => {
  assert.deepEqual(normalizeBnmExchangeRatesInput({}), { limit: 27 })
  assert.deepEqual(normalizeBnmExchangeRatesInput({ currencyCode: 'usd', limit: 1 }), { currencyCode: 'USD', limit: 1 })
  assert.throws(() => normalizeBnmExchangeRatesInput({ currencyCode: 'US' }), RuntimeFailure)
  assert.throws(() => normalizeBnmExchangeRatesInput({ limit: 28 }), RuntimeFailure)
})

function jsonResponse(value: unknown): Response {
  return new Response(JSON.stringify(value), { status: 200, headers: { 'content-type': 'application/json' } })
}

function createOprFixture(): Record<string, unknown> {
  return {
    data: { year: 2026, date: '2026-03-05', change_in_opr: 0, new_opr_level: 2.75 },
    meta: { last_updated: '2026-03-05 15:02:15', total_result: 1 },
  }
}

function createExchangeRatesFixture(): Record<string, unknown> {
  return {
    data: [
      { currency_code: 'CHF', unit: 1, rate: { date: '2026-04-30', buying_rate: 5.0253, selling_rate: 5.0329, middle_rate: 5.0291 } },
      { currency_code: 'USD', unit: 1, rate: { date: '2026-04-30', buying_rate: 3.945, selling_rate: 3.97, middle_rate: null } },
    ],
    meta: { quote: 'rm', session: '1130', last_updated: '2026-04-30 23:01:23', total_result: 27 },
  }
}

function createUsdExchangeRateFixture(): Record<string, unknown> {
  return {
    data: { currency_code: 'USD', unit: 1, rate: { date: '2026-04-30', buying_rate: 3.945, selling_rate: 3.97, middle_rate: null } },
    meta: { quote: 'rm', session: '1130', last_updated: '2026-04-30 23:01:23', total_result: 1 },
  }
}

function createKijangEmasFixture(): Record<string, unknown> {
  return {
    data: {
      effective_date: '2026-04-30',
      one_oz: { buying: 18396, selling: 19149 },
      half_oz: { buying: 9198, selling: 9755 },
      quarter_oz: { buying: 4599, selling: 4968 },
    },
    meta: { last_updated: '2026-04-30 01:00:04', total_result: 1 },
  }
}
