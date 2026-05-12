import assert from 'node:assert/strict'
import test from 'node:test'
import { listGeoApiCommunes, listGeoApiDepartments, listGeoApiRegions } from '../src/application/usecases/geoApi.js'
import {
  GEO_API_COMMUNE_FIELDS,
  GEO_API_COMMUNE_GEOMETRY_FIELDS,
  GeoApiClient,
  normalizeGeoApiCommunesInput,
  normalizeGeoApiDepartmentsInput,
  normalizeGeoApiRegionsInput,
} from '../src/infrastructure/openApis/geoApiClient.js'

const communeFixture = [{
  nom: 'Paris',
  code: '75056',
  codesPostaux: ['75001', '75002'],
  centre: { type: 'Point', coordinates: [2.347, 48.8589] },
  population: 2103778,
  _score: 9.5,
  departement: { code: '75', nom: 'Paris' },
  region: { code: '11', nom: 'Île-de-France' },
}]

const departmentFixture = [{ nom: 'Paris', code: '75', region: { code: '11', nom: 'Île-de-France' } }]
const regionFixture = [{ nom: 'Île-de-France', code: '11' }]

test('GeoApi client calls communes, departments, and regions JSON endpoints', async () => {
  const requests: string[] = []
  const client = new GeoApiClient({
    baseUrl: 'https://geo.test',
    fetchImpl: (async input => {
      const url = new URL(String(input))
      requests.push(url.href)
      if (url.pathname.includes('departements')) return jsonResponse(departmentFixture)
      if (url.pathname === '/regions') return jsonResponse(regionFixture)
      return jsonResponse(communeFixture)
    }) as typeof fetch,
  })

  const communes = await client.listCommunes({ query: 'Paris', limit: 5, includeGeometry: true })
  const departments = await client.listDepartments({ regionCode: '11', limit: 3 })
  const regions = await client.listRegions({ limit: 2 })

  assert.equal(communes[0]?.name, 'Paris')
  assert.equal(communes[0]?.latitude, 48.8589)
  assert.equal(departments[0]?.region?.name, 'Île-de-France')
  assert.equal(regions[0]?.code, '11')
  assert.deepEqual(requests, [
    'https://geo.test/communes?nom=Paris&boost=population&fields=nom%2Ccode%2CcodesPostaux%2Ccentre%2Cdepartement%2Cregion%2Cpopulation&format=json&geometry=centre&limit=5',
    'https://geo.test/regions/11/departements?fields=nom%2Ccode%2Cregion&format=json',
    'https://geo.test/regions?fields=nom%2Ccode&format=json',
  ])
})

test('GeoApi usecases expose no-auth metadata and pagination', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async input => {
    const url = new URL(String(input))
    if (url.pathname.includes('departements')) return jsonResponse(departmentFixture)
    if (url.pathname === '/regions') return jsonResponse(regionFixture)
    return jsonResponse(communeFixture)
  }) as typeof fetch
  try {
    const communes = await listGeoApiCommunes({ query: 'Paris', limit: 1 })
    assert.equal(communes.kind, 'geoapi.communes')
    assert.equal(communes.api.authentication, 'none')
    assert.equal(communes.api.usesBrowserClickstream, false)
    assert.equal(communes.communes[0]?.department?.code, '75')
    assert.equal(communes.communes[0]?.latitude, undefined)

    const departments = await listGeoApiDepartments({ regionCode: '11', limit: 1 })
    assert.equal(departments.kind, 'geoapi.departments')
    assert.equal(departments.departments[0]?.code, '75')

    const regions = await listGeoApiRegions({ limit: 1 })
    assert.equal(regions.kind, 'geoapi.regions')
    assert.equal(regions.regions[0]?.name, 'Île-de-France')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('GeoApi normalizers validate filters and defaults', () => {
  assert.deepEqual(normalizeGeoApiCommunesInput({}), { query: 'Paris', limit: 10, includeGeometry: false })
  assert.deepEqual(normalizeGeoApiCommunesInput({ postalCode: '75001', limit: 5, includeGeometry: true }), { postalCode: '75001', limit: 5, includeGeometry: true })
  assert.throws(() => normalizeGeoApiCommunesInput({ query: 'Paris', postalCode: '75001' }), /only one commune filter/u)
  assert.throws(() => normalizeGeoApiCommunesInput({ postalCode: '7500A' }), /postal code/u)
  assert.throws(() => normalizeGeoApiCommunesInput({ limit: 51 }), /between 1 and 50/u)
  assert.deepEqual(normalizeGeoApiDepartmentsInput({ regionCode: '11' }), { regionCode: '11', limit: 10 })
  assert.throws(() => normalizeGeoApiDepartmentsInput({ regionCode: 'abc' }), /region code/u)
  assert.throws(() => normalizeGeoApiDepartmentsInput({ regionCode: '99' }), /current French region codes/u)
  assert.deepEqual(normalizeGeoApiRegionsInput({ limit: 18 }), { limit: 18 })
})

test('GeoApi commune fields omit centre unless geometry is requested', () => {
  assert.equal(GEO_API_COMMUNE_FIELDS.includes('centre'), false)
  assert.equal(GEO_API_COMMUNE_GEOMETRY_FIELDS.split(',').includes('centre'), true)
})

test('GeoApi client rejects non-JSON provider errors', async () => {
  const client = new GeoApiClient({ fetchImpl: (async () => new Response('Not Found', { status: 404, headers: { 'content-type': 'text/plain' } })) as typeof fetch })
  await assert.rejects(() => client.listCommunes({ query: 'Paris', limit: 1, includeGeometry: false }), /non-JSON/u)
})

test('GeoApi client explains Cloudflare HTML challenges', async () => {
  const client = new GeoApiClient({
    fetchImpl: (async () => new Response('<!DOCTYPE html><title>Just a moment...</title>', {
      status: 403,
      headers: { 'content-type': 'text/html; charset=UTF-8', 'server': 'cloudflare', 'cf-mitigated': 'challenge' },
    })) as typeof fetch,
  })

  await assert.rejects(
    () => client.listCommunes({ query: 'Paris', limit: 1, includeGeometry: false }),
    /Cloudflare challenge HTML page/u,
  )
})

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
}
