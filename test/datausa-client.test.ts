import assert from 'node:assert/strict'
import test from 'node:test'
import { getDataUsaPopulation, listDataUsaGeographies } from '../src/application/usecases/dataUsa.js'
import { DataUsaClient, normalizeDataUsaGeographiesInput, normalizeDataUsaPopulationInput } from '../src/infrastructure/openApis/dataUsaClient.js'
import { RuntimeFailure } from '../src/shared/errors/runtimeFailure.js'

test('Data USA client reads population and geography JSON', async () => {
  const client = new DataUsaClient({
    fetchImpl: (async input => {
      const url = new URL(String(input))
      if (url.pathname === '/tesseract/data.jsonrecords') {
        assert.equal(url.searchParams.get('cube'), 'acs_yg_total_population_5')
        assert.equal(url.searchParams.get('drilldowns'), 'State,Year')
        assert.equal(url.searchParams.get('measures'), 'Population')
        assert.equal(url.searchParams.get('time'), 'Year.latest')
        assert.equal(url.searchParams.get('limit'), '100,0')
        return jsonResponse(createPopulationFixture())
      }
      assert.equal(url.pathname, '/tesseract/members')
      assert.equal(url.searchParams.get('level'), 'State')
      return jsonResponse(createGeographiesFixture())
    }) as typeof fetch,
  })

  const population = await client.getPopulation({ drilldown: 'State', year: 'latest', limit: 100, offset: 0 })
  assert.equal(population.rows[0]?.geography, 'California')
  assert.equal(population.page.total, 1)

  const geographies = await client.listGeographies({ level: 'State', query: 'cali', limit: 100 })
  assert.equal(geographies.members.length, 1)
  assert.equal(geographies.members[0]?.key, '04000US06')
})

test('Data USA usecases project TUI-ready JSON', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async input => {
    const url = new URL(String(input))
    return jsonResponse(url.pathname === '/tesseract/data.jsonrecords' ? createPopulationFixture() : createGeographiesFixture())
  }) as typeof fetch

  try {
    const population = await getDataUsaPopulation({ drilldown: 'State', year: 'latest', geographyId: '04000US06' })
    assert.equal(population.kind, 'datausa.population')
    assert.equal(population.api.authentication, 'none')
    assert.equal(population.api.usesBrowserClickstream, false)
    assert.equal(population.source.sourceName, 'Census Bureau')
    assert.equal(population.rows[0]?.population, 39287377)

    const geographies = await listDataUsaGeographies({ level: 'State', query: 'california' })
    assert.equal(geographies.kind, 'datausa.geographies')
    assert.equal(geographies.api.authentication, 'none')
    assert.equal(geographies.api.usesBrowserClickstream, false)
    assert.equal(geographies.pagination.maxLimit, 100)
    assert.equal(geographies.members[0]?.caption, 'California')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('Data USA normalizers enforce curated bounds', () => {
  assert.deepEqual(normalizeDataUsaPopulationInput({}), { drilldown: 'State', year: 'latest', limit: 100, offset: 0 })
  assert.deepEqual(normalizeDataUsaPopulationInput({ drilldown: 'nation', year: 2024, geographyId: ' 01000US ', limit: 1, offset: 2 }), { drilldown: 'Nation', year: '2024', geographyId: '01000US', limit: 1, offset: 2 })
  assert.deepEqual(normalizeDataUsaGeographiesInput({ query: ' ca ', limit: 5 }), { level: 'State', query: 'ca', limit: 5 })
  assert.throws(() => normalizeDataUsaPopulationInput({ drilldown: 'County' }), RuntimeFailure)
  assert.throws(() => normalizeDataUsaPopulationInput({ year: '202' }), RuntimeFailure)
  assert.throws(() => normalizeDataUsaGeographiesInput({ limit: 101 }), RuntimeFailure)
})

function jsonResponse(value: unknown): Response {
  return new Response(JSON.stringify(value), { status: 200, headers: { 'content-type': 'application/json' } })
}

function createPopulationFixture(): Record<string, unknown> {
  return {
    annotations: {
      dataset_name: 'ACS 5-year Estimate',
      source_name: 'Census Bureau',
      topic: 'Diversity',
      table_id: 'B01003',
    },
    page: { limit: 100, offset: 0, total: 1 },
    columns: ['State ID', 'State', 'Year', 'Population'],
    data: [
      { 'State ID': '04000US06', State: 'California', Year: 2024, Population: 39287377 },
    ],
  }
}

function createGeographiesFixture(): Record<string, unknown> {
  return {
    name: 'State',
    caption: 'State',
    depth: 1,
    members: [
      { key: '', caption: '' },
      { key: '04000US06', caption: 'California' },
      { key: '04000US36', caption: 'New York' },
    ],
  }
}
