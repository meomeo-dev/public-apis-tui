import assert from 'node:assert/strict'
import test from 'node:test'
import { lookupReceitaWs } from '../src/application/usecases/receitaWs.js'
import { ReceitaWsClient, normalizeReceitaWsLookupInput } from '../src/infrastructure/openApis/receitaWsClient.js'
import { RuntimeFailure } from '../src/shared/errors/runtimeFailure.js'

test('ReceitaWS client reads public CNPJ JSON', async () => {
  const client = new ReceitaWsClient({
    fetchImpl: (async input => {
      const url = new URL(String(input))
      assert.equal(url.href, 'https://www.receitaws.com.br/v1/cnpj/27865757000102')
      return jsonResponse(createReceitaWsFixture())
    }) as typeof fetch,
  })

  const company = await client.lookup({ cnpj: '27865757000102' })
  assert.equal(company.name, 'GLOBO COMUNICACAO E PARTICIPACOES S/A')
  assert.equal(company.primaryActivities[0]?.code, '60.21-7-00')
  assert.equal(company.state, 'RJ')
})

test('ReceitaWS usecase projects TUI-ready JSON', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async () => jsonResponse(createReceitaWsFixture())) as typeof fetch

  try {
    const result = await lookupReceitaWs({ cnpj: '27.865.757/0001-02' })
    assert.equal(result.kind, 'receitaws.lookup')
    assert.equal(result.api.provider, 'receitaws')
    assert.equal(result.api.authentication, 'none')
    assert.equal(result.api.usesBrowserClickstream, false)
    assert.equal(result.query.cnpj, '27865757000102')
    assert.equal(result.company.city, 'RIO DE JANEIRO')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('ReceitaWS normalizer enforces CNPJ shape', () => {
  assert.deepEqual(normalizeReceitaWsLookupInput({}), { cnpj: '27865757000102' })
  assert.deepEqual(normalizeReceitaWsLookupInput({ cnpj: '27.865.757/0001-02' }), { cnpj: '27865757000102' })
  assert.throws(() => normalizeReceitaWsLookupInput({ cnpj: '123' }), RuntimeFailure)
})

export function createReceitaWsFixture(): Record<string, unknown> {
  return {
    status: 'OK',
    abertura: '31/01/1986',
    situacao: 'ATIVA',
    tipo: 'MATRIZ',
    nome: 'GLOBO COMUNICACAO E PARTICIPACOES S/A',
    fantasia: 'TV/REDE/GLOBO.COM/CANAIS GLOBO/GLOBOPLAY/ELETROMIDIA',
    porte: 'DEMAIS',
    natureza_juridica: '205-4 - Sociedade Anônima Fechada',
    atividade_principal: [{ code: '60.21-7-00', text: 'Atividades de televisão aberta' }],
    atividades_secundarias: [{ code: '62.04-0-00', text: 'Consultoria em tecnologia da informação' }],
    logradouro: 'R LOPES QUINTAS',
    numero: '303',
    complemento: '',
    municipio: 'RIO DE JANEIRO',
    bairro: 'JARDIM BOTANICO',
    uf: 'RJ',
    cep: '22.460-901',
    email: 'cadastro@exemplo.test',
    telefone: '(21) 0000-0000',
    capital_social: '6983568523.86',
    ultima_atualizacao: '2026-04-26T23:59:59.000Z',
    cnpj: '27.865.757/0001-02',
  }
}

function jsonResponse(value: unknown): Response {
  return new Response(JSON.stringify(value), { status: 200, headers: { 'content-type': 'application/json' } })
}
