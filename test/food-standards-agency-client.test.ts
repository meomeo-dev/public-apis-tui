import assert from 'node:assert/strict'
import test from 'node:test'
import { listFoodStandardsAgencyAuthorities, searchFoodStandardsAgencyEstablishments } from '../src/application/usecases/foodStandardsAgency.js'
import {
  FoodStandardsAgencyClient,
  normalizeFoodStandardsAgencyAuthoritiesInput,
  normalizeFoodStandardsAgencyEstablishmentsInput,
} from '../src/infrastructure/openApis/foodStandardsAgencyClient.js'
import { RuntimeFailure } from '../src/shared/errors/runtimeFailure.js'

test('Food Standards Agency client reads authorities and establishments JSON', async () => {
  const client = new FoodStandardsAgencyClient({
    fetchImpl: (async (input, init) => {
      const url = new URL(String(input))
      assert.equal(init?.headers !== undefined && (init.headers as Record<string, string>)['x-api-version'], '2')
      if (url.pathname === '/Authorities/basic') {
        return jsonResponse(createAuthoritiesFixture())
      }
      assert.equal(url.pathname, '/Establishments')
      assert.equal(url.searchParams.get('name'), 'coffee')
      assert.equal(url.searchParams.get('localAuthorityId'), '197')
      assert.equal(url.searchParams.get('ratingKey'), 'fhrs_5_en-gb')
      assert.equal(url.searchParams.get('pageSize'), '2')
      assert.equal(url.searchParams.get('pageNumber'), '1')
      return jsonResponse(createEstablishmentsFixture())
    }) as typeof fetch,
  })

  const authorities = await client.listAuthorities({ limit: 1 })
  assert.equal(authorities.authorities.length, 1)
  assert.equal(authorities.authorities[0]?.name, 'Aberdeen City')
  assert.equal(authorities.authorities[0]?.establishmentCount, 2261)

  const establishments = await client.searchEstablishments({
    query: 'coffee',
    localAuthorityId: 197,
    ratingValue: '5',
    pageSize: 2,
    pageNumber: 1,
  })
  assert.equal(establishments.establishments[0]?.businessName, 'Coffey Coffee')
  assert.equal(establishments.establishments[0]?.scores.hygiene, 0)
  assert.equal(establishments.meta.totalCount, 11613)
})

test('Food Standards Agency usecases project TUI-ready JSON', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async input => {
    const url = new URL(String(input))
    return jsonResponse(url.pathname === '/Authorities/basic' ? createAuthoritiesFixture() : createEstablishmentsFixture())
  }) as typeof fetch

  try {
    const authorities = await listFoodStandardsAgencyAuthorities({ limit: 5000 })
    assert.equal(authorities.kind, 'foodstandardsagency.authorities')
    assert.equal(authorities.api.authentication, 'none')
    assert.equal(authorities.api.usesBrowserClickstream, false)
    assert.equal(authorities.api.apiVersion, '2')
    assert.equal(authorities.pagination.maxLimit, 5000)
    assert.equal(authorities.authorities[0]?.name, 'Aberdeen City')

    const establishments = await searchFoodStandardsAgencyEstablishments({ query: 'coffee', pageSize: 5000 })
    assert.equal(establishments.kind, 'foodstandardsagency.establishments')
    assert.equal(establishments.api.authentication, 'none')
    assert.equal(establishments.api.usesBrowserClickstream, false)
    assert.equal(establishments.pagination.maxPageSize, 5000)
    assert.equal(establishments.establishments[0]?.businessName, 'Coffey Coffee')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('Food Standards Agency normalizers enforce curated bounds and defaults', () => {
  assert.deepEqual(normalizeFoodStandardsAgencyAuthoritiesInput({}), { limit: 5000 })
  assert.deepEqual(normalizeFoodStandardsAgencyAuthoritiesInput({ limit: 1 }), { limit: 1 })
  assert.deepEqual(normalizeFoodStandardsAgencyEstablishmentsInput({}), { query: 'coffee', pageSize: 5000, pageNumber: 1 })
  assert.deepEqual(normalizeFoodStandardsAgencyEstablishmentsInput({ query: ' tea ', ratingValue: 'Pass', pageSize: 10, pageNumber: 2 }), {
    query: 'tea',
    ratingValue: 'Pass',
    pageSize: 10,
    pageNumber: 2,
  })
  assert.throws(() => normalizeFoodStandardsAgencyAuthoritiesInput({ limit: 5001 }), RuntimeFailure)
  assert.throws(() => normalizeFoodStandardsAgencyEstablishmentsInput({ pageSize: 5001 }), RuntimeFailure)
  assert.throws(() => normalizeFoodStandardsAgencyEstablishmentsInput({ pageNumber: 0 }), RuntimeFailure)
})

function jsonResponse(value: unknown): Response {
  return new Response(JSON.stringify(value), { status: 200, headers: { 'content-type': 'application/json' } })
}

function createAuthoritiesFixture(): Record<string, unknown> {
  return {
    authorities: [
      {
        LocalAuthorityId: 197,
        LocalAuthorityIdCode: '760',
        Name: 'Aberdeen City',
        EstablishmentCount: 2261,
        SchemeType: 2,
      },
    ],
    meta: {
      itemCount: 1,
      returncode: 'OK',
    },
    links: [],
  }
}

function createEstablishmentsFixture(): Record<string, unknown> {
  return {
    establishments: [
      {
        FHRSID: 1830226,
        BusinessName: 'Coffey Coffee',
        BusinessType: 'Mobile caterer',
        LocalAuthorityName: 'Darlington',
        LocalAuthorityCode: '874',
        RatingValue: '5',
        RatingDate: '2025-05-06T00:00:00',
        PostCode: 'DL2',
        SchemeType: 'FHRS',
        geocode: { longitude: null, latitude: null },
        scores: { Hygiene: 0, Structural: 0, ConfidenceInManagement: 0 },
      },
    ],
    meta: {
      dataSource: 'ElasticSearch',
      extractDate: '2026-05-04T03:44:10.3359624+01:00',
      itemCount: 1,
      returncode: 'OK',
      totalCount: 11613,
      totalPages: 12,
      pageSize: 1000,
      pageNumber: 1,
    },
    links: [],
  }
}
