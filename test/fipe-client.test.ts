import assert from 'node:assert/strict'
import test from 'node:test'
import { getFipePrice, listFipeBrands, listFipeModels, listFipeYears } from '../src/application/usecases/fipe.js'
import { FipeClient, normalizeFipeListInput, normalizeFipeModelsInput, normalizeFipePriceInput, normalizeFipeYearsInput } from '../src/infrastructure/openApis/fipeClient.js'
import { RuntimeFailure } from '../src/shared/errors/runtimeFailure.js'

test('Fipe client reads brands, models, years, and price without auth', async () => {
  const requestedUrls: string[] = []
  const client = new FipeClient({
    fetchImpl: (async input => {
      requestedUrls.push(String(input))
      if (String(input).endsWith('/anos/2014-3')) return jsonResponse(createPriceFixture())
      if (String(input).endsWith('/anos')) return jsonResponse(createYearsFixture())
      if (String(input).endsWith('/modelos')) return jsonResponse(createModelsFixture())
      return jsonResponse(createBrandsFixture())
    }) as typeof fetch,
  })

  const brands = await client.brands({ vehicleType: 'carros', query: 'volks', limit: 1 })
  assert.deepEqual(brands.items, [{ code: '59', name: 'VW - VolksWagen' }])
  assert.equal(brands.rateLimit.remaining, '499')

  const models = await client.models({ vehicleType: 'carros', brandCode: '59', query: 'amarok', limit: 1 })
  assert.equal(models.items[0]?.code, '5940')

  const years = await client.years({ vehicleType: 'carros', brandCode: '59', modelCode: '5940', limit: 2 })
  assert.equal(years.items[0]?.code, '2022-3')

  const price = await client.price({ vehicleType: 'carros', brandCode: '59', modelCode: '5940', yearCode: '2014-3' })
  assert.equal(price.price.value, 'R$ 86.907,00')
  assert.deepEqual(requestedUrls, [
    'https://parallelum.com.br/fipe/api/v1/carros/marcas',
    'https://parallelum.com.br/fipe/api/v1/carros/marcas/59/modelos',
    'https://parallelum.com.br/fipe/api/v1/carros/marcas/59/modelos/5940/anos',
    'https://parallelum.com.br/fipe/api/v1/carros/marcas/59/modelos/5940/anos/2014-3',
  ])
})

test('Fipe usecases project no-auth TUI-ready metadata', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async input => {
    if (String(input).endsWith('/anos/2014-3')) return jsonResponse(createPriceFixture())
    if (String(input).endsWith('/anos')) return jsonResponse(createYearsFixture())
    if (String(input).endsWith('/modelos')) return jsonResponse(createModelsFixture())
    return jsonResponse(createBrandsFixture())
  }) as typeof fetch
  try {
    const brands = await listFipeBrands({ query: 'volks', limit: 2 })
    assert.equal(brands.kind, 'fipe.brands')
    assert.equal(brands.api.authentication, 'none')
    assert.equal(brands.api.usesBrowserClickstream, false)

    const models = await listFipeModels({ brandCode: '59', limit: 2 })
    assert.equal(models.kind, 'fipe.models')
    assert.equal(models.items[0]?.code, '5940')

    const years = await listFipeYears({ brandCode: '59', modelCode: '5940', limit: 2 })
    assert.equal(years.kind, 'fipe.years')
    assert.equal(years.items[0]?.code, '2022-3')

    const price = await getFipePrice({ brandCode: '59', modelCode: '5940', yearCode: '2014-3' })
    assert.equal(price.kind, 'fipe.price')
    assert.equal(price.api.authentication, 'none')
    assert.equal(price.price.fipeCode, '005340-6')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('Fipe normalizers enforce documented path codes and local caps', () => {
  assert.deepEqual(normalizeFipeListInput({}), { vehicleType: 'carros', limit: 100 })
  assert.deepEqual(normalizeFipeModelsInput({}), { vehicleType: 'carros', limit: 100, brandCode: '59' })
  assert.deepEqual(normalizeFipeYearsInput({}), { vehicleType: 'carros', limit: 100, brandCode: '59', modelCode: '5940' })
  assert.deepEqual(normalizeFipePriceInput({}), { vehicleType: 'carros', brandCode: '59', modelCode: '5940', yearCode: '2014-3' })
  assert.throws(() => normalizeFipeListInput({ vehicleType: 'cars' }), RuntimeFailure)
  assert.throws(() => normalizeFipeListInput({ limit: 1001 }), RuntimeFailure)
  assert.throws(() => normalizeFipeModelsInput({ brandCode: 'vw' }), RuntimeFailure)
  assert.throws(() => normalizeFipePriceInput({ yearCode: '2014' }), RuntimeFailure)
})

function jsonResponse(value: unknown): Response {
  return new Response(JSON.stringify(value), {
    status: 200,
    headers: { 'content-type': 'application/json', 'x-ratelimit-limit': '500', 'x-ratelimit-remaining': '499', 'x-ratelimit-reset': '86400' },
  })
}

function createBrandsFixture(): Array<Record<string, unknown>> {
  return [{ codigo: '59', nome: 'VW - VolksWagen' }, { codigo: '22', nome: 'Ford' }]
}

function createModelsFixture(): Record<string, unknown> {
  return {
    modelos: [{ codigo: 5940, nome: 'AMAROK High.CD 2.0 16V TDI 4x4 Dies. Aut' }, { codigo: 5261, nome: 'AMAROK Highline CD 2.0 16V TDI 4x4 Dies.' }],
  }
}

function createYearsFixture(): Array<Record<string, unknown>> {
  return [{ codigo: '2022-3', nome: '2022 Diesel' }, { codigo: '2014-3', nome: '2014 Diesel' }]
}

function createPriceFixture(): Record<string, unknown> {
  return {
    TipoVeiculo: 1,
    Valor: 'R$ 86.907,00',
    Marca: 'VW - VolksWagen',
    Modelo: 'AMAROK High.CD 2.0 16V TDI 4x4 Dies. Aut',
    AnoModelo: 2014,
    Combustivel: 'Diesel',
    CodigoFipe: '005340-6',
    MesReferencia: 'maio de 2026',
    SiglaCombustivel: 'D',
  }
}
