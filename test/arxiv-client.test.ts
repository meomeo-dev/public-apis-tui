import assert from 'node:assert/strict'
import test from 'node:test'
import { searchArxiv, getArxivPaper } from '../src/application/usecases/arxiv.js'
import { ArxivClient } from '../src/infrastructure/openApis/arxivClient.js'

const sampleFeed = `<?xml version='1.0' encoding='UTF-8'?>
<feed xmlns:opensearch="http://a9.com/-/spec/opensearch/1.1/"
  xmlns:arxiv="http://arxiv.org/schemas/atom"
  xmlns="http://www.w3.org/2005/Atom">
  <id>https://arxiv.org/api/test</id>
  <title>arXiv Query: search_query=all:electron</title>
  <updated>2026-05-10T13:08:37Z</updated>
  <link href="https://arxiv.org/api/query?search_query=all:electron"
    type="application/atom+xml"/>
  <opensearch:itemsPerPage>2</opensearch:itemsPerPage>
  <opensearch:totalResults>12</opensearch:totalResults>
  <opensearch:startIndex>0</opensearch:startIndex>
  <entry>
    <id>http://arxiv.org/abs/2101.00001v1</id>
    <title>Etat de l'art sur l'application des bandits multi-bras</title>
    <updated>2021-01-04T18:12:28Z</updated>
    <link href="https://arxiv.org/abs/2101.00001v1" rel="alternate"
      type="text/html"/>
    <link href="https://arxiv.org/pdf/2101.00001v1" rel="related"
      type="application/pdf" title="pdf"/>
    <summary>The Multi-armed bandit offer the advantage to learn and exploit.</summary>
    <category term="cs.LG" scheme="http://arxiv.org/schemas/atom"/>
    <category term="cs.AI" scheme="http://arxiv.org/schemas/atom"/>
    <published>2021-01-04T18:12:28Z</published>
    <arxiv:comment>in French</arxiv:comment>
    <arxiv:primary_category term="cs.LG"/>
    <author><name>Djallel Bouneffouf</name></author>
  </entry>
</feed>`

test('arXiv client sends documented query params and parses Atom feed', async () => {
  const requests: string[] = []
  const client = new ArxivClient({
    baseUrl: 'https://arxiv.test',
    fetchImpl: (async input => {
      requests.push(String(input))
      return new Response(sampleFeed, {
        status: 200,
        headers: { 'content-type': 'application/atom+xml' },
      })
    }) as typeof fetch,
  })

  const feed = await client.query({
    searchQuery: 'all:electron',
    start: 10,
    maxResults: 2,
    sortBy: 'submittedDate',
    sortOrder: 'descending',
  })

  assert.equal(
    requests[0],
    [
      'https://arxiv.test/api/query?search_query=all%3Aelectron',
      '&start=10&max_results=2&sortBy=submittedDate&sortOrder=descending',
    ].join(''),
  )
  assert.equal(feed.totalResults, 12)
  assert.equal(feed.itemsPerPage, 2)
  assert.equal(feed.entries[0]?.arxivId, '2101.00001v1')
  assert.equal(feed.entries[0]?.primaryCategory, 'cs.LG')
  assert.equal(feed.entries[0]?.authors[0], 'Djallel Bouneffouf')
  assert.equal(feed.entries[0]?.pdfUrl, 'https://arxiv.org/pdf/2101.00001v1')
})

test('arXiv usecases project no-auth metadata and bounded summaries', async () => {
  const originalFetch = globalThis.fetch
  const requests: string[] = []
  globalThis.fetch = (async input => {
    requests.push(String(input))
    return new Response(sampleFeed, {
    status: 200,
    headers: { 'content-type': 'application/atom+xml' },
    })
  }) as typeof fetch
  try {
    const search = await searchArxiv({
      query: 'all:electron',
      category: 'cs.LG',
      maxResults: 2,
      summaryLength: 20,
    })
    assert.equal(search.kind, 'arxiv.search')
    assert.equal(search.api.authentication, 'none')
    assert.equal(search.api.usesBrowserClickstream, false)
    assert.equal(search.query.category, 'cs.LG')
    assert.equal(search.query.maxResults, 2)
    assert.match(requests[0] ?? '', /search_query=cat%3Acs\.LG\+AND\+/u)
    assert.doesNotMatch(requests[0] ?? '', /%2BAND%2B/u)
    assert.equal(search.papers[0]?.summary, 'The Multi-armed ban…')

    const paper = await getArxivPaper({ id: '2101.00001', summaryLength: 0 })
    assert.equal(paper.kind, 'arxiv.paper')
    assert.equal(paper.found, true)
    assert.equal(paper.paper?.summary, '')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('arXiv usecases validate bounds and identifiers', async () => {
  await assert.rejects(() => searchArxiv({ maxResults: 101 }), /1 to 100/u)
  await assert.rejects(() => searchArxiv({ start: -1 }), /0 to 30000/u)
  await assert.rejects(() => searchArxiv({ sortBy: 'updated' }), /sort-by/u)
  await assert.rejects(() => getArxivPaper({ id: 'not valid id' }), /identifier/u)
})

test('arXiv client surfaces non-Atom failures', async () => {
  const client = new ArxivClient({
    fetchImpl: (async () => new Response('bad request', {
      status: 400,
      statusText: 'Bad Request',
      headers: { 'content-type': 'text/plain' },
    })) as typeof fetch,
  })

  await assert.rejects(
    () => client.query({ start: -1 }),
    /bad request/u,
  )
})

test('arXiv client explains upstream rate limiting clearly', async () => {
  const client = new ArxivClient({
    fetchImpl: (async () => new Response('Rate exceeded.', {
      status: 429,
      statusText: 'Too Many Requests',
      headers: { 'content-type': 'text/html' },
    })) as typeof fetch,
  })

  await assert.rejects(
    () => client.query({ searchQuery: 'all:electron', maxResults: 1 }),
    /arXiv API is currently rate limiting this runtime/u,
  )
})
