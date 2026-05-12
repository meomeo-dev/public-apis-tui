import assert from 'node:assert/strict'
import test from 'node:test'
import { getMeowFacts } from '../src/application/usecases/meowFacts.js'
import { MeowFactsClient } from '../src/infrastructure/openApis/meowFactsClient.js'

test('MeowFacts client sends documented no-auth query parameters', async () => {
  const requests: string[] = []
  const client = new MeowFactsClient({
    baseUrl: 'https://meow.test',
    fetchImpl: (async input => {
      requests.push(String(input))
      return jsonResponse({ data: ['Cats walk on their toes.'] })
    }) as typeof fetch,
  })

  const response = await client.getFacts({ count: 3, id: 2, lang: 'eng-us' })
  assert.deepEqual(response.data, ['Cats walk on their toes.'])
  assert.deepEqual(requests, ['https://meow.test/?count=3&id=2&lang=eng-us'])
})

test('MeowFacts usecase projects no-auth API metadata', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async () => jsonResponse({
    data: [
      'Cats walk on their toes.',
      'Cats have five toes on their front paws.',
    ],
  })) as typeof fetch
  try {
    const result = await getMeowFacts({ count: 2, lang: ' ENG-US ' })
    assert.equal(result.kind, 'meowfacts.facts')
    assert.equal(result.api.provider, 'meowfacts')
    assert.equal(result.api.authentication, 'none')
    assert.equal(result.api.usesBrowserClickstream, false)
    assert.deepEqual(result.query, { count: 2, id: undefined, lang: 'eng-us' })
    assert.equal(result.count, 2)
    assert.equal(result.facts[0], 'Cats walk on their toes.')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('MeowFacts usecase defaults to one fact and validates numeric filters', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async () => jsonResponse({ data: ['Cats walk on their toes.'] })) as typeof fetch
  try {
    const result = await getMeowFacts()
    assert.deepEqual(result.query, { count: 1, id: undefined, lang: undefined })
    await assert.rejects(() => getMeowFacts({ count: 0 }), /1 to 50/u)
    await assert.rejects(() => getMeowFacts({ id: -1 }), /non-negative/u)
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
