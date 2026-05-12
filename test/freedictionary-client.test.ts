import assert from 'node:assert/strict'
import test from 'node:test'
import { defineFreeDictionary } from '../src/application/usecases/freeDictionary.js'
import {
  FreeDictionaryClient,
  normalizeFreeDictionaryDefineInput,
} from '../src/infrastructure/openApis/freeDictionaryClient.js'

test('Free Dictionary client calls documented entries endpoint and parses rate-limit headers', async () => {
  const requests: string[] = []
  const client = new FreeDictionaryClient({
    baseUrl: 'https://dictionary.test',
    fetchImpl: (async input => {
      const url = new URL(String(input))
      requests.push(url.href)
      assert.equal(url.pathname, '/api/v2/entries/en/hello')
      return jsonResponse(createEntriesBody(), 200, {
        'x-ratelimit-limit': '450',
        'x-ratelimit-remaining': '449',
        'x-ratelimit-reset': '1775767656',
      })
    }) as typeof fetch,
  })

  const result = await client.define({ word: 'hello', language: 'en' })

  assert.deepEqual(requests, ['https://dictionary.test/api/v2/entries/en/hello'])
  assert.equal(result.entries[0]?.word, 'hello')
  assert.equal(result.entries[0]?.meanings[0]?.definitions[0]?.definition, 'A greeting.')
  assert.equal(result.rateLimit.limit, '450')
})

test('Free Dictionary usecase projects bounded TUI-ready definitions', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async () => jsonResponse(createEntriesBody(), 200, {
    'x-ratelimit-limit': '450',
    'x-ratelimit-remaining': '449',
  })) as typeof fetch
  try {
    const result = await defineFreeDictionary({ word: 'hello', definitionLimit: 1 })
    assert.equal(result.kind, 'freedictionary.define')
    assert.equal(result.api.authentication, 'none')
    assert.equal(result.api.usesBrowserClickstream, false)
    assert.equal(result.query.word, 'hello')
    assert.equal(result.entries[0]?.meanings[0]?.definitions.length, 1)
    assert.equal(result.count.definitionsShown, 1)
    assert.equal(result.count.definitionsTotal, 2)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('Free Dictionary normalizer enforces curated inputs', () => {
  assert.deepEqual(normalizeFreeDictionaryDefineInput({ word: ' hello ', language: 'EN', definitionLimit: 2 }), {
    word: 'hello',
    language: 'en',
    definitionLimit: 2,
  })
  assert.throws(() => normalizeFreeDictionaryDefineInput({ word: 'bad/word' }), /--word/u)
  assert.throws(() => normalizeFreeDictionaryDefineInput({ language: 'english' }), /--language/u)
  assert.throws(() => normalizeFreeDictionaryDefineInput({ definitionLimit: 51 }), /definition-limit/u)
})

function createEntriesBody() {
  return [
    {
      word: 'hello',
      phonetic: '/həˈloʊ/',
      phonetics: [{ text: '/həˈloʊ/', audio: 'https://api.dictionaryapi.dev/media/pronunciations/en/hello-us.mp3' }],
      meanings: [
        {
          partOfSpeech: 'interjection',
          definitions: [
            { definition: 'A greeting.', example: 'Hello, everyone.', synonyms: ['hi'], antonyms: ['bye'] },
            { definition: 'A call for attention.', synonyms: [], antonyms: [] },
          ],
          synonyms: ['greeting'],
          antonyms: ['goodbye'],
        },
      ],
      license: { name: 'CC BY-SA 3.0', url: 'https://creativecommons.org/licenses/by-sa/3.0' },
      sourceUrls: ['https://en.wiktionary.org/wiki/hello'],
    },
  ]
}

function jsonResponse(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...headers },
  })
}
