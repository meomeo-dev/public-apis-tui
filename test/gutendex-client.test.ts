import assert from 'node:assert/strict'
import test from 'node:test'
import { getGutendexBook, listGutendexBooks } from '../src/application/usecases/gutendex.js'
import { GutendexClient } from '../src/infrastructure/openApis/gutendexClient.js'

test('Gutendex client lists books with documented query parameters', async () => {
  let requestedUrl: URL | undefined
  const client = new GutendexClient({
    fetchImpl: (async input => {
      requestedUrl = new URL(String(input))
      return jsonResponse(createBooksResponse())
    }) as typeof fetch,
  })

  const response = await client.listBooks({ search: 'great expectations', topic: 'fiction', languages: 'en,fr', page: 2, sort: 'popular', ids: '1400,1342' })

  assert.equal(requestedUrl?.href, 'https://gutendex.com/books/?search=great+expectations&topic=fiction&languages=en%2Cfr&sort=popular&ids=1400%2C1342&page=2')
  assert.equal(response.count, 1)
  assert.equal(response.results[0]?.title, 'Great Expectations')
})

test('Gutendex client fetches one book by id', async () => {
  let requestedUrl: URL | undefined
  const client = new GutendexClient({
    fetchImpl: (async input => {
      requestedUrl = new URL(String(input))
      return jsonResponse(createBookFixture())
    }) as typeof fetch,
  })

  const book = await client.getBook({ id: 1342 })

  assert.equal(requestedUrl?.href, 'https://gutendex.com/books/1342/')
  assert.equal(book.id, 1342)
  assert.equal(book.authors[0]?.name, 'Austen, Jane')
})

test('Gutendex usecases project no-auth metadata and summaries', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async input => {
    const url = new URL(String(input))
    return jsonResponse(url.pathname === '/books/' ? createBooksResponse() : createBookFixture())
  }) as typeof fetch
  try {
    const books = await listGutendexBooks({ search: 'great', languages: 'en' })
    assert.equal(books.kind, 'gutendex.books')
    assert.equal(books.api.provider, 'gutendex')
    assert.equal(books.api.authentication, 'none')
    assert.equal(books.api.usesBrowserClickstream, false)
    assert.equal(books.pagination.pageSize, '0-32')
    assert.equal(books.books[0]?.formats.text, 'https://www.gutenberg.org/files/1400/1400-0.txt')

    const book = await getGutendexBook({ id: 1342 })
    assert.equal(book.kind, 'gutendex.book')
    assert.equal(book.book.title, 'Pride and Prejudice')
    assert.equal(book.book.authors[0], 'Austen, Jane (1775-1817)')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('Gutendex usecases validate curated inputs', async () => {
  await assert.rejects(() => listGutendexBooks({ search: 'x'.repeat(201) }), /200 characters/u)
  await assert.rejects(() => listGutendexBooks({ topic: 'x'.repeat(121) }), /120 characters/u)
  await assert.rejects(() => listGutendexBooks({ languages: 'english' }), /ISO 639-1/u)
  await assert.rejects(() => listGutendexBooks({ page: 0 }), /positive integer/u)
  await assert.rejects(() => listGutendexBooks({ sort: 'newest' }), /ascending, descending, or popular/u)
  await assert.rejects(() => listGutendexBooks({ ids: '1,a' }), /numeric book ids/u)
  await assert.rejects(() => getGutendexBook({ id: 0 }), /positive integer/u)
})

test('Gutendex client surfaces API failures', async () => {
  const client = new GutendexClient({
    fetchImpl: (async () => jsonResponse({ detail: 'Not found.' }, 404)) as typeof fetch,
  })

  await assert.rejects(
    () => client.getBook({ id: 999999999 }),
    /Not found/u,
  )
})

function createBooksResponse(): Record<string, unknown> {
  return {
    count: 1,
    next: null,
    previous: null,
    results: [
      {
        id: 1400,
        title: 'Great Expectations',
        authors: [{ name: 'Dickens, Charles', birth_year: 1812, death_year: 1870 }],
        translators: [],
        summaries: ['A coming-of-age novel.'],
        subjects: ['Bildungsroman'],
        bookshelves: ['Best Books Ever Listings'],
        languages: ['en'],
        copyright: false,
        media_type: 'Text',
        formats: {
          'text/plain; charset=utf-8': 'https://www.gutenberg.org/files/1400/1400-0.txt',
          'text/html': 'https://www.gutenberg.org/ebooks/1400.html.images',
          'application/epub+zip': 'https://www.gutenberg.org/ebooks/1400.epub3.images',
        },
        download_count: 12345,
      },
    ],
  }
}

function createBookFixture(): Record<string, unknown> {
  return {
    id: 1342,
    title: 'Pride and Prejudice',
    authors: [{ name: 'Austen, Jane', birth_year: 1775, death_year: 1817 }],
    translators: [],
    summaries: ['A novel about manners and first impressions.'],
    subjects: ['Courtship -- Fiction'],
    bookshelves: ['Best Books Ever Listings'],
    languages: ['en'],
    copyright: false,
    media_type: 'Text',
    formats: {
      'text/plain; charset=us-ascii': 'https://www.gutenberg.org/files/1342/1342-0.txt',
      'text/html': 'https://www.gutenberg.org/ebooks/1342.html.images',
      'image/jpeg': 'https://www.gutenberg.org/cache/epub/1342/pg1342.cover.medium.jpg',
    },
    download_count: 54321,
  }
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}
