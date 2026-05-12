import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export const UK_POLICE_BASE_URL = 'https://data.police.uk'
export const UK_POLICE_DOCS_URL = 'https://data.police.uk/docs/'
export const UK_POLICE_DEFAULT_LATITUDE = 52.629729
export const UK_POLICE_DEFAULT_LONGITUDE = -1.131592
export const UK_POLICE_DEFAULT_CATEGORY = 'all-crime'
export const UK_POLICE_DEFAULT_LIMIT = 25
export const UK_POLICE_MAX_LIMIT = 100

const allowedCategories = [
  'all-crime',
  'anti-social-behaviour',
  'bicycle-theft',
  'burglary',
  'criminal-damage-arson',
  'drugs',
  'other-theft',
  'possession-of-weapons',
  'public-order',
  'robbery',
  'shoplifting',
  'theft-from-the-person',
  'vehicle-crime',
  'violent-crime',
  'other-crime',
] as const

export type UkPoliceCrimeCategory = typeof allowedCategories[number]

export type UkPoliceStreetCrimesInput = {
  latitude?: number | undefined
  longitude?: number | undefined
  date?: string | undefined
  category?: string | undefined
  limit?: number | undefined
}

export type NormalizedUkPoliceStreetCrimesInput = {
  latitude: number
  longitude: number
  date?: string | undefined
  category: UkPoliceCrimeCategory
  limit: number
}

export type UkPoliceCrimeLocation = {
  latitude?: number | undefined
  longitude?: number | undefined
  streetId?: number | undefined
  streetName?: string | undefined
}

export type UkPoliceCrimeOutcome = {
  category?: string | undefined
  date?: string | undefined
}

export type UkPoliceStreetCrime = {
  id: number
  category: string
  month: string
  locationType?: string | undefined
  locationSubtype?: string | undefined
  location?: UkPoliceCrimeLocation | undefined
  outcomeStatus?: UkPoliceCrimeOutcome | undefined
  context?: string | undefined
  persistentIdPresent: boolean
}

export type UkPoliceStreetCrimesMeta = {
  returned: number
  totalAvailable: number
  truncated: boolean
  latestKnownDate?: string | undefined
  sourceEndpoint: string
}

type UkPoliceClientOptions = {
  baseUrl?: string | undefined
  fetchImpl?: typeof fetch | undefined
}

export class UkPoliceClient {
  constructor(private readonly options: UkPoliceClientOptions = {}) {}

  async listStreetCrimes(
    input: NormalizedUkPoliceStreetCrimesInput,
  ): Promise<{ meta: UkPoliceStreetCrimesMeta; crimes: UkPoliceStreetCrime[] }> {
    const url = new URL(
      `/api/crimes-street/${input.category}`,
      this.options.baseUrl ?? UK_POLICE_BASE_URL,
    )
    url.searchParams.set('lat', String(input.latitude))
    url.searchParams.set('lng', String(input.longitude))
    if (input.date !== undefined) {
      url.searchParams.set('date', input.date)
    }

    const parsed = await this.fetchJson(url)
    if (!Array.isArray(parsed)) {
      throw new RuntimeFailure(
        'OPEN_API_FAILED',
        'UK Police street-crimes response had an unexpected schema.',
        { provider: 'ukpolice', response: parsed },
      )
    }

    const crimes = parsed
      .map(parseStreetCrime)
      .filter((crime): crime is UkPoliceStreetCrime => crime !== undefined)
    return {
      meta: {
        returned: Math.min(crimes.length, input.limit),
        totalAvailable: crimes.length,
        truncated: crimes.length > input.limit,
        latestKnownDate: readLatestKnownDate(crimes),
        sourceEndpoint: `GET /api/crimes-street/${input.category}`,
      },
      crimes: crimes.slice(0, input.limit),
    }
  }

  private async fetchJson(url: URL): Promise<unknown> {
    const fetchImpl = this.options.fetchImpl ?? fetch
    let response: Response
    try {
      response = await fetchImpl(url, { headers: { accept: 'application/json' } })
    } catch (error) {
      throw new RuntimeFailure(
        'OPEN_API_FAILED',
        `UK Police API request failed: ${String(error)}`,
        {
          provider: 'ukpolice',
          endpoint: url.href,
        },
      )
    }
    const text = await response.text()
    const contentType = response.headers.get('content-type') ?? undefined
    if (isCloudflareChallenge(response, text)) {
      throw new RuntimeFailure(
        'OPEN_API_FAILED',
        [
          'UK Police is currently returning a Cloudflare challenge HTML page',
          'instead of the documented JSON API response; retry later or use',
          'cached/offline data.',
        ].join(' '),
        {
          provider: 'ukpolice',
          endpoint: url.href,
          status: response.status,
          contentType,
        },
      )
    }

    let parsed: unknown
    try {
      parsed = JSON.parse(text) as unknown
    } catch {
      throw new RuntimeFailure(
        'OPEN_API_FAILED',
        'UK Police API returned non-JSON content.',
        {
          provider: 'ukpolice',
          endpoint: url.href,
          status: response.status,
          contentType,
          preview: text.slice(0, 120),
        },
      )
    }
    if (!response.ok) {
      throw new RuntimeFailure(
        'OPEN_API_FAILED',
        `UK Police API request failed with HTTP ${String(response.status)}.`,
        {
          provider: 'ukpolice',
          endpoint: url.href,
          status: response.status,
          contentType,
          response: parsed,
        },
      )
    }
    return parsed
  }
}

export function normalizeUkPoliceStreetCrimesInput(
  input: UkPoliceStreetCrimesInput = {},
): NormalizedUkPoliceStreetCrimesInput {
  return {
    latitude: normalizeLatitude(input.latitude ?? UK_POLICE_DEFAULT_LATITUDE),
    longitude: normalizeLongitude(input.longitude ?? UK_POLICE_DEFAULT_LONGITUDE),
    date: normalizeOptionalMonth(input.date),
    category: normalizeCategory(input.category ?? UK_POLICE_DEFAULT_CATEGORY),
    limit: normalizeInteger(
      input.limit,
      UK_POLICE_DEFAULT_LIMIT,
      1,
      UK_POLICE_MAX_LIMIT,
      '--limit',
    ),
  }
}

function parseStreetCrime(value: unknown): UkPoliceStreetCrime | undefined {
  if (
    !isRecord(value) ||
    typeof value.id !== 'number' ||
    typeof value.category !== 'string' ||
    typeof value.month !== 'string'
  ) {
    return undefined
  }

  const location = isRecord(value.location) ? parseLocation(value.location) : undefined
  const outcomeStatus = isRecord(value.outcome_status)
    ? parseOutcomeStatus(value.outcome_status)
    : undefined
  return {
    id: value.id,
    category: value.category,
    month: value.month,
    locationType: readString(value.location_type),
    locationSubtype: readString(value.location_subtype),
    location,
    outcomeStatus,
    context: readString(value.context),
    persistentIdPresent: typeof value.persistent_id === 'string' &&
      value.persistent_id.trim() !== '',
  }
}

function parseLocation(
  value: Record<string, unknown>,
): UkPoliceCrimeLocation | undefined {
  const street = isRecord(value.street) ? value.street : {}
  const location: UkPoliceCrimeLocation = {}
  const latitude = parseNumericString(value.latitude)
  const longitude = parseNumericString(value.longitude)
  if (latitude !== undefined) location.latitude = latitude
  if (longitude !== undefined) location.longitude = longitude
  if (typeof street.id === 'number') location.streetId = street.id
  if (typeof street.name === 'string' && street.name.trim() !== '') {
    location.streetName = street.name.trim()
  }
  return Object.keys(location).length > 0 ? location : undefined
}

function parseOutcomeStatus(
  value: Record<string, unknown>,
): UkPoliceCrimeOutcome | undefined {
  const outcome: UkPoliceCrimeOutcome = {}
  const category = readString(value.category)
  const date = readString(value.date)
  if (category !== undefined) outcome.category = category
  if (date !== undefined) outcome.date = date
  return Object.keys(outcome).length > 0 ? outcome : undefined
}

function readLatestKnownDate(crimes: UkPoliceStreetCrime[]): string | undefined {
  const months = crimes
    .map(crime => crime.month)
    .filter(month => /^\d{4}-\d{2}$/u.test(month))
    .sort()
  return months.at(-1)
}

function normalizeCategory(value: string): UkPoliceCrimeCategory {
  const normalized = value.trim().toLowerCase()
  if (!allowedCategories.includes(normalized as UkPoliceCrimeCategory)) {
    throw new RuntimeFailure(
      'INVALID_ARGUMENT',
      `--category must be one of: ${allowedCategories.join(', ')}.`,
    )
  }
  return normalized as UkPoliceCrimeCategory
}

function normalizeLatitude(value: number): number {
  if (!Number.isFinite(value) || value < -90 || value > 90) {
    throw new RuntimeFailure(
      'INVALID_ARGUMENT',
      '--latitude must be a number between -90 and 90.',
    )
  }
  return value
}

function normalizeLongitude(value: number): number {
  if (!Number.isFinite(value) || value < -180 || value > 180) {
    throw new RuntimeFailure(
      'INVALID_ARGUMENT',
      '--longitude must be a number between -180 and 180.',
    )
  }
  return value
}

function normalizeOptionalMonth(value: string | undefined): string | undefined {
  if (value === undefined || value.trim() === '') {
    return undefined
  }
  const normalized = value.trim()
  if (!/^\d{4}-(0[1-9]|1[0-2])$/u.test(normalized)) {
    throw new RuntimeFailure(
      'INVALID_ARGUMENT',
      '--date must use YYYY-MM format, such as 2024-01.',
    )
  }
  return normalized
}

function normalizeInteger(
  value: number | undefined,
  fallback: number,
  min: number,
  max: number,
  label: string,
): number {
  const parsed = value ?? fallback
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    throw new RuntimeFailure(
      'INVALID_ARGUMENT',
      `${label} must be an integer between ${String(min)} and ${String(max)}.`,
    )
  }
  return parsed
}

function parseNumericString(value: unknown): number | undefined {
  if (typeof value !== 'string' && typeof value !== 'number') {
    return undefined
  }
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function isCloudflareChallenge(response: Response, body: string): boolean {
  const server = response.headers.get('server')?.toLowerCase() ?? ''
  const mitigated = response.headers.get('cf-mitigated')?.toLowerCase() ?? ''
  const contentType = response.headers.get('content-type')?.toLowerCase() ?? ''
  const normalizedBody = body.toLowerCase()
  return (
    (response.status === 403 || response.status === 429) &&
    contentType.includes('text/html') &&
    (
      mitigated === 'challenge' ||
      server.includes('cloudflare') ||
      normalizedBody.includes('just a moment') ||
      normalizedBody.includes('captcha') ||
      normalizedBody.includes('waf')
    )
  )
}
