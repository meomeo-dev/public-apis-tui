import assert from 'node:assert/strict'
import test from 'node:test'
import {
  listShareSources,
  normalizeShareSearchInput,
  normalizeShareSourcesInput,
  searchShareWorks,
} from '../src/application/usecases/share.js'
import { ShareClient } from '../src/infrastructure/openApis/shareClient.js'

test('SHARE client calls curated search and source endpoints', async () => {
  const requests: Array<{ url: URL; init: RequestInit }> = []
  const client = new ShareClient({
    baseUrl: 'https://share.test/api/v2',
    fetchImpl: (async (input, init = {}) => {
      const url = new URL(String(input))
      requests.push({ url, init })
      if (url.pathname.endsWith('/_search')) return jsonResponse(searchFixture)
      return jsonResponse(sourcesFixture, 'application/vnd.api+json')
    }) as typeof fetch,
  })

  const search = await client.searchCreativeWorks({
    query: 'reproducibility',
    type: 'preprint',
    source: 'OSF',
    limit: 2,
    offset: 4,
    sort: 'date',
  })
  const sources = await client.listSources()

  assert.equal(requests[0]?.url.pathname, '/api/v2/search/creativeworks/_search')
  assert.equal(requests[0]?.init.method, 'POST')
  assert.equal(search.total, 42)
  assert.equal(search.hits[0]?.id, 'E00D0-60A-128')

  const body = JSON.parse(String(requests[0]?.init.body)) as Record<string, unknown>
  assert.equal(body.size, 2)
  assert.equal(body.from, 4)
  assert.equal(body.aggs, undefined)
  const query = body.query as Record<string, unknown>
  const bool = query.bool as Record<string, unknown>
  assert.ok(JSON.stringify(bool).includes('simple_query_string'))
  assert.ok(JSON.stringify(bool).includes('"type":"preprint"'))
  assert.ok(JSON.stringify(bool).includes('"sources":"OSF"'))

  assert.equal(requests[1]?.url.pathname, '/api/v2/sources/')
  assert.equal(requests[1]?.init.method, 'GET')
  assert.equal(sources.sources[0]?.attributes.name, 'OSF')
})

test('SHARE usecases project metadata and public API boundaries', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async input => {
    const url = new URL(String(input))
    if (url.pathname.endsWith('/_search')) return jsonResponse(searchFixture)
    return jsonResponse(sourcesFixture, 'application/vnd.api+json')
  }) as typeof fetch

  try {
    const search = await searchShareWorks({
      query: 'reproducibility',
      type: 'preprint',
      source: 'OSF',
      limit: 2,
      offset: 1,
      sort: 'date',
      descriptionLength: 24,
    })
    assert.equal(search.kind, 'share.search')
    assert.equal(search.api.authentication, 'none')
    assert.equal(search.api.usesBrowserClickstream, false)
    assert.equal(search.query.source, 'OSF')
    assert.equal(search.pagination.total, 42)
    assert.equal(search.pagination.nextOffset, 2)
    assert.equal(search.works[0]?.title, 'Reproducibility in Management Science')
    assert.equal(search.works[0]?.links.doi, 'http://dx.doi.org/10.31219/OSF.IO/MYDZV')
    assert.match(search.works[0]?.description ?? '', /Reproducibility work/u)

    const sources = await listShareSources({ query: 'open science', limit: 1 })
    assert.equal(sources.kind, 'share.sources')
    assert.equal(sources.api.provider, 'share')
    assert.equal(sources.pagination.upstreamReturned, 2)
    assert.equal(sources.sources[0]?.name, 'OSF')
    assert.equal(sources.sources[0]?.sourceConfigCount, 1)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('SHARE normalization rejects unsafe or unbounded parameters', () => {
  assert.deepEqual(normalizeShareSearchInput({}), {
    query: 'reproducibility',
    type: undefined,
    source: undefined,
    limit: 10,
    offset: 0,
    sort: 'relevance',
    descriptionLength: 320,
  })
  assert.deepEqual(normalizeShareSourcesInput({}), {
    query: '',
    limit: 10,
    offset: 0,
  })
  assert.throws(
    () => normalizeShareSearchInput({ limit: 51 }),
    /SHARE --limit must be an integer from 1 to 50/u,
  )
  assert.throws(
    () => normalizeShareSearchInput({ offset: 10001 }),
    /SHARE --offset must be an integer/u,
  )
  assert.throws(
    () => normalizeShareSearchInput({ type: 'dataset' }),
    /SHARE --type must be one of/u,
  )
  assert.throws(
    () => normalizeShareSearchInput({ query: '{"match_all":{}}' }),
    /must not contain raw JSON/u,
  )
  assert.throws(
    () => normalizeShareSearchInput({ source: '../secret' }),
    /letters, numbers/u,
  )
  assert.throws(
    () => normalizeShareSearchInput({ descriptionLength: 1001 }),
    /description-length must be an integer/u,
  )
})

test('SHARE client rejects upstream errors and malformed responses', async () => {
  const failingClient = new ShareClient({
    baseUrl: 'https://share.test/api/v2',
    fetchImpl: (
      async () => jsonResponse({ detail: 'bad request' }, 'application/json', 400)
    ) as typeof fetch,
  })
  await assert.rejects(
    () => failingClient.searchCreativeWorks({
      query: 'reproducibility',
      limit: 1,
      offset: 0,
      sort: 'relevance',
    }),
    /bad request/u,
  )

  const malformedClient = new ShareClient({
    baseUrl: 'https://share.test/api/v2',
    fetchImpl: (async () => jsonResponse({ data: {} })) as typeof fetch,
  })
  await assert.rejects(
    () => malformedClient.listSources(),
    /expected JSON:API page shape/u,
  )
})

test('SHARE client surfaces Cloudflare challenge HTML clearly', async () => {
  const client = new ShareClient({
    baseUrl: 'https://share.test/api/v2',
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
    () => client.listSources(),
    /Cloudflare challenge HTML page/u,
  )
})

const searchFixture = {
  took: 5,
  timed_out: false,
  hits: {
    total: { value: 42 },
    hits: [
      {
        _id: 'E00D0-60A-128',
        _score: 18.2,
        _source: {
          id: 'E00D0-60A-128',
          title: 'Reproducibility in Management Science',
          type: 'preprint',
          sources: ['OSF'],
          date: '2023-11-01T21:29:20.468782+00:00',
          date_published: '2023-11-01T21:29:20.468782+00:00',
          date_updated: '2024-01-01T00:00:00+00:00',
          description: 'Reproducibility work package and analysis materials.',
          contributors: ['Miloš Fišar', 'Christoph Huber'],
          funders: ['Open Science Fund'],
          publishers: ['OSF Preprints'],
          identifiers: [
            'http://osf.io/mydzv/',
            'http://dx.doi.org/10.31219/OSF.IO/MYDZV',
          ],
          tags: ['reproducibility', 'open science'],
          subjects: ['bepress|Business'],
          retracted: false,
          withdrawn: false,
        },
      },
    ],
  },
}

const sourcesFixture = {
  data: [
    {
      type: 'Source',
      id: '1',
      attributes: {
        name: 'OSF',
        homePage: 'https://osf.io/',
        longTitle: 'Open Science Framework',
      },
      relationships: {
        sourceConfigs: {
          meta: { count: 1 },
          data: [{ type: 'SourceConfig', id: '1' }],
        },
      },
      links: { self: 'https://share.osf.io/api/v2/sources/DC0DE-ADB-EEF/' },
    },
    {
      type: 'Source',
      id: '2',
      attributes: {
        name: 'zenodo',
        homePage: 'https://zenodo.org/',
        longTitle: 'Zenodo',
      },
      relationships: {
        sourceConfigs: { meta: { count: 1 }, data: [] },
      },
      links: { self: 'https://share.osf.io/api/v2/sources/2/' },
    },
  ],
  links: {
    next: 'https://share.osf.io/api/v2/sources/?page%5Bcursor%5D=cD0xMA%3D%3D',
    prev: null,
  },
}

function jsonResponse(
  value: unknown,
  contentType = 'application/json',
  status = 200,
): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { 'content-type': contentType },
  })
}
