import assert from 'node:assert/strict'
import test from 'node:test'
import { searchChroniclingAmerica } from '../src/application/usecases/chroniclingAmerica.js'
import { ChroniclingAmericaClient, normalizeChroniclingAmericaSearchInput } from '../src/infrastructure/openApis/chroniclingAmericaClient.js'

test('Chronicling America client searches current LOC JSON API', async () => {
  const client = new ChroniclingAmericaClient({
    baseUrl: 'https://example.test',
    fetchImpl: (async input => {
      const url = new URL(String(input))
      assert.equal(url.pathname, '/collections/chronicling-america/')
      assert.equal(url.searchParams.get('fo'), 'json')
      assert.equal(url.searchParams.get('at'), 'results,pagination')
      assert.equal(url.searchParams.get('q'), 'lincoln')
      assert.equal(url.searchParams.get('c'), '20')
      assert.equal(url.searchParams.get('sp'), '2')
      assert.equal(url.searchParams.get('dates'), '1860/1865')
      return new Response(JSON.stringify(createChroniclingAmericaFixture()), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    }) as typeof fetch,
  })

  const response = await client.search({ query: 'lincoln', count: 20, page: 2, dates: '1860/1865' })
  assert.equal(response.items.length, 1)
  assert.equal(response.items[0]?.title, 'Image 2 of The Cass County Republican')
  assert.equal(response.items[0]?.onlineFormats[0], 'image')
  assert.equal(response.pagination.current, 2)
  assert.equal(response.pagination.total, 1249405)
})

test('Chronicling America usecase projects TUI-ready JSON', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async () => new Response(JSON.stringify(createChroniclingAmericaFixture()), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })) as typeof fetch
  try {
    const result = await searchChroniclingAmerica({ count: 5 })
    assert.equal(result.kind, 'chroniclingamerica.search')
    assert.equal(result.api.provider, 'chroniclingamerica')
    assert.equal(result.api.authentication, 'none')
    assert.equal(result.api.usesBrowserClickstream, false)
    assert.equal(result.query.query, 'lincoln')
    assert.equal(result.query.count, 5)
    assert.equal(result.pagination.returned, 1)
    assert.equal(result.pagination.maxCount, 1000)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('Chronicling America normalizer enforces documented bounds', () => {
  assert.deepEqual(normalizeChroniclingAmericaSearchInput(), { query: 'lincoln', count: 1000, page: 1 })
  assert.deepEqual(normalizeChroniclingAmericaSearchInput({ query: 'vote', count: 10, page: 3, dates: '1860/1865' }), { query: 'vote', count: 10, page: 3, dates: '1860/1865' })
  assert.throws(() => normalizeChroniclingAmericaSearchInput({ count: 1001 }), /--count must be an integer/)
  assert.throws(() => normalizeChroniclingAmericaSearchInput({ dates: 'bad-date' }), /--dates/)
})

test('Chronicling America client explains Cloudflare HTML challenges', async () => {
  const client = new ChroniclingAmericaClient({
    baseUrl: 'https://example.test',
    fetchImpl: (async () => new Response('<!DOCTYPE html><title>Just a moment...</title>', {
      status: 403,
      headers: { 'content-type': 'text/html; charset=UTF-8', 'server': 'cloudflare', 'cf-mitigated': 'challenge' },
    })) as typeof fetch,
  })

  await assert.rejects(
    () => client.search({ query: 'lincoln', count: 5, page: 1 }),
    /Cloudflare challenge HTML page/u,
  )
})

function createChroniclingAmericaFixture(): Record<string, unknown> {
  return {
    pagination: {
      current: 2,
      from: 21,
      to: 21,
      perpage: 20,
      total: 1249405,
      next: 'https://www.loc.gov/collections/chronicling-america/?c=20&fo=json&q=lincoln&sp=3',
      previous: 'https://www.loc.gov/collections/chronicling-america/?c=20&fo=json&q=lincoln&sp=1',
    },
    results: [
      {
        id: 'http://www.loc.gov/resource/sn85033611/1860-11-08/ed-1/?sp=2',
        title: 'Image 2 of The Cass County Republican',
        date: '1860-11-08',
        digitized: true,
        url: 'https://www.loc.gov/resource/sn85033611/1860-11-08/ed-1/?sp=2&q=lincoln',
        description: ['Abraham Lincoln election newspaper page.'],
        image_url: ['https://tile.loc.gov/example.jpg#h=296&w=231'],
        subject: ['newspapers', 'michigan'],
        location: ['dowagiac', 'michigan'],
        partof: ['chronicling america'],
        original_format: ['newspaper'],
        online_format: ['image', 'pdf', 'online text'],
      },
    ],
  }
}
