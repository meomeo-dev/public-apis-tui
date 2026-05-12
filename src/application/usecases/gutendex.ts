import { GutendexClient, type GutendexBook, type GutendexPerson } from '../../infrastructure/openApis/gutendexClient.js'
import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export type GutendexBooksInput = {
  search?: string | undefined
  topic?: string | undefined
  languages?: string | undefined
  page?: number | undefined
  sort?: string | undefined
  ids?: string | undefined
}

export type GutendexBookInput = {
  id?: number | undefined
}

export type GutendexApiMeta = {
  provider: 'gutendex'
  publicApisProject: 'https://github.com/public-apis/public-apis'
  endpoint: 'GET /books/' | 'GET /books/{id}/'
  docsUrl: 'https://gutendex.com/'
  usesBrowserClickstream: false
  authentication: 'none'
  documentedPageSize: '0-32 books per page, controlled by Gutendex'
}

export type GutendexBookSummary = {
  id: number
  title: string
  authors: string[]
  languages: string[]
  summaries: string[]
  subjects: string[]
  bookshelves: string[]
  copyright: boolean | null
  mediaType: string
  downloadCount: number
  formats: {
    text?: string | undefined
    html?: string | undefined
    epub?: string | undefined
    kindle?: string | undefined
    image?: string | undefined
  }
}

export type GutendexBooksResult = {
  kind: 'gutendex.books'
  api: GutendexApiMeta
  query: {
    search?: string | undefined
    topic?: string | undefined
    languages?: string | undefined
    page: number
    sort?: 'ascending' | 'descending' | 'popular' | undefined
    ids?: string | undefined
  }
  pagination: {
    count: number
    page: number
    next: string | null
    previous: string | null
    pageSize: string
  }
  count: number
  books: GutendexBookSummary[]
}

export type GutendexBookResult = {
  kind: 'gutendex.book'
  api: GutendexApiMeta
  query: {
    id: number
  }
  book: GutendexBookSummary
}

export async function listGutendexBooks(input: GutendexBooksInput = {}): Promise<GutendexBooksResult> {
  const query = normalizeBooksInput(input)
  const client = new GutendexClient()
  const response = await client.listBooks(query)
  return {
    kind: 'gutendex.books',
    api: createApiMeta('GET /books/'),
    query,
    pagination: {
      count: response.count,
      page: query.page,
      next: response.next,
      previous: response.previous,
      pageSize: '0-32',
    },
    count: response.results.length,
    books: response.results.map(toBookSummary),
  }
}

export async function getGutendexBook(input: GutendexBookInput = {}): Promise<GutendexBookResult> {
  const query = normalizeBookInput(input)
  const client = new GutendexClient()
  const book = await client.getBook(query)
  return {
    kind: 'gutendex.book',
    api: createApiMeta('GET /books/{id}/'),
    query,
    book: toBookSummary(book),
  }
}

function createApiMeta(endpoint: GutendexApiMeta['endpoint']): GutendexApiMeta {
  return {
    provider: 'gutendex',
    publicApisProject: 'https://github.com/public-apis/public-apis',
    endpoint,
    docsUrl: 'https://gutendex.com/',
    usesBrowserClickstream: false,
    authentication: 'none',
    documentedPageSize: '0-32 books per page, controlled by Gutendex',
  }
}

function normalizeBooksInput(input: GutendexBooksInput): GutendexBooksResult['query'] {
  return {
    search: normalizeOptionalText(input.search, 'search', 200),
    topic: normalizeOptionalText(input.topic, 'topic', 120),
    languages: normalizeLanguages(input.languages),
    page: normalizePage(input.page),
    sort: normalizeSort(input.sort),
    ids: normalizeIds(input.ids),
  }
}

function normalizeBookInput(input: GutendexBookInput): GutendexBookResult['query'] {
  const id = input.id ?? 1342
  if (!Number.isInteger(id) || id < 1) {
    throw new RuntimeFailure('INVALID_ARGUMENT', 'Gutendex --id must be a positive integer.', { id: input.id })
  }
  return { id }
}

function normalizeOptionalText(value: string | undefined, label: string, maxLength: number): string | undefined {
  const text = value?.trim()
  if (text === undefined || text === '') {
    return undefined
  }
  if (text.length > maxLength) {
    throw new RuntimeFailure('INVALID_ARGUMENT', `Gutendex --${label} must be ${maxLength} characters or fewer.`, {
      [label]: value,
    })
  }
  return text
}

function normalizeLanguages(value: string | undefined): string | undefined {
  const languages = value?.trim().toLowerCase()
  if (languages === undefined || languages === '') {
    return undefined
  }
  if (!/^[a-z]{2}(,[a-z]{2})*$/u.test(languages)) {
    throw new RuntimeFailure('INVALID_ARGUMENT', 'Gutendex --languages must be comma-separated ISO 639-1 codes such as en or en,fr.', {
      languages: value,
    })
  }
  return languages
}

function normalizePage(value: number | undefined): number {
  const page = value ?? 1
  if (!Number.isInteger(page) || page < 1) {
    throw new RuntimeFailure('INVALID_ARGUMENT', 'Gutendex --page must be a positive integer.', { page: value })
  }
  return page
}

function normalizeSort(value: string | undefined): 'ascending' | 'descending' | 'popular' | undefined {
  const sort = value?.trim().toLowerCase()
  if (sort === undefined || sort === '') {
    return undefined
  }
  if (sort === 'ascending' || sort === 'descending' || sort === 'popular') {
    return sort
  }
  throw new RuntimeFailure('INVALID_ARGUMENT', 'Gutendex --sort must be ascending, descending, or popular.', {
    sort: value,
  })
}

function normalizeIds(value: string | undefined): string | undefined {
  const ids = value?.trim()
  if (ids === undefined || ids === '') {
    return undefined
  }
  if (!/^[0-9]+(,[0-9]+)*$/u.test(ids)) {
    throw new RuntimeFailure('INVALID_ARGUMENT', 'Gutendex --ids must be comma-separated numeric book ids.', {
      ids: value,
    })
  }
  return ids
}

function toBookSummary(book: GutendexBook): GutendexBookSummary {
  return {
    id: book.id,
    title: book.title,
    authors: book.authors.map(formatPerson),
    languages: book.languages,
    summaries: book.summaries,
    subjects: book.subjects,
    bookshelves: book.bookshelves,
    copyright: book.copyright,
    mediaType: book.mediaType,
    downloadCount: book.downloadCount,
    formats: {
      text: findFormat(book.formats, ['text/plain; charset=us-ascii', 'text/plain; charset=utf-8', 'text/plain']),
      html: findFormat(book.formats, ['text/html; charset=utf-8', 'text/html']),
      epub: findFormat(book.formats, ['application/epub+zip']),
      kindle: findFormat(book.formats, ['application/x-mobipocket-ebook']),
      image: findFormat(book.formats, ['image/jpeg']),
    },
  }
}

function formatPerson(person: GutendexPerson): string {
  const years = person.birthYear !== undefined || person.deathYear !== undefined ? ` (${person.birthYear ?? '?'}-${person.deathYear ?? '?'})` : ''
  return `${person.name}${years}`
}

function findFormat(formats: Record<string, string>, preferredTypes: string[]): string | undefined {
  for (const type of preferredTypes) {
    if (formats[type] !== undefined) {
      return formats[type]
    }
  }
  return undefined
}
