import assert from 'node:assert/strict'
import test from 'node:test'
import {
  normalizeMinorPlanetCenterSearchInput,
  searchMinorPlanetCenter,
} from '../src/application/usecases/minorPlanetCenter.js'
import {
  MinorPlanetCenterClient,
} from '../src/infrastructure/openApis/minorPlanetCenterClient.js'

test('Minor Planet Center client calls documented Asterank MPC endpoint', async () => {
  let requestedUrl: URL | undefined
  const client = new MinorPlanetCenterClient(
    'https://www.asterank.com',
    (async input => {
      requestedUrl = new URL(String(input))
      return jsonResponse([
        {
          readable_des: '(1) Ceres',
          des: '00001',
          H: 3.34,
          e: 0.0760091,
          a: 2.7691652,
          i: 10.59407,
          num_obs: 6725,
          last_obs: '20180430',
          ref: 'MPO452155',
        },
      ])
    }) as typeof fetch,
  )

  const response = await client.search({
    queryJson: { readable_des: { $regex: 'Ceres', $options: 'i' } },
    limit: 2,
  })

  assert.equal(requestedUrl?.origin, 'https://www.asterank.com')
  assert.equal(requestedUrl?.pathname, '/api/mpc')
  assert.equal(requestedUrl?.searchParams.get('limit'), '2')
  assert.equal(
    requestedUrl?.searchParams.get('query'),
    '{"readable_des":{"$regex":"Ceres","$options":"i"}}',
  )
  assert.deepEqual(response, [
    {
      readableDesignation: '(1) Ceres',
      designation: '00001',
      absoluteMagnitude: 3.34,
      eccentricity: 0.0760091,
      semiMajorAxisAu: 2.7691652,
      inclinationDeg: 10.59407,
      observations: 6725,
      lastObservation: '20180430',
      reference: 'MPO452155',
    },
  ])
})

test('Minor Planet Center usecase projects bounded no-auth metadata', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async () => jsonResponse([
    {
      readable_des: '(138911) 2001 AE2',
      des: 'D8911',
      H: 19.2,
      e: 0.0816482,
      a: 1.3496103,
      i: 1.66164,
      num_obs: 548,
      num_opp: 10,
    },
  ])) as typeof fetch

  try {
    const result = await searchMinorPlanetCenter({
      query: '',
      maxEccentricity: '0.1',
      maxInclination: '4',
      maxSemiMajorAxis: '1.5',
      minObservations: '100',
      limit: 1,
    })
    assert.equal(result.kind, 'minorplanetcenter.search')
    assert.equal(result.api.provider, 'minorplanetcenter')
    assert.equal(result.api.authentication, 'none')
    assert.equal(result.api.usesBrowserClickstream, false)
    assert.match(result.api.boundary, /no arbitrary MongoDB query/u)
    assert.deepEqual(result.query, {
      query: '',
      maxEccentricity: 0.1,
      maxInclination: 4,
      maxSemiMajorAxis: 1.5,
      minObservations: 100,
      limit: 1,
    })
    assert.deepEqual(result.upstreamQuery, {
      e: { $lt: 0.1 },
      i: { $lt: 4 },
      a: { $lt: 1.5 },
      num_obs: { $gte: 100 },
    })
    assert.equal(result.asteroids[0]?.readableDesignation, '(138911) 2001 AE2')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test(
  'Minor Planet Center client rejects Cloudflare challenge HTML clearly',
  async () => {
    const client = new MinorPlanetCenterClient(
      'https://www.asterank.com',
      (async () => {
        return new Response('<!DOCTYPE html><title>Just a moment...</title>', {
          status: 429,
          statusText: 'Too Many Requests',
          headers: {
            'cf-mitigated': 'challenge',
            'content-type': 'text/html; charset=UTF-8',
            server: 'cloudflare',
          },
        })
      }) as typeof fetch,
    )

    await assert.rejects(
      () => client.search({ limit: 1 }),
      /Cloudflare challenge HTML/u,
    )
  },
)

test('Minor Planet Center normalizer enforces curated bounds', () => {
  assert.deepEqual(normalizeMinorPlanetCenterSearchInput({}), {
    query: 'Ceres',
    limit: 10,
  })
  assert.deepEqual(normalizeMinorPlanetCenterSearchInput({ query: '' }), {
    query: '',
    limit: 10,
  })
  assert.equal(
    normalizeMinorPlanetCenterSearchInput({ maxEccentricity: '0.5' }).maxEccentricity,
    0.5,
  )
  assert.throws(
    () => normalizeMinorPlanetCenterSearchInput({ limit: 51 }),
    /between 1 and 50/u,
  )
  assert.throws(
    () => normalizeMinorPlanetCenterSearchInput({ maxInclination: '181' }),
    /between 0 and 180/u,
  )
  assert.throws(
    () => normalizeMinorPlanetCenterSearchInput({ minObservations: '1.5' }),
    /must be an integer/u,
  )
  assert.throws(
    () => normalizeMinorPlanetCenterSearchInput({ query: 'x'.repeat(81) }),
    /80 characters or fewer/u,
  )
})

function jsonResponse(value: unknown): Response {
  return new Response(JSON.stringify(value), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })
}
