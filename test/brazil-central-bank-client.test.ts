import assert from 'node:assert/strict'
import test from 'node:test'
import { getBrazilCentralBankSgsLatest, searchBrazilCentralBankDatasets } from '../src/application/usecases/brazilCentralBank.js'
import {
  BrazilCentralBankClient,
  normalizeBrazilCentralBankDatasetsInput,
  normalizeBrazilCentralBankSgsLatestInput,
} from '../src/infrastructure/openApis/brazilCentralBankClient.js'
import { RuntimeFailure } from '../src/shared/errors/runtimeFailure.js'

test('Brazil Central Bank client reads CKAN datasets and SGS JSON', async () => {
  const client = new BrazilCentralBankClient({
    fetchImpl: (async input => {
      const url = new URL(String(input))
      if (url.hostname === 'dadosabertos.bcb.gov.br') {
        assert.equal(url.pathname, '/api/3/action/package_search')
        assert.equal(url.searchParams.get('q'), 'selic')
        assert.equal(url.searchParams.get('rows'), '100')
        assert.equal(url.searchParams.get('start'), '0')
        return jsonResponse(createDatasetsFixture())
      }

      assert.equal(url.hostname, 'api.bcb.gov.br')
      assert.equal(url.pathname, '/dados/serie/bcdata.sgs.11/dados/ultimos/20')
      assert.equal(url.searchParams.get('formato'), 'json')
      return jsonResponse(createSgsFixture())
    }) as typeof fetch,
  })

  const datasets = await client.searchDatasets({ query: 'selic', rows: 100, start: 0 })
  assert.equal(datasets.count, 1)
  assert.equal(datasets.datasets[0]?.name, 'estatisticas-selic-operacoes')
  assert.equal(datasets.datasets[0]?.tags[0], 'selic')

  const observations = await client.getSgsLatest({ seriesCode: 11, limit: 20 })
  assert.equal(observations[0]?.date, '30/04/2026')
  assert.equal(observations[0]?.value, 0.0534)
})

test('Brazil Central Bank usecases project TUI-ready JSON', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async input => {
    const url = new URL(String(input))
    return jsonResponse(url.hostname === 'dadosabertos.bcb.gov.br' ? createDatasetsFixture() : createSgsFixture())
  }) as typeof fetch

  try {
    const datasets = await searchBrazilCentralBankDatasets({ query: 'selic' })
    assert.equal(datasets.kind, 'brazilcentralbank.datasets')
    assert.equal(datasets.api.authentication, 'none')
    assert.equal(datasets.api.usesBrowserClickstream, false)
    assert.equal(datasets.pagination.maxRows, 100)
    assert.equal(datasets.datasets[0]?.organization, 'Banco Central do Brasil')

    const latest = await getBrazilCentralBankSgsLatest({ seriesCode: 11 })
    assert.equal(latest.kind, 'brazilcentralbank.sgsLatest')
    assert.equal(latest.api.authentication, 'none')
    assert.equal(latest.api.usesBrowserClickstream, false)
    assert.equal(latest.series.name, 'SELIC overnight rate')
    assert.equal(latest.observations[0]?.rawValue, '0.053400')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('Brazil Central Bank normalizers enforce curated bounds', () => {
  assert.deepEqual(normalizeBrazilCentralBankDatasetsInput({}), { query: 'selic', rows: 100, start: 0 })
  assert.deepEqual(normalizeBrazilCentralBankDatasetsInput({ query: ' cambio ', rows: 1, start: 2 }), { query: 'cambio', rows: 1, start: 2 })
  assert.deepEqual(normalizeBrazilCentralBankSgsLatestInput({ seriesCode: 432, limit: 5 }), { seriesCode: 432, limit: 5 })
  assert.throws(() => normalizeBrazilCentralBankDatasetsInput({ rows: 101 }), RuntimeFailure)
  assert.throws(() => normalizeBrazilCentralBankDatasetsInput({ start: -1 }), RuntimeFailure)
  assert.throws(() => normalizeBrazilCentralBankSgsLatestInput({ seriesCode: 0 }), RuntimeFailure)
  assert.throws(() => normalizeBrazilCentralBankSgsLatestInput({ limit: 101 }), RuntimeFailure)
})

function jsonResponse(value: unknown): Response {
  return new Response(JSON.stringify(value), { status: 200, headers: { 'content-type': 'application/json' } })
}

function createDatasetsFixture(): Record<string, unknown> {
  return {
    success: true,
    result: {
      count: 1,
      results: [
        {
          id: '2e5311b0-a4b5-4b03-a5ce-6db362cb719f',
          name: 'estatisticas-selic-operacoes',
          title: 'Estatísticas Selic',
          notes: 'Informações e estatísticas de operações registradas no Sistema Especial de Liquidação e de Custódia.',
          metadata_modified: '2026-04-30T20:03:02.002192',
          num_resources: 12,
          organization: { title: 'Banco Central do Brasil' },
          tags: [{ name: 'selic' }, { name: 'mercado aberto' }],
        },
      ],
    },
  }
}

function createSgsFixture(): unknown[] {
  return [
    { data: '30/04/2026', valor: '0.053400' },
    { data: '29/04/2026', valor: '0.054266' },
  ]
}
