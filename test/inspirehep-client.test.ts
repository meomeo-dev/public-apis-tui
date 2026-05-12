import assert from 'node:assert/strict'
import test from 'node:test'
import {
  getInspireHepRecord,
  normalizeInspireHepRecordInput,
  normalizeInspireHepSearchInput,
  searchInspireHep,
} from '../src/application/usecases/inspireHep.js'
import { InspireHepClient } from '../src/infrastructure/openApis/inspireHepClient.js'

const searchFixture = {
  hits: {
    total: 123,
    hits: [
      createInspireHepRecordFixture(),
    ],
  },
  links: {
    self: 'https://inspirehep.net/api/literature/?q=higgs&size=1&page=1',
    next: 'https://inspirehep.net/api/literature/?q=higgs&size=1&page=2',
  },
}

test('INSPIRE HEP client calls curated literature JSON endpoints', async () => {
  const requestedUrls: URL[] = []
  const client = new InspireHepClient({
    baseUrl: 'https://inspirehep.test',
    fetchImpl: (async input => {
      const url = new URL(String(input))
      requestedUrls.push(url)
      return jsonResponse(
        url.pathname === '/api/literature/4328'
          ? createInspireHepRecordFixture()
          : searchFixture,
        {
          'x-ratelimit-limit': '15',
          'x-ratelimit-remaining': '14',
        },
      )
    }) as typeof fetch,
  })

  const search = await client.searchLiterature({
    q: 'higgs',
    sort: 'mostcited',
    size: 2,
    page: 3,
    fields: 'titles,authors.full_name,control_number',
  })
  const record = await client.getLiteratureRecord(4328)

  assert.equal(requestedUrls[0]?.pathname, '/api/literature')
  assert.equal(requestedUrls[0]?.searchParams.get('q'), 'higgs')
  assert.equal(requestedUrls[0]?.searchParams.get('sort'), 'mostcited')
  assert.equal(requestedUrls[0]?.searchParams.get('size'), '2')
  assert.equal(requestedUrls[0]?.searchParams.get('page'), '3')
  assert.equal(
    requestedUrls[0]?.searchParams.get('fields'),
    'titles,authors.full_name,control_number',
  )
  assert.equal(search.total, 123)
  assert.equal(search.hits[0]?.id, '4328')
  assert.equal(search.rateLimit.remaining, '14')

  assert.equal(requestedUrls[1]?.pathname, '/api/literature/4328')
  assert.equal(record.record.metadata.control_number, 4328)
})

test('INSPIRE HEP usecases project metadata and open API boundaries', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async input => {
    const url = new URL(String(input))
    if (url.pathname === '/api/literature/4328') {
      return jsonResponse(createInspireHepRecordFixture())
    }
    assert.equal(url.searchParams.get('q'), 'higgs')
    assert.equal(url.searchParams.get('size'), '2')
    assert.equal(url.searchParams.get('page'), '1')
    assert.match(url.searchParams.get('fields') ?? '', /citation_count/u)
    return jsonResponse(searchFixture)
  }) as typeof fetch

  try {
    const search = await searchInspireHep({
      query: 'higgs',
      sort: 'mostrecent',
      limit: 2,
      abstractLength: 80,
    })
    assert.equal(search.kind, 'inspirehep.search')
    assert.equal(search.api.authentication, 'none')
    assert.equal(search.api.usesBrowserClickstream, false)
    assert.equal(search.query.fields?.includes('authors.full_name'), true)
    assert.equal(search.pagination.total, 123)
    assert.equal(search.pagination.nextPage, 2)
    assert.equal(search.papers[0]?.title, 'Partial Symmetries of Weak Interactions')
    assert.deepEqual(search.papers[0]?.authors, ['Glashow, S.L.'])
    assert.deepEqual(search.papers[0]?.dois, ['10.1016/0029-5582(61)90469-2'])
    assert.equal(search.papers[0]?.citationCount, 10459)

    const record = await getInspireHepRecord({ recid: 4328, abstractLength: 0 })
    assert.equal(record.kind, 'inspirehep.record')
    assert.equal(record.paper.recid, 4328)
    assert.equal(record.paper.abstract, undefined)
    assert.equal(record.paper.links.record, 'https://inspirehep.net/literature/4328')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('INSPIRE HEP normalization rejects unbounded or invalid parameters', () => {
  assert.deepEqual(normalizeInspireHepSearchInput({}), {
    q: 'higgs',
    sort: undefined,
    size: 10,
    page: 1,
    fields: normalizeInspireHepSearchInput({}).fields,
    abstractLength: 500,
  })
  assert.deepEqual(normalizeInspireHepRecordInput({}), {
    recid: 4328,
    abstractLength: 500,
  })
  assert.throws(
    () => normalizeInspireHepSearchInput({ limit: 51 }),
    /INSPIRE HEP --limit must be an integer from 1 to 50/u,
  )
  assert.throws(
    () => normalizeInspireHepSearchInput({ page: 401 }),
    /INSPIRE HEP --page must be an integer from 1 to 400/u,
  )
  assert.throws(
    () => normalizeInspireHepSearchInput({ sort: 'relevance' }),
    /INSPIRE HEP --sort must be mostrecent or mostcited/u,
  )
  assert.throws(
    () => normalizeInspireHepRecordInput({ recid: 0 }),
    /INSPIRE HEP --recid must be a positive integer record id/u,
  )
  assert.equal(normalizeInspireHepSearchInput({ query: '' }).q, 'higgs')
  assert.equal(normalizeInspireHepSearchInput({ sort: '' }).sort, undefined)
})

test('INSPIRE HEP client surfaces Cloudflare challenge HTML clearly', async () => {
  const client = new InspireHepClient({
    baseUrl: 'https://inspirehep.test',
    fetchImpl: (async () =>
      new Response('<!DOCTYPE html><title>Just a moment...</title>', {
        status: 403,
        statusText: 'Forbidden',
        headers: {
          'content-type': 'text/html; charset=UTF-8',
          'server': 'cloudflare',
          'cf-mitigated': 'challenge',
        },
      })) as typeof fetch,
  })

  await assert.rejects(
    () =>
      client.searchLiterature({
        q: 'higgs',
        size: 1,
        page: 1,
      }),
    /Cloudflare challenge HTML/u,
  )
})

function createInspireHepRecordFixture(): Record<string, unknown> {
  return {
    id: '4328',
    created: '1982-01-01T00:00:00+00:00',
    updated: '2023-03-09T12:32:12.611268+00:00',
    links: {
      json: 'https://inspirehep.net/api/literature/4328?format=json',
      citations: 'https://inspirehep.net/api/literature/?q=refersto:recid:4328',
      bibtex: 'https://inspirehep.net/api/literature/4328?format=bibtex',
    },
    metadata: {
      control_number: 4328,
      citation_count: 10459,
      citation_count_without_self_citations: 10441,
      titles: [{ title: 'Partial Symmetries of Weak Interactions' }],
      authors: [{ full_name: 'Glashow, S.L.' }],
      publication_info: [
        {
          year: 1961,
          page_start: '579',
          page_end: '588',
          journal_title: 'Nucl.Phys.',
          journal_volume: '22',
        },
      ],
      dois: [{ value: '10.1016/0029-5582(61)90469-2' }],
      arxiv_eprints: [{ value: 'hep-ph/0000001', categories: ['hep-ph'] }],
      primary_arxiv_category: 'hep-ph',
      inspire_categories: [{ term: 'Phenomenology-HEP' }],
      document_type: ['article'],
      texkeys: ['Glashow:1961tr'],
      abstracts: [
        {
          value: [
            'Weak and electromagnetic interactions of the leptons are',
            'examined under the hypothesis that the weak interactions are',
            'mediated by vector bosons.',
          ].join(' '),
        },
      ],
      earliest_date: '1961',
    },
  }
}

function jsonResponse(
  value: unknown,
  headers: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(value), {
    status: 200,
    headers: { 'content-type': 'application/json', ...headers },
  })
}
