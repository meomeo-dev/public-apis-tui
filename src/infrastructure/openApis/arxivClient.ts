import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export const ARXIV_DEFAULT_BASE_URL = 'https://export.arxiv.org'

export type ArxivSearchQuery = {
  searchQuery?: string | undefined
  idList?: string[] | undefined
  start?: number | undefined
  maxResults?: number | undefined
  sortBy?: string | undefined
  sortOrder?: string | undefined
}

export type ArxivFeed = {
  id: string
  title: string
  updated: string
  selfUrl?: string | undefined
  totalResults: number
  startIndex: number
  itemsPerPage: number
  entries: ArxivEntry[]
}

export type ArxivEntry = {
  id: string
  arxivId: string
  title: string
  summary: string
  published: string
  updated: string
  authors: string[]
  categories: string[]
  primaryCategory?: string | undefined
  comment?: string | undefined
  journalRef?: string | undefined
  doi?: string | undefined
  absUrl?: string | undefined
  pdfUrl?: string | undefined
}

export type ArxivClientOptions = {
  baseUrl?: string | undefined
  fetchImpl?: typeof fetch | undefined
}

export class ArxivClient {
  private readonly baseUrl: string
  private readonly fetchImpl: typeof fetch

  constructor(options: ArxivClientOptions = {}) {
    this.baseUrl = normalizeBaseUrl(options.baseUrl ?? ARXIV_DEFAULT_BASE_URL)
    this.fetchImpl = options.fetchImpl ?? fetch
  }

  async query(query: ArxivSearchQuery = {}): Promise<ArxivFeed> {
    const url = new URL('/api/query', this.baseUrl)
    appendOptionalStringParam(url, 'search_query', query.searchQuery)
    if (query.idList !== undefined && query.idList.length > 0) {
      url.searchParams.set('id_list', query.idList.join(','))
    }
    appendOptionalNumberParam(url, 'start', query.start)
    appendOptionalNumberParam(url, 'max_results', query.maxResults)
    appendOptionalStringParam(url, 'sortBy', query.sortBy)
    appendOptionalStringParam(url, 'sortOrder', query.sortOrder)

    const response = await this.fetchImpl(url, {
      method: 'GET',
      headers: {
        accept: 'application/atom+xml, application/xml, text/xml',
        'user-agent': [
          'public-apis-tui no-auth CLI;',
          'https://github.com/public-apis/public-apis',
        ].join(' '),
      },
    })
    const body = await response.text()

    if (!response.ok) {
      if (isRateLimitResponse(response, body)) {
        throw new RuntimeFailure(
          'OPEN_API_FAILED',
          [
            'arXiv API is currently rate limiting this runtime',
            '(HTTP 429 Rate exceeded); retry later or use cached/offline data.',
          ].join(' '),
          {
            provider: 'arxiv',
            status: response.status,
            statusText: response.statusText,
            contentType: response.headers.get('content-type') ?? undefined,
          },
        )
      }
      throw new RuntimeFailure(
        'OPEN_API_FAILED',
        body.trim() || response.statusText || 'arXiv API request failed.',
        {
          provider: 'arxiv',
          status: response.status,
          statusText: response.statusText,
          contentType: response.headers.get('content-type') ?? undefined,
        },
      )
    }
    return parseArxivAtom(body)
  }
}

function isRateLimitResponse(response: Response, body: string): boolean {
  return response.status === 429 || body.trim().toLowerCase() === 'rate exceeded.'
}

function parseArxivAtom(xml: string): ArxivFeed {
  const feedBody = readElementBody(xml, 'feed')
  if (feedBody === undefined) {
    throw new RuntimeFailure(
      'OPEN_API_FAILED',
      'arXiv Atom response is missing feed root.',
    )
  }
  const entries = matchElements(feedBody, 'entry').map(parseEntry)
  return {
    id: readRequiredText(feedBody, 'id', 'feed id'),
    title: readRequiredText(feedBody, 'title', 'feed title'),
    updated: readRequiredText(feedBody, 'updated', 'feed updated'),
    selfUrl: readFeedSelfUrl(feedBody),
    totalResults: readRequiredInteger(feedBody, 'opensearch:totalResults'),
    startIndex: readRequiredInteger(feedBody, 'opensearch:startIndex'),
    itemsPerPage: readRequiredInteger(feedBody, 'opensearch:itemsPerPage'),
    entries,
  }
}

function parseEntry(entryXml: string): ArxivEntry {
  const id = readRequiredText(entryXml, 'id', 'entry id')
  const links = parseLinks(entryXml)
  return {
    id,
    arxivId: normalizeArxivId(id),
    title: normalizeWhitespace(readRequiredText(entryXml, 'title', 'entry title')),
    summary: normalizeWhitespace(
      readRequiredText(entryXml, 'summary', 'entry summary'),
    ),
    published: readRequiredText(entryXml, 'published', 'entry published'),
    updated: readRequiredText(entryXml, 'updated', 'entry updated'),
    authors: matchElements(entryXml, 'author').map(author => (
      normalizeWhitespace(readRequiredText(author, 'name', 'author name'))
    )),
    categories: parseCategories(entryXml),
    primaryCategory: readTermAttribute(entryXml, 'arxiv:primary_category'),
    comment: readOptionalText(entryXml, 'arxiv:comment'),
    journalRef: readOptionalText(entryXml, 'arxiv:journal_ref'),
    doi: readOptionalText(entryXml, 'arxiv:doi'),
    absUrl: links.alternate,
    pdfUrl: links.pdf,
  }
}

type ArxivLinks = {
  alternate?: string | undefined
  pdf?: string | undefined
}

function parseLinks(xml: string): ArxivLinks {
  const result: { alternate?: string | undefined; pdf?: string | undefined } = {}
  for (const attributes of matchStartTagAttributes(xml, 'link')) {
    const href = attributes.href
    if (href === undefined) continue
    if (attributes.rel === 'alternate' && result.alternate === undefined) {
      result.alternate = href
    }
    if (attributes.title === 'pdf' && result.pdf === undefined) {
      result.pdf = href
    }
  }
  return result
}

function parseCategories(xml: string): string[] {
  return matchStartTagAttributes(xml, 'category')
    .map(attributes => attributes.term)
    .filter((term): term is string => term !== undefined && term.trim() !== '')
}

function readFeedSelfUrl(xml: string): string | undefined {
  return matchStartTagAttributes(xml, 'link').find(attributes => (
    attributes.type === 'application/atom+xml'
  ))?.href
}

function readRequiredText(xml: string, tag: string, label: string): string {
  const value = readOptionalText(xml, tag)
  if (value === undefined || value === '') {
    throw new RuntimeFailure(
      'OPEN_API_FAILED',
      `arXiv Atom response is missing ${label}.`,
    )
  }
  return value
}

function readOptionalText(xml: string, tag: string): string | undefined {
  const body = readElementBody(xml, tag)
  return body === undefined ? undefined : decodeXml(body).trim()
}

function readRequiredInteger(xml: string, tag: string): number {
  const value = readRequiredText(xml, tag, tag)
  const parsed = Number(value)
  if (!Number.isInteger(parsed)) {
    throw new RuntimeFailure(
      'OPEN_API_FAILED',
      `arXiv Atom field ${tag} must be an integer.`,
      { value },
    )
  }
  return parsed
}

function readTermAttribute(xml: string, tag: string): string | undefined {
  return matchStartTagAttributes(xml, tag)[0]?.term
}

function readElementBody(xml: string, tag: string): string | undefined {
  const escapedTag = escapeRegExp(tag)
  const pattern = `<${escapedTag}\\b[^>]*>([\\s\\S]*?)<\\/${escapedTag}>`
  const match = new RegExp(pattern, 'u').exec(xml)
  return match?.[1]
}

function matchElements(xml: string, tag: string): string[] {
  const escapedTag = escapeRegExp(tag)
  const pattern = `<${escapedTag}\\b[^>]*>[\\s\\S]*?<\\/${escapedTag}>`
  return [...xml.matchAll(new RegExp(pattern, 'gu'))]
    .map(match => match[0] ?? '')
}

function matchStartTagAttributes(
  xml: string,
  tag: string,
): Array<Record<string, string>> {
  const escapedTag = escapeRegExp(tag)
  const pattern = `<${escapedTag}\\b([^>]*)\\/?>(?:\\s*<\\/${escapedTag}>)?`
  return [...xml.matchAll(new RegExp(pattern, 'gu'))]
    .map(match => parseAttributes(match[1] ?? ''))
}

function parseAttributes(value: string): Record<string, string> {
  const attributes: Record<string, string> = {}
  for (const match of value.matchAll(/([A-Za-z_:][-A-Za-z0-9_:.]*)="([^"]*)"/gu)) {
    const key = match[1]
    const rawValue = match[2]
    if (key !== undefined && rawValue !== undefined) {
      attributes[key] = decodeXml(rawValue)
    }
  }
  return attributes
}

function normalizeArxivId(value: string): string {
  return value.replace(/^https?:\/\/arxiv\.org\/abs\//u, '')
}

function normalizeBaseUrl(value: string): string {
  return value.replace(/\/+$/u, '')
}

function appendOptionalStringParam(
  url: URL,
  key: string,
  value: string | undefined,
): void {
  if (value !== undefined && value.trim() !== '') {
    url.searchParams.set(key, value.trim())
  }
}

function appendOptionalNumberParam(
  url: URL,
  key: string,
  value: number | undefined,
): void {
  if (typeof value === 'number') {
    url.searchParams.set(key, String(value))
  }
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/gu, ' ').trim()
}

function decodeXml(value: string): string {
  return value
    .replace(/&#(\d+);/gu, (_, codePoint: string) => (
      String.fromCodePoint(Number(codePoint))
    ))
    .replace(/&#x([0-9a-f]+);/giu, (_, codePoint: string) => (
      String.fromCodePoint(Number.parseInt(codePoint, 16))
    ))
    .replace(/&quot;/gu, '"')
    .replace(/&apos;/gu, "'")
    .replace(/&lt;/gu, '<')
    .replace(/&gt;/gu, '>')
    .replace(/&amp;/gu, '&')
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')
}
