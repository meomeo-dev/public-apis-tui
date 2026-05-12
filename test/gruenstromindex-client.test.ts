import assert from 'node:assert/strict'
import test from 'node:test'
import { getGruenstromIndexForecast } from '../src/application/usecases/gruenstromindex.js'
import { GruenstromIndexClient, normalizeGruenstromIndexForecastInput } from '../src/infrastructure/openApis/gruenstromindexClient.js'
import { RuntimeFailure } from '../src/shared/errors/runtimeFailure.js'

test('GrünstromIndex client reads forecast JSON', async () => {
  const client = new GruenstromIndexClient({
    fetchImpl: (async input => {
      const url = new URL(String(input))
      assert.equal(url.pathname, '/v2.0/gsi/prediction')
      assert.equal(url.searchParams.get('zip'), '69168')
      return jsonResponse(createForecastFixture())
    }) as typeof fetch,
  })

  const result = await client.getForecast({ zip: '69168', limit: 2 })
  assert.equal(result.forecast.length, 2)
  assert.equal(result.forecast[0]?.gsi, 0.95)
  assert.equal(result.forecast[0]?.energyprice, -0.0005)
  assert.equal(result.provisioning?.license, 'CC BY-NC-SA 4.0')
})

test('GrünstromIndex usecase projects TUI-ready JSON', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async () => jsonResponse(createForecastFixture())) as typeof fetch

  try {
    const result = await getGruenstromIndexForecast({ zip: '69168', limit: 2 })
    assert.equal(result.kind, 'gruenstromindex.forecast')
    assert.equal(result.api.provider, 'gruenstromindex')
    assert.equal(result.api.authentication, 'none')
    assert.equal(result.api.usesBrowserClickstream, false)
    assert.equal(result.pagination.maxLimit, 98)
    assert.equal(result.forecast.length, 2)
    assert.equal(result.summary.best?.gsi, 12.35)
    assert.equal(result.summary.worst?.gsi, 0.95)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('GrünstromIndex normalizer enforces German postal code and max observed rows', () => {
  assert.deepEqual(normalizeGruenstromIndexForecastInput({}), { zip: '69168', limit: 98 })
  assert.deepEqual(normalizeGruenstromIndexForecastInput({ zip: ' 10115 ', limit: 5 }), { zip: '10115', limit: 5 })
  assert.throws(() => normalizeGruenstromIndexForecastInput({ zip: 'ABCDE' }), RuntimeFailure)
  assert.throws(() => normalizeGruenstromIndexForecastInput({ limit: 99 }), RuntimeFailure)
})

function jsonResponse(value: unknown): Response {
  return new Response(JSON.stringify(value), { status: 200, headers: { 'content-type': 'application/json' } })
}

function createForecastFixture(): Record<string, unknown> {
  return {
    support: 'dev@stromdao.com',
    documentation: 'https://corrently.io/books/grunstromindex',
    forecast: [
      {
        epochtime: 1777842000,
        eevalue: 1,
        ewind: 0,
        esolar: 0,
        sci: 25,
        gsi: 0.95,
        timeStamp: 1777842000000,
        energyprice: '-0.0005000',
        co2_avg: 342,
        co2_g_standard: 373,
        co2_g_oekostrom: 64,
        timeframe: { start: 1777842000000, end: 1777845600000 },
        zip: '69168',
      },
      {
        epochtime: 1777845600,
        eevalue: 13,
        ewind: 12,
        esolar: 0,
        sci: 25,
        gsi: 12.35,
        timeStamp: 1777845600000,
        energyprice: '-0.0065000',
        co2_avg: 342,
        co2_g_standard: 334,
        co2_g_oekostrom: 58,
        timeframe: { start: 1777845600000, end: 1777849200000 },
        zip: '69168',
      },
    ],
    provisioning: {
      license: 'CC BY-NC-SA 4.0',
      tier: 'anonymous',
      info: 'Anonymous access',
    },
  }
}
