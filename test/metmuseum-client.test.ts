import assert from 'node:assert/strict'
import test from 'node:test'
import { getMetMuseumObject, listMetMuseumDepartments, searchMetMuseum } from '../src/application/usecases/metMuseum.js'
import { MetMuseumClient } from '../src/infrastructure/openApis/metMuseumClient.js'

test('Met Museum client sends documented search query parameters', async () => {
  const seen: { url?: string | undefined } = {}
  const client = new MetMuseumClient({
    fetchImpl: (async input => {
      seen.url = String(input)
      return jsonResponse({ total: 2, objectIDs: [436121, 436545] })
    }) as typeof fetch,
  })

  const result = await client.searchObjects({ q: 'cat', departmentId: 11, hasImages: true, isPublicDomain: true })

  assert.equal(seen.url, 'https://collectionapi.metmuseum.org/public/collection/v1/search?q=cat&departmentId=11&hasImages=true&isPublicDomain=true')
  assert.deepEqual(result.objectIDs, [436121, 436545])
})

test('Met Museum usecases project search, object, and departments', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async input => {
    const url = new URL(String(input))
    if (url.pathname.endsWith('/search')) {
      return jsonResponse({ total: 2, objectIDs: [436121, 436545] })
    }
    if (url.pathname.endsWith('/departments')) {
      return jsonResponse({ departments: [{ departmentId: 11, displayName: 'European Paintings' }] })
    }
    return jsonResponse(createObjectFixture(Number(url.pathname.split('/').pop() ?? 436121)))
  }) as typeof fetch
  try {
    const search = await searchMetMuseum({ query: 'cat', hasImages: true, limit: 2, detailLimit: 1 })
    assert.equal(search.kind, 'metmuseum.search')
    assert.equal(search.api.authentication, 'none')
    assert.equal(search.api.usesBrowserClickstream, false)
    assert.equal(search.api.rateLimit, '80 requests/second')
    assert.deepEqual(search.objectIds, [436121, 436545])
    assert.equal(search.objects[0]?.title, 'A Woman Seated beside a Vase of Flowers')

    const object = await getMetMuseumObject({ objectId: 436121 })
    assert.equal(object.kind, 'metmuseum.object')
    assert.equal(object.object.objectId, 436121)

    const departments = await listMetMuseumDepartments({ limit: 1 })
    assert.deepEqual(departments.departments, [{ departmentId: 11, displayName: 'European Paintings' }])
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('Met Museum usecases validate curated limits and identifiers', async () => {
  await assert.rejects(() => searchMetMuseum({}), /requires --query/u)
  await assert.rejects(() => searchMetMuseum({ query: 'cat', limit: 101 }), /1 to 100/u)
  await assert.rejects(() => searchMetMuseum({ query: 'cat', detailLimit: 21 }), /1 to 20/u)
  await assert.rejects(() => searchMetMuseum({ query: 'cat', departmentId: 0 }), /department-id/u)
  await assert.rejects(() => getMetMuseumObject({ objectId: 0 }), /object-id/u)
})

test('Met Museum client surfaces provider errors', async () => {
  const client = new MetMuseumClient({
    fetchImpl: (async () => jsonResponse({ message: 'Not found' }, 404)) as typeof fetch,
  })

  await assert.rejects(
    () => client.getObject(999999999),
    /Not found/u,
  )
})

function createObjectFixture(objectID: number): Record<string, unknown> {
  return {
    objectID,
    title: 'A Woman Seated beside a Vase of Flowers',
    department: 'European Paintings',
    objectName: 'Painting',
    artistDisplayName: 'Edgar Degas',
    objectDate: '1865',
    medium: 'Oil on canvas',
    dimensions: '29 x 36 1/4 in.',
    isPublicDomain: true,
    primaryImage: 'https://images.metmuseum.org/CRDImages/ep/original/DP-25460-001.jpg',
    primaryImageSmall: 'https://images.metmuseum.org/CRDImages/ep/web-large/DP-25460-001.jpg',
    objectURL: `https://www.metmuseum.org/art/collection/search/${objectID}`,
  }
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}
