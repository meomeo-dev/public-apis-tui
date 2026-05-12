import assert from 'node:assert/strict'
import test from 'node:test'
import { getRandomDogWoof, listRandomDogFiles } from '../src/application/usecases/randomDog.js'
import { RandomDogClient } from '../src/infrastructure/openApis/randomDogClient.js'

test('RandomDog client sends documented no-auth requests', async () => {
  const requests: string[] = []
  const client = new RandomDogClient({
    baseUrl: 'https://random.test',
    fetchImpl: (async input => {
      requests.push(String(input))
      if (String(input).endsWith('/doggos')) {
        return jsonResponse(['a.jpg', 'b.mp4'])
      }
      return jsonResponse({ fileSizeBytes: 12345, url: 'https://random.dog/a.jpg' })
    }) as typeof fetch,
  })

  const woof = await client.getRandomWoof()
  const files = await client.listFiles()
  assert.equal(woof.url, 'https://random.dog/a.jpg')
  assert.deepEqual(files, ['a.jpg', 'b.mp4'])
  assert.deepEqual(requests, ['https://random.test/woof.json', 'https://random.test/doggos'])
})

test('RandomDog woof usecase projects no-auth API metadata', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async () => jsonResponse({
    fileSizeBytes: 12345,
    url: 'https://random.dog/a.jpg',
  })) as typeof fetch
  try {
    const result = await getRandomDogWoof()
    assert.equal(result.kind, 'randomdog.woof')
    assert.equal(result.api.provider, 'random-dog')
    assert.equal(result.api.authentication, 'none')
    assert.equal(result.api.usesBrowserClickstream, false)
    assert.equal(result.file.extension, 'jpg')
    assert.equal(result.file.mediaType, 'image')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('RandomDog files usecase filters, limits, and validates options', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async () => jsonResponse(['a.jpg', 'b.mp4', 'c.png'])) as typeof fetch
  try {
    const result = await listRandomDogFiles({ limit: 2, mediaType: 'image' })
    assert.equal(result.kind, 'randomdog.files')
    assert.deepEqual(result.query, { limit: 2, mediaType: 'image' })
    assert.equal(result.totalKnownFiles, 3)
    assert.deepEqual(result.files.map(file => file.name), ['a.jpg', 'c.png'])
    await assert.rejects(() => listRandomDogFiles({ limit: 0 }), /1 to 200/u)
    await assert.rejects(() => listRandomDogFiles({ mediaType: 'audio' }), /image or video/u)
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
