import assert from 'node:assert/strict'
import test from 'node:test'
import { listBcFerriesRoutes } from '../src/application/usecases/bcFerries.js'
import { BcFerriesClient, normalizeBcFerriesRoutesInput } from '../src/infrastructure/openApis/bcFerriesClient.js'

test('BC Ferries client reads capacity routes without auth', async () => {
  let requestedUrl = ''
  const client = new BcFerriesClient({
    fetchImpl: async input => {
      requestedUrl = String(input)
      return jsonResponse(createFixture())
    },
  })
  const routes = await client.routes({ type: 'capacity', routeCode: 'HSBNAN', limit: 1 })
  assert.equal(requestedUrl, 'https://bcferriesapi.ca/v2/capacity/')
  assert.equal(routes[0]?.routeCode, 'HSBNAN')
  assert.equal(routes[0]?.sailings[0]?.vesselName, 'Queen of Oak Bay')
  assert.equal(routes[0]?.sailings[0]?.fill, 12)
})

test('BC Ferries usecase projects no-auth metadata and normalized query', async () => {
  const previousFetch = globalThis.fetch
  globalThis.fetch = (async () => jsonResponse(createFixture())) as typeof fetch
  try {
    const result = await listBcFerriesRoutes({ type: 'capacity', routeCode: 'hsbnan', limit: 1 })
    assert.equal(result.kind, 'bcferries.routes')
    assert.equal(result.api.authentication, 'none')
    assert.equal(result.api.usesBrowserClickstream, false)
    assert.equal(result.query.routeCode, 'HSBNAN')
    assert.equal(result.routes.length, 1)
  } finally {
    globalThis.fetch = previousFetch
  }
})

test('BC Ferries normalizer validates type, route code, and limit', () => {
  assert.deepEqual(normalizeBcFerriesRoutesInput({ type: 'NonCapacity', routeCode: 'hsbnan', limit: 1 }), { type: 'noncapacity', routeCode: 'HSBNAN', limit: 1 })
  assert.throws(() => normalizeBcFerriesRoutesInput({ type: 'all' }), /--type/)
  assert.throws(() => normalizeBcFerriesRoutesInput({ routeCode: 'HSB' }), /--route-code/)
})

function createFixture() {
  return {
    routes: [{
      routeCode: 'HSBNAN',
      fromTerminalCode: 'HSB',
      toTerminalCode: 'NAN',
      sailingDuration: '1:40',
      sailings: [
        { time: '6:15 am', arrivalTime: '7:55 am', sailingStatus: 'current', fill: 12, carFill: 10, oversizeFill: 2, vesselName: 'Queen of Oak Bay', vesselStatus: '' },
        { time: '', arrivalTime: '', sailingStatus: '', fill: 0, carFill: 0, oversizeFill: 0, vesselName: '', vesselStatus: '' },
      ],
    }],
  }
}

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } })
}
