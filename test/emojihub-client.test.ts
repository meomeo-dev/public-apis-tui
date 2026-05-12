import assert from 'node:assert/strict'
import test from 'node:test'
import {
  getEmojiHubRandom,
  listEmojiHubCategories,
  listEmojiHubGroups,
  searchEmojiHub,
} from '../src/application/usecases/emojiHub.js'
import { EmojiHubClient } from '../src/infrastructure/openApis/emojiHubClient.js'

test('EmojiHub client sends documented no-auth search request', async () => {
  const seen: { url?: string | undefined } = {}
  const client = new EmojiHubClient({
    fetchImpl: (async input => {
      seen.url = String(input)
      return jsonResponse([createEmojiFixture()])
    }) as typeof fetch,
  })

  const response = await client.searchEmojis({ query: 'cat' })

  assert.equal(seen.url, 'https://emojihub.yurace.pro/api/search?q=cat')
  assert.equal(response[0]?.name, 'smiling cat face with open mouth')
})

test('EmojiHub usecases project emoji metadata and taxonomy', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async input => {
    const url = new URL(String(input))
    if (url.pathname === '/api/random') {
      return jsonResponse(createEmojiFixture())
    }
    if (url.pathname === '/api/categories') {
      return jsonResponse(['smileys and people', 'animals and nature'])
    }
    if (url.pathname === '/api/groups') {
      return jsonResponse(['cat face', 'animal mammal'])
    }
    return jsonResponse([createEmojiFixture()])
  }) as typeof fetch
  try {
    const random = await getEmojiHubRandom()
    assert.equal(random.kind, 'emojihub.random')
    assert.equal(random.api.authentication, 'none')
    assert.equal(random.api.usesBrowserClickstream, false)
    assert.equal(random.emoji.character, '😺')

    const search = await searchEmojiHub({ category: 'animals and nature', limit: 1 })
    assert.equal(search.kind, 'emojihub.search')
    assert.equal(search.api.endpoint, 'GET /all/category/:category')
    assert.equal(search.query.category, 'animals-and-nature')
    assert.equal(search.count, 1)

    const categories = await listEmojiHubCategories({ limit: 1 })
    assert.deepEqual(categories.categories, ['smileys and people'])

    const groups = await listEmojiHubGroups({ limit: 2 })
    assert.deepEqual(groups.groups, ['cat face', 'animal mammal'])
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('EmojiHub usecases validate curated search options', async () => {
  await assert.rejects(() => searchEmojiHub({}), /exactly one/u)
  await assert.rejects(() => searchEmojiHub({ query: 'cat', category: 'animals and nature' }), /exactly one/u)
  await assert.rejects(() => searchEmojiHub({ query: 'cat', limit: 101 }), /1 to 100/u)
  await assert.rejects(() => searchEmojiHub({ group: 'cat/face' }), /documented slug/u)
  await assert.rejects(() => listEmojiHubGroups({ limit: 0 }), /1 to 100/u)
})

test('EmojiHub client surfaces provider errors', async () => {
  const client = new EmojiHubClient({
    fetchImpl: (async () => jsonResponse({ message: 'not found' }, 404)) as typeof fetch,
  })

  await assert.rejects(
    () => client.listCategories(),
    /not found/u,
  )
})

function createEmojiFixture(): Record<string, unknown> {
  return {
    name: 'smiling cat face with open mouth',
    category: 'smileys and people',
    group: 'cat face',
    htmlCode: ['&#128570;'],
    unicode: ['U+1F63A'],
  }
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}
