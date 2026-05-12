import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export const WORLD_BANK_DEFAULT_BASE_URL = 'https://api.worldbank.org/v2'
export const WORLD_BANK_DEFAULT_COUNTRY = 'US'
export const WORLD_BANK_DEFAULT_INDICATOR = 'SP.POP.TOTL'
export const WORLD_BANK_DEFAULT_DATE = '2020:2022'
export const WORLD_BANK_DEFAULT_PER_PAGE = 20
export const WORLD_BANK_MAX_PER_PAGE = 100
export const WORLD_BANK_MAX_PAGE = 1000

export type WorldBankPagination = {
  page: number
  pages: number
  perPage: number
  total: number
  sourceId?: string | undefined
  lastUpdated?: string | undefined
}

export type WorldBankCountry = {
  id: string
  iso2Code: string
  name: string
  region: WorldBankLabeledCode
  adminRegion?: WorldBankLabeledCode | undefined
  incomeLevel: WorldBankLabeledCode
  lendingType: WorldBankLabeledCode
  capitalCity?: string | undefined
  longitude?: number | undefined
  latitude?: number | undefined
}

export type WorldBankIndicatorPoint = {
  indicatorId: string
  indicatorName: string
  countryId: string
  countryName: string
  countryIso3Code?: string | undefined
  date: string
  value?: number | undefined
  unit?: string | undefined
  obsStatus?: string | undefined
  decimal?: number | undefined
}

export type WorldBankIndicatorMetadata = {
  id: string
  name: string
  unit?: string | undefined
  source?: WorldBankLabeledCode | undefined
  sourceNote?: string | undefined
  sourceOrganization?: string | undefined
  topics: WorldBankLabeledCode[]
}

export type WorldBankLabeledCode = {
  id: string
  value: string
  iso2Code?: string | undefined
}

export type WorldBankCountriesResponse = {
  pagination: WorldBankPagination
  countries: WorldBankCountry[]
}

export type WorldBankIndicatorSeriesResponse = {
  pagination: WorldBankPagination
  points: WorldBankIndicatorPoint[]
}

export type WorldBankIndicatorMetadataResponse = {
  pagination: WorldBankPagination
  indicators: WorldBankIndicatorMetadata[]
}

export type WorldBankCountriesQuery = {
  page: number
  perPage: number
}

export type WorldBankIndicatorQuery = {
  country: string
  indicator: string
  date: string
  page: number
  perPage: number
}

export class WorldBankClient {
  constructor(
    private readonly baseUrl = WORLD_BANK_DEFAULT_BASE_URL,
    private readonly fetchImpl: typeof fetch = globalThis.fetch,
  ) {}

  async listCountries(
    query: WorldBankCountriesQuery,
  ): Promise<WorldBankCountriesResponse> {
    const url = this.createUrl('/country')
    url.searchParams.set('format', 'json')
    url.searchParams.set('page', String(query.page))
    url.searchParams.set('per_page', String(query.perPage))
    const parsed = await this.fetchJson(url)
    const { pagination, items } = parsePagedArray(parsed, 'World Bank countries')
    return {
      pagination,
      countries: items.map(parseCountry).filter((item): item is WorldBankCountry => {
        return item !== undefined
      }),
    }
  }

  async getIndicatorSeries(
    query: WorldBankIndicatorQuery,
  ): Promise<WorldBankIndicatorSeriesResponse> {
    const url = this.createUrl(`/country/${query.country}/indicator/${query.indicator}`)
    url.searchParams.set('format', 'json')
    url.searchParams.set('date', query.date)
    url.searchParams.set('page', String(query.page))
    url.searchParams.set('per_page', String(query.perPage))
    const parsed = await this.fetchJson(url)
    const { pagination, items } = parsePagedArray(parsed, 'World Bank indicator')
    return {
      pagination,
      points: items
        .map(parseIndicatorPoint)
        .filter((item): item is WorldBankIndicatorPoint => item !== undefined),
    }
  }

  async getIndicatorMetadata(
    indicator: string,
  ): Promise<WorldBankIndicatorMetadataResponse> {
    const url = this.createUrl(`/indicator/${indicator}`)
    url.searchParams.set('format', 'json')
    url.searchParams.set('per_page', '1')
    const parsed = await this.fetchJson(url)
    const { pagination, items } = parsePagedArray(
      parsed,
      'World Bank indicator metadata',
    )
    return {
      pagination,
      indicators: items
        .map(parseIndicatorMetadata)
        .filter((item): item is WorldBankIndicatorMetadata => item !== undefined),
    }
  }

  private createUrl(path: string): URL {
    return new URL(`${normalizeBaseUrl(this.baseUrl)}${path}`)
  }

  private async fetchJson(url: URL): Promise<unknown> {
    let response: Response
    try {
      response = await this.fetchImpl(url, {
        method: 'GET',
        headers: {
          accept: 'application/json',
          'user-agent': 'public-apis-cli no-auth CLI',
        },
      })
    } catch (error) {
      throw new RuntimeFailure(
        'OPEN_API_FAILED',
        `World Bank request failed: ${String(error)}`,
        { provider: 'worldbank', url: url.toString() },
      )
    }

    const text = await response.text()
    if (isChallengeResponse(response, text)) {
      throw new RuntimeFailure(
        'OPEN_API_FAILED',
        [
          'World Bank is currently returning a challenge HTML page instead',
          'of the documented JSON API response; retry later or use',
          'cached/offline data.',
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
        'World Bank response was not JSON.',
        {
          ...details,
          preview: text.slice(0, 120),
        },
      )
    }

    if (!response.ok) {
      throw new RuntimeFailure(
        'OPEN_API_FAILED',
        `World Bank request failed with HTTP ${response.status}.`,
        {
          ...details,
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
    provider: 'worldbank',
    status: response.status,
    statusText: response.statusText,
    contentType: response.headers.get('content-type') ?? undefined,
    url: url.toString(),
  }
}

function isChallengeResponse(response: Response, body: string): boolean {
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
      || /captcha|access denied|attention required/i.test(body)
    )
  )
}

export function normalizeWorldBankCountry(value: string | undefined): string {
  const normalized = (value ?? WORLD_BANK_DEFAULT_COUNTRY).trim().toUpperCase()
  if (/^[A-Z0-9]{2,3}$/u.test(normalized)) return normalized
  throw new RuntimeFailure(
    'INVALID_ARGUMENT',
    'World Bank --country must be a 2-3 character ISO or aggregate code.',
    { country: value },
  )
}

export function normalizeWorldBankIndicator(value: string | undefined): string {
  const normalized = (value ?? WORLD_BANK_DEFAULT_INDICATOR).trim().toUpperCase()
  if (/^[A-Z0-9_.-]{2,80}$/u.test(normalized) && !normalized.includes('..')) {
    return normalized
  }
  throw new RuntimeFailure(
    'INVALID_ARGUMENT',
    'World Bank --indicator must be a 2-80 character indicator code.',
    { indicator: value },
  )
}

export function normalizeWorldBankDate(value: string | undefined): string {
  const normalized = (value ?? WORLD_BANK_DEFAULT_DATE).trim()
  if (/^\d{4}$/u.test(normalized)) return normalized
  if (/^\d{4}:\d{4}$/u.test(normalized)) {
    const [startRaw, endRaw] = normalized.split(':')
    const start = Number(startRaw)
    const end = Number(endRaw)
    if (start <= end && end - start <= 60) return normalized
  }
  throw new RuntimeFailure(
    'INVALID_ARGUMENT',
    'World Bank --date must be YYYY or YYYY:YYYY with a range up to 60 years.',
    { date: value },
  )
}

export function normalizeWorldBankPage(value: number | undefined): number {
  const page = value ?? 1
  if (Number.isInteger(page) && page >= 1 && page <= WORLD_BANK_MAX_PAGE) {
    return page
  }
  throw new RuntimeFailure(
    'INVALID_ARGUMENT',
    `World Bank --page must be between 1 and ${String(WORLD_BANK_MAX_PAGE)}.`,
    { page: value },
  )
}

export function normalizeWorldBankPerPage(value: number | undefined): number {
  const perPage = value ?? WORLD_BANK_DEFAULT_PER_PAGE
  if (
    Number.isInteger(perPage) &&
    perPage >= 1 &&
    perPage <= WORLD_BANK_MAX_PER_PAGE
  ) {
    return perPage
  }
  throw new RuntimeFailure(
    'INVALID_ARGUMENT',
    `World Bank --per-page must be between 1 and ${String(WORLD_BANK_MAX_PER_PAGE)}.`,
    { perPage: value },
  )
}

function parsePagedArray(value: unknown, label: string): {
  pagination: WorldBankPagination
  items: unknown[]
} {
  if (!Array.isArray(value) || !isRecord(value[0])) {
    throw new RuntimeFailure(
      'OPEN_API_FAILED',
      `${label} response had an unexpected schema.`,
    )
  }

  const message = readWorldBankMessage(value[0])
  if (message !== undefined) {
    throw new RuntimeFailure('OPEN_API_FAILED', message, { provider: 'worldbank' })
  }

  const pagination = parsePagination(value[0])
  const items = Array.isArray(value[1]) ? value[1] : []
  return { pagination, items }
}

function parsePagination(value: Record<string, unknown>): WorldBankPagination {
  return {
    page: readNumber(value.page) ?? 1,
    pages: readNumber(value.pages) ?? 1,
    perPage: readNumber(value.per_page) ?? WORLD_BANK_DEFAULT_PER_PAGE,
    total: readNumber(value.total) ?? 0,
    sourceId: readString(value.sourceid),
    lastUpdated: readString(value.lastupdated),
  }
}

function parseCountry(value: unknown): WorldBankCountry | undefined {
  if (!isRecord(value)) return undefined
  const id = readString(value.id)
  const iso2Code = readString(value.iso2Code)
  const name = readString(value.name)
  const region = parseLabeledCode(value.region)
  const incomeLevel = parseLabeledCode(value.incomeLevel)
  const lendingType = parseLabeledCode(value.lendingType)
  if (
    id === undefined ||
    iso2Code === undefined ||
    name === undefined ||
    region === undefined ||
    incomeLevel === undefined ||
    lendingType === undefined
  ) {
    return undefined
  }
  return {
    id,
    iso2Code,
    name,
    region,
    adminRegion: parseLabeledCode(value.adminregion),
    incomeLevel,
    lendingType,
    capitalCity: readString(value.capitalCity),
    longitude: readFloatString(value.longitude),
    latitude: readFloatString(value.latitude),
  }
}

function parseIndicatorPoint(value: unknown): WorldBankIndicatorPoint | undefined {
  if (!isRecord(value)) return undefined
  const indicator = parseLabeledCode(value.indicator)
  const country = parseLabeledCode(value.country)
  const date = readString(value.date)
  if (indicator === undefined || country === undefined || date === undefined) {
    return undefined
  }
  return {
    indicatorId: indicator.id,
    indicatorName: indicator.value,
    countryId: country.id,
    countryName: country.value,
    countryIso3Code: readString(value.countryiso3code),
    date,
    value: readNumber(value.value),
    unit: readString(value.unit),
    obsStatus: readString(value.obs_status),
    decimal: readNumber(value.decimal),
  }
}

function parseIndicatorMetadata(
  value: unknown,
): WorldBankIndicatorMetadata | undefined {
  if (!isRecord(value)) return undefined
  const id = readString(value.id)
  const name = readString(value.name)
  if (id === undefined || name === undefined) return undefined
  return {
    id,
    name,
    unit: readString(value.unit),
    source: parseLabeledCode(value.source),
    sourceNote: readString(value.sourceNote),
    sourceOrganization: readString(value.sourceOrganization),
    topics: Array.isArray(value.topics)
      ? value.topics.map(parseLabeledCode).filter(isDefined)
      : [],
  }
}

function parseLabeledCode(value: unknown): WorldBankLabeledCode | undefined {
  if (!isRecord(value)) return undefined
  const label = readString(value.value)
  const id = readString(value.id) ?? readString(value.iso2code) ?? label
  if (id === undefined || label === undefined) return undefined
  return {
    id,
    value: label,
    iso2Code: readString(value.iso2code),
  }
}

function readWorldBankMessage(value: Record<string, unknown>): string | undefined {
  if (!Array.isArray(value.message)) return undefined
  const messages = value.message.filter(isRecord).map(message => {
    return [message.key, message.value]
      .filter((part): part is string => typeof part === 'string' && part !== '')
      .join(': ')
  }).filter(message => message !== '')
  return messages.length > 0 ? messages.join('; ') : 'World Bank returned an error.'
}

function readNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : undefined
  }
  return undefined
}

function readFloatString(value: unknown): number | undefined {
  if (typeof value !== 'string' || value.trim() === '') return undefined
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() !== ''
    ? value.trim()
    : undefined
}

function isDefined<TValue>(value: TValue | undefined): value is TValue {
  return value !== undefined
}

function normalizeBaseUrl(value: string): string {
  return value.replace(/\/+$/u, '')
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}
