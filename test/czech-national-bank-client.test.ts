import assert from 'node:assert/strict'
import test from 'node:test'
import { getCzechNationalBankRates } from '../src/application/usecases/czechNationalBank.js'
import { CzechNationalBankClient, normalizeCzechNationalBankRatesInput } from '../src/infrastructure/openApis/czechNationalBankClient.js'
import { RuntimeFailure } from '../src/shared/errors/runtimeFailure.js'

test('Czech National Bank client reads documented daily XML without auth', async () => {
  const seen: string[] = []
  const client = new CzechNationalBankClient({
    fetchImpl: (async input => {
      const url = new URL(String(input))
      seen.push(`${url.pathname}${url.search}`)
      return xmlResponse(createDailyXml())
    }) as typeof fetch,
  })

  const rates = await client.rates(normalizeCzechNationalBankRatesInput({ code: 'eur', date: '2026-05-05', limit: 1 }))

  assert.deepEqual(seen, ['/cs/financni-trhy/devizovy-trh/kurzy-devizoveho-trhu/kurzy-devizoveho-trhu/denni_kurz.xml?date=05.05.2026'])
  assert.equal(rates.bank, 'CNB')
  assert.equal(rates.date, '05.05.2026')
  assert.deepEqual(rates.rates, [{ code: 'EUR', currency: 'euro', amount: 1, rate: 24.395, country: 'EMU' }])
})

test('Czech National Bank usecase projects XML data to TUI-ready JSON', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async () => xmlResponse(createDailyXml())) as typeof fetch
  try {
    const result = await getCzechNationalBankRates({ limit: 2 })
    assert.equal(result.kind, 'czechnationalbank.rates')
    assert.equal(result.api.authentication, 'none')
    assert.equal(result.api.usesBrowserClickstream, false)
    assert.equal(result.api.transport, 'HTTPS XML REST projected to JSON')
    assert.equal(result.pagination.maxLimit, 30)
    assert.equal(result.rates[1]?.code, 'USD')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('Czech National Bank client retries transient fetch failures', async () => {
  let attempts = 0
  const client = new CzechNationalBankClient({
    retryDelayMs: 1,
    fetchImpl: (async () => {
      attempts += 1
      if (attempts === 1) {
        throw new Error('temporary network reset')
      }
      return xmlResponse(createDailyXml())
    }) as typeof fetch,
  })

  const result = await client.rates(normalizeCzechNationalBankRatesInput({ code: 'USD', limit: 1 }))
  assert.equal(attempts, 2)
  assert.equal(result.rates[0]?.code, 'USD')
})

test('Czech National Bank normalizer enforces curated date, code, and limit bounds', () => {
  assert.equal(normalizeCzechNationalBankRatesInput({}).limit, 30)
  assert.equal(normalizeCzechNationalBankRatesInput({ code: 'usd' }).code, 'USD')
  assert.throws(() => normalizeCzechNationalBankRatesInput({ date: '05/05/2026' }), RuntimeFailure)
  assert.throws(() => normalizeCzechNationalBankRatesInput({ code: 'EU' }), RuntimeFailure)
  assert.throws(() => normalizeCzechNationalBankRatesInput({ limit: 31 }), RuntimeFailure)
})

function xmlResponse(value: string): Response {
  return new Response(value, { status: 200, headers: { 'content-type': 'application/xml; charset=utf-8' } })
}

function createDailyXml(): string {
  return '<?xml version="1.0" encoding="UTF-8"?><kurzy banka="CNB" datum="05.05.2026" poradi="85"><tabulka typ="XML_TYP_CNB_KURZY_DEVIZOVEHO_TRHU"><radek kod="EUR" mena="euro" mnozstvi="1" kurz="24,395" zeme="EMU"/><radek kod="USD" mena="dollar" mnozstvi="1" kurz="21,438" zeme="USA"/></tabulka></kurzy>'
}
