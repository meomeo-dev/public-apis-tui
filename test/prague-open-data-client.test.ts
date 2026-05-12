import assert from 'node:assert/strict'
import test from 'node:test'
import {
  PragueOpenDataClient,
  PRAGUE_OPEN_DATA_DEFAULT_CATALOG_URL,
  PRAGUE_OPEN_DATA_DEFAULT_DATASET_IRI,
  normalizePragueOpenDataDatasetInput,
  normalizePragueOpenDataDatasetsInput,
} from '../src/infrastructure/openApis/pragueOpenDataClient.js'
import { listPragueOpenDataDatasets, showPragueOpenDataDataset } from '../src/application/usecases/pragueOpenData.js'

test('Prague Open Data client reads LKOD catalog and dataset JSON-LD', async () => {
  const requested: string[] = []
  const client = new PragueOpenDataClient({
    fetchImpl: async input => {
      const url = String(input)
      requested.push(url)
      if (url === PRAGUE_OPEN_DATA_DEFAULT_CATALOG_URL) {
        return jsonResponse(createCatalogFixture())
      }
      if (url.endsWith('/dataset-transport')) {
        return jsonResponse(createDatasetFixture())
      }
      if (url.endsWith('/dataset-water')) {
        return jsonResponse({
          ...createDatasetFixture(),
          iri: 'https://api.lkod.cz/lod/catalog/dataset-water',
          'název': { cs: 'Vodní plochy' },
          popis: { cs: 'Seznam vodních ploch' },
          'klíčové_slovo': { cs: ['voda'] },
        })
      }
      return jsonResponse({ error_message: 'missing' }, { status: 404 })
    },
  })

  const search = await client.listDatasets({ query: 'doprava', limit: 5 })
  assert.equal(search.total, 2)
  assert.equal(search.matched, 1)
  assert.equal(search.results[0]?.title, 'Jízdní řády')
  assert.equal(search.results[0]?.distributions[0]?.format, 'GTFS')
  assert.deepEqual(search.results[0]?.keywords, ['doprava', 'veřejná doprava'])

  const dataset = await client.showDataset({ datasetIri: 'https://api.lkod.cz/lod/catalog/dataset-transport' })
  assert.equal(dataset.id, 'dataset-transport')
  assert.equal(dataset.distributions[0]?.accessUrl, 'https://opendata.iprpraha.cz/DPP/JR/jrdata.zip')
  assert.equal(dataset.distributions[0]?.containsPersonalData, 'https://data.gov.cz/podmínky-užití/neobsahuje-osobní-údaje/')
  assert.deepEqual(requested, [PRAGUE_OPEN_DATA_DEFAULT_CATALOG_URL, 'https://api.lkod.cz/lod/catalog/dataset-transport', 'https://api.lkod.cz/lod/catalog/dataset-water', 'https://api.lkod.cz/lod/catalog/dataset-transport'])
})

test('Prague Open Data usecases expose no-auth metadata and normalized query', async () => {
  const normalizedSearch = normalizePragueOpenDataDatasetsInput({ query: ' doprava ', limit: 1 })
  assert.deepEqual(normalizedSearch, { query: 'doprava', limit: 1 })

  const normalizedDataset = normalizePragueOpenDataDatasetInput({ datasetIri: PRAGUE_OPEN_DATA_DEFAULT_DATASET_IRI })
  assert.equal(normalizedDataset.datasetIri, PRAGUE_OPEN_DATA_DEFAULT_DATASET_IRI)

  assert.throws(() => normalizePragueOpenDataDatasetsInput({ query: 'x' }), /--query must be between 2 and 120 characters/)
  assert.throws(() => normalizePragueOpenDataDatasetsInput({ limit: 390 }), /--limit must be an integer between 1 and 389/)
  assert.throws(() => normalizePragueOpenDataDatasetInput({ datasetIri: 'https://example.com/dataset' }), /--dataset-iri must be a Prague LKOD public dataset IRI/)
})

test('Prague Open Data application results include stable API contract', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = async input => {
    const url = String(input)
    if (url === PRAGUE_OPEN_DATA_DEFAULT_CATALOG_URL) {
      return jsonResponse(createCatalogFixture())
    }
    return jsonResponse(createDatasetFixture())
  }
  try {
    const datasets = await listPragueOpenDataDatasets({ query: 'doprava', limit: 1 })
    assert.equal(datasets.kind, 'pragueopendata.datasets')
    assert.equal(datasets.api.provider, 'pragueopendata')
    assert.equal(datasets.api.authentication, 'none')
    assert.equal(datasets.api.usesBrowserClickstream, false)
    assert.equal(datasets.pagination.maxLimit, 389)

    const dataset = await showPragueOpenDataDataset({ datasetIri: 'https://api.lkod.cz/lod/catalog/dataset-transport' })
    assert.equal(dataset.kind, 'pragueopendata.dataset')
    assert.equal(dataset.query.datasetIri, 'https://api.lkod.cz/lod/catalog/dataset-transport')
    assert.equal(dataset.count, 1)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('Prague Open Data client surfaces Cloudflare challenge HTML clearly', async () => {
  const client = new PragueOpenDataClient({
    fetchImpl: (async () =>
      new Response('<!DOCTYPE html><title>Just a moment...</title>', {
        status: 403,
        headers: {
          'content-type': 'text/html; charset=UTF-8',
          server: 'cloudflare',
          'cf-mitigated': 'challenge',
        },
      })) as typeof fetch,
  })

  await assert.rejects(() => client.fetchCatalog(), /Cloudflare challenge HTML page/u)
})

function createCatalogFixture(): Record<string, unknown> {
  return {
    iri: PRAGUE_OPEN_DATA_DEFAULT_CATALOG_URL,
    typ: 'Katalog',
    'název': { cs: 'Katalog otevřených dat Golemio' },
    popis: { cs: 'Katalog otevřených dat hlavního města Prahy.' },
    'domovská_stránka': 'https://opendata.praha.eu',
    'datová_sada': ['https://api.lkod.cz/lod/catalog/dataset-transport', 'https://api.lkod.cz/lod/catalog/dataset-water'],
  }
}

function createDatasetFixture(): Record<string, unknown> {
  return {
    iri: 'https://api.lkod.cz/lod/catalog/dataset-transport',
    typ: 'Datová sada',
    'název': { cs: 'Jízdní řády' },
    popis: { cs: 'Aktuální jízdní řády sítě linek PID.' },
    poskytovatel: 'https://api.lkod.cz/organization/dpp',
    'téma': ['http://publications.europa.eu/resource/authority/data-theme/TRAN'],
    'klíčové_slovo': { cs: ['doprava', 'veřejná doprava'], en: [] },
    'časové_pokrytí': { typ: 'Časový interval', 'začátek': '2020-06-24', konec: '2020-07-04' },
    distribuce: [
      {
        iri: 'https://api.lkod.cz/lod/catalog/dataset-transport/distributions/gtfs.zip',
        typ: 'Distribuce',
        'název': { cs: 'Jízdní řády GTFS' },
        'formát': 'http://publications.europa.eu/resource/authority/file-type/GTFS',
        'typ_média': 'http://www.iana.org/assignments/media-types/application/zip',
        'přístupové_url': 'https://opendata.iprpraha.cz/DPP/JR/jrdata.zip',
        'soubor_ke_stažení': 'https://opendata.iprpraha.cz/DPP/JR/jrdata.zip',
        'podmínky_užití': {
          typ: 'Specifikace podmínek užití',
          'osobní_údaje': 'https://data.gov.cz/podmínky-užití/neobsahuje-osobní-údaje/',
        },
      },
    ],
  }
}

function jsonResponse(body: unknown, init: { status?: number | undefined } = {}): Response {
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: { 'content-type': 'application/ld+json; charset=utf-8' },
  })
}
