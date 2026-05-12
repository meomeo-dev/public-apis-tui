import assert from 'node:assert/strict'
import test from 'node:test'
import {
  listOsfNodes,
  listOsfPreprints,
  normalizeOsfNodesInput,
  normalizeOsfPreprintsInput,
} from '../src/application/usecases/osf.js'
import { OsfClient } from '../src/infrastructure/openApis/osfClient.js'

const nodesFixture = {
  data: [
    createNodeFixture(),
  ],
  links: {
    next: 'https://api.osf.io/v2/nodes/?page=2&page%5Bsize%5D=2',
    meta: { total: 23, per_page: 2 },
  },
  meta: { version: '2.0' },
}

const preprintsFixture = {
  data: [
    createPreprintFixture(),
  ],
  links: {
    next: 'https://api.osf.io/v2/preprints/?page=2&page%5Bsize%5D=2',
    meta: { total: 42, per_page: 2 },
  },
  meta: { version: '2.0' },
}

test('OSF client calls curated public JSON:API list endpoints', async () => {
  const requestedUrls: URL[] = []
  const client = new OsfClient({
    baseUrl: 'https://api.osf.test/v2',
    fetchImpl: (async input => {
      const url = new URL(String(input))
      requestedUrls.push(url)
      return jsonResponse(url.pathname.endsWith('/preprints/')
        ? preprintsFixture
        : nodesFixture)
    }) as typeof fetch,
  })

  const nodes = await client.listNodes({
    title: 'reproducibility',
    category: 'project',
    tags: 'open science',
    public: true,
    limit: 2,
    page: 3,
  })
  const preprints = await client.listPreprints({
    provider: 'psyarxiv',
    isPublished: true,
    limit: 2,
    page: 4,
  })

  assert.equal(requestedUrls[0]?.pathname, '/v2/nodes/')
  assert.equal(requestedUrls[0]?.searchParams.get('filter[title]'), 'reproducibility')
  assert.equal(requestedUrls[0]?.searchParams.get('filter[category]'), 'project')
  assert.equal(requestedUrls[0]?.searchParams.get('filter[tags]'), 'open science')
  assert.equal(requestedUrls[0]?.searchParams.get('filter[public]'), 'true')
  assert.equal(requestedUrls[0]?.searchParams.get('page[size]'), '2')
  assert.equal(requestedUrls[0]?.searchParams.get('page'), '3')
  assert.equal(nodes.total, 23)
  assert.equal(nodes.data[0]?.id, 'abcde')

  assert.equal(requestedUrls[1]?.pathname, '/v2/preprints/')
  assert.equal(requestedUrls[1]?.searchParams.get('filter[provider]'), 'psyarxiv')
  assert.equal(requestedUrls[1]?.searchParams.get('filter[is_published]'), 'true')
  assert.equal(requestedUrls[1]?.searchParams.get('page[size]'), '2')
  assert.equal(requestedUrls[1]?.searchParams.get('page'), '4')
  assert.equal(preprints.total, 42)
  assert.equal(preprints.data[0]?.id, 'xyz12_v1')
})

test('OSF usecases project metadata and public API boundaries', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async input => {
    const url = new URL(String(input))
    if (url.pathname.endsWith('/preprints/')) {
      assert.equal(url.searchParams.get('filter[provider]'), 'psyarxiv')
      return jsonResponse(preprintsFixture)
    }
    assert.equal(url.searchParams.get('filter[title]'), 'reproducibility')
    return jsonResponse(nodesFixture)
  }) as typeof fetch

  try {
    const nodes = await listOsfNodes({
      title: 'reproducibility',
      category: 'project',
      limit: 2,
      descriptionLength: 40,
    })
    assert.equal(nodes.kind, 'osf.nodes')
    assert.equal(nodes.api.authentication, 'none')
    assert.equal(nodes.api.usesBrowserClickstream, false)
    assert.equal(nodes.query.public, true)
    assert.equal(nodes.pagination.total, 23)
    assert.equal(nodes.pagination.nextPage, 2)
    assert.equal(nodes.nodes[0]?.id, 'abcde')
    assert.equal(nodes.nodes[0]?.tags[0], 'reproducibility')
    assert.match(nodes.nodes[0]?.description ?? '', /Reproducibility/)

    const preprints = await listOsfPreprints({
      provider: 'psyarxiv',
      limit: 2,
      descriptionLength: 0,
    })
    assert.equal(preprints.kind, 'osf.preprints')
    assert.equal(preprints.api.authentication, 'none')
    assert.equal(preprints.query.isPublished, true)
    assert.equal(preprints.preprints[0]?.provider, 'psyarxiv')
    assert.equal(preprints.preprints[0]?.description, undefined)
    assert.deepEqual(preprints.preprints[0]?.dataLinks, [
      'https://example.org/data',
    ])
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('OSF normalization rejects unbounded or invalid parameters', () => {
  assert.deepEqual(normalizeOsfNodesInput({}), {
    title: 'reproducibility',
    category: undefined,
    tags: undefined,
    public: true,
    limit: 10,
    page: 1,
    descriptionLength: 360,
  })
  assert.deepEqual(normalizeOsfPreprintsInput({}), {
    provider: 'psyarxiv',
    isPublished: true,
    limit: 10,
    page: 1,
    descriptionLength: 360,
  })
  assert.throws(
    () => normalizeOsfNodesInput({ limit: 51 }),
    /OSF --limit must be an integer from 1 to 50/u,
  )
  assert.throws(
    () => normalizeOsfNodesInput({ page: 501 }),
    /OSF --page must be an integer from 1 to 500/u,
  )
  assert.throws(
    () => normalizeOsfNodesInput({ category: 'paper' }),
    /OSF --category must be one of/u,
  )
  assert.throws(
    () => normalizeOsfPreprintsInput({ provider: '../secret' }),
    /OSF --provider must be a short provider slug/u,
  )
  assert.throws(
    () => normalizeOsfPreprintsInput({ descriptionLength: 1001 }),
    /OSF --description-length must be an integer from 0 to 1000/u,
  )
})

test('OSF client rejects upstream errors and malformed JSON:API pages', async () => {
  const failingClient = new OsfClient({
    baseUrl: 'https://api.osf.test/v2',
    fetchImpl: (async () => new Response(JSON.stringify({
      errors: [{ detail: 'Authentication credentials were not provided.' }],
    }), {
      status: 401,
      headers: { 'content-type': 'application/vnd.api+json' },
    })) as typeof fetch,
  })
  await assert.rejects(
    () => failingClient.listNodes({ limit: 1, page: 1 }),
    /Authentication credentials were not provided/u,
  )

  const malformedClient = new OsfClient({
    baseUrl: 'https://api.osf.test/v2',
    fetchImpl: (
      async () => jsonResponse({ data: { id: 'not-array' } })
    ) as typeof fetch,
  })
  await assert.rejects(
    () => malformedClient.listPreprints({ limit: 1, page: 1 }),
    /expected JSON:API page shape/u,
  )
})

test('OSF client surfaces Cloudflare challenge HTML clearly', async () => {
  const client = new OsfClient({
    baseUrl: 'https://api.osf.test/v2',
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
    () => client.listNodes({ limit: 1, page: 1 }),
    /Cloudflare challenge HTML page/u,
  )
})

function createNodeFixture(): Record<string, unknown> {
  return {
    id: 'abcde',
    type: 'nodes',
    attributes: {
      title: 'Reproducibility materials',
      description: 'Reproducibility package for an open science project.',
      category: 'project',
      public: true,
      date_created: '2026-01-01T00:00:00.000000',
      date_modified: '2026-05-01T00:00:00.000000',
      registration: false,
      preprint: true,
      fork: false,
      collection: false,
      tags: ['reproducibility', 'open science'],
      subjects: [[{ id: 'subj1', text: 'Social and Behavioral Sciences' }]],
    },
    relationships: {},
    links: {
      html: 'https://osf.io/abcde/',
      self: 'https://api.osf.io/v2/nodes/abcde/',
      iri: 'https://osf.io/abcde',
    },
  }
}

function createPreprintFixture(): Record<string, unknown> {
  return {
    id: 'xyz12_v1',
    type: 'preprints',
    attributes: {
      title: 'Open science preprint',
      description: 'A public preprint about reproducible research.',
      date_created: '2026-01-02T00:00:00.000000',
      date_modified: '2026-05-02T00:00:00.000000',
      date_published: '2026-05-02T00:00:00.000000',
      public: true,
      is_published: true,
      reviews_state: 'accepted',
      version: 1,
      is_latest_version: true,
      tags: ['open science'],
      data_links: ['https://example.org/data'],
      prereg_links: ['https://osf.io/prereg'],
      subjects: [[{ id: 'subj2', text: 'Psychology' }]],
    },
    relationships: {
      provider: { data: { id: 'psyarxiv', type: 'preprint-providers' } },
    },
    links: {
      html: 'https://osf.io/preprints/psyarxiv/xyz12_v1/',
      self: 'https://api.osf.io/v2/preprints/xyz12_v1/',
      preprint_doi: 'https://doi.org/10.31234/osf.io/xyz12',
      iri: 'https://osf.io/xyz12',
    },
  }
}

function jsonResponse(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { 'content-type': 'application/vnd.api+json' },
  })
}
