import assert from 'node:assert/strict'
import test from 'node:test'
import { getBankOfRussiaHistory, getBankOfRussiaRates } from '../src/application/usecases/bankOfRussia.js'
import { BankOfRussiaClient, normalizeBankOfRussiaHistoryInput, normalizeBankOfRussiaRatesInput } from '../src/infrastructure/openApis/bankOfRussiaClient.js'
import { RuntimeFailure } from '../src/shared/errors/runtimeFailure.js'

test('Bank of Russia client reads daily and dynamic XML without auth', async () => {
  const seen: string[] = []
  const client = new BankOfRussiaClient({
    fetchImpl: (async input => {
      const url = new URL(String(input))
      seen.push(`${url.pathname}${url.search}`)
      if (url.pathname.endsWith('/XML_dynamic.asp')) return xmlResponse(createDynamicXml())
      return xmlResponse(createDailyXml())
    }) as typeof fetch,
  })

  const rates = await client.rates(normalizeBankOfRussiaRatesInput({ code: 'USD', date: '2026-05-05', limit: 1 }))
  const history = await client.history(normalizeBankOfRussiaHistoryInput({ code: 'USD', from: '2026-05-01', to: '2026-05-05', limit: 2 }))

  assert.deepEqual(seen, [
    '/scripts/XML_daily.asp?date_req=05%2F05%2F2026',
    '/scripts/XML_daily.asp',
    '/scripts/XML_dynamic.asp?date_req1=01%2F05%2F2026&date_req2=05%2F05%2F2026&VAL_NM_RQ=R01235',
  ])
  assert.equal(rates.rates[0]?.charCode, 'USD')
  assert.equal(rates.rates[0]?.value, 75.4388)
  assert.equal(history.records.length, 2)
  assert.equal(history.records[1]?.unitRate, 75.4388)
})

test('Bank of Russia usecases project XML data to TUI-ready JSON', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async input => {
    const url = new URL(String(input))
    return url.pathname.endsWith('/XML_dynamic.asp') ? xmlResponse(createDynamicXml()) : xmlResponse(createDailyXml())
  }) as typeof fetch
  try {
    const rates = await getBankOfRussiaRates({ limit: 2 })
    const history = await getBankOfRussiaHistory({ code: 'USD', from: '2026-05-01', to: '2026-05-05', limit: 2 })
    assert.equal(rates.kind, 'bankofrussia.rates')
    assert.equal(rates.api.authentication, 'none')
    assert.equal(rates.api.usesBrowserClickstream, false)
    assert.equal(rates.pagination.maxLimit, 54)
    assert.equal(history.kind, 'bankofrussia.history')
    assert.equal(history.records.length, 2)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('Bank of Russia normalizers enforce curated date, code, and limit bounds', () => {
  assert.equal(normalizeBankOfRussiaRatesInput({}).limit, 54)
  assert.equal(normalizeBankOfRussiaHistoryInput({ code: 'usd', from: '2026-05-01', to: '2026-05-05' }).code, 'USD')
  assert.throws(() => normalizeBankOfRussiaRatesInput({ date: '05/05/2026' }), RuntimeFailure)
  assert.throws(() => normalizeBankOfRussiaRatesInput({ code: 'US' }), RuntimeFailure)
  assert.throws(() => normalizeBankOfRussiaRatesInput({ limit: 55 }), RuntimeFailure)
  assert.throws(() => normalizeBankOfRussiaHistoryInput({ limit: 61 }), RuntimeFailure)
  assert.throws(() => normalizeBankOfRussiaHistoryInput({ from: '2026-05-08', to: '2026-05-01' }), RuntimeFailure)
})

function xmlResponse(value: string): Response {
  return new Response(value, { status: 200, headers: { 'content-type': 'application/xml; charset=windows-1251' } })
}

function createDailyXml(): string {
  return '<?xml version="1.0" encoding="windows-1251"?><ValCurs Date="05.05.2026" name="Foreign Currency Market"><Valute ID="R01235"><NumCode>840</NumCode><CharCode>USD</CharCode><Nominal>1</Nominal><Name>Доллар США</Name><Value>75,4388</Value><VunitRate>75,4388</VunitRate></Valute><Valute ID="R01239"><NumCode>978</NumCode><CharCode>EUR</CharCode><Nominal>1</Nominal><Name>Евро</Name><Value>88,2651</Value><VunitRate>88,2651</VunitRate></Valute></ValCurs>'
}

function createDynamicXml(): string {
  return '<?xml version="1.0" encoding="windows-1251"?><ValCurs ID="R01235" DateRange1="01.05.2026" DateRange2="05.05.2026" name="Foreign Currency Market Dynamic"><Record Date="01.05.2026" Id="R01235"><Nominal>1</Nominal><Value>74,8014</Value><VunitRate>74,8014</VunitRate></Record><Record Date="05.05.2026" Id="R01235"><Nominal>1</Nominal><Value>75,4388</Value><VunitRate>75,4388</VunitRate></Record></ValCurs>'
}
