import assert from 'node:assert/strict'
import test from 'node:test'
import {
  searchGbifOccurrences,
  searchGbifSpecies,
  normalizeGbifOccurrencesInput,
  normalizeGbifSpeciesInput,
} from '../src/application/usecases/gbif.js'
import { GbifClient } from '../src/infrastructure/openApis/gbifClient.js'

const speciesFixture = {
  count: 2,
  limit: 2,
  offset: 0,
  endOfRecords: false,
  results: [
    {
      key: 2878688,
      nubKey: 2878688,
      scientificName: 'Quercus robur L.',
      canonicalName: 'Quercus robur',
      rank: 'SPECIES',
      taxonomicStatus: 'ACCEPTED',
      kingdom: 'Plantae',
      family: 'Fagaceae',
      genus: 'Quercus',
      species: 'Quercus robur',
      nameType: 'SCIENTIFIC',
      synonym: false,
      numOccurrences: 140762,
    },
  ],
}

const occurrenceFixture = {
  count: 140762,
  limit: 2,
  offset: 0,
  endOfRecords: false,
  results: [
    {
      key: 45123456,
      gbifID: '45123456',
      scientificName: 'Quercus robur L.',
      acceptedScientificName: 'Quercus robur L.',
      country: 'United Kingdom',
      countryCode: 'GB',
      decimalLatitude: 51.5,
      decimalLongitude: -0.12,
      eventDate: '2026-04-01',
      year: 2026,
      basisOfRecord: 'HUMAN_OBSERVATION',
      datasetKey: 'dataset-key',
      datasetTitle: 'Example occurrence dataset',
      publishingOrgKey: 'org-key',
      license: 'CC_BY_4_0',
      issues: ['GEODETIC_DATUM_ASSUMED_WGS84'],
      media: [{ identifier: 'https://example.com/image.jpg' }],
    },
  ],
}

test('GBIF client calls curated species and occurrence parameters', async () => {
  const requestedUrls: URL[] = []
  const client = new GbifClient({
    baseUrl: 'https://api.gbif.test/v1',
    fetchImpl: (async input => {
      const url = new URL(String(input))
      requestedUrls.push(url)
      return jsonResponse(
        url.pathname.endsWith('/species/search') ? speciesFixture : occurrenceFixture,
      )
    }) as typeof fetch,
  })

  const species = await client.searchSpecies({
    query: 'Quercus robur',
    rank: 'SPECIES',
    status: 'ACCEPTED',
    higherTaxonKey: 7707728,
    limit: 2,
    offset: 3,
  })
  const occurrences = await client.searchOccurrences({
    scientificName: 'Quercus robur',
    country: 'GB',
    year: '2026',
    basisOfRecord: 'HUMAN_OBSERVATION',
    hasCoordinate: true,
    limit: 2,
    offset: 4,
  })

  assert.equal(requestedUrls[0]?.pathname, '/v1/species/search')
  assert.equal(requestedUrls[0]?.searchParams.get('q'), 'Quercus robur')
  assert.equal(requestedUrls[0]?.searchParams.get('rank'), 'SPECIES')
  assert.equal(requestedUrls[0]?.searchParams.get('status'), 'ACCEPTED')
  assert.equal(requestedUrls[0]?.searchParams.get('higherTaxonKey'), '7707728')
  assert.equal(requestedUrls[0]?.searchParams.get('limit'), '2')
  assert.equal(requestedUrls[0]?.searchParams.get('offset'), '3')
  assert.equal(species.results[0]?.scientificName, 'Quercus robur L.')

  assert.equal(requestedUrls[1]?.pathname, '/v1/occurrence/search')
  assert.equal(requestedUrls[1]?.searchParams.get('scientificName'), 'Quercus robur')
  assert.equal(requestedUrls[1]?.searchParams.get('country'), 'GB')
  assert.equal(requestedUrls[1]?.searchParams.get('year'), '2026')
  assert.equal(requestedUrls[1]?.searchParams.get('basisOfRecord'), 'HUMAN_OBSERVATION')
  assert.equal(requestedUrls[1]?.searchParams.get('hasCoordinate'), 'true')
  assert.equal(requestedUrls[1]?.searchParams.get('limit'), '2')
  assert.equal(requestedUrls[1]?.searchParams.get('offset'), '4')
  assert.equal(occurrences.results[0]?.datasetTitle, 'Example occurrence dataset')
})

test('GBIF usecases project no-auth metadata and bounded summaries', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async input => {
    const url = new URL(String(input))
    if (url.pathname.endsWith('/species/search')) {
      assert.equal(url.searchParams.get('limit'), '2')
      return jsonResponse(speciesFixture)
    }
    assert.equal(url.searchParams.get('country'), 'GB')
    return jsonResponse(occurrenceFixture)
  }) as typeof fetch

  try {
    const species = await searchGbifSpecies({
      query: 'Quercus robur',
      rank: 'SPECIES',
      limit: 2,
    })
    assert.equal(species.kind, 'gbif.species')
    assert.equal(species.api.authentication, 'none')
    assert.equal(species.api.usesBrowserClickstream, false)
    assert.equal(species.query.limit, 2)
    assert.equal(species.pagination.total, 2)
    assert.equal(species.species[0]?.canonicalName, 'Quercus robur')

    const occurrences = await searchGbifOccurrences({
      scientificName: 'Quercus robur',
      country: 'gb',
      limit: 2,
    })
    assert.equal(occurrences.kind, 'gbif.occurrences')
    assert.equal(occurrences.api.authentication, 'none')
    assert.equal(occurrences.query.country, 'GB')
    assert.equal(occurrences.occurrences[0]?.mediaCount, 1)
    assert.deepEqual(occurrences.occurrences[0]?.coordinates, {
      latitude: 51.5,
      longitude: -0.12,
    })
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('GBIF input normalization rejects unbounded or invalid parameters', () => {
  assert.deepEqual(normalizeGbifSpeciesInput({}), {
    query: 'Quercus robur',
    rank: undefined,
    status: undefined,
    higherTaxonKey: undefined,
    limit: 10,
    offset: 0,
  })
  assert.throws(
    () => normalizeGbifSpeciesInput({ limit: 51 }),
    /GBIF --limit must be an integer from 1 to 50/u,
  )
  assert.throws(
    () => normalizeGbifSpeciesInput({ offset: 10001 }),
    /GBIF --offset must be an integer from 0 to 10000/u,
  )
  assert.throws(
    () => normalizeGbifOccurrencesInput({ country: 'GBR' }),
    /GBIF --country must be an ISO 3166-1 alpha-2 country code/u,
  )
  assert.throws(
    () => normalizeGbifOccurrencesInput({ year: 'twenty' }),
    /GBIF --year must be a four-digit year/u,
  )
})

test('GBIF client surfaces Cloudflare challenge HTML clearly', async () => {
  const client = new GbifClient({
    baseUrl: 'https://api.gbif.test/v1',
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
      client.searchSpecies({
        query: 'Quercus robur',
        limit: 1,
        offset: 0,
      }),
    /Cloudflare challenge HTML page/u,
  )
})

function jsonResponse(value: unknown): Response {
  return new Response(JSON.stringify(value), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })
}
