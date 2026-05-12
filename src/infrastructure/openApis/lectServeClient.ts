import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export const LECTSERVE_DEFAULT_BASE_URL = 'https://www.lectserve.com'

export const LECTSERVE_LECTIONARIES = ['acna', 'rcl'] as const

export type LectServeLectionary = typeof LECTSERVE_LECTIONARIES[number]

export type LectServeDateQuery = {
  date: string
  lectionary: LectServeLectionary
}

export type LectServeSundayQuery = {
  lectionary: LectServeLectionary
}

export type LectServeService = {
  name: string
  alt?: string | undefined
  readings: string[]
}

export type LectServeSunday = {
  date: string
  datePretty?: string | undefined
  day?: string | undefined
  year?: string | undefined
  type?: string | undefined
  lectionary?: string | undefined
  prevSunday?: string | undefined
  nextSunday?: string | undefined
  services: LectServeService[]
}

export type LectServeDailyReadings = {
  morning: {
    first?: string | undefined
    second?: string | undefined
  }
  evening: {
    first?: string | undefined
    second?: string | undefined
  }
}

export type LectServeDaily = {
  date: string
  datePretty?: string | undefined
  day?: string | undefined
  week?: string | undefined
  lectionary?: string | undefined
  yesterday?: string | undefined
  tomorrow?: string | undefined
  readings: LectServeDailyReadings
}

export type LectServeDatePayload = {
  sunday?: LectServeSunday | undefined
  daily?: LectServeDaily | undefined
  redLetter?: LectServeSunday | undefined
}

export type LectServeClientOptions = {
  baseUrl?: string | undefined
  fetchImpl?: typeof fetch | undefined
}

export class LectServeClient {
  private readonly baseUrl: string
  private readonly fetchImpl: typeof fetch

  constructor(options: LectServeClientOptions = {}) {
    this.baseUrl = normalizeBaseUrl(options.baseUrl ?? LECTSERVE_DEFAULT_BASE_URL)
    this.fetchImpl = options.fetchImpl ?? fetch
  }

  async date(query: LectServeDateQuery): Promise<LectServeDatePayload> {
    const url = this.createUrl(`/date/${query.date}`)
    url.searchParams.set('lect', query.lectionary)
    const value = await this.fetchJson(url)
    if (!isRecord(value)) {
      throw new RuntimeFailure(
        'OPEN_API_FAILED',
        'LectServe date response was not an object.',
      )
    }
    return parseDatePayload(value)
  }

  async sunday(query: LectServeSundayQuery): Promise<LectServeSunday> {
    const url = this.createUrl('/sunday')
    url.searchParams.set('lect', query.lectionary)
    const value = await this.fetchJson(url)
    if (!isRecord(value)) {
      throw new RuntimeFailure(
        'OPEN_API_FAILED',
        'LectServe Sunday response was not an object.',
      )
    }
    return parseSunday(value)
  }

  private createUrl(pathname: string): URL {
    return new URL(pathname, this.baseUrl)
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
        `LectServe request failed: ${String(error)}`,
        { provider: 'lectserve', url: url.toString() },
      )
    }

    const body = await response.text()

    if (isCloudflareChallenge(response, body)) {
      throw new RuntimeFailure(
        'OPEN_API_FAILED',
        [
          'LectServe is currently returning a Cloudflare challenge HTML page',
          'instead of the documented JSON API response; retry later or use',
          'cached/offline data.',
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
        'LectServe response was not JSON.',
        {
          ...createResponseDetails(response, url),
          preview: body.slice(0, 120),
        },
      )
    }

    if (!response.ok) {
      throw new RuntimeFailure(
        'OPEN_API_FAILED',
        `LectServe request failed with HTTP ${response.status}.`,
        {
          ...createResponseDetails(response, url),
          response: parsed,
        },
      )
    }

    return parsed
  }
}

function createResponseDetails(response: Response, url: URL): Record<string, unknown> {
  return {
    provider: 'lectserve',
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

function parseDatePayload(value: Record<string, unknown>): LectServeDatePayload {
  const sunday = parseOptionalSunday(value.sunday)
  const daily = parseOptionalDaily(value.daily)
  const redLetter = parseOptionalSunday(value.red_letter)
  return {
    ...(sunday !== undefined ? { sunday } : {}),
    ...(daily !== undefined ? { daily } : {}),
    ...(redLetter !== undefined ? { redLetter } : {}),
  }
}

function parseOptionalSunday(value: unknown): LectServeSunday | undefined {
  return isRecord(value) ? parseSunday(value) : undefined
}

function parseSunday(value: Record<string, unknown>): LectServeSunday {
  const date = readString(value.date)
  if (date === undefined) {
    throw new RuntimeFailure(
      'OPEN_API_FAILED',
      'LectServe Sunday payload is missing date.',
    )
  }
  const services = readArray(value.services)
    .filter(isRecord)
    .map(parseService)
    .filter((service): service is LectServeService => service !== undefined)
  return {
    date,
    ...(readString(value.date_pretty) !== undefined
      ? { datePretty: readString(value.date_pretty) }
      : {}),
    ...(readString(value.day) !== undefined ? { day: readString(value.day) } : {}),
    ...(readString(value.year) !== undefined ? { year: readString(value.year) } : {}),
    ...(readString(value.type) !== undefined ? { type: readString(value.type) } : {}),
    ...(readString(value.lectionary) !== undefined
      ? { lectionary: readString(value.lectionary) }
      : {}),
    ...(readString(value.prevSunday) !== undefined
      ? { prevSunday: readString(value.prevSunday) }
      : {}),
    ...(readString(value.nextSunday) !== undefined
      ? { nextSunday: readString(value.nextSunday) }
      : {}),
    services,
  }
}

function parseService(value: Record<string, unknown>): LectServeService | undefined {
  const name = readString(value.name)
  if (name === undefined) return undefined
  const alt = readString(value.alt)
  const readings = readArray(value.readings)
    .map(readString)
    .filter((reading): reading is string => reading !== undefined)
  return {
    name,
    ...(alt !== undefined ? { alt } : {}),
    readings,
  }
}

function parseOptionalDaily(value: unknown): LectServeDaily | undefined {
  if (!isRecord(value)) return undefined
  const date = readString(value.date)
  if (date === undefined) return undefined
  const readings = isRecord(value.readings) ? value.readings : {}
  return {
    date,
    ...(readString(value.date_pretty) !== undefined
      ? { datePretty: readString(value.date_pretty) }
      : {}),
    ...(readString(value.day) !== undefined ? { day: readString(value.day) } : {}),
    ...(readString(value.week) !== undefined ? { week: readString(value.week) } : {}),
    ...(readString(value.lectionary) !== undefined
      ? { lectionary: readString(value.lectionary) }
      : {}),
    ...(readString(value.yesterday) !== undefined
      ? { yesterday: readString(value.yesterday) }
      : {}),
    ...(readString(value.tomorrow) !== undefined
      ? { tomorrow: readString(value.tomorrow) }
      : {}),
    readings: parseDailyReadings(readings),
  }
}

function parseDailyReadings(
  value: Record<string, unknown>,
): LectServeDailyReadings {
  const morning = isRecord(value.morning) ? value.morning : {}
  const evening = isRecord(value.evening) ? value.evening : {}
  return {
    morning: {
      ...(readString(morning.first) !== undefined
        ? { first: readString(morning.first) }
        : {}),
      ...(readString(morning.second) !== undefined
        ? { second: readString(morning.second) }
        : {}),
    },
    evening: {
      ...(readString(evening.first) !== undefined
        ? { first: readString(evening.first) }
        : {}),
      ...(readString(evening.second) !== undefined
        ? { second: readString(evening.second) }
        : {}),
    },
  }
}

function readArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() !== ''
    ? value.trim()
    : undefined
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function normalizeBaseUrl(value: string): string {
  return value.endsWith('/') ? value : `${value}/`
}
