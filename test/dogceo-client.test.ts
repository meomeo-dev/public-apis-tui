import assert from 'node:assert/strict'
import test from 'node:test'
import { DogCeoClient } from '../src/infrastructure/openApis/dogCeoClient.js'
import {
  getDogCeoRandomImages,
  listDogCeoBreeds,
  listDogCeoSubBreeds,
} from '../src/application/usecases/dogCeo.js'

test('Dog CEO client sends documented no-auth requests', async () => {
  const requests: string[] = []
  const client = new DogCeoClient({
    baseUrl: 'https://dog.test/api',
    fetchImpl: (async input => {
      requests.push(String(input))
      return jsonResponse({
        message: ['https://images.dog.ceo/breeds/hound-afghan/sample.jpg'],
        status: 'success',
      })
    }) as typeof fetch,
  })

  const images = await client.getRandomImages({ breed: 'hound', subBreed: 'afghan', count: 2 })
  assert.deepEqual(images, ['https://images.dog.ceo/breeds/hound-afghan/sample.jpg'])
  assert.deepEqual(requests, ['https://dog.test/api/breed/hound/afghan/images/random/2'])
})

test('Dog CEO breeds usecase projects no-auth API metadata', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async () => jsonResponse({
    message: {
      hound: ['afghan', 'basset'],
      akita: [],
    },
    status: 'success',
  })) as typeof fetch
  try {
    const result = await listDogCeoBreeds()
    assert.equal(result.kind, 'dogceo.breeds')
    assert.equal(result.api.provider, 'dog-ceo')
    assert.equal(result.api.authentication, 'none')
    assert.equal(result.api.usesBrowserClickstream, false)
    assert.equal(result.totalBreeds, 2)
    assert.equal(result.totalSubBreeds, 2)
    assert.deepEqual(result.breeds[0], { breed: 'akita', subBreeds: [] })
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('Dog CEO images usecase normalizes filters and count', async () => {
  const requests: string[] = []
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async input => {
    requests.push(String(input))
    return jsonResponse({
      message: [
        'https://images.dog.ceo/breeds/hound-afghan/a.jpg',
        'https://images.dog.ceo/breeds/hound-afghan/b.jpg',
      ],
      status: 'success',
    })
  }) as typeof fetch
  try {
    const result = await getDogCeoRandomImages({ breed: ' HOUND ', subBreed: ' Afghan ', count: 2 })
    assert.equal(result.kind, 'dogceo.images')
    assert.deepEqual(result.query, { breed: 'hound', subBreed: 'afghan', count: 2 })
    assert.equal(result.count, 2)
    assert.deepEqual(requests, ['https://dog.ceo/api/breed/hound/afghan/images/random/2'])
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('Dog CEO sub-breeds usecase validates required breed', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async () => jsonResponse({
    message: ['afghan', 'basset'],
    status: 'success',
  })) as typeof fetch
  try {
    const result = await listDogCeoSubBreeds({ breed: ' HOUND ' })
    assert.equal(result.kind, 'dogceo.subbreeds')
    assert.deepEqual(result.query, { breed: 'hound' })
    assert.deepEqual(result.subBreeds, ['afghan', 'basset'])
  } finally {
    globalThis.fetch = originalFetch
  }
})

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}
