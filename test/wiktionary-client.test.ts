import assert from 'node:assert/strict'
import test from 'node:test'
import { extractWiktionary, searchWiktionary } from '../src/application/usecases/wiktionary.js'
import {
  WiktionaryClient,
  normalizeWiktionaryExtractInput,
  normalizeWiktionarySearchInput,
} from '../src/infrastructure/openApis/wiktionaryClient.js'

test('Wiktionary client calls MediaWiki search and extracts endpoints', async () => {
  const requests: string[] = []
  const client = new WiktionaryClient({
    baseUrl: 'https://wiktionary.test',
    fetchImpl: (async input => {
      const url = new URL(String(input))
      requests.push(url.href)
      assert.equal(url.pathname, '/w/api.php')
      assert.equal(url.searchParams.get('format'), 'json')
      if (url.searchParams.get('list') === 'search') {
        assert.equal(url.searchParams.get('srsearch'), 'hello')
        assert.equal(url.searchParams.get('srlimit'), '50')
        return jsonResponse(createSearchBody())
      }
      assert.equal(url.searchParams.get('prop'), 'extracts')
      assert.equal(url.searchParams.get('titles'), 'hello')
      return jsonResponse(createExtractBody())
    }) as typeof fetch,
  })

  const search = await client.search({ query: 'hello' })
  const extract = await client.extract({ title: 'hello' })

  assert.equal(requests.length, 2)
  assert.equal(search.items[0]?.title, 'hello')
  assert.equal(search.continueOffset, 50)
  assert.equal(extract.title, 'hello')
  assert.equal(extract.extract.includes('== English =='), true)
})

test('Wiktionary usecases project TUI-ready search and extract JSON', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async input => {
    const url = new URL(String(input))
    return jsonResponse(url.searchParams.get('list') === 'search' ? createSearchBody() : createExtractBody())
  }) as typeof fetch
  try {
    const search = await searchWiktionary({ query: 'hello', limit: 2 })
    assert.equal(search.kind, 'wiktionary.search')
    assert.equal(search.api.authentication, 'none')
    assert.equal(search.api.usesBrowserClickstream, false)
    assert.equal(search.results[0]?.url, 'https://en.wiktionary.org/wiki/hello')

    const extract = await extractWiktionary({ title: 'hello', chars: 200 })
    assert.equal(extract.kind, 'wiktionary.extract')
    assert.equal(extract.api.authentication, 'none')
    assert.equal(extract.page.title, 'hello')
    assert.equal(extract.page.extractChars > 0, true)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('Wiktionary normalizers enforce curated API bounds', () => {
  assert.deepEqual(normalizeWiktionarySearchInput({ query: ' hello ', limit: 50, offset: 3 }), {
    query: 'hello',
    limit: 50,
    offset: 3,
  })
  assert.deepEqual(normalizeWiktionaryExtractInput({ title: ' hello ', chars: 12000, redirects: false }), {
    title: 'hello',
    chars: 12000,
    redirects: false,
  })
  assert.throws(() => normalizeWiktionarySearchInput({ limit: 51 }), /--limit/u)
  assert.throws(() => normalizeWiktionarySearchInput({ offset: -1 }), /--offset/u)
  assert.throws(() => normalizeWiktionaryExtractInput({ chars: 12001 }), /--chars/u)
})

function createSearchBody() {
  return {
    batchcomplete: true,
    continue: { sroffset: 50, continue: '-||' },
    query: {
      searchinfo: { totalhits: 1535 },
      search: [
        {
          ns: 0,
          title: 'hello',
          pageid: 4803,
          size: 42895,
          wordcount: 1017,
          snippet: '<span class="searchmatch">Hello</span>, world',
          timestamp: '2026-03-23T18:04:21Z',
        },
      ],
    },
  }
}

function createExtractBody() {
  return {
    batchcomplete: true,
    query: {
      pages: [
        {
          pageid: 4803,
          ns: 0,
          title: 'hello',
          extract: '== English ==\n\n=== Interjection ===\nA greeting.',
        },
      ],
    },
  }
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}
