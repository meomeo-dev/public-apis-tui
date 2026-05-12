import assert from 'node:assert/strict'
import test from 'node:test'
import {
  listSpaceXLaunches,
  listSpaceXLaunchpads,
  listSpaceXRockets,
  normalizeSpaceXLaunchesInput,
  normalizeSpaceXLaunchpadsInput,
  normalizeSpaceXRocketsInput,
  getSpaceXCompany,
} from '../src/application/usecases/spaceX.js'
import { SpaceXClient } from '../src/infrastructure/openApis/spaceXClient.js'

test('SpaceX client calls documented no-auth REST endpoints', async () => {
  const requests: Array<{ url: URL; init: RequestInit }> = []
  const client = new SpaceXClient({
    baseUrl: 'https://api.spacexdata.test',
    fetchImpl: (async (input, init = {}) => {
      const url = new URL(String(input))
      requests.push({ url, init })
      if (url.pathname === '/v4/company') return jsonResponse(companyFixture)
      if (url.pathname === '/v4/rockets') return jsonResponse([rocketFixture])
      if (url.pathname === '/v4/launchpads') return jsonResponse([launchpadFixture])
      return jsonResponse(launchesFixture)
    }) as typeof fetch,
  })

  const company = await client.getCompany()
  const rockets = await client.listRockets()
  const launchpads = await client.listLaunchpads()
  const launches = await client.queryLaunches({
    name: 'Crew',
    upcoming: false,
    success: true,
    rocket: '5e9d0d95eda69973a809d1ec',
    launchpad: '5e9e4502f509094188566f88',
    start: '2022-01-01',
    end: '2022-12-31',
    sort: 'date-desc',
    limit: 2,
    page: 3,
  })

  assert.equal(requests[0]?.url.pathname, '/v4/company')
  assert.equal(requests[0]?.init.method, 'GET')
  assert.equal(company.name, 'SpaceX')
  assert.equal(requests[1]?.url.pathname, '/v4/rockets')
  assert.equal(rockets[0]?.name, 'Falcon 9')
  assert.equal(requests[2]?.url.pathname, '/v4/launchpads')
  assert.equal(launchpads[0]?.name, 'KSC LC 39A')
  assert.equal(requests[3]?.url.pathname, '/v5/launches/query')
  assert.equal(requests[3]?.init.method, 'POST')
  assert.equal(launches.docs[0]?.name, 'Crew-5')

  const body = JSON.parse(String(requests[3]?.init.body)) as Record<string, unknown>
  const query = body.query as Record<string, unknown>
  const name = query.name as Record<string, unknown>
  const dateUtc = query.date_utc as Record<string, unknown>
  const options = body.options as Record<string, unknown>
  assert.equal(name.$regex, 'Crew')
  assert.equal(query.upcoming, false)
  assert.equal(query.success, true)
  assert.equal(query.rocket, '5e9d0d95eda69973a809d1ec')
  assert.equal(query.launchpad, '5e9e4502f509094188566f88')
  assert.equal(dateUtc.$gte, '2022-01-01')
  assert.equal(options.limit, 2)
  assert.equal(options.page, 3)
  assert.deepEqual(options.sort, { date_utc: 'desc' })
})

test('SpaceX usecases project boundaries and local filters', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async input => {
    const url = new URL(String(input))
    if (url.pathname === '/v4/company') return jsonResponse(companyFixture)
    if (url.pathname === '/v4/rockets') {
      return jsonResponse([
        rocketFixture,
        { ...rocketFixture, id: 'inactive', active: false },
      ])
    }
    if (url.pathname === '/v4/launchpads') {
      return jsonResponse([
        launchpadFixture,
        { ...launchpadFixture, id: 'retired', status: 'retired' },
      ])
    }
    return jsonResponse(launchesFixture)
  }) as typeof fetch

  try {
    const company = await getSpaceXCompany()
    assert.equal(company.kind, 'spacex.company')
    assert.equal(company.api.authentication, 'none')
    assert.equal(company.api.usesBrowserClickstream, false)

    const rockets = await listSpaceXRockets({
      search: 'Falcon',
      active: true,
      limit: 1,
    })
    assert.equal(rockets.kind, 'spacex.rockets')
    assert.equal(rockets.pagination.matched, 1)
    assert.equal(rockets.rockets[0]?.name, 'Falcon 9')

    const launchpads = await listSpaceXLaunchpads({
      search: 'Kennedy',
      status: 'active',
      limit: 1,
    })
    assert.equal(launchpads.kind, 'spacex.launchpads')
    assert.equal(launchpads.launchpads[0]?.fullName, 'Kennedy Space Center LC 39A')

    const launches = await listSpaceXLaunches({ name: 'Crew', limit: 1 })
    assert.equal(launches.kind, 'spacex.launches')
    assert.equal(launches.pagination.total, 1)
    assert.equal(launches.launches[0]?.links.youtubeId, '5EwW8ZkArL4')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('SpaceX normalizers reject raw query syntax and unbounded parameters', () => {
  assert.deepEqual(normalizeSpaceXRocketsInput({}), {
    search: '',
    active: undefined,
    limit: 10,
    offset: 0,
  })
  assert.deepEqual(normalizeSpaceXLaunchpadsInput({ status: 'active' }), {
    search: '',
    status: 'active',
    limit: 10,
    offset: 0,
  })
  assert.deepEqual(normalizeSpaceXLaunchesInput({}), {
    name: undefined,
    upcoming: undefined,
    success: undefined,
    rocket: undefined,
    launchpad: undefined,
    start: undefined,
    end: undefined,
    sort: 'date-desc',
    limit: 10,
    page: 1,
  })
  assert.throws(
    () => normalizeSpaceXLaunchesInput({ limit: 51 }),
    /SpaceX --limit must be an integer from 1 to 50/u,
  )
  assert.throws(
    () => normalizeSpaceXLaunchesInput({ page: 201 }),
    /SpaceX --page must be an integer from 1 to 200/u,
  )
  assert.throws(
    () => normalizeSpaceXLaunchesInput({ sort: 'raw' }),
    /SpaceX --sort must be one of/u,
  )
  assert.throws(
    () => normalizeSpaceXLaunchesInput({ name: '{"$where":"sleep"}' }),
    /must not contain raw query syntax/u,
  )
  assert.throws(
    () => normalizeSpaceXLaunchpadsInput({ status: '../secret' }),
    /letters, numbers/u,
  )
  assert.throws(
    () => normalizeSpaceXLaunchesInput({ rocket: 'falcon9' }),
    /24 character SpaceX object id/u,
  )
  assert.throws(
    () => normalizeSpaceXLaunchesInput({ start: 'tomorrow' }),
    /UTC ISO date-time/u,
  )
})

test('SpaceX client rejects upstream errors and malformed responses', async () => {
  const failingClient = new SpaceXClient({
    baseUrl: 'https://api.spacexdata.test',
    fetchImpl: (async () => jsonResponse({ error: 'bad query' }, 400)) as typeof fetch,
  })
  await assert.rejects(
    () => failingClient.queryLaunches({
      sort: 'date-desc',
      limit: 1,
      page: 1,
    }),
    /bad query/u,
  )

  const malformedClient = new SpaceXClient({
    baseUrl: 'https://api.spacexdata.test',
    fetchImpl: (async () => jsonResponse({ docs: {} })) as typeof fetch,
  })
  await assert.rejects(
    () => malformedClient.queryLaunches({
      sort: 'date-desc',
      limit: 1,
      page: 1,
    }),
    /expected page shape/u,
  )
})

test('SpaceX client surfaces Cloudflare challenge HTML clearly', async () => {
  const client = new SpaceXClient({
    baseUrl: 'https://api.spacexdata.test',
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
    () => client.getCompany(),
    /Cloudflare challenge HTML page/u,
  )
})

const companyFixture = {
  headquarters: {
    address: 'Rocket Road',
    city: 'Hawthorne',
    state: 'California',
  },
  links: {
    website: 'https://www.spacex.com/',
    flickr: 'https://www.flickr.com/photos/spacex/',
    twitter: 'https://twitter.com/SpaceX',
    elon_twitter: 'https://twitter.com/elonmusk',
  },
  name: 'SpaceX',
  founder: 'Elon Musk',
  founded: 2002,
  employees: 8000,
  vehicles: 3,
  launch_sites: 3,
  test_sites: 1,
  ceo: 'Elon Musk',
  cto: 'Elon Musk',
  coo: 'Gwynne Shotwell',
  cto_propulsion: 'Tom Mueller',
  valuation: 52000000000,
  summary: 'SpaceX designs, manufactures and launches advanced rockets.',
  id: '5eb75edc42fea42237d7f3ed',
}

const rocketFixture = {
  height: { meters: 70, feet: 229.6 },
  diameter: { meters: 3.7, feet: 12 },
  mass: { kg: 549054, lb: 1207920 },
  engines: {
    number: 9,
    type: 'merlin',
    version: '1D+',
    propellant_1: 'liquid oxygen',
    propellant_2: 'RP-1 kerosene',
  },
  payload_weights: [{ id: 'leo', name: 'Low Earth Orbit', kg: 22800 }],
  flickr_images: ['https://example.com/falcon9.jpg'],
  name: 'Falcon 9',
  type: 'rocket',
  active: true,
  stages: 2,
  boosters: 0,
  cost_per_launch: 50000000,
  success_rate_pct: 97,
  first_flight: '2010-06-04',
  country: 'United States',
  company: 'SpaceX',
  wikipedia: 'https://en.wikipedia.org/wiki/Falcon_9',
  description: 'Falcon 9 is a two-stage rocket.',
  id: '5e9d0d95eda69973a809d1ec',
}

const launchpadFixture = {
  images: { large: ['https://i.imgur.com/9oEMXwa.png'] },
  name: 'KSC LC 39A',
  full_name: 'Kennedy Space Center LC 39A',
  locality: 'Cape Canaveral',
  region: 'Florida',
  latitude: 28.6080585,
  longitude: -80.6039558,
  launch_attempts: 55,
  launch_successes: 54,
  rockets: ['5e9d0d95eda69973a809d1ec'],
  timezone: 'America/New_York',
  launches: ['5eb87cdfffd86e000604b331'],
  status: 'active',
  id: '5e9e4502f509094188566f88',
}

const launchesFixture = {
  docs: [
    {
      links: {
        patch: { small: 'https://images2.imgbox.com/eb/d8/D1Yywp0w_o.png' },
        webcast: 'https://youtu.be/5EwW8ZkArL4',
        youtube_id: '5EwW8ZkArL4',
        wikipedia: 'https://en.wikipedia.org/wiki/SpaceX_Crew-5',
      },
      rocket: '5e9d0d95eda69973a809d1ec',
      success: true,
      failures: [],
      details: 'Crew-5 transported astronauts to the ISS.',
      crew: [{ crew: '62dd7196202306255024d13c', role: 'Commander' }],
      ships: [],
      capsules: ['617c05591bad2c661a6e2909'],
      payloads: ['62dd73ed202306255024d145'],
      launchpad: '5e9e4502f509094188566f88',
      flight_number: 187,
      name: 'Crew-5',
      date_utc: '2022-10-05T16:00:00.000Z',
      date_local: '2022-10-05T12:00:00-04:00',
      date_precision: 'hour',
      upcoming: false,
      id: '633f72130531f07b4fdf59c3',
    },
  ],
  totalDocs: 1,
  limit: 1,
  page: 1,
  totalPages: 1,
  hasPrevPage: false,
  hasNextPage: false,
  prevPage: null,
  nextPage: null,
}

function jsonResponse(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  })
}
