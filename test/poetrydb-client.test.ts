import assert from 'node:assert/strict'
import test from 'node:test'
import { getPoetryDbRandom, searchPoetryDb } from '../src/application/usecases/poetryDb.js'
import { PoetryDbClient } from '../src/infrastructure/openApis/poetryDbClient.js'

const poemFixture = [
  {
    title: 'Ozymandias',
    author: 'Percy Bysshe Shelley',
    linecount: '14',
    lines: ['I met a traveller from an antique land', 'Who said: Two vast and trunkless legs of stone'],
  },
]

test('PoetryDB client searches with documented field, poemcount, and output fields', async () => {
  let requestedUrl: URL | undefined
  const client = new PoetryDbClient({
    fetchImpl: (async input => {
      requestedUrl = new URL(String(input))
      return jsonResponse(poemFixture)
    }) as typeof fetch,
  })

  const poems = await client.search({ field: 'title', term: 'Ozymandias', exact: true, count: 500, includeLines: true })

  assert.equal(requestedUrl?.href, 'https://poetrydb.org/title,poemcount/Ozymandias:abs;20/author,title,linecount,lines.json')
  assert.equal(poems[0]?.title, 'Ozymandias')
  assert.equal(poems[0]?.linecount, 14)
})

test('PoetryDB client fetches random poems with metadata-only fields', async () => {
  let requestedUrl: URL | undefined
  const client = new PoetryDbClient({
    fetchImpl: (async input => {
      requestedUrl = new URL(String(input))
      return jsonResponse([{ title: 'Song', author: 'Christina Rossetti', linecount: '8' }])
    }) as typeof fetch,
  })

  const poems = await client.random({ count: 2, includeLines: false })

  assert.equal(requestedUrl?.href, 'https://poetrydb.org/random/2/author,title,linecount.json')
  assert.equal(poems[0]?.author, 'Christina Rossetti')
  assert.deepEqual(poems[0]?.lines, [])
})

test('PoetryDB search treats documented not-found response as an empty result set', async () => {
  const client = new PoetryDbClient({
    fetchImpl: (async () =>
      new Response(JSON.stringify({ status: 404, reason: 'Not found' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })) as typeof fetch,
  })

  const poems = await client.search({ field: 'title', term: 'zzzz-not-real-poem-title-zzzz', exact: true, count: 2 })

  assert.deepEqual(poems, [])
})

test('PoetryDB usecases project no-auth metadata and bounded poem lines', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async input => {
    const url = new URL(String(input))
    if (url.pathname.startsWith('/random/')) {
      assert.equal(url.pathname, '/random/1/author,title,linecount,lines.json')
      return jsonResponse(poemFixture)
    }
    assert.equal(url.pathname, '/title,poemcount/Ozymandias;20/author,title,linecount,lines.json')
    return jsonResponse(poemFixture)
  }) as typeof fetch

  try {
    const search = await searchPoetryDb({ lineLimit: 1 })
    assert.equal(search.kind, 'poetrydb.search')
    assert.equal((search.api as Record<string, unknown>).authentication, 'none')
    assert.equal((search.api as Record<string, unknown>).usesBrowserClickstream, false)
    assert.equal((search.poems as Array<Record<string, unknown>>)[0]?.title, 'Ozymandias')
    assert.deepEqual((search.poems as Array<Record<string, unknown>>)[0]?.lines, ['I met a traveller from an antique land'])
    assert.equal((search.poems as Array<Record<string, unknown>>)[0]?.truncatedLines, 1)

    const random = await getPoetryDbRandom({ includeLines: true })
    assert.equal(random.kind, 'poetrydb.random')
    assert.equal((random.query as Record<string, unknown>).count, 1)
    assert.equal((random.poems as Array<Record<string, unknown>>)[0]?.author, 'Percy Bysshe Shelley')
  } finally {
    globalThis.fetch = originalFetch
  }
})

function jsonResponse(value: unknown): Response {
  return new Response(JSON.stringify(value), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })
}
