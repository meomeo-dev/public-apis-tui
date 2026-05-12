import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export const SPACEX_DEFAULT_BASE_URL = 'https://api.spacexdata.com'

export type SpaceXClientOptions = {
  baseUrl?: string | undefined
  fetchImpl?: typeof fetch | undefined
}

export type SpaceXLaunchesQuery = {
  name?: string | undefined
  upcoming?: boolean | undefined
  success?: boolean | undefined
  rocket?: string | undefined
  launchpad?: string | undefined
  start?: string | undefined
  end?: string | undefined
  sort: SpaceXLaunchSort
  limit: number
  page: number
}

export type SpaceXLaunchSort =
  | 'date-desc'
  | 'date-asc'
  | 'flight-desc'
  | 'flight-asc'

export type SpaceXCompany = {
  id: string
  name: string
  founder?: string | undefined
  founded?: number | undefined
  employees?: number | undefined
  vehicles?: number | undefined
  launchSites?: number | undefined
  testSites?: number | undefined
  ceo?: string | undefined
  cto?: string | undefined
  coo?: string | undefined
  ctoPropulsion?: string | undefined
  valuation?: number | undefined
  summary?: string | undefined
  headquarters?: SpaceXHeadquarters | undefined
  links: SpaceXLinks
}

export type SpaceXHeadquarters = {
  address?: string | undefined
  city?: string | undefined
  state?: string | undefined
}

export type SpaceXLinks = {
  website?: string | undefined
  flickr?: string | undefined
  twitter?: string | undefined
  elonTwitter?: string | undefined
  wikipedia?: string | undefined
  webcast?: string | undefined
  youtubeId?: string | undefined
  article?: string | undefined
  patchSmall?: string | undefined
}

export type SpaceXRocket = {
  id: string
  name: string
  type?: string | undefined
  active?: boolean | undefined
  stages?: number | undefined
  boosters?: number | undefined
  costPerLaunch?: number | undefined
  successRatePct?: number | undefined
  firstFlight?: string | undefined
  country?: string | undefined
  company?: string | undefined
  wikipedia?: string | undefined
  description?: string | undefined
  heightMeters?: number | undefined
  diameterMeters?: number | undefined
  massKg?: number | undefined
  engineCount?: number | undefined
  engineType?: string | undefined
  engineVersion?: string | undefined
  propellants: string[]
  payloadWeights: SpaceXPayloadWeight[]
  imageCount: number
}

export type SpaceXPayloadWeight = {
  id?: string | undefined
  name?: string | undefined
  kg?: number | undefined
}

export type SpaceXLaunchpad = {
  id: string
  name: string
  fullName?: string | undefined
  locality?: string | undefined
  region?: string | undefined
  timezone?: string | undefined
  latitude?: number | undefined
  longitude?: number | undefined
  status?: string | undefined
  launchAttempts?: number | undefined
  launchSuccesses?: number | undefined
  rocketIds: string[]
  launchCount: number
  imageCount: number
}

export type SpaceXLaunch = {
  id: string
  name: string
  flightNumber?: number | undefined
  dateUtc?: string | undefined
  dateLocal?: string | undefined
  datePrecision?: string | undefined
  upcoming?: boolean | undefined
  success?: boolean | undefined
  rocketId?: string | undefined
  launchpadId?: string | undefined
  details?: string | undefined
  links: SpaceXLinks
  failureReasons: string[]
  crewCount: number
  shipCount: number
  capsuleCount: number
  payloadCount: number
}

export type SpaceXQueryPage<TItem> = {
  totalDocs: number
  returned: number
  limit: number
  page: number
  totalPages: number
  hasPrevPage: boolean
  hasNextPage: boolean
  prevPage?: number | undefined
  nextPage?: number | undefined
  docs: TItem[]
}

export class SpaceXClient {
  private readonly baseUrl: string
  private readonly fetchImpl: typeof fetch

  constructor(options: SpaceXClientOptions = {}) {
    this.baseUrl = normalizeBaseUrl(options.baseUrl ?? SPACEX_DEFAULT_BASE_URL)
    this.fetchImpl = options.fetchImpl ?? fetch
  }

  async getCompany(): Promise<SpaceXCompany> {
    return parseCompany(await this.requestJson('GET', '/v4/company'))
  }

  async listRockets(): Promise<SpaceXRocket[]> {
    const parsed = await this.requestJson('GET', '/v4/rockets')
    if (!Array.isArray(parsed)) {
      throw new RuntimeFailure(
        'OPEN_API_FAILED',
        'SpaceX rockets response did not match the expected array shape.',
        { provider: 'spacex' },
      )
    }
    return parsed.map(parseRocket).filter(isDefined)
  }

  async listLaunchpads(): Promise<SpaceXLaunchpad[]> {
    const parsed = await this.requestJson('GET', '/v4/launchpads')
    if (!Array.isArray(parsed)) {
      throw new RuntimeFailure(
        'OPEN_API_FAILED',
        'SpaceX launchpads response did not match the expected array shape.',
        { provider: 'spacex' },
      )
    }
    return parsed.map(parseLaunchpad).filter(isDefined)
  }

  async queryLaunches(
    query: SpaceXLaunchesQuery,
  ): Promise<SpaceXQueryPage<SpaceXLaunch>> {
    const parsed = await this.requestJson(
      'POST',
      '/v5/launches/query',
      buildLaunchesQueryBody(query),
    )
    return parseQueryPage(parsed, parseLaunch)
  }

  private async requestJson(
    method: 'GET' | 'POST',
    pathname: string,
    body?: Record<string, unknown> | undefined,
  ): Promise<unknown> {
    const url = new URL(pathname, this.baseUrl)
    let response: Response
    try {
      response = await this.fetchImpl(url, {
        method,
        headers: {
          accept: 'application/json',
          ...(body === undefined ? {} : { 'content-type': 'application/json' }),
          'user-agent': 'public-apis-tui no-auth CLI',
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      })
    } catch (error) {
      throw new RuntimeFailure(
        'OPEN_API_FAILED',
        `SpaceX request failed: ${String(error)}`,
        { provider: 'spacex', url: url.toString() },
      )
    }

    const text = await response.text()

    if (isCloudflareChallenge(response, text)) {
      throw new RuntimeFailure(
        'OPEN_API_FAILED',
        [
          'SpaceX is currently returning a Cloudflare challenge HTML page',
          'instead of the documented JSON API response; retry later or use',
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
        'SpaceX response was not JSON.',
        {
          ...details,
          preview: text.slice(0, 160),
        },
      )
    }

    if (!response.ok) {
      throw new RuntimeFailure(
        'OPEN_API_FAILED',
        readErrorMessage(parsed)
          ?? `SpaceX request failed with HTTP ${response.status}.`,
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
    provider: 'spacex',
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

function buildLaunchesQueryBody(query: SpaceXLaunchesQuery): Record<string, unknown> {
  const where: Record<string, unknown> = {}
  if (query.name !== undefined) {
    where.name = { $regex: escapeRegex(query.name), $options: 'i' }
  }
  if (query.upcoming !== undefined) where.upcoming = query.upcoming
  if (query.success !== undefined) where.success = query.success
  if (query.rocket !== undefined) where.rocket = query.rocket
  if (query.launchpad !== undefined) where.launchpad = query.launchpad
  const dateRange: Record<string, string> = {}
  if (query.start !== undefined) dateRange.$gte = query.start
  if (query.end !== undefined) dateRange.$lte = query.end
  if (Object.keys(dateRange).length > 0) where.date_utc = dateRange

  return {
    query: where,
    options: {
      limit: query.limit,
      page: query.page,
      sort: buildSort(query.sort),
    },
  }
}

function buildSort(sort: SpaceXLaunchSort): Record<string, 'asc' | 'desc'> {
  switch (sort) {
    case 'date-asc':
      return { date_utc: 'asc' }
    case 'flight-desc':
      return { flight_number: 'desc' }
    case 'flight-asc':
      return { flight_number: 'asc' }
    case 'date-desc':
      return { date_utc: 'desc' }
  }
}

function parseCompany(value: unknown): SpaceXCompany {
  if (!isRecord(value)) {
    throw new RuntimeFailure(
      'OPEN_API_FAILED',
      'SpaceX company response did not match the expected object shape.',
      { provider: 'spacex' },
    )
  }
  const id = readString(value.id)
  const name = readString(value.name)
  if (id === undefined || name === undefined) {
    throw new RuntimeFailure(
      'OPEN_API_FAILED',
      'SpaceX company response is missing id or name.',
      { provider: 'spacex' },
    )
  }
  return {
    id,
    name,
    founder: readString(value.founder),
    founded: readNumber(value.founded),
    employees: readNumber(value.employees),
    vehicles: readNumber(value.vehicles),
    launchSites: readNumber(value.launch_sites),
    testSites: readNumber(value.test_sites),
    ceo: readString(value.ceo),
    cto: readString(value.cto),
    coo: readString(value.coo),
    ctoPropulsion: readString(value.cto_propulsion),
    valuation: readNumber(value.valuation),
    summary: readString(value.summary),
    headquarters: parseHeadquarters(value.headquarters),
    links: parseLinks(value.links),
  }
}

function parseRocket(value: unknown): SpaceXRocket | undefined {
  if (!isRecord(value)) return undefined
  const id = readString(value.id)
  const name = readString(value.name)
  if (id === undefined || name === undefined) return undefined
  const engines = isRecord(value.engines) ? value.engines : {}
  return {
    id,
    name,
    type: readString(value.type),
    active: readBoolean(value.active),
    stages: readNumber(value.stages),
    boosters: readNumber(value.boosters),
    costPerLaunch: readNumber(value.cost_per_launch),
    successRatePct: readNumber(value.success_rate_pct),
    firstFlight: readString(value.first_flight),
    country: readString(value.country),
    company: readString(value.company),
    wikipedia: readString(value.wikipedia),
    description: readString(value.description),
    heightMeters: readNestedNumber(value.height, 'meters'),
    diameterMeters: readNestedNumber(value.diameter, 'meters'),
    massKg: readNestedNumber(value.mass, 'kg'),
    engineCount: readNumber(engines.number),
    engineType: readString(engines.type),
    engineVersion: readString(engines.version),
    propellants: [
      readString(engines.propellant_1),
      readString(engines.propellant_2),
    ].filter(isDefined),
    payloadWeights: readArray(value.payload_weights)
      .map(parsePayloadWeight)
      .filter(isDefined),
    imageCount: readArray(value.flickr_images).length,
  }
}

function parsePayloadWeight(value: unknown): SpaceXPayloadWeight | undefined {
  if (!isRecord(value)) return undefined
  return {
    id: readString(value.id),
    name: readString(value.name),
    kg: readNumber(value.kg),
  }
}

function parseLaunchpad(value: unknown): SpaceXLaunchpad | undefined {
  if (!isRecord(value)) return undefined
  const id = readString(value.id)
  const name = readString(value.name)
  if (id === undefined || name === undefined) return undefined
  const largeImages = isRecord(value.images) ? readArray(value.images.large) : []
  return {
    id,
    name,
    fullName: readString(value.full_name),
    locality: readString(value.locality),
    region: readString(value.region),
    timezone: readString(value.timezone),
    latitude: readNumber(value.latitude),
    longitude: readNumber(value.longitude),
    status: readString(value.status),
    launchAttempts: readNumber(value.launch_attempts),
    launchSuccesses: readNumber(value.launch_successes),
    rocketIds: readArray(value.rockets).map(readString).filter(isDefined),
    launchCount: readArray(value.launches).length,
    imageCount: largeImages.length,
  }
}

function parseLaunch(value: unknown): SpaceXLaunch | undefined {
  if (!isRecord(value)) return undefined
  const id = readString(value.id)
  const name = readString(value.name)
  if (id === undefined || name === undefined) return undefined
  return {
    id,
    name,
    flightNumber: readNumber(value.flight_number),
    dateUtc: readString(value.date_utc),
    dateLocal: readString(value.date_local),
    datePrecision: readString(value.date_precision),
    upcoming: readBoolean(value.upcoming),
    success: readBoolean(value.success),
    rocketId: readString(value.rocket),
    launchpadId: readString(value.launchpad),
    details: readString(value.details),
    links: parseLinks(value.links),
    failureReasons: readArray(value.failures)
      .map(item => (isRecord(item) ? readString(item.reason) : undefined))
      .filter(isDefined),
    crewCount: readArray(value.crew).length,
    shipCount: readArray(value.ships).length,
    capsuleCount: readArray(value.capsules).length,
    payloadCount: readArray(value.payloads).length,
  }
}

function parseQueryPage<TItem>(
  value: unknown,
  parseItem: (value: unknown) => TItem | undefined,
): SpaceXQueryPage<TItem> {
  if (!isRecord(value) || !Array.isArray(value.docs)) {
    throw new RuntimeFailure(
      'OPEN_API_FAILED',
      'SpaceX query response did not match the expected page shape.',
      { provider: 'spacex' },
    )
  }
  const docs = value.docs.map(parseItem).filter(isDefined)
  return {
    totalDocs: readNumber(value.totalDocs) ?? docs.length,
    returned: docs.length,
    limit: readNumber(value.limit) ?? docs.length,
    page: readNumber(value.page) ?? 1,
    totalPages: readNumber(value.totalPages) ?? 1,
    hasPrevPage: readBoolean(value.hasPrevPage) ?? false,
    hasNextPage: readBoolean(value.hasNextPage) ?? false,
    prevPage: readNumber(value.prevPage),
    nextPage: readNumber(value.nextPage),
    docs,
  }
}

function parseHeadquarters(value: unknown): SpaceXHeadquarters | undefined {
  if (!isRecord(value)) return undefined
  return {
    address: readString(value.address),
    city: readString(value.city),
    state: readString(value.state),
  }
}

function parseLinks(value: unknown): SpaceXLinks {
  if (!isRecord(value)) return {}
  const patch = isRecord(value.patch) ? value.patch : {}
  return {
    website: readString(value.website),
    flickr: readString(value.flickr),
    twitter: readString(value.twitter),
    elonTwitter: readString(value.elon_twitter),
    wikipedia: readString(value.wikipedia),
    webcast: readString(value.webcast),
    youtubeId: readString(value.youtube_id),
    article: readString(value.article),
    patchSmall: readString(patch.small),
  }
}

function readErrorMessage(value: unknown): string | undefined {
  if (!isRecord(value)) return undefined
  return readString(value.error) ?? readString(value.message)
}

function readNestedNumber(value: unknown, key: string): number | undefined {
  return isRecord(value) ? readNumber(value[key]) : undefined
}

function readArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() !== '' ? value : undefined
}

function readNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

function readBoolean(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function isDefined<TValue>(value: TValue | undefined): value is TValue {
  return value !== undefined
}

function normalizeBaseUrl(value: string): string {
  return value.endsWith('/') ? value : `${value}/`
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')
}
