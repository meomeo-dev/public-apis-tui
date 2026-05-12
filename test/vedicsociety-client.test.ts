import assert from 'node:assert/strict'
import test from 'node:test'
import {
  getVedicSocietyCategory,
  normalizeVedicSocietyCategoryInput,
  normalizeVedicSocietyDescriptionsInput,
  normalizeVedicSocietyWordsInput,
  searchVedicSocietyDescriptions,
  searchVedicSocietyWords,
} from '../src/application/usecases/vedicSociety.js'
import {
  VedicSocietyClient,
} from '../src/infrastructure/openApis/vedicSocietyClient.js'

test('Vedic Society client calls documented noun metadata endpoints', async () => {
  const requestedUrls: string[] = []
  const client = new VedicSocietyClient(
    'https://indica-1hwj.onrender.com/vs/v2',
    (async input => {
      requestedUrls.push(String(input))
      return jsonResponse([createVedicSocietyEntry()])
    }) as typeof fetch,
  )

  await client.words('agni')
  await client.descriptions('sacrificial fire')
  await client.category('river')

  assert.deepEqual(requestedUrls, [
    'https://indica-1hwj.onrender.com/vs/v2/words/agni',
    'https://indica-1hwj.onrender.com/vs/v2/descriptions/sacrificial%20fire',
    'https://indica-1hwj.onrender.com/vs/v2/categories/river',
  ])
})

test('Vedic Society usecases project entries and local pagination', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async input => {
    const url = new URL(String(input))
    if (url.pathname.endsWith('/words/agni')) {
      return jsonResponse([
        createVedicSocietyEntry({ word: 'agnishala', category: 'building' }),
        createVedicSocietyEntry({ word: 'agneyi', category: 'place' }),
        createVedicSocietyEntry({ word: 'agni', category: 'object' }),
      ])
    }
    if (url.pathname.endsWith('/descriptions/fire')) {
      return jsonResponse([
        createVedicSocietyEntry({
          word: 'ashtri',
          description: 'fireplace',
          category: 'building',
        }),
      ])
    }
    assert.equal(url.pathname, '/vs/v2/categories/river')
    return jsonResponse([
      createVedicSocietyEntry({ word: 'ganga', category: 'river' }),
    ])
  }) as typeof fetch

  try {
    const words = await searchVedicSocietyWords({
      word: 'agni',
      limit: 2,
      offset: 1,
    })
    assert.equal(words.kind, 'vedicsociety.words')
    assert.equal(words.api.authentication, 'none')
    assert.equal(words.api.usesBrowserClickstream, false)
    assert.equal(words.pagination.total, 3)
    assert.equal(words.pagination.returned, 2)
    assert.equal(words.entries[0]?.word, 'agneyi')
    assert.deepEqual(words.facets.categories, ['building', 'object', 'place'])

    const descriptions = await searchVedicSocietyDescriptions({
      description: 'fire',
    })
    assert.equal(descriptions.kind, 'vedicsociety.descriptions')
    assert.equal(descriptions.entries[0]?.description, 'fireplace')

    const category = await getVedicSocietyCategory({ category: 'river' })
    assert.equal(category.kind, 'vedicsociety.category')
    assert.equal(category.entries[0]?.word, 'ganga')
    assert.match(category.api.boundary, /Read-only Vedic Society/u)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('Vedic Society normalization rejects unsafe warning-as-data inputs', () => {
  assert.deepEqual(normalizeVedicSocietyWordsInput({}), {
    word: 'agni',
    limit: 20,
    offset: 0,
  })
  assert.equal(normalizeVedicSocietyDescriptionsInput({}).description, 'fire')
  assert.equal(
    normalizeVedicSocietyCategoryInput({ category: 'River' }).category,
    'river',
  )
  assert.throws(
    () => normalizeVedicSocietyCategoryInput({ category: 'geography' }),
    /--category must be one of/u,
  )
  assert.throws(
    () => normalizeVedicSocietyWordsInput({ word: '../secret' }),
    /must not include slash/u,
  )
  assert.throws(
    () => normalizeVedicSocietyDescriptionsInput({ limit: 101 }),
    /--limit must be an integer from 1 to 100/u,
  )
})

test('Vedic Society maps known not-found text and rejects warnings', async () => {
  const emptyClient = new VedicSocietyClient(
    'https://indica-1hwj.onrender.com/vs/v2',
    (async () => new Response('Not found. No word contains that string.', {
      status: 200,
      headers: { 'content-type': 'text/html; charset=utf-8' },
    })) as typeof fetch,
  )
  assert.deepEqual(await emptyClient.words('zzzznotfound'), [])

  const warningClient = new VedicSocietyClient(
    'https://indica-1hwj.onrender.com/vs/v2',
    (async () => new Response('Error: Categories can only be these: river.', {
      status: 200,
      headers: { 'content-type': 'text/html; charset=utf-8' },
    })) as typeof fetch,
  )
  await assert.rejects(
    () => warningClient.category('geography'),
    /was not JSON/u,
  )

  const malformedClient = new VedicSocietyClient(
    'https://indica-1hwj.onrender.com/vs/v2',
    (async () => jsonResponse([{ word: 'ganga' }])) as typeof fetch,
  )
  await assert.rejects(
    () => malformedClient.category('river'),
    /missing string field nagari/u,
  )
})

test('Vedic Society client surfaces challenge HTML clearly', async () => {
  const client = new VedicSocietyClient(
    'https://indica-1hwj.onrender.com/vs/v2',
    (async () => new Response(
      '<!DOCTYPE html><title>Just a moment...</title>',
      {
        status: 403,
        headers: {
          'content-type': 'text/html; charset=UTF-8',
          server: 'cloudflare',
          'cf-mitigated': 'challenge',
        },
      },
    )) as typeof fetch,
  )

  await assert.rejects(
    () => client.words('agni'),
    /Cloudflare challenge HTML page/u,
  )
})

function createVedicSocietyEntry(
  overrides: Partial<ReturnType<typeof baseVedicSocietyEntry>> = {},
): Record<string, unknown> {
  return { ...baseVedicSocietyEntry(), ...overrides }
}

function baseVedicSocietyEntry(): Record<string, unknown> {
  return {
    word: 'agnishala',
    nagari: 'अग्निशाला',
    description: 'the central hall containing the fireplace',
    category: 'building',
  }
}

function jsonResponse(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}
