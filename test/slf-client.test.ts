import assert from 'node:assert/strict'
import test from 'node:test'
import { lookupSlf } from '../src/application/usecases/slf.js'
import { SlfClient, normalizeSlfLookupInput } from '../src/infrastructure/openApis/slfClient.js'

const fixture = {
  a: {
    stadt: ['Aalen', 'Aachen', 'Amberg'],
    land: ['Albanien', 'Armenien'],
    fluss: ['Aabach'],
    name: ['Anna'],
    beruf: ['Arzt'],
    tier: ['Affe'],
    marke: ['Audi'],
    pflanze: ['Ahorn'],
  },
  b: {
    stadt: ['Berlin'],
    land: ['Belgien', 'Brasilien'],
  },
}

test('SLF client reads bounded values and categories from static JSON', async () => {
  const client = new SlfClient({
    fetchImpl: (async input => {
      assert.equal(String(input), 'https://slftool.github.io/data.json')
      return jsonResponse(fixture)
    }) as typeof fetch,
  })

  const result = await client.lookup({ letter: 'a', category: 'stadt', limit: 2 })
  assert.deepEqual(result.values, ['Aalen', 'Aachen'])
  assert.deepEqual(result.availableCategories, ['stadt', 'land', 'fluss', 'name', 'beruf', 'tier', 'marke', 'pflanze'])
})

test('SLF usecase projects no-auth static JSON metadata', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async () => jsonResponse(fixture)) as typeof fetch
  try {
    const result = await lookupSlf({ letter: 'b', category: 'land', limit: 1 })
    assert.equal(result.kind, 'slf.lookup')
    assert.equal(result.api.authentication, 'none')
    assert.equal(result.api.usesBrowserClickstream, false)
    assert.equal(result.api.transport, 'HTTPS static JSON')
    assert.deepEqual(result.values, ['Belgien'])
    assert.deepEqual(result.count, { returned: 1, maxLimit: 50 })
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('SLF normalizer enforces letter, category, and limit bounds', () => {
  assert.deepEqual(normalizeSlfLookupInput({}), { letter: 'a', category: 'stadt', limit: 10 })
  assert.deepEqual(normalizeSlfLookupInput({ letter: ' Ä ', category: 'LAND', limit: 2 }), { letter: 'ä', category: 'land', limit: 2 })
  assert.throws(() => normalizeSlfLookupInput({ letter: 'ab' }), /--letter/u)
  assert.throws(() => normalizeSlfLookupInput({ category: 'unknown' }), /--category/u)
  assert.throws(() => normalizeSlfLookupInput({ limit: 51 }), /between 1 and 50/u)
})

test('SLF client rejects non-JSON provider failures', async () => {
  const client = new SlfClient({
    fetchImpl: (async () => new Response('<html>not json</html>', { status: 200, headers: { 'content-type': 'text/html' } })) as typeof fetch,
  })
  await assert.rejects(() => client.lookup({ letter: 'a', category: 'stadt', limit: 1 }), /non-JSON/u)
})

test('SLF client surfaces Cloudflare challenge HTML clearly', async () => {
  const client = new SlfClient({
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
  await assert.rejects(() => client.lookup({ letter: 'a', category: 'stadt', limit: 1 }), /Cloudflare challenge HTML page/u)
})

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
}
