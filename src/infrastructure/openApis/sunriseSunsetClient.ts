import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export const SUNRISE_SUNSET_BASE_URL = 'https://api.sunrise-sunset.org'
export const SUNRISE_SUNSET_DOCS_URL = 'https://sunrise-sunset.org/api'
export const SUNRISE_SUNSET_DEFAULT_LATITUDE = 36.72016
export const SUNRISE_SUNSET_DEFAULT_LONGITUDE = -4.42034
export const SUNRISE_SUNSET_DEFAULT_DATE = '2026-05-11'
export const SUNRISE_SUNSET_DEFAULT_TZID = 'UTC'

export type SunriseSunsetInput = {
  latitude?: number | undefined
  longitude?: number | undefined
  date?: string | undefined
  tzid?: string | undefined
}

export type NormalizedSunriseSunsetInput = {
  latitude: number
  longitude: number
  date: string
  tzid: string
}

export type SunriseSunsetTimes = {
  sunrise: string
  sunset: string
  solarNoon: string
  dayLengthSeconds: number
  civilTwilightBegin: string
  civilTwilightEnd: string
  nauticalTwilightBegin: string
  nauticalTwilightEnd: string
  astronomicalTwilightBegin: string
  astronomicalTwilightEnd: string
}

export type SunriseSunsetResponse = {
  status: 'OK'
  tzid: string
  results: SunriseSunsetTimes
}

export type SunriseSunsetClientOptions = {
  baseUrl?: string | undefined
  fetchImpl?: typeof fetch | undefined
}

export class SunriseSunsetClient {
  private readonly baseUrl: string
  private readonly fetchImpl: typeof fetch

  constructor(options: SunriseSunsetClientOptions = {}) {
    this.baseUrl = normalizeBaseUrl(options.baseUrl ?? SUNRISE_SUNSET_BASE_URL)
    this.fetchImpl = options.fetchImpl ?? globalThis.fetch
  }

  async getTimes(
    input: NormalizedSunriseSunsetInput,
  ): Promise<SunriseSunsetResponse> {
    const url = new URL('/json', this.baseUrl)
    url.searchParams.set('lat', String(input.latitude))
    url.searchParams.set('lng', String(input.longitude))
    url.searchParams.set('date', input.date)
    url.searchParams.set('formatted', '0')
    url.searchParams.set('tzid', input.tzid)
    const parsed = await this.fetchJson(url)
    return parseSunriseSunsetResponse(parsed)
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
        `Sunrise-Sunset request failed: ${String(error)}`,
        { provider: 'sunrisesunset', url: url.toString() },
      )
    }

    const text = await response.text()

    if (isCloudflareChallenge(response, text)) {
      throw new RuntimeFailure(
        'OPEN_API_FAILED',
        [
          'Sunrise-Sunset is currently returning a Cloudflare challenge HTML',
          'page instead of the documented JSON API response; retry later or',
          'use cached/offline data.',
        ].join(' '),
        createResponseDetails(response, url),
      )
    }

    const details = createResponseDetails(response, url)
    let parsed: unknown
    try {
      parsed = JSON.parse(text) as unknown
    } catch {
      throw new RuntimeFailure(
        'OPEN_API_FAILED',
        'Sunrise-Sunset response was not JSON.',
        {
          ...details,
          preview: text.slice(0, 160),
        },
      )
    }

    if (!response.ok) {
      throw new RuntimeFailure(
        'OPEN_API_FAILED',
        `Sunrise-Sunset request failed with HTTP ${response.status}.`,
        { ...details, response: parsed },
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
    provider: 'sunrisesunset',
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
    (response.status === 403 || response.status === 429)
    && contentType.includes('text/html')
    && (
      mitigated === 'challenge'
      || server.includes('cloudflare')
      || /<title>\s*just a moment/i.test(body)
    )
  )
}

export function normalizeSunriseSunsetInput(
  input: SunriseSunsetInput = {},
): NormalizedSunriseSunsetInput {
  return {
    latitude: normalizeLatitude(input.latitude ?? SUNRISE_SUNSET_DEFAULT_LATITUDE),
    longitude: normalizeLongitude(
      input.longitude ?? SUNRISE_SUNSET_DEFAULT_LONGITUDE,
    ),
    date: normalizeIsoDate(input.date ?? SUNRISE_SUNSET_DEFAULT_DATE),
    tzid: normalizeTzid(input.tzid ?? SUNRISE_SUNSET_DEFAULT_TZID),
  }
}

function parseSunriseSunsetResponse(value: unknown): SunriseSunsetResponse {
  if (!isRecord(value) || !isRecord(value.results)) {
    throw new RuntimeFailure(
      'OPEN_API_FAILED',
      'Sunrise-Sunset response had an unexpected schema.',
      { provider: 'sunrisesunset' },
    )
  }
  const status = readString(value.status)
  if (
    status === 'INVALID_REQUEST' ||
    status === 'INVALID_DATE' ||
    status === 'INVALID_TZID'
  ) {
    throw new RuntimeFailure(
      'OPEN_API_FAILED',
      `Sunrise-Sunset provider returned ${status}.`,
      { provider: 'sunrisesunset', response: value },
    )
  }
  if (status !== 'OK') {
    throw new RuntimeFailure(
      'OPEN_API_FAILED',
      `Sunrise-Sunset provider returned ${status ?? 'unknown status'}.`,
      { provider: 'sunrisesunset', response: value },
    )
  }
  return {
    status,
    tzid: readString(value.tzid) ?? 'UTC',
    results: parseTimes(value.results),
  }
}

function parseTimes(value: Record<string, unknown>): SunriseSunsetTimes {
  return {
    sunrise: requireString(value.sunrise, 'sunrise'),
    sunset: requireString(value.sunset, 'sunset'),
    solarNoon: requireString(value.solar_noon, 'solar_noon'),
    dayLengthSeconds: requireNumber(value.day_length, 'day_length'),
    civilTwilightBegin: requireString(
      value.civil_twilight_begin,
      'civil_twilight_begin',
    ),
    civilTwilightEnd: requireString(
      value.civil_twilight_end,
      'civil_twilight_end',
    ),
    nauticalTwilightBegin: requireString(
      value.nautical_twilight_begin,
      'nautical_twilight_begin',
    ),
    nauticalTwilightEnd: requireString(
      value.nautical_twilight_end,
      'nautical_twilight_end',
    ),
    astronomicalTwilightBegin: requireString(
      value.astronomical_twilight_begin,
      'astronomical_twilight_begin',
    ),
    astronomicalTwilightEnd: requireString(
      value.astronomical_twilight_end,
      'astronomical_twilight_end',
    ),
  }
}

function normalizeLatitude(value: number): number {
  if (!Number.isFinite(value) || value < -90 || value > 90) {
    throw new RuntimeFailure(
      'INVALID_ARGUMENT',
      'Sunrise-Sunset --latitude must be a number from -90 to 90.',
      { latitude: value },
    )
  }
  return value
}

function normalizeLongitude(value: number): number {
  if (!Number.isFinite(value) || value < -180 || value > 180) {
    throw new RuntimeFailure(
      'INVALID_ARGUMENT',
      'Sunrise-Sunset --longitude must be a number from -180 to 180.',
      { longitude: value },
    )
  }
  return value
}

function normalizeIsoDate(value: string): string {
  const date = value.trim()
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(date)) {
    throw new RuntimeFailure(
      'INVALID_ARGUMENT',
      'Sunrise-Sunset --date must use YYYY-MM-DD format.',
      { date: value },
    )
  }
  const parsed = new Date(`${date}T00:00:00.000Z`)
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) {
    throw new RuntimeFailure(
      'INVALID_ARGUMENT',
      'Sunrise-Sunset --date must be a real Gregorian date.',
      { date: value },
    )
  }
  return date
}

function normalizeTzid(value: string): string {
  const tzid = value.trim()
  if (tzid === '') {
    throw new RuntimeFailure(
      'INVALID_ARGUMENT',
      'Sunrise-Sunset --tzid must not be empty.',
    )
  }
  if (!/^[A-Za-z][A-Za-z0-9_+./-]{0,63}$/u.test(tzid)) {
    throw new RuntimeFailure(
      'INVALID_ARGUMENT',
      'Sunrise-Sunset --tzid must be a safe timezone identifier.',
      { tzid: value },
    )
  }
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tzid }).format(new Date(0))
  } catch {
    throw new RuntimeFailure(
      'INVALID_ARGUMENT',
      'Sunrise-Sunset --tzid must be a valid timezone identifier.',
      { tzid: value },
    )
  }
  return tzid
}

function requireString(value: unknown, field: string): string {
  const text = readString(value)
  if (text !== undefined) return text
  throw new RuntimeFailure(
    'OPEN_API_FAILED',
    `Sunrise-Sunset response is missing ${field}.`,
    { provider: 'sunrisesunset' },
  )
}

function requireNumber(value: unknown, field: string): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  throw new RuntimeFailure(
    'OPEN_API_FAILED',
    `Sunrise-Sunset response is missing numeric ${field}.`,
    { provider: 'sunrisesunset' },
  )
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() !== '' ? value : undefined
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function normalizeBaseUrl(value: string): string {
  return value.endsWith('/') ? value : `${value}/`
}
