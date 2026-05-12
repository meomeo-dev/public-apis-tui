import assert from 'node:assert/strict'
import test from 'node:test'
import { listWhiskyHunterDistilleries } from '../src/application/usecases/whiskyHunter.js'
import {
  filterWhiskyHunterDistilleries,
  normalizeWhiskyHunterDistilleriesInput,
  WhiskyHunterClient,
} from '../src/infrastructure/openApis/whiskyHunterClient.js'
import { RuntimeFailure } from '../src/shared/errors/runtimeFailure.js'

test('WhiskyHunter client reads distilleries JSON', async () => {
  const client = new WhiskyHunterClient({
    fetchImpl: (async input => {
      const url = new URL(String(input))
      assert.equal(url.pathname, '/api/distilleries_info/')
      return new Response(JSON.stringify(createDistilleriesFixture()), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    }) as typeof fetch,
  })

  const distilleries = await client.listDistilleries()
  assert.equal(distilleries[0]?.name, '8 Doors Distillery')
  assert.equal(distilleries[2]?.country, 'Japan')
})

test('WhiskyHunter usecase projects TUI-ready JSON and local filters', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async () => new Response(JSON.stringify(createDistilleriesFixture()), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })) as typeof fetch

  try {
    const result = await listWhiskyHunterDistilleries({ country: 'Scotland', limit: 2 })
    assert.equal(result.kind, 'whiskyhunter.distilleries')
    assert.equal(result.api.authentication, 'none')
    assert.equal(result.api.usesBrowserClickstream, false)
    assert.equal(result.pagination.upstreamTotal, 3)
    assert.equal(result.distilleries.length, 2)
    assert.equal(result.distilleries[0]?.country, 'Scotland')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('WhiskyHunter normalizers and filters enforce finite list bounds', () => {
  const input = normalizeWhiskyHunterDistilleriesInput({ query: 'aber', country: ' Scotland ', limit: 313 })
  assert.deepEqual(input, { limit: 313, query: 'aber', country: 'Scotland' })
  assert.deepEqual(normalizeWhiskyHunterDistilleriesInput({}), { limit: 313 })
  assert.equal(filterWhiskyHunterDistilleries(createDistilleriesFixture(), { limit: 10, query: 'yoichi' })[0]?.slug, 'yoichi')
  assert.throws(() => normalizeWhiskyHunterDistilleriesInput({ limit: 314 }), RuntimeFailure)
  assert.throws(() => normalizeWhiskyHunterDistilleriesInput({ query: ' ' }), RuntimeFailure)
})

function createDistilleriesFixture() {
  return [
    { name: '8 Doors Distillery', slug: '8_doors', country: 'Scotland' },
    { name: 'Aberfeldy', slug: 'aberfeldy', country: 'Scotland' },
    { name: 'Yoichi Distillery', slug: 'yoichi', country: 'Japan' },
  ]
}
