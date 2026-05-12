import assert from 'node:assert/strict'
import test from 'node:test'
import { listCatFactNinjaBreeds, listCatFactNinjaFacts } from '../src/application/usecases/catFactNinja.js'
import { CatFactNinjaClient } from '../src/infrastructure/openApis/catFactNinjaClient.js'

test('CatFact Ninja client sends documented no-auth query parameters', async () => {
  let requestedUrl: URL | undefined
  const client = new CatFactNinjaClient({
    fetchImpl: (async input => {
      requestedUrl = new URL(String(input))
      return jsonResponse({
        fact: 'Cats have 3 eyelids.',
        length: 20,
      })
    }) as typeof fetch,
  })

  const fact = await client.getRandomFact({ maxLength: 140 })

  assert.equal(requestedUrl?.origin, 'https://catfact.ninja')
  assert.equal(requestedUrl?.pathname, '/fact')
  assert.equal(requestedUrl?.searchParams.get('max_length'), '140')
  assert.equal(requestedUrl?.searchParams.has('api_key'), false)
  assert.equal(fact.fact, 'Cats have 3 eyelids.')
})

test('CatFact Ninja facts usecase projects no-auth API metadata', async () => {
  const previousFetch = globalThis.fetch
  globalThis.fetch = (async () => jsonResponse(createFactsResponse())) as typeof fetch

  try {
    const result = await listCatFactNinjaFacts({ limit: 2, page: 1 })

    assert.equal(result.kind, 'catfact.facts')
    assert.equal(result.api.authentication, 'none')
    assert.equal(result.api.usesBrowserClickstream, false)
    assert.equal(result.pagination.total, 2)
    assert.equal(result.facts[0]?.fact, 'Cats walk on their toes.')
  } finally {
    globalThis.fetch = previousFetch
  }
})

test('CatFact Ninja breeds usecase projects breed rows', async () => {
  const previousFetch = globalThis.fetch
  globalThis.fetch = (async () => jsonResponse(createBreedsResponse())) as typeof fetch

  try {
    const result = await listCatFactNinjaBreeds({ limit: 1 })

    assert.equal(result.kind, 'catfact.breeds')
    assert.equal(result.api.authentication, 'none')
    assert.equal(result.breeds[0]?.breed, 'Abyssinian')
  } finally {
    globalThis.fetch = previousFetch
  }
})

function createFactsResponse() {
  return {
    current_page: 1,
    data: [
      { fact: 'Cats walk on their toes.', length: 24 },
      { fact: 'Most cats adore sardines.', length: 25 },
    ],
    first_page_url: 'https://catfact.ninja/facts?page=1',
    from: 1,
    last_page: 1,
    last_page_url: 'https://catfact.ninja/facts?page=1',
    next_page_url: null,
    path: 'https://catfact.ninja/facts',
    per_page: 2,
    prev_page_url: null,
    to: 2,
    total: 2,
  }
}

function createBreedsResponse() {
  return {
    current_page: 1,
    data: [
      {
        breed: 'Abyssinian',
        country: 'Ethiopia',
        origin: 'Natural/Standard',
        coat: 'Short',
        pattern: 'Ticked',
      },
    ],
    first_page_url: 'https://catfact.ninja/breeds?page=1',
    from: 1,
    last_page: 1,
    last_page_url: 'https://catfact.ninja/breeds?page=1',
    next_page_url: null,
    path: 'https://catfact.ninja/breeds',
    per_page: 1,
    prev_page_url: null,
    to: 1,
    total: 1,
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
