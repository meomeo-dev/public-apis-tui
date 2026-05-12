import assert from 'node:assert/strict'
import test from 'node:test'
import { getCrossrefWork, listCrossrefWorks } from '../src/application/usecases/crossref.js'
import { CrossrefClient } from '../src/infrastructure/openApis/crossrefClient.js'

test('Crossref client searches works with curated query parameters', async () => {
  let requestedUrl: URL | undefined
  const client = new CrossrefClient({
    fetchImpl: (async input => {
      requestedUrl = new URL(String(input))
      return jsonResponse(createWorksResponse(), 200, createRateHeaders())
    }) as typeof fetch,
  })

  const response = await client.listWorks({
    query: 'deep learning',
    rows: 2,
    offset: 10,
    filter: 'type:journal-article',
    sort: 'published',
    order: 'desc',
    select: 'DOI,title',
    mailto: 'dev@example.com',
  })

  assert.equal(requestedUrl?.href, 'https://api.crossref.org/works?query=deep+learning&rows=2&offset=10&filter=type%3Ajournal-article&sort=published&order=desc&select=DOI%2Ctitle&mailto=dev%40example.com')
  assert.equal(response.totalResults, 100)
  assert.equal(response.nextOffset, 11)
  assert.equal(response.rateLimit.limit, '5')
  assert.equal(response.items[0]?.DOI, '10.1000/test')
})

test('Crossref client fetches one work by encoded DOI', async () => {
  let requestedUrl: URL | undefined
  const client = new CrossrefClient({
    fetchImpl: (async input => {
      requestedUrl = new URL(String(input))
      return jsonResponse(createWorkResponse(), 200, createRateHeaders())
    }) as typeof fetch,
  })

  const response = await client.getWork({ doi: '10.1037/0003-066X.59.1.29' })

  assert.equal(requestedUrl?.href, 'https://api.crossref.org/works/10.1037%2F0003-066X.59.1.29')
  assert.equal(response.work.DOI, '10.1037/0003-066x.59.1.29')
})

test('Crossref usecases project metadata and rate-limit headers', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async input => {
    const url = new URL(String(input))
    return jsonResponse(url.pathname.includes('/works/') ? createWorkResponse() : createWorksResponse(), 200, createRateHeaders())
  }) as typeof fetch
  try {
    const works = await listCrossrefWorks({ query: 'metadata', rows: 1, offset: 0, filter: 'type:book-chapter' })
    assert.equal(works.kind, 'crossref.works')
    assert.equal(works.api.provider, 'crossref')
    assert.equal(works.api.authentication, 'none')
    assert.equal(works.api.usesBrowserClickstream, false)
    assert.equal(works.api.documentedMaximumRows, 1000)
    assert.equal(works.query.rows, 1)
    assert.equal(works.pagination.totalResults, 100)
    assert.equal(works.rateLimit.apiPool, 'public')
    assert.equal(works.works[0]?.title, 'Metadata for Everyone')

    const work = await getCrossrefWork({ doi: '10.1037/0003-066X.59.1.29' })
    assert.equal(work.kind, 'crossref.work')
    assert.equal(work.work.doi, '10.1037/0003-066x.59.1.29')
    assert.equal(work.work.authors[0], 'Oakley Ray')
    assert.equal(work.work.abstract, 'Short abstract.')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('Crossref usecases validate curated inputs', async () => {
  await assert.rejects(() => listCrossrefWorks({ query: 'x'.repeat(201) }), /200 characters/u)
  await assert.rejects(() => listCrossrefWorks({ rows: 1001 }), /documented maximum 1000/u)
  await assert.rejects(() => listCrossrefWorks({ offset: -1 }), /0 to 100000/u)
  await assert.rejects(() => listCrossrefWorks({ order: 'sideways' }), /asc or desc/u)
  await assert.rejects(() => listCrossrefWorks({ mailto: 'bad' }), /email address/u)
  await assert.rejects(() => getCrossrefWork({}), /--doi is required/u)
  await assert.rejects(() => getCrossrefWork({ doi: 'bad doi' }), /must look like a DOI/u)
  await assert.rejects(() => getCrossrefWork({ doi: 'not-a-doi' }), /must look like a DOI/u)
})

test('Crossref client surfaces API failures', async () => {
  const client = new CrossrefClient({
    fetchImpl: (async () => jsonResponse({ status: 'failed', message: 'Resource not found.' }, 404)) as typeof fetch,
  })

  await assert.rejects(
    () => client.getWork({ doi: '10.404/not-found' }),
    /Resource not found/u,
  )
})

function createWorksResponse(): Record<string, unknown> {
  return {
    status: 'ok',
    message: {
      'total-results': 100,
      'items-per-page': 1,
      items: [
        {
          DOI: '10.1000/test',
          title: ['Metadata for Everyone'],
          author: [{ given: 'Ada', family: 'Lovelace' }],
          publisher: 'Example Publisher',
          type: 'book-chapter',
          issued: { 'date-parts': [[2026, 5, 3]] },
          'container-title': ['Example Book'],
          'is-referenced-by-count': 12,
          URL: 'https://doi.org/10.1000/test',
        },
      ],
    },
  }
}

function createWorkResponse(): Record<string, unknown> {
  return {
    status: 'ok',
    message: {
      DOI: '10.1037/0003-066x.59.1.29',
      title: ['How the Mind Hurts and Heals the Body.'],
      author: [{ given: 'Oakley', family: 'Ray' }],
      publisher: 'American Psychological Association (APA)',
      type: 'journal-article',
      issued: { 'date-parts': [[2004]] },
      URL: 'https://doi.org/10.1037/0003-066x.59.1.29',
      abstract: '<jats:p>Short abstract.</jats:p>',
    },
  }
}

function createRateHeaders(): Headers {
  return new Headers({
    'content-type': 'application/json',
    'x-rate-limit-limit': '5',
    'x-rate-limit-interval': '1s',
    'x-concurrency-limit': '1',
    'x-api-pool': 'public',
  })
}

function jsonResponse(body: unknown, status = 200, headers = new Headers({ 'content-type': 'application/json' })): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers,
  })
}
