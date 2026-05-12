import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export const ICSDB_REPOSITORY_URL = 'https://github.com/gadael/icsdb'
export const ICSDB_TREE_URL =
  'https://api.github.com/repos/gadael/icsdb/git/trees/master?recursive=1'
export const ICSDB_RAW_BASE_URL =
  'https://raw.githubusercontent.com/gadael/icsdb/master/build'

export const ICSDB_LOCALES = ['en-US', 'fr-FR'] as const

export type IcsdbLocale = typeof ICSDB_LOCALES[number]

export type IcsdbCalendarRecord = {
  locale: IcsdbLocale
  slug: string
  fileName: string
  path: string
  title: string
  sourceUrl: string
}

export type IcsdbCalendarPayload = {
  title?: string | undefined
  productId?: string | undefined
  method?: string | undefined
  timezone?: string | undefined
  events: IcsdbEvent[]
}

export type IcsdbEvent = {
  summary: string
  startDate?: string | undefined
  endDate?: string | undefined
  rrule?: string | undefined
  rdateCount: number
  rdatePreview: string[]
  categories: string[]
  uid?: string | undefined
}

type IcsdbClientOptions = {
  treeUrl?: string | undefined
  rawBaseUrl?: string | undefined
  fetchImpl?: typeof fetch | undefined
}

type GitTreeEntry = {
  path?: unknown
  type?: unknown
}

type GitTreePayload = {
  tree?: unknown
  truncated?: unknown
}

type IcsProperty = {
  name: string
  rawValue: string
  value: string
}

export class IcsdbClient {
  private readonly treeUrl: string
  private readonly rawBaseUrl: string
  private readonly fetchImpl: typeof fetch

  constructor(options: IcsdbClientOptions = {}) {
    this.treeUrl = options.treeUrl ?? ICSDB_TREE_URL
    this.rawBaseUrl = trimTrailingSlashes(
      options.rawBaseUrl ?? ICSDB_RAW_BASE_URL,
    )
    this.fetchImpl = options.fetchImpl ?? globalThis.fetch
  }

  async listCalendars(locale: IcsdbLocale): Promise<IcsdbCalendarRecord[]> {
    const payload = await this.fetchJson(new URL(this.treeUrl))
    if (!isRecord(payload)) {
      throw new RuntimeFailure(
        'OPEN_API_FAILED',
        'icsdb GitHub tree response was not a JSON object.',
      )
    }

    const tree = parseTreePayload(payload)
    return tree
      .map(entry => parseCalendarEntry(entry, locale, this.rawBaseUrl))
      .filter((entry): entry is IcsdbCalendarRecord => entry !== undefined)
      .sort((left, right) => left.slug.localeCompare(right.slug))
  }

  async calendarEvents(
    locale: IcsdbLocale,
    slug: string,
  ): Promise<IcsdbCalendarPayload> {
    const url = createRawCalendarUrl(this.rawBaseUrl, locale, slug)
    const text = await this.fetchText(url)
    return parseIcsCalendar(text)
  }

  sourceUrl(locale: IcsdbLocale, slug: string): string {
    return createRawCalendarUrl(this.rawBaseUrl, locale, slug).toString()
  }

  private async fetchJson(url: URL): Promise<unknown> {
    const response = await this.fetchResponse(url, 'application/json')
    const body = await response.text()

    if (isCloudflareChallenge(response, body)) {
      throw new RuntimeFailure(
        'OPEN_API_FAILED',
        [
          'icsdb GitHub tree endpoint is currently returning a Cloudflare',
          'challenge HTML page instead of the documented JSON API response;',
          'retry later or use cached/offline data.',
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
        'icsdb GitHub tree response was not JSON.',
        {
          ...createResponseDetails(response, url),
          preview: body.slice(0, 120),
        },
      )
    }

    if (!response.ok) {
      throw new RuntimeFailure(
        'OPEN_API_FAILED',
        `icsdb GitHub tree request failed with HTTP ${response.status}.`,
        {
          ...createResponseDetails(response, url),
          response: parsed,
        },
      )
    }
    return parsed
  }

  private async fetchText(url: URL): Promise<string> {
    const response = await this.fetchResponse(url, 'text/calendar,text/plain')
    const body = await response.text()

    if (isCloudflareChallenge(response, body)) {
      throw new RuntimeFailure(
        'OPEN_API_FAILED',
        [
          'icsdb raw calendar endpoint is currently returning a Cloudflare',
          'challenge HTML page instead of the documented ICS response;',
          'retry later or use cached/offline data.',
        ].join(' '),
        createResponseDetails(response, url),
      )
    }

    if (!response.ok) {
      throw new RuntimeFailure(
        'OPEN_API_FAILED',
        `icsdb raw ICS request failed with HTTP ${response.status}.`,
        {
          ...createResponseDetails(response, url),
          preview: body.slice(0, 120),
        },
      )
    }
    if (!body.startsWith('BEGIN:VCALENDAR')) {
      throw new RuntimeFailure(
        'OPEN_API_FAILED',
        'icsdb raw response was not an ICS calendar.',
        {
          ...createResponseDetails(response, url),
          preview: body.slice(0, 120),
        },
      )
    }
    return body
  }

  private async fetchResponse(url: URL, accept: string): Promise<Response> {
    try {
      return await this.fetchImpl(url, {
        method: 'GET',
        headers: {
          accept,
          'user-agent': 'public-apis-tui no-auth CLI',
        },
      })
    } catch (error) {
      throw new RuntimeFailure(
        'OPEN_API_FAILED',
        `icsdb request failed: ${String(error)}`,
        { provider: 'icsdb', url: url.toString() },
      )
    }
  }
}

function createResponseDetails(
  response: Response,
  url: URL,
): Record<string, unknown> {
  return {
    provider: 'icsdb',
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

export function parseIcsCalendar(text: string): IcsdbCalendarPayload {
  const lines = unfoldIcsLines(text)
  if (!lines.includes('BEGIN:VCALENDAR')) {
    throw new RuntimeFailure(
      'OPEN_API_FAILED',
      'icsdb raw response did not contain BEGIN:VCALENDAR.',
    )
  }

  const events: IcsdbEvent[] = []
  const calendarProperties: IcsProperty[] = []
  let eventProperties: IcsProperty[] | undefined
  for (const line of lines) {
    if (line === 'BEGIN:VEVENT') {
      eventProperties = []
      continue
    }
    if (line === 'END:VEVENT') {
      if (eventProperties !== undefined) {
        events.push(parseEvent(eventProperties))
      }
      eventProperties = undefined
      continue
    }

    const property = parseProperty(line)
    if (property === undefined) continue
    if (eventProperties !== undefined) {
      eventProperties.push(property)
    } else {
      calendarProperties.push(property)
    }
  }

  if (events.length === 0) {
    throw new RuntimeFailure(
      'OPEN_API_FAILED',
      'icsdb calendar did not contain any VEVENT entries.',
    )
  }

  return {
    title: readPropertyValue(calendarProperties, 'X-WR-CALNAME'),
    productId: readPropertyValue(calendarProperties, 'PRODID'),
    method: readPropertyValue(calendarProperties, 'METHOD'),
    timezone: readPropertyValue(calendarProperties, 'X-WR-TIMEZONE'),
    events,
  }
}

function parseTreePayload(value: Record<string, unknown>): GitTreeEntry[] {
  const payload = value as GitTreePayload
  if (payload.truncated === true) {
    throw new RuntimeFailure(
      'OPEN_API_FAILED',
      'icsdb GitHub tree response was truncated.',
    )
  }
  if (!Array.isArray(payload.tree)) {
    throw new RuntimeFailure(
      'OPEN_API_FAILED',
      'icsdb GitHub tree response did not include a tree array.',
    )
  }
  return payload.tree.filter(isRecord)
}

function parseCalendarEntry(
  entry: GitTreeEntry,
  locale: IcsdbLocale,
  rawBaseUrl: string,
): IcsdbCalendarRecord | undefined {
  if (entry.type !== 'blob' || typeof entry.path !== 'string') {
    return undefined
  }
  const prefix = `build/${locale}/`
  const suffix = '-nonworkingdays.ics'
  if (!entry.path.startsWith(prefix) || !entry.path.endsWith(suffix)) {
    return undefined
  }
  const fileName = entry.path.slice(prefix.length)
  const slug = fileName.slice(0, -suffix.length)
  if (slug.trim() === '') return undefined
  return {
    locale,
    slug,
    fileName,
    path: entry.path,
    title: humanizeSlug(slug),
    sourceUrl: createRawCalendarUrl(rawBaseUrl, locale, slug).toString(),
  }
}

function parseEvent(properties: IcsProperty[]): IcsdbEvent {
  const rdates = readDateList(properties, 'RDATE')
  return {
    summary: readPropertyValue(properties, 'SUMMARY') ?? 'Untitled event',
    startDate: readIcsDate(readPropertyRawValue(properties, 'DTSTART')),
    endDate: readIcsDate(readPropertyRawValue(properties, 'DTEND')),
    rrule: readPropertyValue(properties, 'RRULE'),
    rdateCount: rdates.length,
    rdatePreview: rdates.slice(0, 8),
    categories: readTextList(properties, 'CATEGORIES'),
    uid: readPropertyValue(properties, 'UID'),
  }
}

function unfoldIcsLines(text: string): string[] {
  const normalized = text.replace(/\r\n/gu, '\n').replace(/\r/gu, '\n')
  const lines: string[] = []
  for (const line of normalized.split('\n')) {
    if (/^[ \t]/u.test(line) && lines.length > 0) {
      const previous = lines[lines.length - 1] ?? ''
      lines[lines.length - 1] = `${previous}${line.slice(1)}`
    } else if (line !== '') {
      lines.push(line)
    }
  }
  return lines
}

function parseProperty(line: string): IcsProperty | undefined {
  const colonIndex = line.indexOf(':')
  if (colonIndex < 1) return undefined
  const head = line.slice(0, colonIndex)
  const rawValue = line.slice(colonIndex + 1)
  const [name] = head.split(';', 1)
  if (name === undefined || name.trim() === '') return undefined
  return {
    name: name.toUpperCase(),
    rawValue,
    value: unescapeIcsText(rawValue),
  }
}

function readPropertyValue(
  properties: IcsProperty[],
  name: string,
): string | undefined {
  return properties.find(property => property.name === name)?.value
}

function readPropertyRawValue(
  properties: IcsProperty[],
  name: string,
): string | undefined {
  return properties.find(property => property.name === name)?.rawValue
}

function readTextList(properties: IcsProperty[], name: string): string[] {
  return properties
    .filter(property => property.name === name)
    .flatMap(property => splitIcsList(property.rawValue).map(unescapeIcsText))
    .map(value => value.trim())
    .filter(value => value !== '')
}

function readDateList(properties: IcsProperty[], name: string): string[] {
  return properties
    .filter(property => property.name === name)
    .flatMap(property => splitIcsList(property.rawValue))
    .map(readIcsDate)
    .filter((value): value is string => value !== undefined)
}

function splitIcsList(value: string): string[] {
  const parts: string[] = []
  let current = ''
  let escaped = false
  for (const char of value) {
    if (escaped) {
      current += char
      escaped = false
      continue
    }
    if (char === '\\') {
      current += char
      escaped = true
      continue
    }
    if (char === ',') {
      parts.push(current)
      current = ''
      continue
    }
    current += char
  }
  parts.push(current)
  return parts
}

function readIcsDate(value: string | undefined): string | undefined {
  if (value === undefined) return undefined
  const match = /^(\d{4})(\d{2})(\d{2})/u.exec(value)
  if (match === null) return undefined
  return `${match[1]}-${match[2]}-${match[3]}`
}

function unescapeIcsText(value: string): string {
  return value
    .replace(/\\n/giu, '\n')
    .replace(/\\,/gu, ',')
    .replace(/\\;/gu, ';')
    .replace(/\\\\/gu, '\\')
}

function createRawCalendarUrl(
  rawBaseUrl: string,
  locale: IcsdbLocale,
  slug: string,
): URL {
  return new URL(
    `${trimTrailingSlashes(rawBaseUrl)}/${locale}/${
      encodeURIComponent(`${slug}-nonworkingdays.ics`)
    }`,
  )
}

function humanizeSlug(slug: string): string {
  return slug
    .split(/[- ]+/u)
    .filter(part => part !== '')
    .map(capitalizeWord)
    .join(' ')
}

function capitalizeWord(value: string): string {
  if (value.length === 0) return value
  return `${value.slice(0, 1).toUpperCase()}${value.slice(1)}`
}

function trimTrailingSlashes(value: string): string {
  return value.replace(/\/+$/u, '')
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}
