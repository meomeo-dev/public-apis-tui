import assert from 'node:assert/strict'
import test from 'node:test'
import {
  listLaunchLibrary2Events,
  listLaunchLibrary2Launches,
  normalizeLaunchLibrary2EventsInput,
  normalizeLaunchLibrary2LaunchesInput,
} from '../src/application/usecases/launchLibrary2.js'
import {
  LaunchLibrary2Client,
} from '../src/infrastructure/openApis/launchLibrary2Client.js'

test('Launch Library 2 client calls documented upcoming launch endpoint', async () => {
  let requestedUrl: URL | undefined
  const client = new LaunchLibrary2Client(
    'https://ll.thespacedevs.com/2.3.0',
    (async input => {
      requestedUrl = new URL(String(input))
      return jsonResponse({
        count: 1,
        next: null,
        previous: null,
        results: [createLaunchFixture()],
      })
    }) as typeof fetch,
  )

  const response = await client.listUpcomingLaunches({
    limit: 2,
    offset: 4,
    ordering: 'net',
    search: 'Falcon',
    start: '2026-05-11',
    end: '2026-06-01',
    lsp: 'SpaceX',
  })

  assert.equal(requestedUrl?.pathname, '/2.3.0/launches/upcoming/')
  assert.equal(requestedUrl?.searchParams.get('limit'), '2')
  assert.equal(requestedUrl?.searchParams.get('offset'), '4')
  assert.equal(requestedUrl?.searchParams.get('ordering'), 'net')
  assert.equal(requestedUrl?.searchParams.get('search'), 'Falcon')
  assert.equal(requestedUrl?.searchParams.get('net__gte'), '2026-05-11')
  assert.equal(requestedUrl?.searchParams.get('net__lte'), '2026-06-01')
  assert.equal(requestedUrl?.searchParams.get('lsp__name'), 'SpaceX')
  assert.equal(response.results[0]?.name, 'Falcon 9 Block 5 | NROL-172')
  assert.equal(response.results[0]?.rocket?.name, 'Falcon 9 Block 5')
})

test('Launch Library 2 usecases project no-auth launches and events', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async input => {
    const url = new URL(String(input))
    if (url.pathname.endsWith('/launches/upcoming/')) {
      return jsonResponse({
        count: 1,
        next: null,
        previous: null,
        results: [createLaunchFixture()],
      })
    }
    return jsonResponse({
      count: 1,
      next: null,
      previous: null,
      results: [createEventFixture()],
    })
  }) as typeof fetch

  try {
    const launches = await listLaunchLibrary2Launches({ search: 'Falcon', limit: 1 })
    assert.equal(launches.kind, 'launchlibrary2.launches')
    assert.equal(launches.api.provider, 'launchlibrary2')
    assert.equal(launches.api.authentication, 'none')
    assert.equal(launches.api.usesBrowserClickstream, false)
    assert.equal(launches.pagination.returned, 1)
    assert.equal(launches.launches[0]?.mission?.name, 'NROL-172')

    const events = await listLaunchLibrary2Events({ search: 'Docking', limit: 1 })
    assert.equal(events.kind, 'launchlibrary2.events')
    assert.equal(events.api.provider, 'launchlibrary2')
    assert.equal(events.events[0]?.name, 'SpaceX CRS-34 Dragon Docking')
    assert.equal(events.events[0]?.videoUrls[0]?.publisher, 'NASA')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test(
  'Launch Library 2 client rejects Cloudflare challenge HTML clearly',
  async () => {
    const client = new LaunchLibrary2Client(
      'https://ll.thespacedevs.com/2.3.0',
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
      () => client.listUpcomingLaunches({
        limit: 1,
        offset: 0,
        ordering: 'net',
      }),
      /Cloudflare challenge HTML/u,
    )
  },
)

test('Launch Library 2 normalizers enforce curated bounds', () => {
  assert.deepEqual(normalizeLaunchLibrary2LaunchesInput({}), {
    kind: 'launches',
    limit: 10,
    offset: 0,
    ordering: 'net',
  })
  assert.deepEqual(normalizeLaunchLibrary2EventsInput({ hideRecentPrevious: true }), {
    kind: 'events',
    limit: 10,
    offset: 0,
    ordering: 'date',
    hideRecentPrevious: true,
  })
  assert.throws(
    () => normalizeLaunchLibrary2LaunchesInput({ limit: 101 }),
    /between 1 and 100/,
  )
  assert.throws(
    () => normalizeLaunchLibrary2EventsInput({ offset: 10001 }),
    /between 0 and 10000/,
  )
  assert.throws(
    () => normalizeLaunchLibrary2LaunchesInput({ ordering: 'name' }),
    /must be one of/,
  )
  assert.throws(
    () => normalizeLaunchLibrary2EventsInput({ start: 'tomorrow' }),
    /UTC ISO/,
  )
  assert.throws(() => normalizeLaunchLibrary2LaunchesInput({ search: 'x' }), /2-120/)
})

function createLaunchFixture(): Record<string, unknown> {
  return {
    id: '24f0b5b1-f573-4cc9-8898-1eb7fd5cc0f2',
    url: [
      'https://ll.thespacedevs.com/2.3.0/launches/',
      '24f0b5b1-f573-4cc9-8898-1eb7fd5cc0f2/',
    ].join(''),
    name: 'Falcon 9 Block 5 | NROL-172',
    slug: 'falcon-9-block-5-nrol-172',
    status: { name: 'Go for Launch', abbrev: 'Go' },
    net: '2026-05-11T22:28:00Z',
    window_start: '2026-05-11T22:28:00Z',
    window_end: '2026-05-12T02:28:00Z',
    webcast_live: false,
    launch_service_provider: {
      name: 'SpaceX',
      abbrev: 'SpX',
      type: { name: 'Commercial' },
    },
    rocket: {
      configuration: {
        full_name: 'Falcon 9 Block 5',
        families: [{ name: 'Falcon 9' }],
      },
    },
    mission: {
      name: 'NROL-172',
      type: 'Government/Top Secret',
      orbit: { name: 'Unknown' },
      description: 'Reconnaissance mission.',
    },
    pad: {
      name: 'Space Launch Complex 4E',
      map_url: 'https://www.google.com/maps?q=34.632,-120.611',
      location: {
        name: 'Vandenberg SFB, CA, USA',
        country: { name: 'United States of America' },
        latitude: 34.75133,
        longitude: -120.52023,
      },
    },
  }
}

function createEventFixture(): Record<string, unknown> {
  return {
    id: 1449,
    url: 'https://ll.thespacedevs.com/2.3.0/events/1449/',
    name: 'SpaceX CRS-34 Dragon Docking',
    slug: 'spacex-crs-34-dragon-docking',
    date: '2026-05-14T13:50:00Z',
    type: { name: 'Docking' },
    location: 'International Space Station',
    description: 'CRS-34 Dragon will autonomously dock to the ISS.',
    webcast_live: false,
    vid_urls: [
      {
        publisher: 'NASA',
        title: 'NASA CRS-34 Docking',
        url: 'https://plus.nasa.gov/scheduled-video/crs-34/',
        start_time: '2026-05-14T12:20:00Z',
        live: false,
      },
    ],
  }
}

function jsonResponse(value: unknown): Response {
  return new Response(JSON.stringify(value), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })
}
