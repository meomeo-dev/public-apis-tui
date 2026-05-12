import assert from 'node:assert/strict'
import test from 'node:test'
import { getNbpHistory, getNbpTable } from '../src/application/usecases/nbp.js'
import { NbpClient, normalizeNbpHistoryInput, normalizeNbpTableInput } from '../src/infrastructure/openApis/nbpClient.js'
import { RuntimeFailure } from '../src/shared/errors/runtimeFailure.js'

test('NBP client reads table and history JSON without auth', async () => {
  const seen: string[] = []
  const client = new NbpClient({
    fetchImpl: (async input => {
      const url = new URL(String(input))
      seen.push(`${url.pathname}${url.search}`)
      if (url.pathname.includes('/rates/')) return jsonResponse(createHistoryFixture())
      return jsonResponse([createTableFixture()])
    }) as typeof fetch,
  })

  const table = await client.table(normalizeNbpTableInput({ table: 'a', code: 'usd', limit: 1 }))
  const history = await client.history(normalizeNbpHistoryInput({ table: 'a', code: 'usd', count: 2 }))

  assert.deepEqual(seen, [
    '/api/exchangerates/tables/a/?format=json',
    '/api/exchangerates/rates/a/usd/last/2/?format=json',
  ])
  assert.equal(table.rates[0]?.code, 'USD')
  assert.equal(table.rates[0]?.mid, 3.6303)
  assert.equal(history.rates.length, 2)
})

test('NBP usecases project no-auth TUI-ready metadata', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async input => {
    const url = new URL(String(input))
    return url.pathname.includes('/rates/') ? jsonResponse(createHistoryFixture()) : jsonResponse([createTableFixture()])
  }) as typeof fetch
  try {
    const table = await getNbpTable({})
    const history = await getNbpHistory({ code: 'USD', count: 2 })
    assert.equal(table.kind, 'nbp.tables')
    assert.equal(table.api.authentication, 'none')
    assert.equal(table.api.usesBrowserClickstream, false)
    assert.equal(table.pagination.maxLimit, 120)
    assert.equal(history.kind, 'nbp.history')
    assert.equal(history.pagination.maxCount, 93)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('NBP normalizers enforce curated table, code, and count bounds', () => {
  assert.equal(normalizeNbpTableInput({}).limit, 120)
  assert.equal(normalizeNbpHistoryInput({ code: 'eur' }).code, 'EUR')
  assert.throws(() => normalizeNbpTableInput({ table: 'D' }), RuntimeFailure)
  assert.throws(() => normalizeNbpTableInput({ code: 'US' }), RuntimeFailure)
  assert.throws(() => normalizeNbpTableInput({ limit: 121 }), RuntimeFailure)
  assert.throws(() => normalizeNbpHistoryInput({ count: 94 }), RuntimeFailure)
})

function jsonResponse(value: unknown): Response {
  return new Response(JSON.stringify(value), { status: 200, headers: { 'content-type': 'application/json' } })
}

function createTableFixture(): Record<string, unknown> {
  return {
    table: 'A',
    no: '084/A/NBP/2026',
    effectiveDate: '2026-05-04',
    rates: [
      { currency: 'dolar amerykański', code: 'USD', mid: 3.6303 },
      { currency: 'euro', code: 'EUR', mid: 4.2607 },
    ],
  }
}

function createHistoryFixture(): Record<string, unknown> {
  return {
    table: 'A',
    currency: 'dolar amerykański',
    code: 'USD',
    rates: [
      { no: '083/A/NBP/2026', effectiveDate: '2026-05-01', mid: 3.6123 },
      { no: '084/A/NBP/2026', effectiveDate: '2026-05-04', mid: 3.6303 },
    ],
  }
}
