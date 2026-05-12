import assert from 'node:assert/strict'
import test from 'node:test'
import { listDucksUnlimitedChapters } from '../src/application/usecases/ducksUnlimited.js'
import { DucksUnlimitedClient, normalizeDucksUnlimitedChaptersInput } from '../src/infrastructure/openApis/ducksUnlimitedClient.js'

const arcgisFixture = {
  objectIdFieldName: 'OBJECTID',
  geometryType: 'esriGeometryPoint',
  exceededTransferLimit: false,
  features: [
    {
      attributes: {
        OBJECTID: 76,
        University_Chapter: 'Texas A&M University',
        City: 'College Station',
        State: 'TX',
        ChapterID: 'TX-0217',
        MEVR_RD: 'Rob Wilson',
      },
      geometry: { x: -96.34616814755597, y: 30.60579567005256 },
    },
  ],
}

test('Ducks Unlimited client builds curated ArcGIS query parameters', async () => {
  const requests: string[] = []
  const client = new DucksUnlimitedClient({
    baseUrl: 'https://ducks.test/FeatureServer/0',
    fetchImpl: (async input => {
      requests.push(String(input))
      return jsonResponse(arcgisFixture)
    }) as typeof fetch,
  })

  const response = await client.listChapters({ state: 'TX', query: 'Texas', limit: 10, includeGeometry: true })

  assert.equal(response.chapters[0]?.universityChapter, 'Texas A&M University')
  assert.equal(response.chapters[0]?.latitude, 30.60579567005256)
  assert.equal(response.exceededTransferLimit, false)
  const url = new URL(requests[0] ?? '')
  assert.equal(url.pathname, '/FeatureServer/0/query')
  assert.equal(url.searchParams.get('f'), 'json')
  assert.equal(url.searchParams.get('returnGeometry'), 'true')
  assert.equal(url.searchParams.get('resultRecordCount'), '10')
  assert.equal(url.searchParams.get('where'), "1=1 AND State='TX' AND (UPPER(University_Chapter) LIKE '%TEXAS%' OR UPPER(City) LIKE '%TEXAS%' OR UPPER(ChapterID) LIKE '%TEXAS%')")
})

test('Ducks Unlimited usecase exposes no-auth metadata and bounded pagination', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async () => jsonResponse(arcgisFixture)) as typeof fetch
  try {
    const result = await listDucksUnlimitedChapters({ state: 'tx', limit: 5, includeGeometry: false })
    assert.equal(result.kind, 'ducksunlimited.chapters')
    assert.equal(result.api.authentication, 'none')
    assert.equal(result.api.usesBrowserClickstream, false)
    assert.equal(result.query.state, 'TX')
    assert.equal(result.pagination.limit, 5)
    assert.equal(result.chapters[0]?.chapterId, 'TX-0217')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('Ducks Unlimited normalizer validates state, query, and limit', () => {
  assert.deepEqual(normalizeDucksUnlimitedChaptersInput({ state: ' tx ', query: 'Texas A&M', limit: 25, includeGeometry: true }), {
    state: 'TX',
    query: 'Texas A&M',
    limit: 25,
    includeGeometry: true,
  })
  assert.deepEqual(normalizeDucksUnlimitedChaptersInput({}), { limit: 25, includeGeometry: false })
  assert.throws(() => normalizeDucksUnlimitedChaptersInput({ state: 'Texas' }), /two-letter/u)
  assert.throws(() => normalizeDucksUnlimitedChaptersInput({ query: 'Texas; DROP' }), /may contain/u)
  assert.throws(() => normalizeDucksUnlimitedChaptersInput({ limit: 101 }), /between 1 and 100/u)
})

test('Ducks Unlimited client surfaces ArcGIS JSON errors', async () => {
  const client = new DucksUnlimitedClient({
    fetchImpl: (async () => jsonResponse({ error: { code: 400, message: 'Cannot perform query.', details: ['Invalid field'] } }, 200)) as typeof fetch,
  })
  await assert.rejects(() => client.listChapters({ limit: 25, includeGeometry: false }), /Cannot perform query.*Invalid field/u)
})

test('Ducks Unlimited client explains Cloudflare HTML challenges', async () => {
  const client = new DucksUnlimitedClient({
    fetchImpl: (async () => new Response('<!DOCTYPE html><title>Just a moment...</title>', {
      status: 403,
      headers: { 'content-type': 'text/html; charset=UTF-8', 'server': 'cloudflare', 'cf-mitigated': 'challenge' },
    })) as typeof fetch,
  })

  await assert.rejects(
    () => client.listChapters({ limit: 25, includeGeometry: false }),
    /Cloudflare challenge HTML page/u,
  )
})

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
}
