import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export const NASA_DEFAULT_BASE_URL = 'https://images-api.nasa.gov'

export type NasaSearchParams = {
  query: string
  mediaType: NasaMediaType
  center?: string | undefined
  yearStart?: number | undefined
  yearEnd?: number | undefined
  page: number
  pageSize: number
}

export type NasaAssetParams = {
  nasaId: string
}

export type NasaMediaType = 'image' | 'audio' | 'video'

export type NasaSearchResponse = {
  totalHits: number
  href?: string | undefined
  items: NasaSearchItem[]
}

export type NasaSearchItem = {
  nasaId: string
  title: string
  description?: string | undefined
  center?: string | undefined
  dateCreated?: string | undefined
  mediaType?: string | undefined
  keywords: string[]
  secondaryCreator?: string | undefined
  href?: string | undefined
  previewUrl?: string | undefined
  links: NasaItemLink[]
}

export type NasaItemLink = {
  href: string
  rel?: string | undefined
  render?: string | undefined
}

export type NasaAssetResponse = {
  nasaId: string
  href?: string | undefined
  files: NasaAssetFile[]
}

export type NasaAssetFile = {
  href: string
  filename: string
  role: string
  extension?: string | undefined
}

type NasaCollectionResponse = {
  collection?: {
    href?: unknown
    metadata?: { total_hits?: unknown } | undefined
    items?: unknown
  } | undefined
}

export class NasaClient {
  constructor(
    private readonly baseUrl = NASA_DEFAULT_BASE_URL,
    private readonly fetchImpl: typeof fetch = globalThis.fetch,
  ) {}

  async search(params: NasaSearchParams): Promise<NasaSearchResponse> {
    const url = this.createSearchUrl(params)
    const parsed = await this.fetchJson(url)
    const collection = readCollection(parsed, 'NASA image search')
    const items = Array.isArray(collection.items) ? collection.items : []
    return {
      totalHits: readNumber(collection.metadata?.total_hits) ?? 0,
      href: readString(collection.href),
      items: items
        .map(parseSearchItem)
        .filter((item): item is NasaSearchItem => item !== undefined),
    }
  }

  async asset(params: NasaAssetParams): Promise<NasaAssetResponse> {
    const url = new URL(`/asset/${encodeURIComponent(params.nasaId)}`, this.baseUrl)
    const parsed = await this.fetchJson(url)
    const collection = readCollection(parsed, 'NASA asset manifest')
    const items = Array.isArray(collection.items) ? collection.items : []
    return {
      nasaId: params.nasaId,
      href: readString(collection.href),
      files: items
        .map(parseAssetFile)
        .filter((item): item is NasaAssetFile => item !== undefined),
    }
  }

  private createSearchUrl(params: NasaSearchParams): URL {
    const url = new URL('/search', this.baseUrl)
    url.searchParams.set('q', params.query)
    url.searchParams.set('media_type', params.mediaType)
    if (params.center !== undefined) url.searchParams.set('center', params.center)
    if (params.yearStart !== undefined) {
      url.searchParams.set('year_start', String(params.yearStart))
    }
    if (params.yearEnd !== undefined) {
      url.searchParams.set('year_end', String(params.yearEnd))
    }
    url.searchParams.set('page', String(params.page))
    url.searchParams.set('page_size', String(params.pageSize))
    return url
  }

  private async fetchJson(url: URL): Promise<unknown> {
    let response: Response
    try {
      response = await this.fetchImpl(url, {
        method: 'GET',
        headers: {
          accept: 'application/json',
          'user-agent': 'public-apis-tui no-auth CLI',
        },
      })
    } catch (error) {
      throw new RuntimeFailure(
        'OPEN_API_FAILED',
        `NASA Images request failed: ${String(error)}`,
        { provider: 'nasa', url: url.toString() },
      )
    }

    const body = await response.text()

    if (isCloudflareChallenge(response, body)) {
      throw new RuntimeFailure(
        'OPEN_API_FAILED',
        [
          'NASA Images is currently returning a Cloudflare challenge HTML',
          'page instead of the documented JSON API response; retry later or',
          'use cached/offline data.',
        ].join(' '),
        createResponseDetails(response, url),
      )
    }

    let parsed: unknown
    try {
      parsed = JSON.parse(body) as unknown
    } catch {
      throw new RuntimeFailure(
        'OPEN_API_FAILED',
        'NASA Images response was not JSON.',
        {
          ...createResponseDetails(response, url),
          preview: body.slice(0, 120),
        },
      )
    }

    if (!response.ok) {
      throw new RuntimeFailure(
        'OPEN_API_FAILED',
        `NASA Images request failed with HTTP ${response.status}.`,
        {
          ...createResponseDetails(response, url),
          response: parsed,
        },
      )
    }

    return parsed
  }
}

function createResponseDetails(
  response: Response,
  url: URL,
): Record<string, unknown> {
  return {
    provider: 'nasa',
    status: response.status,
    statusText: response.statusText,
    contentType: response.headers.get('content-type') ?? undefined,
    url: url.toString(),
  }
}

function isCloudflareChallenge(response: Response, body: string): boolean {
  const server = response.headers.get('server')?.toLowerCase() ?? ''
  const mitigated = response.headers.get('cf-mitigated')?.toLowerCase() ?? ''
  const contentType = response.headers.get('content-type')?.toLowerCase() ?? ''
  return (
    (response.status === 403 || response.status === 429) &&
    contentType.includes('text/html') &&
    (
      mitigated === 'challenge' ||
      server.includes('cloudflare') ||
      /<title>\s*just a moment/i.test(body)
    )
  )
}

function readCollection(
  value: unknown,
  label: string,
): NonNullable<NasaCollectionResponse['collection']> {
  if (!isRecord(value) || !isRecord(value.collection)) {
    throw new RuntimeFailure(
      'OPEN_API_FAILED',
      `${label} response did not match the documented collection shape.`,
    )
  }
  return value.collection
}

function parseSearchItem(value: unknown): NasaSearchItem | undefined {
  if (!isRecord(value)) return undefined
  const data = Array.isArray(value.data) && isRecord(value.data[0])
    ? value.data[0]
    : undefined
  if (data === undefined) return undefined

  const nasaId = readString(data.nasa_id)
  const title = readString(data.title)
  if (nasaId === undefined || title === undefined) return undefined

  const links = Array.isArray(value.links)
    ? value.links.map(parseItemLink).filter(isDefined)
    : []
  return {
    nasaId,
    title,
    ...readOptionalString('description', data.description),
    ...readOptionalString('center', data.center),
    ...readOptionalString('dateCreated', data.date_created),
    ...readOptionalString('mediaType', data.media_type),
    keywords: readStringArray(data.keywords),
    ...readOptionalString('secondaryCreator', data.secondary_creator),
    ...readOptionalString('href', value.href),
    ...readOptionalString('previewUrl', links[0]?.href),
    links,
  }
}

function parseItemLink(value: unknown): NasaItemLink | undefined {
  if (!isRecord(value)) return undefined
  const href = readString(value.href)
  if (href === undefined) return undefined
  return {
    href,
    ...readOptionalString('rel', value.rel),
    ...readOptionalString('render', value.render),
  }
}

function parseAssetFile(value: unknown): NasaAssetFile | undefined {
  if (!isRecord(value)) return undefined
  const href = readString(value.href)
  if (href === undefined) return undefined
  const filename = href.split('/').pop() ?? href
  return {
    href,
    filename,
    role: classifyAssetRole(filename),
    ...readOptionalString('extension', readExtension(filename)),
  }
}

function classifyAssetRole(filename: string): string {
  const lower = filename.toLowerCase()
  if (lower.includes('metadata') && lower.endsWith('.json')) return 'metadata'
  if (lower.includes('captions') || lower.endsWith('.vtt')) return 'captions'
  if (lower.includes('thumb') || lower.includes('preview')) return 'preview'
  if (lower.includes('orig')) return 'original'
  if (lower.includes('large')) return 'large'
  if (lower.includes('medium')) return 'medium'
  if (lower.includes('small')) return 'small'
  return 'file'
}

function readExtension(filename: string): string | undefined {
  const match = /\.([A-Za-z0-9]+)$/u.exec(filename)
  return match?.[1]?.toLowerCase()
}

function readOptionalString(
  key: keyof NasaSearchItem | keyof NasaItemLink | keyof NasaAssetFile,
  value: unknown,
): Record<string, string> {
  const text = readString(value)
  return text === undefined ? {} : { [key]: text }
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() !== ''
    ? value.trim()
    : undefined
}

function readNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value)
    ? value
    : undefined
}

function readStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.map(readString).filter(isDefined)
}

function isDefined<T>(value: T | undefined): value is T {
  return value !== undefined
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}
