import assert from 'node:assert/strict'
import test from 'node:test'
import { lookupPostcodeDataNl } from '../src/application/usecases/postcodeDataNl.js'
import { PostcodeDataNlClient, normalizePostcodeDataNlLookupInput } from '../src/infrastructure/openApis/postcodeDataNlClient.js'

const fixture = {
  status: 'ok',
  details: [
    {
      street: 'Stationsstraat',
      city: 'Hilversum',
      municipality: 'Hilversum',
      province: 'Noord-Holland',
      postcode: '1211 EP',
      pnum: '1211',
      pchar: 'EP',
      rd_x: '140707.47566666666666666667',
      rd_y: '471005.06166666666666666667',
      lat: '52.2269378842251',
      lon: '5.1780191356884',
    },
  ],
}

test('PostcodeData.nl client sends documented HTTP lookup query', async () => {
  const requests: string[] = []
  const client = new PostcodeDataNlClient({
    baseUrl: 'http://postcodedata.test',
    fetchImpl: (async input => {
      requests.push(String(input))
      return jsonResponse(fixture)
    }) as typeof fetch,
  })
  const addresses = await client.lookup({ postcode: '1211EP', streetNumber: 60, ref: 'public-apis-tui.local' })
  assert.deepEqual(requests, ['http://postcodedata.test/v1/postcode/?postcode=1211EP&streetnumber=60&ref=public-apis-tui.local&type=json'])
  assert.equal(addresses[0]?.street, 'Stationsstraat')
  assert.equal(addresses[0]?.latitude, 52.2269378842251)
})

test('PostcodeData.nl usecase projects HTTP-only privacy metadata', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async () => jsonResponse(fixture)) as typeof fetch
  try {
    const result = await lookupPostcodeDataNl({ postcode: '1211 ep', streetNumber: 60, ref: 'example.test' })
    assert.equal(result.kind, 'postcodedata-nl.lookup')
    assert.equal(result.api.authentication, 'none')
    assert.equal(result.api.usesBrowserClickstream, false)
    assert.equal(result.api.httpOnly, true)
    assert.match(result.api.privacy, /HTTP cleartext/u)
    assert.equal(result.query.postcode, '1211EP')
    assert.equal(result.addresses[0]?.longitude, 5.1780191356884)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('PostcodeData.nl normalizer enforces address and ref bounds', () => {
  assert.deepEqual(normalizePostcodeDataNlLookupInput({}), { postcode: '1211EP', streetNumber: 60, ref: 'public-apis-tui.local' })
  assert.deepEqual(normalizePostcodeDataNlLookupInput({ postcode: ' 1211 ep ', streetNumber: 7, ref: 'Example.Test' }), { postcode: '1211EP', streetNumber: 7, ref: 'example.test' })
  assert.throws(() => normalizePostcodeDataNlLookupInput({ postcode: '0123AB' }), /Dutch postcode/u)
  assert.throws(() => normalizePostcodeDataNlLookupInput({ streetNumber: 0 }), /street-number/u)
  assert.throws(() => normalizePostcodeDataNlLookupInput({ ref: 'not-domain' }), /--ref/u)
})

test('PostcodeData.nl client maps no results to an empty address list', async () => {
  const client = new PostcodeDataNlClient({
    baseUrl: 'http://postcodedata.test',
    fetchImpl: (async () => jsonResponse({ status: 'error', errormessage: 'no results' })) as typeof fetch,
  })
  assert.deepEqual(await client.lookup({ postcode: '1211EP', streetNumber: 99999, ref: 'example.test' }), [])
})

test('PostcodeData.nl client surfaces provider validation errors', async () => {
  const client = new PostcodeDataNlClient({
    baseUrl: 'http://postcodedata.test',
    fetchImpl: (async () => jsonResponse({ status: 'error', errormessage: 'no ref (ref=domain.nl)' })) as typeof fetch,
  })
  await assert.rejects(() => client.lookup({ postcode: '1211EP', streetNumber: 60, ref: 'example.test' }), /no ref/u)
})

test('PostcodeData.nl client surfaces Cloudflare challenge HTML clearly', async () => {
  const client = new PostcodeDataNlClient({
    baseUrl: 'http://postcodedata.test',
    fetchImpl: (async () =>
      new Response('<!DOCTYPE html><title>Just a moment...</title>', {
        status: 403,
        headers: {
          'content-type': 'text/html; charset=UTF-8',
          server: 'cloudflare',
          'cf-mitigated': 'challenge',
        },
      })) as typeof fetch,
  })
  await assert.rejects(() => client.lookup({ postcode: '1211EP', streetNumber: 60, ref: 'example.test' }), /Cloudflare challenge HTML page/u)
})

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
}
