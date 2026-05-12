import {
  normalizeWolneLekturyBookQuery,
  normalizeWolneLekturyBooksQuery,
  normalizeWolneLekturyReadQuery,
  WolneLekturyClient,
  WOLNE_LEKTURY_DEFAULT_LIMIT,
  WOLNE_LEKTURY_DEFAULT_READ_LIMIT,
  WOLNE_LEKTURY_MAX_LIMIT,
  WOLNE_LEKTURY_MAX_READ_LIMIT,
  type WolneLekturyBookDetail,
  type WolneLekturyBookSummary,
  type WolneLekturyTextPage,
} from '../../infrastructure/openApis/wolneLekturyClient.js'

export type WolneLekturyBooksInput = {
  query?: string | undefined
  author?: string | undefined
  genre?: string | undefined
  kind?: string | undefined
  epoch?: string | undefined
  limit?: number | undefined
}

export type WolneLekturyBookInput = {
  slug?: string | undefined
}

export type WolneLekturyReadInput = {
  slug?: string | undefined
  offset?: number | undefined
  limit?: number | undefined
}

export async function listWolneLekturyBooks(input: WolneLekturyBooksInput = {}): Promise<Record<string, unknown>> {
  const client = new WolneLekturyClient()
  const query = normalizeWolneLekturyBooksQuery(input)
  const books = await client.listBooks(query)
  return {
    kind: 'wolnelektury.books',
    api: createApiMeta('GET /api/books/'),
    query,
    count: books.length,
    books: books.map(projectBookSummary),
  }
}

export async function getWolneLekturyBook(input: WolneLekturyBookInput = {}): Promise<Record<string, unknown>> {
  const client = new WolneLekturyClient()
  const query = normalizeWolneLekturyBookQuery(input)
  const book = await client.getBook(query)
  return {
    kind: 'wolnelektury.book',
    api: createApiMeta('GET /api/books/{slug}/'),
    query,
    book: projectBookDetail(book),
  }
}

export async function readWolneLekturyBook(input: WolneLekturyReadInput = {}): Promise<Record<string, unknown>> {
  const client = new WolneLekturyClient()
  const query = normalizeWolneLekturyReadQuery(input)
  const page = await client.readBook(query)
  return {
    kind: 'wolnelektury.read',
    api: createApiMeta('GET official TXT download URL from /api/books/{slug}/'),
    query,
    page: projectTextPage(page),
  }
}

function createApiMeta(endpoint: string): Record<string, unknown> {
  return {
    provider: 'wolnelektury',
    endpoint,
    authentication: 'none',
    usesBrowserClickstream: false,
    documentedPagination: 'not documented for /api/books/',
    defaultLimit: WOLNE_LEKTURY_DEFAULT_LIMIT,
    cliLimitCap: WOLNE_LEKTURY_MAX_LIMIT,
    defaultReadLimit: WOLNE_LEKTURY_DEFAULT_READ_LIMIT,
    cliReadLimitCap: WOLNE_LEKTURY_MAX_READ_LIMIT,
    docs: 'https://wolnelektury.pl/api/',
  }
}

function projectBookSummary(book: WolneLekturyBookSummary): Record<string, unknown> {
  return {
    title: book.title,
    ...(book.author !== undefined ? { author: book.author } : {}),
    ...(book.epoch !== undefined ? { epoch: book.epoch } : {}),
    ...(book.genre !== undefined ? { genre: book.genre } : {}),
    ...(book.kind !== undefined ? { kind: book.kind } : {}),
    href: book.href,
    ...(book.url !== undefined ? { url: book.url } : {}),
    ...(book.cover !== undefined ? { cover: book.cover } : {}),
    ...(book.hasAudio !== undefined ? { hasAudio: book.hasAudio } : {}),
    ...(book.slug !== undefined ? { slug: book.slug } : {}),
  }
}

function projectBookDetail(book: WolneLekturyBookDetail): Record<string, unknown> {
  return {
    title: book.title,
    ...(book.url !== undefined ? { url: book.url } : {}),
    authors: book.authors.map(entry => entry.name),
    epochs: book.epochs.map(entry => entry.name),
    genres: book.genres.map(entry => entry.name),
    kinds: book.kinds.map(entry => entry.name),
    downloads: book.downloads,
    ...(book.cover !== undefined ? { cover: book.cover } : {}),
    ...(book.childrenCount !== undefined ? { childrenCount: book.childrenCount } : {}),
  }
}

function projectTextPage(page: WolneLekturyTextPage): Record<string, unknown> {
  return {
    slug: page.slug,
    sourceUrl: page.sourceUrl,
    offset: page.offset,
    limit: page.limit,
    totalLines: page.totalLines,
    returnedLines: page.lines.length,
    lines: page.lines,
  }
}
