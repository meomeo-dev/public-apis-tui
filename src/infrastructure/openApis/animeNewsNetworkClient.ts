import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export const ANIME_NEWS_NETWORK_DEFAULT_BASE_URL = 'https://www.animenewsnetwork.com'
const ANIME_TITLES_REPORT_ID = 155

export type AnimeNewsNetworkTitlesQuery = {
  skip?: number | undefined
  limit?: number | undefined
  namePrefix?: string | undefined
}

export type AnimeNewsNetworkReportItem = {
  id: number
  gid?: number | undefined
  type?: string | undefined
  name: string
  precision?: string | undefined
  vintage?: string | undefined
}

export type AnimeNewsNetworkReport = {
  skipped: number
  listed: number
  args: {
    type?: string | undefined
    name?: string | undefined
  }
  items: AnimeNewsNetworkReportItem[]
}

export type AnimeNewsNetworkClientOptions = {
  baseUrl?: string | undefined
  fetchImpl?: typeof fetch | undefined
}

export class AnimeNewsNetworkClient {
  private readonly baseUrl: string
  private readonly fetchImpl: typeof fetch

  constructor(options: AnimeNewsNetworkClientOptions = {}) {
    this.baseUrl = normalizeBaseUrl(options.baseUrl ?? ANIME_NEWS_NETWORK_DEFAULT_BASE_URL)
    this.fetchImpl = options.fetchImpl ?? fetch
  }

  async listAnimeTitles(query: AnimeNewsNetworkTitlesQuery = {}): Promise<AnimeNewsNetworkReport> {
    const url = new URL(`${this.baseUrl}/encyclopedia/reports.xml`)
    url.searchParams.set('id', String(ANIME_TITLES_REPORT_ID))
    url.searchParams.set('type', 'anime')
    if (query.skip !== undefined) {
      url.searchParams.set('nskip', String(query.skip))
    }
    if (query.limit !== undefined) {
      url.searchParams.set('nlist', String(query.limit))
    }
    if (query.namePrefix !== undefined) {
      url.searchParams.set('name', query.namePrefix)
    }

    const response = await this.fetchImpl(url, {
      method: 'GET',
      headers: {
        accept: 'text/xml, application/xml',
        'user-agent': 'public-apis-tui/0.5.0 no-auth CLI',
      },
    })
    const body = await response.text()

    if (!response.ok) {
      throw new RuntimeFailure('OPEN_API_FAILED', body.trim() || response.statusText || 'Anime News Network request failed.', {
        status: response.status,
        statusText: response.statusText,
      })
    }

    return parseReportXml(body)
  }
}

function normalizeBaseUrl(value: string): string {
  return value.replace(/\/+$/u, '')
}

function parseReportXml(xml: string): AnimeNewsNetworkReport {
  const reportMatch = /<report\b([^>]*)>([\s\S]*)<\/report>/u.exec(xml)
  if (reportMatch === null) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'Anime News Network report response must include a report root element.')
  }

  const attributes = parseAttributes(reportMatch[1] ?? '')
  const body = reportMatch[2] ?? ''
  return {
    skipped: readIntegerAttribute(attributes, 'skipped'),
    listed: readIntegerAttribute(attributes, 'listed'),
    args: parseArgs(body),
    items: parseItems(body),
  }
}

function parseArgs(body: string): AnimeNewsNetworkReport['args'] {
  const argsMatch = /<args>([\s\S]*?)<\/args>/u.exec(body)
  if (argsMatch === null) {
    return {}
  }
  const argsBody = argsMatch[1] ?? ''
  return {
    ...readOptionalTagProperty(argsBody, 'type', 'type'),
    ...readOptionalTagProperty(argsBody, 'name', 'name'),
  }
}

function parseItems(body: string): AnimeNewsNetworkReportItem[] {
  return [...body.matchAll(/<item>([\s\S]*?)<\/item>/gu)].map(match => {
    const itemBody = match[1] ?? ''
    return {
      id: readIntegerTag(itemBody, 'id'),
      ...readOptionalIntegerTagProperty(itemBody, 'gid', 'gid'),
      ...readOptionalTagProperty(itemBody, 'type', 'type'),
      name: readStringTag(itemBody, 'name'),
      ...readOptionalTagProperty(itemBody, 'precision', 'precision'),
      ...readOptionalTagProperty(itemBody, 'vintage', 'vintage'),
    }
  })
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

function readIntegerAttribute(attributes: Record<string, string>, key: string): number {
  const value = attributes[key]
  if (value === undefined) {
    throw new RuntimeFailure('OPEN_API_FAILED', `Anime News Network report attribute ${key} is required.`)
  }
  return parseInteger(value, `attribute ${key}`)
}

function readStringTag(body: string, tag: string): string {
  const value = readOptionalTag(body, tag)
  if (value === undefined) {
    throw new RuntimeFailure('OPEN_API_FAILED', `Anime News Network item field ${tag} is required.`)
  }
  return value
}

function readIntegerTag(body: string, tag: string): number {
  return parseInteger(readStringTag(body, tag), `field ${tag}`)
}

function readOptionalTagProperty<TName extends string>(
  body: string,
  tag: string,
  propertyName: TName,
): { [Key in TName]?: string | undefined } {
  const value = readOptionalTag(body, tag)
  return value === undefined || value === '' ? {} : { [propertyName]: value } as { [Key in TName]?: string | undefined }
}

function readOptionalIntegerTagProperty<TName extends string>(
  body: string,
  tag: string,
  propertyName: TName,
): { [Key in TName]?: number | undefined } {
  const value = readOptionalTag(body, tag)
  return value === undefined || value === '' ? {} : { [propertyName]: parseInteger(value, `field ${tag}`) } as { [Key in TName]?: number | undefined }
}

function readOptionalTag(body: string, tag: string): string | undefined {
  const match = new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, 'u').exec(body)
  return match?.[1] === undefined ? undefined : decodeXml(match[1])
}

function parseInteger(value: string, label: string): number {
  const parsed = Number(value)
  if (!Number.isInteger(parsed)) {
    throw new RuntimeFailure('OPEN_API_FAILED', `Anime News Network ${label} must be an integer.`, { value })
  }
  return parsed
}

function decodeXml(value: string): string {
  return value
    .replace(/&#(\d+);/gu, (_, codePoint: string) => String.fromCodePoint(Number(codePoint)))
    .replace(/&#x([0-9a-f]+);/giu, (_, codePoint: string) => String.fromCodePoint(Number.parseInt(codePoint, 16)))
    .replace(/&quot;/gu, '"')
    .replace(/&apos;/gu, "'")
    .replace(/&lt;/gu, '<')
    .replace(/&gt;/gu, '>')
    .replace(/&amp;/gu, '&')
}
