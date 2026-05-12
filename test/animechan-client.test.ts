import assert from 'node:assert/strict'
import test from 'node:test'
import { getAnimeChanRandomQuote } from '../src/application/usecases/animeChan.js'
import { AnimeChanClient } from '../src/infrastructure/openApis/animeChanClient.js'

test('AnimeChan client fetches a random quote and maps the response envelope', async () => {
  const urls: string[] = []
  const client = new AnimeChanClient({
    baseUrl: 'https://example.test/v1',
    fetchImpl: (async url => {
      urls.push(String(url))
      return new Response(JSON.stringify({
        status: 'success',
        data: {
          content: 'If you only face forward, there is something you will miss seeing.',
          anime: { id: 497, name: 'ReLIFE', altName: 'ReLife' },
          character: { id: 837, name: 'Arata Kaizaki' },
        },
      }), { status: 200, headers: { 'content-type': 'application/json' } })
    }) as typeof fetch,
  })

  const quote = await client.getRandomQuote({ anime: 'ReLIFE' })

  assert.equal(urls[0], 'https://example.test/v1/quotes/random?anime=ReLIFE')
  assert.equal(quote.content, 'If you only face forward, there is something you will miss seeing.')
  assert.equal(quote.anime.name, 'ReLIFE')
  assert.equal(quote.character.name, 'Arata Kaizaki')
})

test('AnimeChan usecase returns open API metadata and normalized query', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async url => {
    assert.equal(String(url), 'https://api.animechan.io/v1/quotes/random?character=Saitama')
    return new Response(JSON.stringify({
      status: 'success',
      data: {
        content: 'I will leave tomorrow’s problems to tomorrow’s me.',
        anime: { id: 1, name: 'One-Punch Man' },
        character: { id: 2, name: 'Saitama' },
      },
    }), { status: 200, headers: { 'content-type': 'application/json' } })
  }) as typeof fetch
  try {
    const result = await getAnimeChanRandomQuote({ character: ' Saitama ' })

    assert.equal(result.kind, 'animechan.random')
    assert.equal(result.api.provider, 'animechan')
    assert.equal(result.api.authentication, 'none')
    assert.equal(result.api.usesBrowserClickstream, false)
    assert.equal(result.api.freeRateLimit, '5 requests/hour')
    assert.deepEqual(result.query, { character: 'Saitama' })
    assert.equal(result.quote.anime.name, 'One-Punch Man')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('AnimeChan usecase rejects mutually exclusive filters', async () => {
  await assert.rejects(
    () => getAnimeChanRandomQuote({ anime: 'ReLIFE', character: 'Saitama' }),
    /mutually exclusive/u,
  )
})

test('AnimeChan client surfaces provider error messages', async () => {
  const client = new AnimeChanClient({
    fetchImpl: (async () => new Response(JSON.stringify({
      message: 'Too many requests! Rate limit will reset in 1 hour.',
    }), { status: 429, statusText: 'Too Many Requests', headers: { 'content-type': 'application/json' } })) as typeof fetch,
  })

  await assert.rejects(
    () => client.getRandomQuote(),
    /Too many requests/u,
  )
})
