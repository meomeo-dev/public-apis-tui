import assert from 'node:assert/strict'
import test from 'node:test'
import {
  getTleSatellite,
  normalizeTleSatelliteInput,
  normalizeTleSearchInput,
  searchTle,
} from '../src/application/usecases/tle.js'
import { TleClient } from '../src/infrastructure/openApis/tleClient.js'

test('TLE client calls documented no-auth JSON endpoints', async () => {
  const requestedUrls: URL[] = []
  const client = new TleClient({
    baseUrl: 'https://tle.example.test',
    fetchImpl: (async input => {
      const url = new URL(String(input))
      requestedUrls.push(url)
      if (url.pathname === '/api/tle/25544') return jsonResponse(createTleFixture())
      return jsonResponse(createTleSearchFixture())
    }) as typeof fetch,
  })

  const search = await client.search({ search: 'ISS', page: 2 })
  const satellite = await client.getSatellite(25544)

  assert.equal(requestedUrls[0]?.pathname, '/api/tle/')
  assert.equal(requestedUrls[0]?.searchParams.get('search'), 'ISS')
  assert.equal(requestedUrls[0]?.searchParams.get('page'), '2')
  assert.equal(requestedUrls[1]?.pathname, '/api/tle/25544')
  assert.equal(search.totalItems, 25)
  assert.equal(search.members[0]?.name, 'ISS (ZARYA)')
  assert.equal(satellite.satelliteId, 25544)
})

test('TLE usecases project bounded no-auth results', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async input => {
    const url = new URL(String(input))
    return jsonResponse(
      url.pathname === '/api/tle/25544'
        ? createTleFixture()
        : createTleSearchFixture(),
    )
  }) as typeof fetch

  try {
    const search = await searchTle({ search: 'ISS', page: 1 })
    assert.equal(search.kind, 'tle.search')
    assert.equal(search.api.provider, 'tle')
    assert.equal(search.api.authentication, 'none')
    assert.equal(search.api.usesBrowserClickstream, false)
    assert.equal(search.pagination.pageSize, 20)
    assert.equal(search.satellites[0]?.orbital.classification, 'U')
    assert.equal(search.satellites[0]?.orbital.inclinationDegrees, 51.631)

    const satellite = await getTleSatellite({ satelliteId: 25544 })
    assert.equal(satellite.kind, 'tle.satellite')
    assert.equal(satellite.satellite.name, 'ISS (ZARYA)')
    assert.equal(satellite.satellite.orbital.meanMotionRevsPerDay, 15.49176858)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('TLE normalizers enforce curated bounds', () => {
  assert.deepEqual(normalizeTleSearchInput({}), {
    search: 'ISS',
    page: 1,
    pageSize: 20,
  })
  assert.deepEqual(normalizeTleSatelliteInput({}), {
    satelliteId: 25544,
  })
  assert.throws(() => normalizeTleSearchInput({ search: 'x' }), /2-80/)
  assert.throws(
    () => normalizeTleSearchInput({ search: '../secret' }),
    /unsupported characters/,
  )
  assert.throws(() => normalizeTleSearchInput({ page: 0 }), /from 1 to 2000/)
  assert.throws(
    () => normalizeTleSatelliteInput({ satelliteId: 0 }),
    /from 1 to 999999/,
  )
})

test('TLE client surfaces Cloudflare challenge HTML clearly', async () => {
  const client = new TleClient({
    baseUrl: 'https://tle.example.test',
    fetchImpl: (async () => new Response(
      '<!DOCTYPE html><title>Just a moment...</title>',
      {
        status: 403,
        headers: {
          'content-type': 'text/html; charset=UTF-8',
          server: 'cloudflare',
          'cf-mitigated': 'challenge',
        },
      },
    )) as typeof fetch,
  })

  await assert.rejects(
    () => client.search({ search: 'ISS', page: 1 }),
    /Cloudflare challenge HTML page/u,
  )
})

function createTleSearchFixture(): Record<string, unknown> {
  return {
    '@context': 'https://www.w3.org/ns/hydra/context.jsonld',
    '@id': 'https://tle.ivanstanojevic.me/api/tle/?search=ISS&page=1',
    '@type': 'hydra:Collection',
    totalItems: 25,
    parameters: {
      search: 'ISS',
      sort: 'popularity',
      'sort-dir': 'desc',
      page: 1,
      'page-size': 20,
    },
    view: {
      first: 'https://tle.ivanstanojevic.me/api/tle/?search=ISS&page=1',
      next: 'https://tle.ivanstanojevic.me/api/tle/?search=ISS&page=2',
      last: 'https://tle.ivanstanojevic.me/api/tle/?search=ISS&page=2',
    },
    member: [createTleFixture()],
  }
}

function createTleFixture(): Record<string, unknown> {
  return {
    '@id': 'https://tle.ivanstanojevic.me/api/tle/25544',
    '@type': 'Tle',
    satelliteId: 25544,
    name: 'ISS (ZARYA)',
    date: '2026-05-10T17:09:53+00:00',
    line1: '1 25544U 98067A   26130.71520280  .00006215  00000+0  12011-3 0  9998',
    line2: '2 25544  51.6310 125.5915 0007454  44.6609 315.4979 15.49176858565946',
  }
}

function jsonResponse(value: unknown): Response {
  return new Response(JSON.stringify(value), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })
}
