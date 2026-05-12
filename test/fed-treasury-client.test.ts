import assert from 'node:assert/strict'
import test from 'node:test'
import { getFedTreasuryDebt, getFedTreasuryRates } from '../src/application/usecases/fedTreasury.js'
import { FedTreasuryClient, normalizeFedTreasuryDebtInput, normalizeFedTreasuryRatesInput } from '../src/infrastructure/openApis/fedTreasuryClient.js'
import { RuntimeFailure } from '../src/shared/errors/runtimeFailure.js'

test('Fed Treasury client reads debt and average rate JSON', async () => {
  const client = new FedTreasuryClient({
    fetchImpl: (async input => {
      const url = new URL(String(input))
      assert.equal(url.searchParams.get('page[size]'), '100')
      if (url.pathname.endsWith('/debt_to_penny')) {
        assert.equal(url.searchParams.get('fields'), 'record_date,tot_pub_debt_out_amt,intragov_hold_amt,debt_held_public_amt')
        assert.equal(url.searchParams.get('sort'), '-record_date')
        return jsonResponse(createDebtFixture())
      }
      assert.equal(url.pathname.endsWith('/avg_interest_rates'), true)
      assert.equal(url.searchParams.get('sort'), '-record_date,src_line_nbr')
      return jsonResponse(createRatesFixture())
    }) as typeof fetch,
  })

  const debt = await client.getDebt({ pageNumber: 1, pageSize: 100 })
  assert.equal(debt.rows[0]?.recordDate, '2026-04-30')
  assert.equal(debt.rows[0]?.totalPublicDebtOutstanding, 38967833861543.11)

  const rates = await client.getRates({ pageNumber: 1, pageSize: 100 })
  assert.equal(rates.rows[0]?.securityDescription, 'Treasury Bills')
  assert.equal(rates.rows[0]?.averageInterestRate, 3.702)
})

test('Fed Treasury usecases project TUI-ready JSON', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async input => {
    const url = new URL(String(input))
    return jsonResponse(url.pathname.endsWith('/debt_to_penny') ? createDebtFixture() : createRatesFixture())
  }) as typeof fetch

  try {
    const debt = await getFedTreasuryDebt({ pageSize: 100 })
    assert.equal(debt.kind, 'fedtreasury.debt')
    assert.equal(debt.api.authentication, 'none')
    assert.equal(debt.api.usesBrowserClickstream, false)
    assert.equal(debt.meta.maxPageSize, 100)
    assert.equal(debt.rows[0]?.debtHeldByPublic, 31272489865435.88)

    const rates = await getFedTreasuryRates({ pageSize: 100 })
    assert.equal(rates.kind, 'fedtreasury.rates')
    assert.equal(rates.api.authentication, 'none')
    assert.equal(rates.api.usesBrowserClickstream, false)
    assert.equal(rates.rows[0]?.securityDescription, 'Treasury Bills')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('Fed Treasury normalizers enforce bounds', () => {
  assert.deepEqual(normalizeFedTreasuryDebtInput({}), { pageNumber: 1, pageSize: 100 })
  assert.deepEqual(normalizeFedTreasuryDebtInput({ pageNumber: 2, pageSize: 1, recordDate: '2026-04-30' }), { pageNumber: 2, pageSize: 1, recordDate: '2026-04-30' })
  assert.deepEqual(normalizeFedTreasuryRatesInput({ securityDesc: ' Treasury Bills ' }), { pageNumber: 1, pageSize: 100, securityDesc: 'Treasury Bills' })
  assert.throws(() => normalizeFedTreasuryDebtInput({ pageNumber: 0 }), RuntimeFailure)
  assert.throws(() => normalizeFedTreasuryDebtInput({ pageSize: 101 }), RuntimeFailure)
  assert.throws(() => normalizeFedTreasuryRatesInput({ recordDate: '20260430' }), RuntimeFailure)
})

function jsonResponse(value: unknown): Response {
  return new Response(JSON.stringify(value), { status: 200, headers: { 'content-type': 'application/json' } })
}

function createDebtFixture(): Record<string, unknown> {
  return {
    meta: { count: 1, 'total-count': 8298, 'total-pages': 8298, labels: { record_date: 'Record Date' } },
    links: { next: '&page%5Bnumber%5D=2&page%5Bsize%5D=100' },
    data: [
      {
        record_date: '2026-04-30',
        tot_pub_debt_out_amt: '38967833861543.11',
        intragov_hold_amt: '7695343996107.23',
        debt_held_public_amt: '31272489865435.88',
      },
    ],
  }
}

function createRatesFixture(): Record<string, unknown> {
  return {
    meta: { count: 2, 'total-count': 4929, 'total-pages': 50, labels: { record_date: 'Record Date' } },
    links: { next: '&page%5Bnumber%5D=2&page%5Bsize%5D=100' },
    data: [
      { record_date: '2026-03-31', security_desc: 'Treasury Bills', avg_interest_rate_amt: '3.702', src_line_nbr: '1' },
      { record_date: '2026-03-31', security_desc: 'Treasury Notes', avg_interest_rate_amt: '3.212', src_line_nbr: '2' },
    ],
  }
}
