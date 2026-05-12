import assert from 'node:assert/strict'
import test from 'node:test'
import { getHttpDogStatus } from '../src/application/usecases/httpDog.js'
import { HttpDogClient } from '../src/infrastructure/openApis/httpDogClient.js'

test('HTTP Dog client sends documented no-auth JSON request', async () => {
  const requests: string[] = []
  const client = new HttpDogClient({
    baseUrl: 'https://dog.test',
    fetchImpl: (async input => {
      requests.push(String(input))
      return jsonResponse({
        status_code: 404,
        title: 'Not Found',
        url: 'https://http.dog/404',
        image: {
          jpg: 'https://http.dog/404.jpg',
          webp: 'https://http.dog/404.webp',
          avif: 'https://http.dog/404.avif',
          jxl: 'https://http.dog/404.jxl',
        },
      })
    }) as typeof fetch,
  })

  const status = await client.getStatus(404)
  assert.equal(status.status_code, 404)
  assert.equal(status.title, 'Not Found')
  assert.deepEqual(requests, ['https://dog.test/404.json'])
})

test('HTTP Dog usecase projects no-auth API metadata', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async () => jsonResponse({
    status_code: 418,
    title: "I'm a teapot",
    url: 'https://http.dog/418',
    image: {
      jpg: 'https://http.dog/418.jpg',
      webp: 'https://http.dog/418.webp',
      avif: 'https://http.dog/418.avif',
      jxl: 'https://http.dog/418.jxl',
    },
  })) as typeof fetch
  try {
    const result = await getHttpDogStatus({ statusCode: 418 })
    assert.equal(result.kind, 'httpdog.status')
    assert.equal(result.api.provider, 'http-dog')
    assert.equal(result.api.authentication, 'none')
    assert.equal(result.api.usesBrowserClickstream, false)
    assert.deepEqual(result.query, { statusCode: 418 })
    assert.equal(result.status.images.jpg, 'https://http.dog/418.jpg')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('HTTP Dog usecase defaults to 404 and validates status code range', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async () => jsonResponse({
    status_code: 404,
    title: 'Not Found',
    url: 'https://http.dog/404',
    image: {
      jpg: 'https://http.dog/404.jpg',
      webp: 'https://http.dog/404.webp',
      avif: 'https://http.dog/404.avif',
      jxl: 'https://http.dog/404.jxl',
    },
  })) as typeof fetch
  try {
    const result = await getHttpDogStatus()
    assert.deepEqual(result.query, { statusCode: 404 })
    await assert.rejects(() => getHttpDogStatus({ statusCode: 42 }), /100 to 999/u)
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
