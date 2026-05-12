import assert from 'node:assert/strict'
import test from 'node:test'
import { getEnergiElspotPrices, getEnergiRightNow } from '../src/application/usecases/energiDataService.js'
import {
  EnergiDataServiceClient,
  normalizeEnergiElspotPricesInput,
  normalizeEnergiRightNowInput,
} from '../src/infrastructure/openApis/energiDataServiceClient.js'

test('Energi Data Service client calls dataset endpoints with filters and limits', async () => {
  const requests: string[] = []
  const client = new EnergiDataServiceClient({
    baseUrl: 'https://energi.test',
    fetchImpl: (async input => {
      const url = new URL(String(input))
      requests.push(url.href)
      if (url.pathname === '/dataset/PowerSystemRightNow') {
        assert.equal(url.searchParams.get('start'), 'now-PT15M')
        assert.equal(url.searchParams.get('limit'), '100')
        return jsonResponse(createRightNowBody(), { totalcalls: '40', remainingcalls: '39' })
      }
      assert.equal(url.pathname, '/dataset/Elspotprices')
      assert.equal(url.searchParams.get('filter'), '{"PriceArea":["DK1"]}')
      assert.equal(url.searchParams.get('sort'), 'HourUTC desc')
      assert.equal(url.searchParams.get('limit'), '5')
      return jsonResponse(createElspotBody(), { totalcalls: '40', remainingcalls: '38' })
    }) as typeof fetch,
  })

  const rightNow = await client.queryDataset({ dataset: 'PowerSystemRightNow', start: 'now-PT15M', limit: 100 })
  const elspot = await client.queryDataset({ dataset: 'Elspotprices', filter: { PriceArea: ['DK1'] }, sort: 'HourUTC desc', limit: 5 })

  assert.equal(requests.length, 2)
  assert.equal(rightNow.records.length, 1)
  assert.equal(rightNow.rateLimit.totalCalls, '40')
  assert.equal(elspot.dataset, 'Elspotprices')
  assert.equal(elspot.rateLimit.remainingCalls, '38')
})

test('Energi Data Service usecases project TUI-ready JSON', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async input => {
    const url = new URL(String(input))
    return url.pathname.includes('PowerSystemRightNow')
      ? jsonResponse(createRightNowBody(), { totalcalls: '40', remainingcalls: '39' })
      : jsonResponse(createElspotBody(), { totalcalls: '40', remainingcalls: '38' })
  }) as typeof fetch
  try {
    const rightNow = await getEnergiRightNow({ limit: 5 })
    assert.equal(rightNow.kind, 'energidataservice.rightnow')
    assert.equal(rightNow.api.authentication, 'none')
    assert.equal(rightNow.api.usesBrowserClickstream, false)
    assert.equal(rightNow.records[0]?.CO2Emission, 114.37)

    const elspot = await getEnergiElspotPrices({ priceArea: 'DK1', limit: 5 })
    assert.equal(elspot.kind, 'energidataservice.elspotprices')
    assert.equal(elspot.query.priceArea, 'DK1')
    assert.equal(elspot.records[0]?.SpotPriceEUR, 92.54)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('Energi Data Service normalizers enforce bounded CLI options', () => {
  assert.deepEqual(normalizeEnergiRightNowInput({}), { start: 'now-PT15M', limit: 100 })
  assert.deepEqual(normalizeEnergiElspotPricesInput({ priceArea: 'dk2', limit: 1 }), { priceArea: 'DK2', sort: 'HourUTC desc', limit: 1 })
  assert.throws(() => normalizeEnergiRightNowInput({ limit: 101 }), /--limit/u)
  assert.throws(() => normalizeEnergiElspotPricesInput({ priceArea: 'XX' }), /--price-area/u)
  assert.throws(() => normalizeEnergiElspotPricesInput({ start: '../bad' }), /--start/u)
})

function createRightNowBody(): Record<string, unknown> {
  return {
    total: 15,
    filters: '',
    limit: 100,
    dataset: 'PowerSystemRightNow',
    records: [
      {
        Minutes1UTC: '2026-05-03T19:15:00',
        Minutes1DK: '2026-05-03T21:15:00',
        CO2Emission: 114.37,
        ProductionGe100MW: 708.59,
        ProductionLt100MW: 467.9,
        SolarPower: 7.23,
        OffshoreWindPower: 374.96,
        OnshoreWindPower: 154.3,
        Exchange_Sum: 2310.19,
      },
    ],
  }
}

function createElspotBody(): Record<string, unknown> {
  return {
    total: 230124,
    filters: '{"PriceArea":["DK1"]}',
    sort: 'HourUTC desc',
    limit: 5,
    dataset: 'Elspotprices',
    records: [
      {
        HourUTC: '2025-09-30T21:00:00',
        HourDK: '2025-09-30T23:00:00',
        PriceArea: 'DK1',
        SpotPriceDKK: 690.700059,
        SpotPriceEUR: 92.54,
      },
    ],
  }
}

function jsonResponse(body: unknown, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json', ...headers },
  })
}
