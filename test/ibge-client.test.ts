import assert from 'node:assert/strict'
import test from 'node:test'
import { listIbgeMunicipalities, listIbgeStates } from '../src/application/usecases/ibge.js'
import { IbgeClient, normalizeIbgeMunicipalitiesInput, normalizeIbgeStatesInput } from '../src/infrastructure/openApis/ibgeClient.js'

const statesFixture = [
  { id: 35, sigla: 'SP', nome: 'São Paulo', regiao: { id: 3, sigla: 'SE', nome: 'Sudeste' } },
  { id: 33, sigla: 'RJ', nome: 'Rio de Janeiro', regiao: { id: 3, sigla: 'SE', nome: 'Sudeste' } },
]

const municipalitiesFixture = [
  {
    id: 3550308,
    nome: 'São Paulo',
    microrregiao: { mesorregiao: { UF: statesFixture[0] } },
    'regiao-imediata': {
      nome: 'São Paulo',
      'regiao-intermediaria': { nome: 'São Paulo', UF: statesFixture[0] },
    },
  },
  {
    id: 3509502,
    nome: 'Campinas',
    microrregiao: { mesorregiao: { UF: statesFixture[0] } },
    'regiao-imediata': {
      nome: 'Campinas',
      'regiao-intermediaria': { nome: 'Campinas', UF: statesFixture[0] },
    },
  },
]

test('IBGE client calls Localidades states and municipalities endpoints', async () => {
  const requests: string[] = []
  const client = new IbgeClient({
    baseUrl: 'https://ibge.test',
    fetchImpl: (async input => {
      const url = new URL(String(input))
      requests.push(url.href)
      return jsonResponse(url.pathname.includes('/municipios') ? municipalitiesFixture : statesFixture)
    }) as typeof fetch,
  })

  const states = await client.listStates({ limit: 1 })
  assert.equal(states.totalReturned, 2)
  assert.deepEqual(states.states[0], { id: 35, acronym: 'SP', name: 'São Paulo', region: { id: 3, acronym: 'SE', name: 'Sudeste' } })

  const municipalities = await client.listMunicipalities({ state: 'SP', limit: 2 })
  assert.equal(municipalities.totalReturned, 2)
  assert.equal(municipalities.municipalities[0]?.name, 'São Paulo')
  assert.equal(municipalities.municipalities[0]?.state?.acronym, 'SP')
  assert.deepEqual(requests, [
    'https://ibge.test/api/v1/localidades/estados?orderBy=nome',
    'https://ibge.test/api/v1/localidades/estados/SP/municipios?orderBy=nome',
  ])
})

test('IBGE usecases project no-auth metadata and normalized queries', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async input => {
    const url = new URL(String(input))
    return jsonResponse(url.pathname.includes('/municipios') ? municipalitiesFixture : statesFixture)
  }) as typeof fetch
  try {
    const states = await listIbgeStates({ limit: 2 })
    assert.equal(states.kind, 'ibge.states')
    assert.equal(states.api.authentication, 'none')
    assert.equal(states.api.usesBrowserClickstream, false)
    assert.equal(states.count, 2)

    const municipalities = await listIbgeMunicipalities({ state: 'sp', limit: 1 })
    assert.equal(municipalities.kind, 'ibge.municipalities')
    assert.equal(municipalities.query.state, 'SP')
    assert.equal(municipalities.count, 1)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('IBGE normalizers validate state abbreviations and limits', () => {
  assert.deepEqual(normalizeIbgeStatesInput({}), { limit: 30 })
  assert.deepEqual(normalizeIbgeMunicipalitiesInput({ state: ' rj ', limit: 1 }), { state: 'RJ', limit: 1 })
  assert.throws(() => normalizeIbgeMunicipalitiesInput({ state: 'SPO' }), /two-letter/u)
  assert.throws(() => normalizeIbgeMunicipalitiesInput({ state: '1P' }), /two-letter/u)
  assert.throws(() => normalizeIbgeStatesInput({ limit: 101 }), /between 1 and 100/u)
})

test('IBGE client rejects non-JSON provider errors', async () => {
  const client = new IbgeClient({
    fetchImpl: (async () => new Response('<html>error</html>', { status: 502, headers: { 'content-type': 'text/html' } })) as typeof fetch,
  })
  await assert.rejects(() => client.listStates({ limit: 30 }), /non-JSON/u)
})

test('IBGE client explains Cloudflare HTML challenges', async () => {
  const client = new IbgeClient({
    fetchImpl: (async () => new Response('<!DOCTYPE html><title>Just a moment...</title>', {
      status: 403,
      headers: { 'content-type': 'text/html; charset=UTF-8', 'server': 'cloudflare', 'cf-mitigated': 'challenge' },
    })) as typeof fetch,
  })

  await assert.rejects(
    () => client.listStates({ limit: 30 }),
    /Cloudflare challenge HTML page/u,
  )
})

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
}
