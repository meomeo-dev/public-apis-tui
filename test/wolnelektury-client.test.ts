import assert from 'node:assert/strict'
import test from 'node:test'
import { getWolneLekturyBook, listWolneLekturyBooks, readWolneLekturyBook } from '../src/application/usecases/wolneLektury.js'
import { WolneLekturyClient } from '../src/infrastructure/openApis/wolneLekturyClient.js'

const booksFixture = [
  {
    title: 'Studnia i wahadło',
    author: 'Edgar Allan Poe',
    epoch: 'Romantyzm',
    genre: 'Opowiadanie',
    kind: 'Epika',
    href: 'https://wolnelektury.pl/api/books/studnia-i-wahadlo/',
    url: 'https://wolnelektury.pl/katalog/lektura/studnia-i-wahadlo/',
    cover: 'book/cover/studnia-i-wahadlo.jpg',
    audio_length: null,
  },
  {
    title: 'Abuzei i Tair',
    author: 'Ignacy Krasicki',
    epoch: 'Oświecenie',
    genre: 'Bajka, Przypowieść',
    kind: 'Epika',
    href: 'https://wolnelektury.pl/api/books/abuzei-i-tair/',
    url: 'https://wolnelektury.pl/katalog/lektura/abuzei-i-tair/',
  },
]

const bookFixture = {
  title: 'Studnia i wahadło',
  authors: [{ name: 'Edgar Allan Poe', slug: 'edgar-allan-poe', href: 'https://wolnelektury.pl/api/authors/edgar-allan-poe/' }],
  epochs: [{ name: 'Romantyzm', slug: 'romantyzm' }],
  genres: [{ name: 'Opowiadanie', slug: 'opowiadanie' }],
  kinds: [{ name: 'Epika', slug: 'epika' }],
  url: 'https://wolnelektury.pl/katalog/lektura/studnia-i-wahadlo/',
  txt: 'https://wolnelektury.pl/media/book/txt/studnia-i-wahadlo.txt',
  pdf: 'https://wolnelektury.pl/media/book/pdf/studnia-i-wahadlo.pdf',
  cover: 'https://wolnelektury.pl/media/book/cover/studnia-i-wahadlo.jpg',
  children: [],
}

test('Wolne Lektury client lists books with client-side filters and cap', async () => {
  let requestedUrl: URL | undefined
  const client = new WolneLekturyClient({
    fetchImpl: (async input => {
      requestedUrl = new URL(String(input))
      return jsonResponse(booksFixture)
    }) as typeof fetch,
  })

  const books = await client.listBooks({ query: 'studnia', author: 'poe', limit: 999 })

  assert.equal(requestedUrl?.href, 'https://wolnelektury.pl/api/books/')
  assert.equal(books.length, 1)
  assert.equal(books[0]?.slug, 'studnia-i-wahadlo')
  assert.equal(books[0]?.cover, 'https://wolnelektury.pl/media/book/cover/studnia-i-wahadlo.jpg')
})

test('Wolne Lektury client fetches one book by slug', async () => {
  let requestedUrl: URL | undefined
  const client = new WolneLekturyClient({
    fetchImpl: (async input => {
      requestedUrl = new URL(String(input))
      return jsonResponse(bookFixture)
    }) as typeof fetch,
  })

  const book = await client.getBook({ slug: 'studnia-i-wahadlo' })

  assert.equal(requestedUrl?.href, 'https://wolnelektury.pl/api/books/studnia-i-wahadlo/')
  assert.equal(book.authors[0]?.name, 'Edgar Allan Poe')
  assert.equal(book.downloads.txt, 'https://wolnelektury.pl/media/book/txt/studnia-i-wahadlo.txt')
})

test('Wolne Lektury client reads bounded TXT pages via official download URL', async () => {
  const requestedUrls: string[] = []
  const client = new WolneLekturyClient({
    fetchImpl: (async input => {
      const url = new URL(String(input))
      requestedUrls.push(url.href)
      if (url.pathname === '/api/books/studnia-i-wahadlo/') {
        return jsonResponse(bookFixture)
      }
      assert.equal(url.href, 'https://wolnelektury.pl/media/book/txt/studnia-i-wahadlo.txt')
      return textResponse(['title', 'line 1', 'line 2', 'line 3', 'line 4'].join('\n'))
    }) as typeof fetch,
  })

  const page = await client.readBook({ slug: 'studnia-i-wahadlo', offset: 1, limit: 2 })

  assert.deepEqual(requestedUrls, [
    'https://wolnelektury.pl/api/books/studnia-i-wahadlo/',
    'https://wolnelektury.pl/media/book/txt/studnia-i-wahadlo.txt',
  ])
  assert.equal(page.totalLines, 5)
  assert.deepEqual(page.lines, ['line 1', 'line 2'])
})

test('Wolne Lektury client retries transient fetch failures and 5xx responses', async () => {
  let attempts = 0
  const client = new WolneLekturyClient({
    retryDelayMs: 0,
    fetchImpl: (async input => {
      attempts += 1
      const url = new URL(String(input))
      if (url.pathname === '/api/books/studnia-i-wahadlo/') {
        if (attempts === 1) {
          throw new TypeError('fetch failed')
        }
        if (attempts === 2) {
          return new Response(JSON.stringify({ error: 'temporary' }), { status: 503, headers: { 'content-type': 'application/json' } })
        }
        return jsonResponse(bookFixture)
      }
      return textResponse('title\nline 1')
    }) as typeof fetch,
  })

  const book = await client.getBook({ slug: 'studnia-i-wahadlo' })

  assert.equal(attempts, 3)
  assert.equal(book.title, 'Studnia i wahadło')
})

test('Wolne Lektury client rejects HTML returned from TXT download URLs', async () => {
  const client = new WolneLekturyClient({
    fetchImpl: (async input => {
      const url = new URL(String(input))
      return url.pathname === '/api/books/studnia-i-wahadlo/'
        ? jsonResponse(bookFixture)
        : textResponse('<!doctype html><html><title>error</title></html>')
    }) as typeof fetch,
  })

  await assert.rejects(
    () => client.readBook({ slug: 'studnia-i-wahadlo' }),
    /looked like HTML/u,
  )
})

test('Wolne Lektury usecases project no-auth metadata and official links', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async input => {
    const url = new URL(String(input))
    if (url.pathname === '/api/books/') {
      return jsonResponse(booksFixture)
    }
    if (url.pathname === '/api/books/studnia-i-wahadlo/') {
      return jsonResponse(bookFixture)
    }
    assert.equal(url.pathname, '/media/book/txt/studnia-i-wahadlo.txt')
    return textResponse(['title', 'line 1', 'line 2', 'line 3'].join('\n'))
  }) as typeof fetch

  try {
    const books = await listWolneLekturyBooks({ query: 'studnia' })
    assert.equal(books.kind, 'wolnelektury.books')
    assert.equal((books.api as Record<string, unknown>).authentication, 'none')
    assert.equal((books.api as Record<string, unknown>).usesBrowserClickstream, false)
    assert.equal((books.books as Array<Record<string, unknown>>)[0]?.title, 'Studnia i wahadło')

    const book = await getWolneLekturyBook()
    assert.equal(book.kind, 'wolnelektury.book')
    assert.equal((book.book as Record<string, unknown>).title, 'Studnia i wahadło')

    const page = await readWolneLekturyBook({ offset: 1, limit: 2 })
    assert.equal(page.kind, 'wolnelektury.read')
    assert.equal((page.api as Record<string, unknown>).usesBrowserClickstream, false)
    assert.deepEqual((page.page as Record<string, unknown>).lines, ['line 1', 'line 2'])
  } finally {
    globalThis.fetch = originalFetch
  }
})

function jsonResponse(value: unknown): Response {
  return new Response(JSON.stringify(value), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })
}

function textResponse(value: string): Response {
  return new Response(value, {
    status: 200,
    headers: { 'content-type': 'text/plain; charset=utf-8' },
  })
}
