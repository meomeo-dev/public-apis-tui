import assert from 'node:assert/strict'
import test from 'node:test'
import {
  normalizeIdigbioMediaInput,
  normalizeIdigbioRecordsInput,
  searchIdigbioMedia,
  searchIdigbioRecords,
} from '../src/application/usecases/idigbio.js'
import { IdigbioClient } from '../src/infrastructure/openApis/idigbioClient.js'

const recordsFixture = {
  itemCount: 2659,
  lastModified: '2026-04-23T17:36:48.691Z',
  items: [
    {
      uuid: 'record-uuid',
      type: 'records',
      etag: 'etag-record',
      data: {
        'dwc:scientificName': 'Quercus robur L.',
        'dwc:institutionCode': 'ALA',
        'dwc:collectionCode': 'V',
        'dwc:catalogNumber': '126679',
      },
      indexTerms: {
        scientificname: 'Quercus robur L.',
        family: 'Fagaceae',
        country: 'United States',
        stateprovince: 'California',
        eventdate: '2024-04-01',
        basisofrecord: 'PreservedSpecimen',
        geopoint: { lat: 34.05, lon: -118.24 },
        hasimage: true,
        mediarecords: ['media-uuid'],
      },
    },
  ],
}

const mediaFixture = {
  itemCount: 2602,
  lastModified: '2026-04-23T17:36:48.691Z',
  items: [
    {
      uuid: 'media-uuid',
      type: 'mediarecords',
      etag: 'etag-media',
      data: {
        'dcterms:title': 'ALA V126679: Quercus robur',
        'dc:type': 'image',
        'dc:format': 'image/jpeg',
        'dcterms:rights': 'CC BY',
        'ac:accessURI': 'https://example.org/media.jpg',
        'ac:attributionLinkURL': 'https://example.org/record',
      },
      indexTerms: {
        mediatype: 'images',
        format: 'image/jpeg',
        rights: 'CC BY',
        recordset: 'recordset-uuid',
        records: ['record-uuid'],
        hasspecimen: true,
      },
    },
  ],
}

test(
  'iDigBio client calls curated search endpoints with JSON query params',
  async () => {
    const requestedUrls: URL[] = []
    const client = new IdigbioClient({
      baseUrl: 'https://search.idigbio.test/v2',
      fetchImpl: (async input => {
        const url = new URL(String(input))
        requestedUrls.push(url)
        return jsonResponse(url.pathname.endsWith('/media/')
          ? mediaFixture
          : recordsFixture)
      }) as typeof fetch,
    })

    const records = await client.searchRecords({
      rq: { scientificname: 'Quercus robur', family: 'Fagaceae' },
      limit: 2,
      offset: 3,
    })
    const media = await client.searchMedia({
      rq: { scientificname: 'Quercus robur' },
      mq: { mediatype: 'images' },
      limit: 2,
      offset: 4,
    })

    assert.equal(requestedUrls[0]?.pathname, '/v2/search/records/')
    assert.deepEqual(
      JSON.parse(requestedUrls[0]?.searchParams.get('rq') ?? '{}'),
      { scientificname: 'Quercus robur', family: 'Fagaceae' },
    )
    assert.equal(requestedUrls[0]?.searchParams.get('limit'), '2')
    assert.equal(requestedUrls[0]?.searchParams.get('offset'), '3')
    assert.equal(records.items[0]?.uuid, 'record-uuid')

    assert.equal(requestedUrls[1]?.pathname, '/v2/search/media/')
    assert.deepEqual(
      JSON.parse(requestedUrls[1]?.searchParams.get('rq') ?? '{}'),
      { scientificname: 'Quercus robur' },
    )
    assert.deepEqual(
      JSON.parse(requestedUrls[1]?.searchParams.get('mq') ?? '{}'),
      { mediatype: 'images' },
    )
    assert.equal(media.items[0]?.uuid, 'media-uuid')
  },
)

test('iDigBio usecases project no-auth metadata and bounded summaries', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async input => {
    const url = new URL(String(input))
    if (url.pathname.endsWith('/records/')) {
      assert.equal(url.searchParams.get('limit'), '2')
      return jsonResponse(recordsFixture)
    }
    assert.equal(url.searchParams.get('limit'), '2')
    assert.deepEqual(
      JSON.parse(url.searchParams.get('mq') ?? '{}'),
      { mediatype: 'images', hasSpecimen: true },
    )
    return jsonResponse(mediaFixture)
  }) as typeof fetch

  try {
    const records = await searchIdigbioRecords({
      scientificName: 'Quercus robur',
      family: 'Fagaceae',
      country: 'United States',
      hasImage: true,
      limit: 2,
    })
    assert.equal(records.kind, 'idigbio.records')
    assert.equal(records.api.authentication, 'none')
    assert.equal(records.api.usesBrowserClickstream, false)
    assert.equal(records.pagination.total, 2659)
    assert.equal(records.records[0]?.scientificName, 'Quercus robur L.')
    assert.deepEqual(records.records[0]?.coordinates, {
      latitude: 34.05,
      longitude: -118.24,
    })

    const media = await searchIdigbioMedia({
      scientificName: 'Quercus robur',
      hasSpecimen: true,
      limit: 2,
    })
    assert.equal(media.kind, 'idigbio.media')
    assert.equal(media.api.authentication, 'none')
    assert.equal(media.query.mediaType, 'images')
    assert.equal(media.media[0]?.mediaType, 'images')
    assert.equal(media.media[0]?.accessUri, 'https://example.org/media.jpg')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('iDigBio input normalization rejects unbounded or invalid parameters', () => {
  assert.deepEqual(normalizeIdigbioRecordsInput({}), {
    rq: { scientificname: 'Quercus robur' },
    scientificName: 'Quercus robur',
    family: undefined,
    country: undefined,
    hasImage: undefined,
    limit: 10,
    offset: 0,
  })
  assert.deepEqual(normalizeIdigbioMediaInput({}), {
    rq: { scientificname: 'Quercus robur' },
    mq: { mediatype: 'images' },
    scientificName: 'Quercus robur',
    mediaType: 'images',
    hasSpecimen: undefined,
    limit: 10,
    offset: 0,
  })
  assert.throws(
    () => normalizeIdigbioRecordsInput({ limit: 51 }),
    /iDigBio --limit must be an integer from 1 to 50/u,
  )
  assert.throws(
    () => normalizeIdigbioMediaInput({ offset: 10001 }),
    /iDigBio --offset must be an integer from 0 to 10000/u,
  )
  assert.throws(
    () => normalizeIdigbioRecordsInput({ scientificName: 'x'.repeat(121) }),
    /iDigBio --scientific-name must be 120 characters or fewer/u,
  )
  assert.deepEqual(normalizeIdigbioRecordsInput({ scientificName: '' }), {
    rq: { scientificname: 'Quercus robur' },
    scientificName: 'Quercus robur',
    family: undefined,
    country: undefined,
    hasImage: undefined,
    limit: 10,
    offset: 0,
  })
  assert.deepEqual(normalizeIdigbioMediaInput({ mediaType: '' }), {
    rq: { scientificname: 'Quercus robur' },
    mq: { mediatype: 'images' },
    scientificName: 'Quercus robur',
    mediaType: 'images',
    hasSpecimen: undefined,
    limit: 10,
    offset: 0,
  })
})

test('iDigBio client surfaces Cloudflare challenge HTML clearly', async () => {
  const client = new IdigbioClient({
    baseUrl: 'https://search.idigbio.test/v2',
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
      client.searchRecords({
        rq: { scientificname: 'Quercus robur' },
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
