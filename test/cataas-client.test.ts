import assert from 'node:assert/strict'
import test from 'node:test'
import { getCataasRandomCat, listCataasCats, listCataasTags } from '../src/application/usecases/cataas.js'
import { CataasClient } from '../src/infrastructure/openApis/cataasClient.js'

test('Cataas client sends documented no-auth random cat JSON request', async () => {
  let requestedUrl: URL | undefined
  const client = new CataasClient({
    fetchImpl: (async input => {
      requestedUrl = new URL(String(input))
      return jsonResponse(createRandomCatResponse())
    }) as typeof fetch,
  })

  const cat = await client.getRandomCat({ tag: 'cute' })

  assert.equal(requestedUrl?.origin, 'https://cataas.com')
  assert.equal(requestedUrl?.pathname, '/cat/cute')
  assert.equal(requestedUrl?.searchParams.get('json'), 'true')
  assert.equal(requestedUrl?.searchParams.has('api_key'), false)
  assert.equal(cat.id, 'cat-123')
})

test('Cataas tags usecase projects no-auth API metadata', async () => {
  const previousFetch = globalThis.fetch
  globalThis.fetch = (async () => jsonResponse(['cute', 'sleepy'])) as typeof fetch

  try {
    const result = await listCataasTags()

    assert.equal(result.kind, 'cataas.tags')
    assert.equal(result.api.provider, 'cataas')
    assert.equal(result.api.authentication, 'none')
    assert.equal(result.api.usesBrowserClickstream, false)
    assert.deepEqual(result.tags, ['cute', 'sleepy'])
  } finally {
    globalThis.fetch = previousFetch
  }
})

test('Cataas cats usecase projects cat rows', async () => {
  const previousFetch = globalThis.fetch
  globalThis.fetch = (async () => jsonResponse([createListedCatResponse()])) as typeof fetch

  try {
    const result = await listCataasCats({ tags: 'cute', limit: 1, skip: 0 })

    assert.equal(result.kind, 'cataas.cats')
    assert.equal(result.query.tags, 'cute')
    assert.equal(result.count, 1)
    assert.equal(result.cats[0]?.url, 'https://cataas.com/cat/cat-123')
  } finally {
    globalThis.fetch = previousFetch
  }
})

test('Cataas random usecase normalizes random cat shape', async () => {
  const previousFetch = globalThis.fetch
  globalThis.fetch = (async () => jsonResponse(createRandomCatResponse())) as typeof fetch

  try {
    const result = await getCataasRandomCat({ tag: 'cute' })

    assert.equal(result.kind, 'cataas.cat')
    assert.equal(result.query.tag, 'cute')
    assert.equal(result.cat.createdAt, '2024-11-11T21:11:17.120Z')
    assert.equal(result.cat.url, 'https://cataas.com/cat/cat-123?position=center')
  } finally {
    globalThis.fetch = previousFetch
  }
})

function createRandomCatResponse() {
  return {
    id: 'cat-123',
    tags: ['cute'],
    created_at: '2024-11-11T21:11:17.120Z',
    url: 'https://cataas.com/cat/cat-123?position=center',
    mimetype: 'image/jpeg',
  }
}

function createListedCatResponse() {
  return {
    id: 'cat-123',
    tags: ['cute'],
    mimetype: 'image/jpeg',
    createdAt: '2024-11-11T21:11:17.120Z',
  }
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json',
    },
  })
}
