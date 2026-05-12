import assert from 'node:assert/strict'
import test from 'node:test'
import { getOpenLibraryWork, searchOpenLibrary } from '../src/application/usecases/openLibrary.js'
import { OpenLibraryClient } from '../src/infrastructure/openApis/openLibraryClient.js'

const searchFixture = {
  numFound: 1,
  start: 0,
  numFoundExact: true,
  docs: [
    {
      key: '/works/OL66554W',
      title: 'Pride and Prejudice',
      author_name: ['Jane Austen'],
      first_publish_year: 1813,
      language: ['eng'],
      edition_count: 4038,
      cover_i: 14348537,
      ebook_access: 'public',
      ia: ['prideprejudice00aust'],
      has_fulltext: true,
    },
  ],
}

const workFixture = {
  key: '/works/OL66554W',
  title: 'Pride and Prejudice',
  description: { type: '/type/text', value: 'A novel about manners and first impressions.' },
  subjects: ['Courtship', 'Sisters'],
  first_publish_date: '1813',
  authors: [{ author: { key: '/authors/OL21594A' } }],
  latest_revision: 117,
  revision: 117,
}

test('Open Library client searches with curated documented parameters', async () => {
  let requestedUrl: URL | undefined
  const client = new OpenLibraryClient({
    fetchImpl: (async input => {
      requestedUrl = new URL(String(input))
      return jsonResponse(searchFixture)
    }) as typeof fetch,
  })

  const response = await client.search({
    query: 'pride',
    title: 'prejudice',
    author: 'austen',
    subject: 'fiction',
    language: 'eng',
    hasFulltext: true,
    ebookAccess: 'public',
    sort: 'new',
    page: 2,
    limit: 500,
    offset: 100,
  })

  assert.equal(requestedUrl?.origin, 'https://openlibrary.org')
  assert.equal(requestedUrl?.pathname, '/search.json')
  assert.equal(requestedUrl?.searchParams.get('q'), 'pride')
  assert.equal(requestedUrl?.searchParams.get('title'), 'prejudice')
  assert.equal(requestedUrl?.searchParams.get('author'), 'austen')
  assert.equal(requestedUrl?.searchParams.get('subject'), 'fiction')
  assert.equal(requestedUrl?.searchParams.get('language'), 'eng')
  assert.equal(requestedUrl?.searchParams.get('has_fulltext'), 'true')
  assert.equal(requestedUrl?.searchParams.get('ebook_access'), 'public')
  assert.equal(requestedUrl?.searchParams.get('sort'), 'new')
  assert.equal(requestedUrl?.searchParams.get('page'), '2')
  assert.equal(requestedUrl?.searchParams.get('limit'), '100')
  assert.equal(requestedUrl?.searchParams.get('offset'), '100')
  assert.match(requestedUrl?.searchParams.get('fields') ?? '', /cover_i/)
  assert.equal(response.docs[0]?.coverUrl, 'https://covers.openlibrary.org/b/id/14348537-M.jpg')
})

test('Open Library client fetches one work by normalized key', async () => {
  let requestedUrl: URL | undefined
  const client = new OpenLibraryClient({
    fetchImpl: (async input => {
      requestedUrl = new URL(String(input))
      return jsonResponse(workFixture)
    }) as typeof fetch,
  })

  const work = await client.getWork({ workKey: 'OL66554W' })

  assert.equal(requestedUrl?.href, 'https://openlibrary.org/works/OL66554W.json')
  assert.equal(work.title, 'Pride and Prejudice')
  assert.equal(work.authors[0]?.key, '/authors/OL21594A')
})

test('Open Library client retries transient fetch failures', async () => {
  let attempts = 0
  const client = new OpenLibraryClient({
    fetchImpl: (async () => {
      attempts += 1
      if (attempts === 1) {
        throw new TypeError('fetch failed')
      }
      return jsonResponse(workFixture)
    }) as typeof fetch,
  })

  const work = await client.getWork({ workKey: 'OL66554W' })

  assert.equal(attempts, 2)
  assert.equal(work.title, 'Pride and Prejudice')
})

test('Open Library usecases project no-auth API metadata and cache-safe results', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async input => {
    const url = new URL(String(input))
    if (url.pathname === '/search.json') {
      assert.equal(url.searchParams.get('limit'), '2')
      return jsonResponse(searchFixture)
    }
    assert.equal(url.pathname, '/works/OL66554W.json')
    return jsonResponse(workFixture)
  }) as typeof fetch

  try {
    const search = await searchOpenLibrary({ query: 'pride', limit: 2 })
    assert.equal(search.kind, 'openlibrary.search')
    assert.equal((search.api as Record<string, unknown>).authentication, 'none')
    assert.equal((search.api as Record<string, unknown>).usesBrowserClickstream, false)
    assert.equal((search.pagination as Record<string, unknown>).limit, 2)
    assert.equal((search.works as Array<Record<string, unknown>>)[0]?.title, 'Pride and Prejudice')

    const work = await getOpenLibraryWork({ workKey: '/works/OL66554W.json' })
    assert.equal(work.kind, 'openlibrary.work')
    assert.equal((work.query as Record<string, unknown>).workKey, '/works/OL66554W')
    assert.equal((work.work as Record<string, unknown>).title, 'Pride and Prejudice')
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
