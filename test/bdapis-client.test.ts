import assert from 'node:assert/strict'
import test from 'node:test'
import { getBdApisDistrict, listBdApisDistricts, listBdApisDivisionDistricts, listBdApisDivisions } from '../src/application/usecases/bdApis.js'
import { BdApisClient, normalizeBdApisDistrictInput, normalizeBdApisDivisionInput, normalizeBdApisListInput } from '../src/infrastructure/openApis/bdApisClient.js'

test('BdAPIs client calls v1.2 administrative geography endpoints', async () => {
  const requests: string[] = []
  const client = new BdApisClient({
    baseUrl: 'https://bd.test',
    fetchImpl: (async input => {
      const url = new URL(String(input))
      requests.push(url.href)
      if (url.pathname.endsWith('/divisions')) return jsonResponse({ status: okStatus(), data: [divisionFixture()] })
      return jsonResponse({ status: okStatus(), data: [districtFixture()] })
    }) as typeof fetch,
  })

  const divisions = await client.listDivisions({ limit: 1 })
  const districts = await client.listDistricts({ limit: 1 })
  const division = await client.listDivisionDistricts({ division: 'dhaka', limit: 1 })
  const district = await client.getDistrict({ district: 'dhaka' })

  assert.equal(divisions[0]?.division, 'Dhaka')
  assert.equal(districts[0]?.district, 'Dhaka')
  assert.equal(division[0]?.upazillas[0], 'Dhamrai')
  assert.equal(district?.coordinates?.latitude, 23.8105)
  assert.deepEqual(requests, [
    'https://bd.test/api/v1.2/divisions',
    'https://bd.test/api/v1.2/districts',
    'https://bd.test/api/v1.2/division/dhaka',
    'https://bd.test/api/v1.2/district/dhaka',
  ])
})

test('BdAPIs usecases project result metadata for TUI', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async input => {
    const url = new URL(String(input))
    if (url.pathname.endsWith('/divisions')) return jsonResponse({ status: okStatus(), data: [divisionFixture()] })
    return jsonResponse({ status: okStatus(), data: [districtFixture()] })
  }) as typeof fetch
  try {
    const divisions = await listBdApisDivisions({ limit: 1 })
    assert.equal(divisions.kind, 'bdapis.divisions')
    assert.equal(divisions.api.authentication, 'none')
    assert.equal(divisions.api.usesBrowserClickstream, false)
    assert.equal(divisions.divisions[0]?.divisionbn, 'ঢাকা')

    const districts = await listBdApisDistricts({ limit: 1 })
    assert.equal(districts.kind, 'bdapis.districts')
    assert.equal(districts.districts[0]?.upazillas.length, 5)

    const division = await listBdApisDivisionDistricts({ division: 'Dhaka', limit: 1 })
    assert.equal(division.kind, 'bdapis.division')
    assert.deepEqual(division.query, { division: 'dhaka', limit: 1 })

    const district = await getBdApisDistrict({ district: 'Dhaka' })
    assert.equal(district.kind, 'bdapis.district')
    assert.equal(district.district?.district, 'Dhaka')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('BdAPIs normalizers enforce list and slug boundaries', () => {
  assert.deepEqual(normalizeBdApisListInput({ limit: 64 }), { limit: 64 })
  assert.deepEqual(normalizeBdApisDivisionInput({ division: ' Coxs Bazar ', limit: 2 }), { division: 'coxs-bazar', limit: 2 })
  assert.deepEqual(normalizeBdApisDistrictInput({ district: 'Dhaka' }), { district: 'dhaka' })
  assert.throws(() => normalizeBdApisListInput({ limit: 65 }), /1 to 64/u)
  assert.throws(() => normalizeBdApisDivisionInput({ division: '1bad' }), /place slug/u)
})

test('BdAPIs client surfaces provider not-found payloads', async () => {
  const client = new BdApisClient({
    fetchImpl: (async () => jsonResponse({ status: { code: 404, message: 'not found' }, data: false })) as typeof fetch,
  })
  await assert.rejects(() => client.listDivisionDistricts({ division: 'notfound', limit: 1 }), /not found/u)
})

function okStatus(): Record<string, unknown> {
  return { code: 200, message: 'ok', date: 'Fri, May 8, 2026, 04:03:32 PM' }
}

function divisionFixture(): Record<string, unknown> {
  return { division: 'Dhaka', divisionbn: 'ঢাকা', coordinates: '23.9536, 90.1495' }
}

function districtFixture(): Record<string, unknown> {
  return { district: 'Dhaka', districtbn: 'ঢাকা', coordinates: '23.8105, 90.3372', upazillas: ['Dhamrai', 'Dohar', 'Keraniganj', 'Nawabganj', 'Savar'] }
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
}
