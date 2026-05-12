import {
  clampOpenLibrarySearchLimit,
  normalizeOpenLibraryWorkKey,
  OpenLibraryClient,
  OPEN_LIBRARY_SEARCH_DEFAULT_LIMIT,
  OPEN_LIBRARY_SEARCH_MAX_LIMIT,
  type OpenLibrarySearchDoc,
  type OpenLibraryWork,
} from '../../infrastructure/openApis/openLibraryClient.js'

export type OpenLibrarySearchInput = {
  query?: string | undefined
  title?: string | undefined
  author?: string | undefined
  subject?: string | undefined
  language?: string | undefined
  hasFulltext?: boolean | undefined
  ebookAccess?: string | undefined
  sort?: string | undefined
  page?: number | undefined
  limit?: number | undefined
  offset?: number | undefined
}

export type OpenLibraryWorkInput = {
  workKey?: string | undefined
}

export async function searchOpenLibrary(input: OpenLibrarySearchInput = {}): Promise<Record<string, unknown>> {
  const client = new OpenLibraryClient()
  const query = normalizeSearchInput(input)
  const response = await client.search(query)
  return {
    kind: 'openlibrary.search',
    api: {
      provider: 'openlibrary',
      endpoint: 'GET /search.json',
      authentication: 'none',
      usesBrowserClickstream: false,
      documentedDefaultLimit: OPEN_LIBRARY_SEARCH_DEFAULT_LIMIT,
      cliLimitCap: OPEN_LIBRARY_SEARCH_MAX_LIMIT,
      docs: 'https://openlibrary.org/dev/docs/api/search',
    },
    query,
    pagination: {
      total: response.numFound,
      start: response.start,
      limit: query.limit,
      page: query.page,
      offset: query.offset,
      numFoundExact: response.numFoundExact,
      nextOffset: response.start + response.docs.length,
    },
    count: response.docs.length,
    works: response.docs.map(projectSearchDoc),
  }
}

export async function getOpenLibraryWork(input: OpenLibraryWorkInput = {}): Promise<Record<string, unknown>> {
  const client = new OpenLibraryClient()
  const query = { workKey: normalizeOpenLibraryWorkKey(input.workKey) }
  const work = await client.getWork(query)
  return {
    kind: 'openlibrary.work',
    api: {
      provider: 'openlibrary',
      endpoint: 'GET /works/{id}.json',
      authentication: 'none',
      usesBrowserClickstream: false,
      docs: 'https://openlibrary.org/dev/docs/api/books',
    },
    query,
    work: projectWork(work),
  }
}

function normalizeSearchInput(input: OpenLibrarySearchInput): Required<Pick<OpenLibrarySearchInput, 'query' | 'limit'>> & OpenLibrarySearchInput {
  return {
    query: input.query?.trim() || 'pride and prejudice',
    ...(input.title !== undefined ? { title: input.title.trim() } : {}),
    ...(input.author !== undefined ? { author: input.author.trim() } : {}),
    ...(input.subject !== undefined ? { subject: input.subject.trim() } : {}),
    ...(input.language !== undefined ? { language: input.language.trim() } : {}),
    ...(typeof input.hasFulltext === 'boolean' ? { hasFulltext: input.hasFulltext } : {}),
    ...(input.ebookAccess !== undefined ? { ebookAccess: input.ebookAccess.trim() } : {}),
    ...(input.sort !== undefined ? { sort: input.sort.trim() } : {}),
    ...(typeof input.page === 'number' ? { page: input.page } : {}),
    limit: clampOpenLibrarySearchLimit(input.limit),
    ...(typeof input.offset === 'number' ? { offset: input.offset } : {}),
  }
}

function projectSearchDoc(work: OpenLibrarySearchDoc): Record<string, unknown> {
  return {
    key: work.key,
    title: work.title,
    authors: work.authors,
    ...(work.firstPublishYear !== undefined ? { firstPublishYear: work.firstPublishYear } : {}),
    languages: work.languages.slice(0, 12),
    ...(work.editionCount !== undefined ? { editionCount: work.editionCount } : {}),
    ...(work.coverId !== undefined ? { coverId: work.coverId } : {}),
    ...(work.coverUrl !== undefined ? { coverUrl: work.coverUrl } : {}),
    ...(work.ebookAccess !== undefined ? { ebookAccess: work.ebookAccess } : {}),
    internetArchiveIds: work.internetArchiveIds.slice(0, 5),
    ...(work.hasFulltext !== undefined ? { hasFulltext: work.hasFulltext } : {}),
    url: work.url,
  }
}

function projectWork(work: OpenLibraryWork): Record<string, unknown> {
  return {
    key: work.key,
    title: work.title,
    ...(work.description !== undefined ? { description: work.description } : {}),
    subjects: work.subjects.slice(0, 50),
    ...(work.firstPublishDate !== undefined ? { firstPublishDate: work.firstPublishDate } : {}),
    authors: work.authors.map(author => author.key),
    ...(work.latestRevision !== undefined ? { latestRevision: work.latestRevision } : {}),
    ...(work.revision !== undefined ? { revision: work.revision } : {}),
    url: work.url,
  }
}
