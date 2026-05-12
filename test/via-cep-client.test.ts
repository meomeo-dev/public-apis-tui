import assert from 'node:assert/strict'
import test from 'node:test'
import { lookupViaCep, searchViaCep } from '../src/application/usecases/viaCep.js'
import { ViaCepClient, normalizeViaCepLookupInput, normalizeViaCepSearchInput } from '../src/infrastructure/openApis/viaCepClient.js'

const addressFixture = {
  cep: '01001-000',
  logradouro: 'Praça da Sé',
  complemento: 'lado ímpar',
  unidade: '',
  bairro: 'Sé',
  localidade: 'São Paulo',
  uf: 'SP',
  estado: 'São Paulo',
  regiao: 'Sudeste',
  ibge: '3550308',
  gia: '1004',
  ddd: '11',
  siafi: '7107',
}

test('ViaCep client looks up CEP records and maps provider fields', async () => {
  const client = new ViaCepClient({
    fetchImpl: (async input => {
      assert.equal(String(input), 'https://viacep.com.br/ws/01001000/json/')
      return jsonResponse(addressFixture)
    }) as typeof fetch,
  })

  const result = await client.lookup({ cep: '01001000' })
  assert.deepEqual(result, {
    cep: '01001-000',
    street: 'Praça da Sé',
    complement: 'lado ímpar',
    neighborhood: 'Sé',
    city: 'São Paulo',
    state: 'SP',
    stateName: 'São Paulo',
    region: 'Sudeste',
    ibge: '3550308',
    gia: '1004',
    ddd: '11',
    siafi: '7107',
  })
})

test('ViaCep client searches bounded address arrays', async () => {
  const client = new ViaCepClient({
    fetchImpl: (async input => {
      assert.equal(String(input), 'https://viacep.com.br/ws/SP/S%C3%A3o%20Paulo/Paulista/json/')
      return jsonResponse([addressFixture, { ...addressFixture, cep: '01311-000', logradouro: 'Avenida Paulista' }])
    }) as typeof fetch,
  })

  const result = await client.search({ state: 'SP', city: 'São Paulo', street: 'Paulista', limit: 1 })
  assert.equal(result.length, 1)
  assert.equal(result[0]?.cep, '01001-000')
})

test('ViaCep usecases project no-auth HTTPS JSON metadata', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async input => jsonResponse(String(input).includes('/01001000/') ? addressFixture : [addressFixture])) as typeof fetch
  try {
    const lookup = await lookupViaCep({ cep: '01001-000' })
    assert.equal(lookup.kind, 'viacep.lookup')
    assert.equal(lookup.api.authentication, 'none')
    assert.equal(lookup.api.usesBrowserClickstream, false)
    assert.equal(lookup.address?.city, 'São Paulo')

    const search = await searchViaCep({ state: 'sp', city: 'São Paulo', street: 'Paulista', limit: 1 })
    assert.equal(search.kind, 'viacep.search')
    assert.equal(search.pagination.maxLimit, 50)
    assert.equal(search.addresses[0]?.state, 'SP')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('ViaCep normalizers prevent upstream HTML 400 paths', () => {
  assert.deepEqual(normalizeViaCepLookupInput({}), { cep: '01001000' })
  assert.deepEqual(normalizeViaCepLookupInput({ cep: '01001-000' }), { cep: '01001000' })
  assert.deepEqual(normalizeViaCepSearchInput({ state: 'sp', city: ' São   Paulo ', street: ' Paulista ', limit: 2 }), { state: 'SP', city: 'São Paulo', street: 'Paulista', limit: 2 })
  assert.throws(() => normalizeViaCepLookupInput({ cep: '0100100' }), /--cep/u)
  assert.throws(() => normalizeViaCepSearchInput({ state: 'XX' }), /--state/u)
  assert.throws(() => normalizeViaCepSearchInput({ city: 'SP' }), /--city/u)
  assert.throws(() => normalizeViaCepSearchInput({ street: 'Pa' }), /--street/u)
  assert.throws(() => normalizeViaCepSearchInput({ limit: 51 }), /between 1 and 50/u)
})

test('ViaCep client maps erro=true lookups to empty results', async () => {
  const client = new ViaCepClient({
    fetchImpl: (async () => jsonResponse({ erro: 'true' })) as typeof fetch,
  })
  assert.equal(await client.lookup({ cep: '99999999' }), undefined)
})

test('ViaCep client rejects non-JSON provider failures', async () => {
  const client = new ViaCepClient({
    fetchImpl: (async () => new Response('<html>bad cep</html>', { status: 400, headers: { 'content-type': 'text/html' } })) as typeof fetch,
  })
  await assert.rejects(() => client.lookup({ cep: '01001000' }), /non-JSON/u)
})

test('ViaCep client surfaces Cloudflare challenge HTML clearly', async () => {
  const client = new ViaCepClient({
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
  await assert.rejects(() => client.lookup({ cep: '01001000' }), /Cloudflare challenge HTML page/u)
})

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
}
