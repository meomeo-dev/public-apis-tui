import assert from 'node:assert/strict'
import test from 'node:test'
import { listOpenGovernmentUsKeywords, listOpenGovernmentUsOrganizations, searchOpenGovernmentUsDatasets } from '../src/application/usecases/openGovernmentUs.js'
import {
  OpenGovernmentUsClient,
  normalizeOpenGovernmentUsKeywordsInput,
  normalizeOpenGovernmentUsOrganizationsInput,
  normalizeOpenGovernmentUsSearchInput,
} from '../src/infrastructure/openApis/openGovernmentUsClient.js'
import { RuntimeFailure } from '../src/shared/errors/runtimeFailure.js'

test('Open Government USA client reads catalog search, organizations, and keywords', async () => {
  const client = new OpenGovernmentUsClient({
    fetchImpl: (async input => {
      const url = new URL(String(input))
      if (url.pathname === '/search') {
        assert.equal(url.searchParams.get('q'), 'business')
        assert.equal(url.searchParams.get('per_page'), '1000')
        assert.equal(url.searchParams.get('org_slug'), 'census')
        assert.equal(url.searchParams.get('after'), 'cursor-1')
        return jsonResponse(createSearchFixture())
      }
      if (url.pathname === '/api/organizations') {
        return jsonResponse(createOrganizationsFixture())
      }
      assert.equal(url.pathname, '/api/keywords')
      assert.equal(url.searchParams.get('size'), '1000')
      assert.equal(url.searchParams.get('min_count'), '1')
      return jsonResponse(createKeywordsFixture())
    }) as typeof fetch,
  })

  const search = await client.searchDatasets({ query: 'business', limit: 1000, orgSlug: 'census', after: 'cursor-1' })
  assert.equal(search.after, 'cursor-2')
  assert.equal(search.results[0]?.title, 'Small Business Size Standards')
  assert.equal(search.results[0]?.publisher, 'Small Business Administration')
  assert.equal(search.results[0]?.resources[0]?.accessUrl, 'https://data.sba.gov/dataset/small-business-size-standards')

  const organizations = await client.listOrganizations({ limit: 120 })
  assert.equal(organizations[0]?.slug, 'census')
  assert.equal(organizations[0]?.datasetCount, 284033)

  const keywords = await client.listKeywords({ size: 1000, minCount: 1 })
  assert.equal(keywords.total, 2)
  assert.equal(keywords.keywords[0]?.keyword, 'county or equivalent entity')
})

test('Open Government USA usecases project TUI-ready JSON', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async input => {
    const url = new URL(String(input))
    if (url.pathname === '/search') {
      return jsonResponse(createSearchFixture())
    }
    if (url.pathname === '/api/organizations') {
      return jsonResponse(createOrganizationsFixture())
    }
    return jsonResponse(createKeywordsFixture())
  }) as typeof fetch

  try {
    const search = await searchOpenGovernmentUsDatasets({})
    assert.equal(search.kind, 'opengovernmentusa.search')
    assert.equal(search.api.authentication, 'none')
    assert.equal(search.api.usesBrowserClickstream, false)
    assert.equal(search.pagination.maxLimit, 1000)
    assert.equal(search.datasets[0]?.keyword[0], 'SBA')

    const organizations = await listOpenGovernmentUsOrganizations({})
    assert.equal(organizations.kind, 'opengovernmentusa.organizations')
    assert.equal(organizations.api.authentication, 'none')
    assert.equal(organizations.pagination.maxLimit, 120)
    assert.equal(organizations.organizations[0]?.name, 'U.S. Census Bureau, Department of Commerce')

    const keywords = await listOpenGovernmentUsKeywords({})
    assert.equal(keywords.kind, 'opengovernmentusa.keywords')
    assert.equal(keywords.api.usesBrowserClickstream, false)
    assert.equal(keywords.pagination.maxLimit, 1000)
    assert.equal(keywords.keywords[1]?.count, 152182)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('Open Government USA normalizers enforce curated bounds', () => {
  assert.deepEqual(normalizeOpenGovernmentUsSearchInput({}), { query: 'business', limit: 1000, orgSlug: undefined, after: undefined })
  assert.deepEqual(normalizeOpenGovernmentUsSearchInput({ query: ' weather ', limit: 5, orgSlug: ' census ', after: ' cursor ' }), {
    query: 'weather',
    limit: 5,
    orgSlug: 'census',
    after: 'cursor',
  })
  assert.deepEqual(normalizeOpenGovernmentUsOrganizationsInput({}), { limit: 120 })
  assert.deepEqual(normalizeOpenGovernmentUsKeywordsInput({}), { size: 1000, minCount: 1 })
  assert.throws(() => normalizeOpenGovernmentUsSearchInput({ query: 'a' }), RuntimeFailure)
  assert.throws(() => normalizeOpenGovernmentUsSearchInput({ limit: 1001 }), RuntimeFailure)
  assert.throws(() => normalizeOpenGovernmentUsOrganizationsInput({ limit: 121 }), RuntimeFailure)
  assert.throws(() => normalizeOpenGovernmentUsKeywordsInput({ size: 1001 }), RuntimeFailure)
  assert.throws(() => normalizeOpenGovernmentUsKeywordsInput({ minCount: 0 }), RuntimeFailure)
})

function jsonResponse(value: unknown): Response {
  return new Response(JSON.stringify(value), { status: 200, headers: { 'content-type': 'application/json' } })
}

function createSearchFixture(): Record<string, unknown> {
  return {
    after: 'cursor-2',
    results: [
      {
        identifier: 'SBA-GCBD-2014-08-001',
        slug: 'small-business-size-standards',
        title: 'Small Business Size Standards',
        publisher: 'Small Business Administration',
        organization: {
          id: '842b8561-cf24-49cf-b901-66c6932a392b',
          name: 'Small Business Administration',
          organization_type: 'Federal Government',
          slug: 'sba',
        },
        keyword: ['SBA', 'small business', 'standards'],
        distribution_titles: ['Small Business Size Standards'],
        dcat: {
          accessLevel: 'public',
          landingPage: 'https://www.sba.gov/document/support--table-size-standards',
          distribution: [
            {
              title: 'Small Business Size Standards',
              accessURL: 'https://data.sba.gov/dataset/small-business-size-standards',
            },
          ],
        },
      },
    ],
  }
}

function createOrganizationsFixture(): Record<string, unknown> {
  return {
    organizations: [
      {
        dataset_count: 284033,
        id: 'fb3131aa-ef06-4a00-ad84-67d93a71d7e3',
        name: 'U.S. Census Bureau, Department of Commerce',
        organization_type: 'Federal Government',
        slug: 'census',
        source_count: 590,
      },
    ],
  }
}

function createKeywordsFixture(): Record<string, unknown> {
  return {
    keywords: [
      { count: 257307, keyword: 'county or equivalent entity' },
      { count: 152182, keyword: 'state fips code' },
    ],
    min_count: 1,
    size: 2,
    total: 2,
  }
}
