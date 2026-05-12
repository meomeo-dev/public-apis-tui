import assert from 'node:assert/strict'
import test from 'node:test'
import {
  getApisGuruMetrics,
  listApisGuruProviders,
  normalizeApisGuruSearchInput,
  searchApisGuru,
} from '../src/application/usecases/apisGuru.js'
import { ApisGuruClient } from '../src/infrastructure/openApis/apisGuruClient.js'

const listFixture = {
  'example.com': {
    added: '2026-01-01T00:00:00.000Z',
    preferred: 'v1',
    versions: {
      v1: {
        added: '2026-01-01T00:00:00.000Z',
        updated: '2026-05-01T00:00:00.000Z',
        openapiVer: '3.0.0',
        swaggerUrl: 'https://api.apis.guru/v2/specs/example.com/v1/swagger.json',
        swaggerYamlUrl: 'https://api.apis.guru/v2/specs/example.com/v1/swagger.yaml',
        link: 'https://api.apis.guru/v2/specs/example.com/v1.json',
        info: {
          title: 'Example API',
          description: 'Example OpenAPI directory entry',
          'x-providerName': 'example.com',
          'x-apisguru-categories': ['developer_tools'],
        },
      },
    },
  },
  'social.example.com:graph': {
    preferred: 'v2',
    versions: {
      v2: {
        updated: '2026-04-01T00:00:00.000Z',
        openapiVer: '3.1.0',
        info: {
          title: 'Graph Social API',
          description: 'Social graph tooling',
          'x-providerName': 'social.example.com',
          'x-serviceName': 'graph',
          'x-apisguru-categories': ['social'],
          'x-unofficialSpec': true,
        },
      },
    },
  },
}

test('APIs.guru client reads documented providers, list, and metrics endpoints', async () => {
  const requested: string[] = []
  const client = new ApisGuruClient({
    fetchImpl: (async input => {
      const url = new URL(String(input))
      requested.push(url.pathname)
      if (url.pathname.endsWith('/providers.json')) {
        return jsonResponse({ data: ['example.com', 'social.example.com'] })
      }
      if (url.pathname.endsWith('/list.json')) {
        return jsonResponse(listFixture)
      }
      if (url.pathname.endsWith('/metrics.json')) {
        return jsonResponse({
          numSpecs: 2,
          numAPIs: 2,
          numEndpoints: 20,
          datasets: [{ title: 'providerCount', data: { 'example.com': 1, 'social.example.com': 1 } }],
        })
      }
      return jsonResponse({ message: 'missing' }, 404)
    }) as typeof fetch,
  })

  assert.deepEqual(await client.listProviders(), ['example.com', 'social.example.com'])
  assert.equal((await client.listApis())[0]?.versions[0]?.title, 'Example API')
  assert.equal((await client.getMetrics()).numEndpoints, 20)
  assert.deepEqual(requested, ['/v2/providers.json', '/v2/list.json', '/v2/metrics.json'])
})

test('APIs.guru usecases project no-auth metadata and curated search filters', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async input => {
    const url = new URL(String(input))
    if (url.pathname.endsWith('/providers.json')) {
      return jsonResponse({ data: ['example.com', 'social.example.com'] })
    }
    if (url.pathname.endsWith('/list.json')) {
      return jsonResponse(listFixture)
    }
    return jsonResponse({
      numSpecs: 2,
      numAPIs: 2,
      numEndpoints: 20,
      numProviders: 2,
      thisWeek: { added: 1, updated: 2 },
      datasets: [{ title: 'providerCount', data: { 'example.com': 1 } }],
    })
  }) as typeof fetch
  try {
    const providers = await listApisGuruProviders({ query: 'example', limit: 1 })
    assert.equal(providers.kind, 'apisguru.providers')
    assert.equal(providers.api.authentication, 'none')
    assert.equal(providers.api.usesBrowserClickstream, false)
    assert.equal(providers.matchedProviders, 2)
    assert.deepEqual(providers.providers, ['example.com'])

    const search = await searchApisGuru({ query: 'graph', includeUnofficial: true, limit: 5 })
    assert.equal(search.kind, 'apisguru.search')
    assert.equal(search.api.upstreamPagination, 'none')
    assert.equal(search.apis[0]?.id, 'social.example.com:graph')

    const metrics = await getApisGuruMetrics()
    assert.equal(metrics.kind, 'apisguru.metrics')
    assert.equal(metrics.metrics.numEndpoints, 20)
    assert.equal(metrics.datasets[0]?.top[0]?.key, 'example.com')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('APIs.guru normalizer enforces bounded terminal output options', () => {
  assert.deepEqual(normalizeApisGuruSearchInput({ query: ' openapi ', limit: 3 }), {
    query: 'openapi',
    includeUnofficial: false,
    sort: 'updated',
    limit: 3,
  })
  assert.throws(() => normalizeApisGuruSearchInput({ limit: 101 }), /between 1 and 100/)
  assert.throws(() => normalizeApisGuruSearchInput({ sort: 'rank' as never }), /updated, title, or provider/)
})

function jsonResponse(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}
