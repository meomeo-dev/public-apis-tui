import assert from 'node:assert/strict'
import test from 'node:test'
import { lookupBinlist } from '../src/application/usecases/binlist.js'
import { BinlistClient, normalizeBinlistLookupInput } from '../src/infrastructure/openApis/binlistClient.js'

test('Binlist client calls lookup endpoint with Accept-Version header', async () => {
  const client = new BinlistClient({
    baseUrl: 'https://binlist.test',
    fetchImpl: (async (input, init) => {
      const url = new URL(String(input))
      assert.equal(url.href, 'https://binlist.test/45717360')
      assert.equal((init?.headers as Record<string, string>)['accept-version'], '3')
      return jsonResponse(createLookupBody())
    }) as typeof fetch,
  })

  const result = await client.lookup({ bin: '45717360' })
  assert.equal(result.scheme, 'visa')
  assert.equal(result.country?.name, 'Denmark')
  assert.equal(result.bank?.name, 'Jyske Bank A/S')
})

test('Binlist usecase projects TUI-ready JSON and open API metadata', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async () => jsonResponse(createLookupBody())) as typeof fetch
  try {
    const result = await lookupBinlist({ bin: '4571-7360' })
    assert.equal(result.kind, 'binlist.lookup')
    assert.equal(result.api.authentication, 'none')
    assert.equal(result.api.usesBrowserClickstream, false)
    assert.equal(result.query.bin, '45717360')
    assert.equal(result.card.scheme, 'visa')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('Binlist normalizer bounds BIN/IIN input', () => {
  assert.deepEqual(normalizeBinlistLookupInput({}), { bin: '45717360' })
  assert.deepEqual(normalizeBinlistLookupInput({ bin: '4571 7360' }), { bin: '45717360' })
  assert.throws(() => normalizeBinlistLookupInput({ bin: 'abc' }), /--bin/u)
  assert.throws(() => normalizeBinlistLookupInput({ bin: '12345' }), /--bin/u)
})

function createLookupBody(): Record<string, unknown> {
  return {
    number: {},
    scheme: 'visa',
    type: 'debit',
    brand: 'Visa Classic/Dankort',
    country: {
      numeric: '208',
      alpha2: 'DK',
      name: 'Denmark',
      emoji: '🇩🇰',
      currency: 'DKK',
      latitude: 56,
      longitude: 10,
    },
    bank: { name: 'Jyske Bank A/S' },
  }
}

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })
}
