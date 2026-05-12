import assert from 'node:assert/strict'
import test from 'node:test'
import {
  getItisRecord,
  normalizeItisRecordInput,
  normalizeItisSearchInput,
  searchItisScientificNames,
} from '../src/application/usecases/itis.js'
import {
  ItisClient,
  normalizeItisTsn,
} from '../src/infrastructure/openApis/itisClient.js'

test('ITIS client calls documented scientific-name JSON endpoint', async () => {
  let requestedUrl: URL | undefined
  const client = new ItisClient(
    'https://www.itis.gov/ITISWebService/jsonservice',
    (async input => {
      requestedUrl = new URL(String(input))
      return jsonResponse({
        scientificNames: [
          {
            tsn: '19405',
            combinedName: 'Quercus robur',
            author: 'L.',
            kingdom: 'Plantae',
          },
        ],
      })
    }) as typeof fetch,
  )

  const response = await client.searchByScientificName({ search: 'Quercus robur' })

  const expectedSearchUrl = [
    'https://www.itis.gov/ITISWebService/jsonservice',
    '/searchByScientificName?srchKey=Quercus+robur',
  ].join('')
  assert.equal(requestedUrl?.href, expectedSearchUrl)
  assert.deepEqual(response, [{
    tsn: '19405',
    combinedName: 'Quercus robur',
    author: 'L.',
    kingdom: 'Plantae',
  }])
})

test(
  'ITIS client rejects Cloudflare challenge HTML as upstream blocker',
  async () => {
    const client = new ItisClient(
      'https://www.itis.gov/ITISWebService/jsonservice',
      (async () => {
        return new Response('<!DOCTYPE html><title>Just a moment...</title>', {
          status: 403,
          statusText: 'Forbidden',
          headers: {
            'cf-mitigated': 'challenge',
            'content-type': 'text/html; charset=UTF-8',
            server: 'cloudflare',
          },
        })
      }) as typeof fetch,
    )

    await assert.rejects(
      () => client.searchByScientificName({ search: 'Quercus robur' }),
      /Cloudflare challenge HTML/u,
    )
  },
)

test('ITIS client rejects empty upstream responses clearly', async () => {
  const client = new ItisClient(
    'https://www.itis.gov/ITISWebService/jsonservice',
    (async () => new Response('', {
      status: 200,
      headers: { 'content-type': 'text/json;charset=ISO-8859-1' },
    })) as typeof fetch,
  )

  await assert.rejects(
    () => client.getFullRecordFromTsn('999999999'),
    /empty response instead of the documented JSON/u,
  )
})

test('ITIS usecases project no-auth search and record metadata', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async input => {
    const url = new URL(String(input))
    if (url.pathname.endsWith('/searchByScientificName')) {
      return jsonResponse({
        scientificNames: [
          { tsn: '19405', combinedName: 'Quercus robur', author: 'L.' },
          {
            tsn: '845209',
            combinedName: 'Quercus robur f. fastigiata',
            author: '(Lam.) O. Schwarz',
          },
        ],
      })
    }
    return jsonResponse({
      tsn: '19405',
      scientificName: { tsn: '19405', combinedName: 'Quercus robur', author: 'L.' },
      commonNameList: {
        commonNames: [{ commonName: 'English oak', language: 'English', tsn: '19405' }],
      },
      synonymList: {
        synonyms: [{ tsn: '845209', sciName: 'Quercus robur f. fastigiata' }],
      },
      hierarchyUp: {
        tsn: '19405',
        taxonName: 'Quercus robur',
        rankName: 'Species',
        parentTsn: '19276',
        parentName: 'Quercus',
      },
      usage: { taxonUsageRating: 'accepted' },
      taxRank: { rankName: 'Species' },
      kingdom: { kingdomName: 'Plantae' },
      credibilityRating: { credRating: 'TWG standards met' },
      dateData: { updateDate: '2012-01-27' },
      jurisdictionalOriginList: { jurisdictionalOrigins: [] },
    })
  }) as typeof fetch

  try {
    const search = await searchItisScientificNames({ query: 'Quercus', limit: 1 })
    assert.equal(search.kind, 'itis.search')
    assert.equal(search.api.authentication, 'none')
    assert.equal(search.api.usesBrowserClickstream, false)
    assert.equal(search.pagination.matched, 2)
    assert.equal(search.names.length, 1)

    const record = await getItisRecord({ tsn: '19405', commonLimit: 1 })
    assert.equal(record.kind, 'itis.record')
    assert.equal(record.api.provider, 'itis')
    assert.equal(record.record.scientificName?.combinedName, 'Quercus robur')
    assert.equal(record.record.commonNames[0]?.commonName, 'English oak')
    assert.equal(
      record.record.synonyms[0]?.scientificName,
      'Quercus robur f. fastigiata',
    )
    assert.equal(record.record.links.report.includes('19405'), true)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('ITIS normalizers enforce curated bounds', () => {
  assert.deepEqual(normalizeItisSearchInput({}), {
    query: 'Quercus robur',
    limit: 10,
    offset: 0,
  })
  assert.deepEqual(normalizeItisRecordInput({}), {
    tsn: '19405',
    commonLimit: 5,
    synonymLimit: 10,
  })
  assert.equal(normalizeItisTsn('00019405'), '00019405')
  assert.throws(() => normalizeItisTsn('abc'), /TSN must contain/)
  assert.throws(() => normalizeItisSearchInput({ query: 'x' }), /between 2 and 120/)
  assert.throws(() => normalizeItisSearchInput({ limit: 51 }), /between 1 and 50/)
  assert.throws(() => normalizeItisRecordInput({ commonLimit: 21 }), /between 0 and 20/)
  assert.throws(
    () => normalizeItisRecordInput({ synonymLimit: 31 }),
    /between 0 and 30/,
  )
})

function jsonResponse(value: unknown): Response {
  return new Response(JSON.stringify(value), {
    status: 200,
    headers: { 'content-type': 'text/json;charset=ISO-8859-1' },
  })
}
