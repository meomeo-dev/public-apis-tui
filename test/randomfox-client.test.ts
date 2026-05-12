import assert from 'node:assert/strict'
import test from 'node:test'
import { getRandomFoxFloof } from '../src/application/usecases/randomFox.js'
import { RandomFoxClient } from '../src/infrastructure/openApis/randomFoxClient.js'

test('RandomFox client sends documented no-auth request', async () => {
  const requests: string[] = []
  const client = new RandomFoxClient({
    baseUrl: 'https://fox.test',
    fetchImpl: (async input => {
      requests.push(String(input))
      return jsonResponse({
        image: 'https://randomfox.ca/images/34.jpg',
        link: 'https://randomfox.ca/?i=34',
      })
    }) as typeof fetch,
  })

  const floof = await client.getFloof()
  assert.equal(floof.image, 'https://randomfox.ca/images/34.jpg')
  assert.deepEqual(requests, ['https://fox.test/floof/'])
})

test('RandomFox usecase projects no-auth API metadata', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async () => jsonResponse({
    image: 'https://randomfox.ca/images/34.jpg',
    link: 'https://randomfox.ca/?i=34',
  })) as typeof fetch
  try {
    const result = await getRandomFoxFloof()
    assert.equal(result.kind, 'randomfox.floof')
    assert.equal(result.api.provider, 'random-fox')
    assert.equal(result.api.authentication, 'none')
    assert.equal(result.api.usesBrowserClickstream, false)
    assert.deepEqual(result.query, {})
    assert.equal(result.fox.link, 'https://randomfox.ca/?i=34')
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
