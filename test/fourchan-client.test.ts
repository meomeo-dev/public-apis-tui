import assert from 'node:assert/strict'
import test from 'node:test'
import { listFourChanBoards, listFourChanCatalog } from '../src/application/usecases/fourChan.js'
import { FourChanClient, normalizeFourChanBoardsInput, normalizeFourChanCatalogInput } from '../src/infrastructure/openApis/fourChanClient.js'

test('4chan client reads boards JSON and normalizes board metadata', async () => {
  let requestedUrl = ''
  const client = new FourChanClient({
    fetchImpl: async input => {
      requestedUrl = String(input)
      return jsonResponse(createBoardsFixture())
    },
  })
  const boards = await client.boards()
  assert.equal(requestedUrl, 'https://a.4cdn.org/boards.json')
  assert.equal(boards[0]?.board, 'g')
  assert.equal(boards[0]?.title, 'Technology')
  assert.equal(boards[0]?.isArchived, true)
  assert.match(boards[0]?.metaDescription ?? '', /Technology/)
})

test('4chan client reads board catalog JSON and strips comment HTML', async () => {
  let requestedUrl = ''
  const client = new FourChanClient({
    fetchImpl: async input => {
      requestedUrl = String(input)
      return jsonResponse(createCatalogFixture())
    },
  })
  const catalog = await client.catalog({ board: 'g', limit: 1 })
  assert.equal(requestedUrl, 'https://a.4cdn.org/g/catalog.json')
  assert.equal(catalog.pageCount, 1)
  assert.equal(catalog.totalThreads, 1)
  assert.equal(catalog.threads[0]?.subject, 'Daily Programming Thread')
  assert.equal(catalog.threads[0]?.comment, 'Hello\nworld & technology')
  assert.equal(catalog.threads[0]?.url, 'https://boards.4chan.org/g/thread/123')
})

test('4chan usecases project no-auth metadata and bounded queries', async () => {
  const previousFetch = globalThis.fetch
  globalThis.fetch = (async input => String(input).endsWith('/boards.json') ? jsonResponse(createBoardsFixture()) : jsonResponse(createCatalogFixture())) as typeof fetch
  try {
    const boards = await listFourChanBoards({ query: 'tech', limit: 1 })
    assert.equal(boards.kind, '4chan.boards')
    assert.equal(boards.api.authentication, 'none')
    assert.equal(boards.api.usesBrowserClickstream, false)
    assert.equal(boards.boards.length, 1)

    const catalog = await listFourChanCatalog({ board: 'g', limit: 1 })
    assert.equal(catalog.kind, '4chan.catalog')
    assert.equal(catalog.query.board, 'g')
    assert.equal(catalog.pagination.returned, 1)
  } finally {
    globalThis.fetch = previousFetch
  }
})

test('4chan normalizers validate board ids and output limits', () => {
  assert.deepEqual(normalizeFourChanBoardsInput({ query: ' Tech ', limit: 3 }), { query: 'tech', limit: 3 })
  assert.deepEqual(normalizeFourChanCatalogInput({ board: '/G/', limit: 3 }), { board: 'g', limit: 3 })
  assert.throws(() => normalizeFourChanCatalogInput({ board: '../g' }), /--board/)
  assert.throws(() => normalizeFourChanBoardsInput({ limit: 151 }), /--limit/)
})

function createBoardsFixture() {
  return {
    boards: [{
      board: 'g',
      title: 'Technology',
      per_page: 15,
      pages: 10,
      max_comment_chars: 2000,
      bump_limit: 310,
      image_limit: 150,
      is_archived: 1,
      meta_description: '&quot;/g/ - Technology&quot; is for discussing technology.',
    }],
  }
}

function createCatalogFixture() {
  return [{
    page: 1,
    threads: [{
      no: 123,
      sub: 'Daily Programming Thread',
      com: 'Hello<br>world &amp; technology',
      name: 'Anonymous',
      now: '05/04/26(Mon)10:00:00',
      time: 1777898400,
      replies: 42,
      images: 7,
      sticky: 1,
      closed: 0,
      last_modified: 1777898500,
      semantic_url: 'daily-programming-thread',
      filename: 'code',
      ext: '.png',
      omitted_posts: 3,
      omitted_images: 1,
    }],
  }]
}

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } })
}
