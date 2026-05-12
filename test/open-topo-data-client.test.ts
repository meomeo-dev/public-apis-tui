import assert from 'node:assert/strict'
import test from 'node:test'
import { lookupOpenTopoData } from '../src/application/usecases/openTopoData.js'
import { OpenTopoDataClient, normalizeOpenTopoDataLookupInput } from '../src/infrastructure/openApis/openTopoDataClient.js'

const fixture = {
  results: [
    { dataset: 'srtm90m', elevation: 1603, location: { lat: 39.7471, lng: -104.9963 } },
  ],
  status: 'OK',
}

test('Open Topo Data client sends bounded lookup query', async () => {
  const requests: string[] = []
  const client = new OpenTopoDataClient({
    baseUrl: 'https://opentopodata.test',
    fetchImpl: (async input => {
      requests.push(String(input))
      return jsonResponse(fixture)
    }) as typeof fetch,
  })
  const results = await client.lookup({
    locations: '39.7471,-104.9963',
    dataset: 'srtm90m',
    interpolation: 'bilinear',
    points: [{ latitude: 39.7471, longitude: -104.9963 }],
  })
  assert.deepEqual(requests, ['https://opentopodata.test/v1/srtm90m?locations=39.7471%2C-104.9963&interpolation=bilinear'])
  assert.equal(results[0]?.elevation, 1603)
  assert.equal(results[0]?.location.latitude, 39.7471)
})

test('Open Topo Data usecase projects no-auth metadata', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async () => jsonResponse(fixture)) as typeof fetch
  try {
    const result = await lookupOpenTopoData({ locations: '39.7471,-104.9963', dataset: 'srtm90m' })
    assert.equal(result.kind, 'opentopodata.lookup')
    assert.equal(result.api.authentication, 'none')
    assert.equal(result.api.usesBrowserClickstream, false)
    assert.equal(result.query.interpolation, 'bilinear')
    assert.equal(result.pagination.maxLocations, 5)
    assert.equal(result.elevations[0]?.dataset, 'srtm90m')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('Open Topo Data normalizer validates coordinates and curated datasets', () => {
  assert.deepEqual(normalizeOpenTopoDataLookupInput({}), {
    locations: '39.7471,-104.9963',
    dataset: 'srtm90m',
    interpolation: 'bilinear',
    points: [{ latitude: 39.7471, longitude: -104.9963 }],
  })
  assert.deepEqual(normalizeOpenTopoDataLookupInput({ locations: ' 0,0 | 39.7,-104.9 ', dataset: 'GEBCO2020', interpolation: 'nearest' }).points, [
    { latitude: 0, longitude: 0 },
    { latitude: 39.7, longitude: -104.9 },
  ])
  assert.throws(() => normalizeOpenTopoDataLookupInput({ locations: '91,0' }), /latitude/u)
  assert.throws(() => normalizeOpenTopoDataLookupInput({ locations: '0,181' }), /longitude/u)
  assert.throws(() => normalizeOpenTopoDataLookupInput({ dataset: 'unknown' }), /--dataset/u)
  assert.throws(() => normalizeOpenTopoDataLookupInput({ interpolation: 'magic' }), /--interpolation/u)
  assert.throws(() => normalizeOpenTopoDataLookupInput({ locations: '0,0|1,1|2,2|3,3|4,4|5,5' }), /at most 5/u)
})

test('Open Topo Data client rejects provider JSON errors', async () => {
  const client = new OpenTopoDataClient({
    baseUrl: 'https://opentopodata.test',
    fetchImpl: (async () => jsonResponse({ status: 'INVALID_REQUEST', error: 'Bad location' }, 400)) as typeof fetch,
  })
  await assert.rejects(() => client.lookup({ locations: '0,0', dataset: 'srtm90m', interpolation: 'bilinear', points: [{ latitude: 0, longitude: 0 }] }), /Bad location/u)
})

test('Open Topo Data client explains Cloudflare HTML challenges', async () => {
  const client = new OpenTopoDataClient({
    baseUrl: 'https://opentopodata.test',
    fetchImpl: (async () => new Response('<!DOCTYPE html><title>Just a moment...</title>', {
      status: 403,
      headers: { 'content-type': 'text/html; charset=UTF-8', 'server': 'cloudflare', 'cf-mitigated': 'challenge' },
    })) as typeof fetch,
  })

  await assert.rejects(
    () => client.lookup({ locations: '0,0', dataset: 'srtm90m', interpolation: 'bilinear', points: [{ latitude: 0, longitude: 0 }] }),
    /Cloudflare challenge HTML page/u,
  )
})

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
}
