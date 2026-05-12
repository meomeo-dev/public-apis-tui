import assert from 'node:assert/strict'
import test from 'node:test'
import { listPinballMapLocations, listPinballMapRegions } from '../src/application/usecases/pinballMap.js'
import { PinballMapClient, normalizePinballMapLocationsInput, normalizePinballMapRegionsInput } from '../src/infrastructure/openApis/pinballMapClient.js'

const regionsFixture = {
  regions: [
    { id: 1, name: 'portland', full_name: 'Portland, Oregon', lat: '45.52341', lon: '-122.67561', state: 'Oregon', effective_radius: 40.0, motd: 'Use attribution' },
    { id: 2, name: 'chicago', full_name: 'Chicago', lat: '41.8781', lon: '-87.6298', state: 'Illinois', effective_radius: 35.0 },
  ],
}

const locationsFixture = {
  locations: [
    { id: 874, name: 'Ground Kontrol Classic Arcade', street: '115 NW 5th Ave', city: 'Portland', state: 'OR', zip: '97209', lat: '45.5240826', lon: '-122.675826', country: 'US', machine_count: 45, is_stern_army: true, ic_active: true, last_updated_by_username: 'gkrepairs' },
  ],
}

test('Pinball Map client reads regions and filters locally', async () => {
  const requests: string[] = []
  const client = new PinballMapClient({
    baseUrl: 'https://pinballmap.test',
    fetchImpl: (async input => {
      requests.push(String(input))
      return jsonResponse(regionsFixture)
    }) as typeof fetch,
  })
  const regions = await client.listRegions({ limit: 5, query: 'oregon' })
  assert.deepEqual(requests, ['https://pinballmap.test/api/v1/regions.json'])
  assert.equal(regions.length, 1)
  assert.equal(regions[0]?.name, 'portland')
  assert.equal(regions[0]?.latitude, 45.52341)
})

test('Pinball Map client sends lightweight location query', async () => {
  const requests: string[] = []
  const client = new PinballMapClient({
    baseUrl: 'https://pinballmap.test',
    fetchImpl: (async input => {
      requests.push(String(input))
      return jsonResponse(String(input).includes('regions') ? regionsFixture : locationsFixture)
    }) as typeof fetch,
  })
  const locations = await client.listLocations({ region: 'portland', query: 'ground', limit: 10 })
  assert.deepEqual(requests, [
    'https://pinballmap.test/api/v1/regions.json',
    'https://pinballmap.test/api/v1/locations.json?region=portland&no_details=1&by_location_name=ground',
  ])
  assert.equal(locations[0]?.name, 'Ground Kontrol Classic Arcade')
  assert.equal(locations[0]?.machineCount, 45)
})

test('Pinball Map usecases project no-auth read-only boundaries', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async input => jsonResponse(String(input).includes('regions') ? regionsFixture : locationsFixture)) as typeof fetch
  try {
    const regions = await listPinballMapRegions({ limit: 1 })
    assert.equal(regions.kind, 'pinballmap.regions')
    assert.equal(regions.api.authentication, 'none')
    assert.equal(regions.api.usesBrowserClickstream, false)
    assert.match(regions.api.writeBoundary, /read-only/u)

    const locations = await listPinballMapLocations({ region: 'portland', query: 'ground', limit: 1 })
    assert.equal(locations.kind, 'pinballmap.locations')
    assert.equal(locations.pagination.noDetails, true)
    assert.equal(locations.locations[0]?.name, 'Ground Kontrol Classic Arcade')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('Pinball Map normalizers enforce bounds', () => {
  assert.deepEqual(normalizePinballMapRegionsInput({}), { limit: 10 })
  assert.deepEqual(normalizePinballMapRegionsInput({ query: ' Oregon ', limit: 2 }), { query: 'Oregon', limit: 2 })
  assert.deepEqual(normalizePinballMapLocationsInput({}), { region: 'portland', limit: 10 })
  assert.deepEqual(normalizePinballMapLocationsInput({ region: 'Chicago', query: ' Logan ', limit: 5 }), { region: 'chicago', query: 'Logan', limit: 5 })
  assert.throws(() => normalizePinballMapLocationsInput({ region: '!' }), /--region/u)
  assert.throws(() => normalizePinballMapLocationsInput({ query: 'a' }), /--query/u)
  assert.throws(() => normalizePinballMapLocationsInput({ limit: 51 }), /between 1 and 50/u)
})

test('Pinball Map client rejects non-JSON provider failures', async () => {
  const client = new PinballMapClient({
    baseUrl: 'https://pinballmap.test',
    fetchImpl: (async () => new Response('<html>not found</html>', { status: 404, headers: { 'content-type': 'text/html' } })) as typeof fetch,
  })
  await assert.rejects(() => client.listLocations({ region: 'portland', limit: 1 }), /non-JSON/u)
})

test('Pinball Map client rejects unknown region slugs before rendering locations', async () => {
  const client = new PinballMapClient({
    baseUrl: 'https://pinballmap.test',
    fetchImpl: (async input => jsonResponse(String(input).includes('regions') ? regionsFixture : locationsFixture)) as typeof fetch,
  })

  await assert.rejects(
    () => client.listLocations({ region: 'zznotaregion', limit: 1 }),
    /known Pinball Map region slug/u,
  )
})

test('Pinball Map client explains Cloudflare HTML challenges', async () => {
  const client = new PinballMapClient({
    baseUrl: 'https://pinballmap.test',
    fetchImpl: (async () => new Response('<!DOCTYPE html><title>Just a moment...</title>', {
      status: 403,
      headers: { 'content-type': 'text/html; charset=UTF-8', 'server': 'cloudflare', 'cf-mitigated': 'challenge' },
    })) as typeof fetch,
  })

  await assert.rejects(
    () => client.listRegions({ limit: 1 }),
    /Cloudflare challenge HTML page/u,
  )
})

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
}
