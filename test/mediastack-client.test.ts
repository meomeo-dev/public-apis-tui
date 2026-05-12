import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { listMediastackNews } from '../src/application/usecases/mediastackNews.js'
import { MediastackClient } from '../src/infrastructure/openApis/mediastackClient.js'
import { writePublicApiProviderConfig } from '../src/infrastructure/persistence/publicApiConfig.js'
import { RuntimeFailure } from '../src/shared/errors/runtimeFailure.js'

test('Mediastack client sends access key and documented news filters', async () => {
  let requestedUrl: string | undefined
  const client = new MediastackClient({
    apiKey: 'test-key',
    fetchImpl: async input => {
      requestedUrl = String(input)
      return jsonResponse({
        pagination: { limit: 5, offset: 10, count: 1, total: 42 },
        data: [createArticleFixture()],
      })
    },
  })

  const result = await client.listNews({
    keywords: 'ai',
    categories: 'technology',
    countries: 'us',
    languages: 'en',
    sort: 'published_desc',
    limit: 5,
    offset: 10,
  })

  assert.ok(requestedUrl)
  const url = new URL(requestedUrl)
  assert.equal(`${url.origin}${url.pathname}`, 'https://api.mediastack.com/v1/news')
  assert.equal(url.searchParams.get('access_key'), 'test-key')
  assert.equal(url.searchParams.get('keywords'), 'ai')
  assert.equal(url.searchParams.get('categories'), 'technology')
  assert.equal(url.searchParams.get('countries'), 'us')
  assert.equal(url.searchParams.get('languages'), 'en')
  assert.equal(url.searchParams.get('sort'), 'published_desc')
  assert.equal(url.searchParams.get('limit'), '5')
  assert.equal(url.searchParams.get('offset'), '10')
  assert.equal(result.pagination.total, 42)
  assert.equal(result.data[0]?.title, 'Public API headline')
})

test('Mediastack client surfaces provider error payloads as runtime failures', async () => {
  const client = new MediastackClient({
    apiKey: 'bad-key',
    fetchImpl: async () =>
      jsonResponse({
        error: {
          code: 'invalid_access_key',
          message: 'You have not supplied a valid API Access Key.',
        },
      }, 401),
  })

  await assert.rejects(
    () => client.listNews(),
    (error: unknown) => {
      assert.ok(error instanceof RuntimeFailure)
      assert.equal(error.code, 'OPEN_API_FAILED')
      assert.equal(error.details.code, 'invalid_access_key')
      return true
    },
  )
})

test('Mediastack news usecase projects open API metadata and article shape', async () => {
  const previousFetch = globalThis.fetch
  globalThis.fetch = (async () =>
    jsonResponse({
      pagination: { limit: 1, offset: 0, count: 1, total: 1 },
      data: [createArticleFixture()],
    })) as typeof fetch

  try {
    const result = await listMediastackNews({ apiKey: 'test-key', keywords: 'public api', limit: 1 })

    assert.equal(result.api.provider, 'mediastack')
    assert.equal(result.api.usesBrowserClickstream, false)
    assert.equal(result.query.keywords, 'public api')
    assert.equal(result.query.limit, 1)
    assert.equal(result.articles[0]?.publishedAt, '2026-05-02T12:00:00+00:00')
  } finally {
    globalThis.fetch = previousFetch
  }
})

test('Mediastack news usecase defaults to the documented maximum free request size', async () => {
  const previousFetch = globalThis.fetch
  let requestedUrl: string | undefined
  globalThis.fetch = (async input => {
    requestedUrl = String(input)
    return jsonResponse({
      pagination: { limit: 100, offset: 0, count: 0, total: 0 },
      data: [],
    })
  }) as typeof fetch

  try {
    await listMediastackNews({ apiKey: 'test-key' })
    assert.ok(requestedUrl)
    assert.equal(new URL(requestedUrl).searchParams.get('limit'), '100')
  } finally {
    globalThis.fetch = previousFetch
  }
})

test('Mediastack news usecase can read access key from local provider config', async () => {
  await withPublicApisHome(async () => {
    await writePublicApiProviderConfig({
      providerId: 'mediastack',
      secrets: { MEDIASTACK_API_KEY: 'config-key' },
    })

    const previousFetch = globalThis.fetch
    const previousEnv = process.env.MEDIASTACK_API_KEY
    let requestedUrl: string | undefined
    delete process.env.MEDIASTACK_API_KEY
    globalThis.fetch = (async input => {
      requestedUrl = String(input)
      return jsonResponse({
        pagination: { limit: 1, offset: 0, count: 0, total: 0 },
        data: [],
      })
    }) as typeof fetch

    try {
      await listMediastackNews({ limit: 1 })
      assert.ok(requestedUrl)
      assert.equal(new URL(requestedUrl).searchParams.get('access_key'), 'config-key')
    } finally {
      globalThis.fetch = previousFetch
      if (previousEnv === undefined) {
        delete process.env.MEDIASTACK_API_KEY
      } else {
        process.env.MEDIASTACK_API_KEY = previousEnv
      }
    }
  })
})

function createArticleFixture() {
  return {
    author: 'Reporter',
    title: 'Public API headline',
    description: 'A short article description.',
    url: 'https://example.com/news/public-api',
    source: 'Example News',
    image: null,
    category: 'technology',
    language: 'en',
    country: 'us',
    published_at: '2026-05-02T12:00:00+00:00',
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

async function withPublicApisHome(run: () => Promise<void>): Promise<void> {
  const root = mkdtempSync(join(tmpdir(), 'public-apis-config-'))
  const previousHome = process.env.PUBLIC_APIS_HOME_DIR
  try {
    process.env.PUBLIC_APIS_HOME_DIR = root
    await run()
  } finally {
    if (previousHome === undefined) {
      delete process.env.PUBLIC_APIS_HOME_DIR
    } else {
      process.env.PUBLIC_APIS_HOME_DIR = previousHome
    }
    rmSync(root, { recursive: true, force: true })
  }
}
