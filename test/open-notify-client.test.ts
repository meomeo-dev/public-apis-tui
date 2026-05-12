import assert from 'node:assert/strict'
import test from 'node:test'
import {
  getOpenNotifyIssNow,
  listOpenNotifyAstronauts,
} from '../src/application/usecases/openNotify.js'
import { OpenNotifyClient } from '../src/infrastructure/openApis/openNotifyClient.js'

test('Open Notify client reads astronauts and ISS position JSON', async () => {
  const client = new OpenNotifyClient({
    fetchImpl: (async input => {
      const url = new URL(String(input))
      assert.equal(url.hostname, 'api.open-notify.org')
      if (url.pathname === '/astros.json') {
        return jsonResponse(createAstrosFixture())
      }
      assert.equal(url.pathname, '/iss-now.json')
      return jsonResponse(createIssNowFixture())
    }) as typeof fetch,
  })

  const astronauts = await client.listAstronauts()
  assert.equal(astronauts.number, 2)
  assert.equal(astronauts.people[0]?.name, 'Oleg Kononenko')
  assert.equal(astronauts.people[1]?.craft, 'Tiangong')

  const issNow = await client.getIssNow()
  assert.equal(issNow.timestamp, 1778290612)
  assert.equal(issNow.position.latitude, 6.7487)
  assert.equal(issNow.position.longitude, 57.1871)
})

test('Open Notify usecases project TUI-ready JSON', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async input => {
    const url = new URL(String(input))
    return jsonResponse(
      url.pathname === '/astros.json' ? createAstrosFixture() : createIssNowFixture(),
    )
  }) as typeof fetch

  try {
    const astronauts = await listOpenNotifyAstronauts()
    assert.equal(astronauts.kind, 'opennotify.astros')
    assert.equal(astronauts.api.authentication, 'none')
    assert.equal(astronauts.api.usesBrowserClickstream, false)
    assert.equal(astronauts.api.security, 'http-only')
    assert.equal(astronauts.people.length, 2)

    const issNow = await getOpenNotifyIssNow()
    assert.equal(issNow.kind, 'opennotify.issNow')
    assert.equal(issNow.api.authentication, 'none')
    assert.equal(issNow.api.usesBrowserClickstream, false)
    assert.equal(issNow.api.security, 'http-only')
    assert.equal(issNow.observedAt, '2026-05-09T01:36:52.000Z')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('Open Notify client surfaces Cloudflare challenge HTML clearly', async () => {
  const client = new OpenNotifyClient({
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

  await assert.rejects(
    () => client.listAstronauts(),
    /Cloudflare challenge HTML page/u,
  )
})

function jsonResponse(value: unknown): Response {
  return new Response(JSON.stringify(value), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })
}

function createAstrosFixture(): Record<string, unknown> {
  return {
    message: 'success',
    number: 2,
    people: [
      { craft: 'ISS', name: 'Oleg Kononenko' },
      { craft: 'Tiangong', name: 'Li Guangsu' },
    ],
  }
}

function createIssNowFixture(): Record<string, unknown> {
  return {
    message: 'success',
    timestamp: 1778290612,
    iss_position: {
      latitude: '6.7487',
      longitude: '57.1871',
    },
  }
}
