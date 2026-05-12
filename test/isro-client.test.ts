import assert from 'node:assert/strict'
import test from 'node:test'
import {
  listIsroCatalog,
  normalizeIsroCatalogInput,
} from '../src/application/usecases/isro.js'
import {
  IsroClient,
  normalizeIsroResource,
} from '../src/infrastructure/openApis/isroClient.js'

test('ISRO client calls documented resource endpoint', async () => {
  let requestedUrl: URL | undefined
  const client = new IsroClient('https://isro.vercel.app/api', (async input => {
    requestedUrl = new URL(String(input))
    return jsonResponse({
      spacecrafts: [
        { id: 1, name: 'Aryabhata' },
        { id: 50, name: 'Chandrayaan-1' },
      ],
    })
  }) as typeof fetch)

  const response = await client.listResource('spacecrafts')

  assert.equal(requestedUrl?.href, 'https://isro.vercel.app/api/spacecrafts')
  assert.deepEqual(response, [
    { id: 1, name: 'Aryabhata' },
    { id: 50, name: 'Chandrayaan-1' },
  ])
})

test(
  'ISRO client rejects Cloudflare challenge HTML as upstream blocker',
  async () => {
    const client = new IsroClient('https://isro.vercel.app/api', (async () => {
      return new Response('<!DOCTYPE html><title>Just a moment...</title>', {
        status: 403,
        statusText: 'Forbidden',
        headers: {
          'cf-mitigated': 'challenge',
          'content-type': 'text/html; charset=UTF-8',
          server: 'cloudflare',
        },
      })
    }) as typeof fetch)

    await assert.rejects(
      () => client.listResource('spacecrafts'),
      /Cloudflare challenge HTML/u,
    )
  },
)

test('ISRO usecase projects no-auth catalog metadata and local search', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async () => jsonResponse({
    customer_satellites: [
      {
        id: 'DLR-TUBSAT',
        country: 'Germany',
        launch_date: '26-05-1999',
        mass: '45',
        launcher: 'PSLV-C2',
      },
      {
        id: 'KITSAT-3',
        country: 'REPUBLIC OF KOREA',
        launch_date: '26-05-1999',
        mass: '110',
        launcher: 'PSLV-C2',
      },
    ],
  })) as typeof fetch
  try {
    const result = await listIsroCatalog({
      resource: 'customer_satellites',
      search: 'germany',
      limit: 5,
    })
    assert.equal(result.kind, 'isro.catalog')
    assert.equal(result.api.provider, 'isro')
    assert.equal(result.api.authentication, 'none')
    assert.equal(result.api.usesBrowserClickstream, false)
    assert.deepEqual(result.api.excludedResources, ['spacecraft_missions'])
    assert.equal(result.query.resource, 'customer_satellites')
    assert.equal(result.pagination.total, 2)
    assert.equal(result.pagination.matched, 1)
    assert.equal(result.items[0]?.id, 'DLR-TUBSAT')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('ISRO normalizers enforce curated resources and pagination bounds', () => {
  assert.equal(normalizeIsroResource('customer-satellites'), 'customer_satellites')
  assert.deepEqual(normalizeIsroCatalogInput({}), {
    resource: 'spacecrafts',
    limit: 20,
    offset: 0,
  })
  assert.deepEqual(normalizeIsroCatalogInput({
    resource: 'centres',
    search: 'Bengaluru',
    limit: 10,
    offset: 2,
  }), {
    resource: 'centres',
    search: 'Bengaluru',
    limit: 10,
    offset: 2,
  })
  assert.throws(() => normalizeIsroResource('spacecraft_missions'), /must be one of/)
  assert.throws(() => normalizeIsroCatalogInput({ limit: 101 }), /between 1 and 100/)
  assert.throws(() => normalizeIsroCatalogInput({ offset: 501 }), /between 0 and 500/)
})

function jsonResponse(value: unknown): Response {
  return new Response(JSON.stringify(value), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })
}
