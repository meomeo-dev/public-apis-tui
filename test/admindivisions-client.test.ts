import assert from 'node:assert/strict'
import test from 'node:test'
import { listAdminDivisionsCountry } from '../src/application/usecases/adminDivisions.js'
import {
  AdminDivisionsClient,
  createAdminDivisionsCountryUrl,
  normalizeAdminDivisionsCountryInput,
} from '../src/infrastructure/openApis/adminDivisionsClient.js'

test('Administrative Divisions client reads country JSON array', async () => {
  const requests: string[] = []
  const client = new AdminDivisionsClient({
    baseUrl: 'https://raw.test/api',
    fetchImpl: (async input => {
      requests.push(String(input))
      return jsonResponse(['Nairobi Area', 'Mombasa', 'Kiambu'])
    }) as typeof fetch,
  })

  const result = await client.listCountry({ country: 'ke', limit: 2 })
  assert.deepEqual(requests, ['https://raw.test/api/KE.json'])
  assert.deepEqual(result.divisions, ['Nairobi Area', 'Mombasa', 'Kiambu'])
})

test('Administrative Divisions usecase projects bounded country divisions', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async input => {
    assert.equal(String(input), 'https://raw.githubusercontent.com/kamikazechaser/administrative-divisions-db/master/api/US.json')
    return jsonResponse(['Arkansas', 'Washington, D.C.', 'Delaware'])
  }) as typeof fetch
  try {
    const result = await listAdminDivisionsCountry({ country: 'us', limit: 2 })

    assert.equal(result.kind, 'admindivisions.country')
    assert.equal(result.api.authentication, 'none')
    assert.equal(result.api.usesBrowserClickstream, false)
    assert.deepEqual(result.query, { country: 'US', limit: 2 })
    assert.equal(result.pagination.returned, 2)
    assert.equal(result.pagination.total, 3)
    assert.deepEqual(result.divisions, ['Arkansas', 'Washington, D.C.'])
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('Administrative Divisions normalizer enforces ISO country and bounds', () => {
  assert.deepEqual(normalizeAdminDivisionsCountryInput({ country: 'ke', limit: 47 }), { country: 'KE', limit: 47 })
  assert.equal(createAdminDivisionsCountryUrl('https://raw.test/api/', 'KE').href, 'https://raw.test/api/KE.json')
  assert.throws(() => normalizeAdminDivisionsCountryInput({ country: 'KEN' }), /ISO 3166/u)
  assert.throws(() => normalizeAdminDivisionsCountryInput({ limit: 0 }), /--limit/u)
  assert.throws(() => normalizeAdminDivisionsCountryInput({ limit: 501 }), /--limit/u)
})

test('Administrative Divisions client rejects missing country files', async () => {
  const client = new AdminDivisionsClient({
    fetchImpl: (async () => new Response('404: Not Found', { status: 404, headers: { 'content-type': 'text/plain' } })) as typeof fetch,
  })

  await assert.rejects(() => client.listCountry({ country: 'XX' }), /HTTP 404/u)
})

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'text/plain; charset=utf-8' },
  })
}
