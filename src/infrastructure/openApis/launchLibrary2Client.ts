import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export const LAUNCH_LIBRARY2_DEFAULT_BASE_URL = 'https://ll.thespacedevs.com/2.3.0'

export type LaunchLibrary2ListParams = {
  limit: number
  offset: number
  ordering: string
  search?: string | undefined
  start?: string | undefined
  end?: string | undefined
  lsp?: string | undefined
  hideRecentPrevious?: boolean | undefined
}

export type LaunchLibrary2Agency = {
  name: string
  abbrev?: string | undefined
  type?: string | undefined
}

export type LaunchLibrary2Location = {
  name: string
  country?: string | undefined
  latitude?: number | undefined
  longitude?: number | undefined
}

export type LaunchLibrary2Launch = {
  id: string
  name: string
  url: string
  slug?: string | undefined
  status?: { name: string; abbrev?: string | undefined } | undefined
  net?: string | undefined
  windowStart?: string | undefined
  windowEnd?: string | undefined
  lastUpdated?: string | undefined
  probability?: number | undefined
  webcastLive?: boolean | undefined
  launchServiceProvider?: LaunchLibrary2Agency | undefined
  rocket?: { name: string; family?: string | undefined } | undefined
  mission?: {
    name: string
    type?: string | undefined
    orbit?: string | undefined
    description?: string | undefined
  } | undefined
  pad?: {
    name: string
    location?: LaunchLibrary2Location | undefined
    mapUrl?: string | undefined
  } | undefined
}

export type LaunchLibrary2Event = {
  id: number
  name: string
  url: string
  slug?: string | undefined
  date?: string | undefined
  type?: string | undefined
  location?: string | undefined
  description?: string | undefined
  webcastLive?: boolean | undefined
  lastUpdated?: string | undefined
  videoUrls: Array<{
    title?: string | undefined
    publisher?: string | undefined
    url: string
    startTime?: string | undefined
    live?: boolean | undefined
  }>
}

export type LaunchLibrary2Envelope<TItem> = {
  count: number
  next?: string | undefined
  previous?: string | undefined
  results: TItem[]
}

export class LaunchLibrary2Client {
  constructor(
    private readonly baseUrl = LAUNCH_LIBRARY2_DEFAULT_BASE_URL,
    private readonly fetchImpl: typeof fetch = globalThis.fetch,
  ) {}

  async listUpcomingLaunches(
    params: LaunchLibrary2ListParams,
  ): Promise<LaunchLibrary2Envelope<LaunchLibrary2Launch>> {
    const url = this.createUrl('launches/upcoming/')
    appendListParams(url, params)
    if (params.start !== undefined) url.searchParams.set('net__gte', params.start)
    if (params.end !== undefined) url.searchParams.set('net__lte', params.end)
    if (params.lsp !== undefined) url.searchParams.set('lsp__name', params.lsp)

    return parseEnvelope(await this.fetchJson(url), parseLaunch)
  }

  async listUpcomingEvents(
    params: LaunchLibrary2ListParams,
  ): Promise<LaunchLibrary2Envelope<LaunchLibrary2Event>> {
    const url = this.createUrl('events/upcoming/')
    appendListParams(url, params)
    if (params.start !== undefined) url.searchParams.set('date__gte', params.start)
    if (params.end !== undefined) url.searchParams.set('date__lte', params.end)
    if (params.hideRecentPrevious !== undefined) {
      url.searchParams.set('hide_recent_previous', String(params.hideRecentPrevious))
    }

    return parseEnvelope(await this.fetchJson(url), parseEvent)
  }

  private createUrl(pathname: string): URL {
    return new URL(pathname, normalizeBaseUrl(this.baseUrl))
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
        `Launch Library 2 request failed: ${String(error)}`,
        { provider: 'launchlibrary2', url: url.toString() },
      )
    }

    const text = await response.text()

    if (isCloudflareChallenge(response, text)) {
      throw new RuntimeFailure(
        'OPEN_API_FAILED',
        [
          'Launch Library 2 is currently returning a Cloudflare challenge',
          'HTML page instead of the documented JSON API response; retry',
          'later or use cached/offline data.',
        ].join(' '),
        createResponseDetails(response, url),
      )
    }

    let parsed: unknown
    try {
      parsed = JSON.parse(text) as unknown
    } catch {
      throw new RuntimeFailure(
        'OPEN_API_FAILED',
        'Launch Library 2 response was not JSON.',
        {
          ...createResponseDetails(response, url),
          preview: text.slice(0, 120),
        },
      )
    }

    if (!response.ok) {
      throw new RuntimeFailure(
        'OPEN_API_FAILED',
        `Launch Library 2 request failed with HTTP ${response.status}.`,
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
    provider: 'launchlibrary2',
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

function appendListParams(url: URL, params: LaunchLibrary2ListParams): void {
  url.searchParams.set('limit', String(params.limit))
  url.searchParams.set('offset', String(params.offset))
  url.searchParams.set('ordering', params.ordering)
  url.searchParams.set('mode', 'normal')
  if (params.search !== undefined) url.searchParams.set('search', params.search)
}

function parseEnvelope<TItem>(
  value: unknown,
  parseItem: (value: unknown) => TItem | undefined,
): LaunchLibrary2Envelope<TItem> {
  if (
    !isRecord(value) ||
    typeof value.count !== 'number' ||
    !Array.isArray(value.results)
  ) {
    throw new RuntimeFailure(
      'OPEN_API_FAILED',
      'Launch Library 2 list response had an unexpected schema.',
    )
  }
  const next = readString(value.next)
  const previous = readString(value.previous)
  return {
    count: value.count,
    ...(next !== undefined ? { next } : {}),
    ...(previous !== undefined ? { previous } : {}),
    results: value.results
      .map(parseItem)
      .filter((item): item is TItem => item !== undefined),
  }
}

function parseLaunch(value: unknown): LaunchLibrary2Launch | undefined {
  if (!isRecord(value)) return undefined
  const id = readString(value.id)
  const name = readString(value.name)
  const url = readString(value.url)
  if (id === undefined || name === undefined || url === undefined) return undefined

  const slug = readString(value.slug)
  const status = parseNamedObject(value.status)
  const net = readString(value.net)
  const windowStart = readString(value.window_start)
  const windowEnd = readString(value.window_end)
  const lastUpdated = readString(value.last_updated)
  const probability = readNumber(value.probability)
  const webcastLive = readBoolean(value.webcast_live)
  const launchServiceProvider = parseAgency(value.launch_service_provider)
  const rocket = parseRocket(value.rocket)
  const mission = parseMission(value.mission)
  const pad = parsePad(value.pad)

  return {
    id,
    name,
    url,
    ...(slug !== undefined ? { slug } : {}),
    ...(status !== undefined ? { status } : {}),
    ...(net !== undefined ? { net } : {}),
    ...(windowStart !== undefined ? { windowStart } : {}),
    ...(windowEnd !== undefined ? { windowEnd } : {}),
    ...(lastUpdated !== undefined ? { lastUpdated } : {}),
    ...(probability !== undefined ? { probability } : {}),
    ...(webcastLive !== undefined ? { webcastLive } : {}),
    ...(launchServiceProvider !== undefined ? { launchServiceProvider } : {}),
    ...(rocket !== undefined ? { rocket } : {}),
    ...(mission !== undefined ? { mission } : {}),
    ...(pad !== undefined ? { pad } : {}),
  }
}

function parseEvent(value: unknown): LaunchLibrary2Event | undefined {
  if (!isRecord(value)) return undefined
  const id = readNumber(value.id)
  const name = readString(value.name)
  const url = readString(value.url)
  if (id === undefined || name === undefined || url === undefined) return undefined

  const slug = readString(value.slug)
  const date = readString(value.date)
  const type = parseNamedObject(value.type)?.name
  const location = readString(value.location)
  const description = readString(value.description)
  const webcastLive = readBoolean(value.webcast_live)
  const lastUpdated = readString(value.last_updated)

  return {
    id,
    name,
    url,
    ...(slug !== undefined ? { slug } : {}),
    ...(date !== undefined ? { date } : {}),
    ...(type !== undefined ? { type } : {}),
    ...(location !== undefined ? { location } : {}),
    ...(description !== undefined ? { description } : {}),
    ...(webcastLive !== undefined ? { webcastLive } : {}),
    ...(lastUpdated !== undefined ? { lastUpdated } : {}),
    videoUrls: readArray(value.vid_urls)
      .map(parseVideoUrl)
      .filter((item): item is LaunchLibrary2Event['videoUrls'][number] => (
        item !== undefined
      )),
  }
}

function parseAgency(value: unknown): LaunchLibrary2Agency | undefined {
  if (!isRecord(value)) return undefined
  const name = readString(value.name)
  if (name === undefined) return undefined
  const abbrev = readString(value.abbrev)
  const type = parseNamedObject(value.type)?.name
  return {
    name,
    ...(abbrev !== undefined ? { abbrev } : {}),
    ...(type !== undefined ? { type } : {}),
  }
}

function parseRocket(
  value: unknown,
): LaunchLibrary2Launch['rocket'] | undefined {
  if (!isRecord(value)) return undefined
  const configuration = isRecord(value.configuration) ? value.configuration : {}
  const name = readString(configuration.full_name) ?? readString(configuration.name)
  if (name === undefined) return undefined
  const family = readArray(configuration.families)
    .map(item => (isRecord(item) ? readString(item.name) : undefined))
    .find(item => item !== undefined)
  return {
    name,
    ...(family !== undefined ? { family } : {}),
  }
}

function parseMission(
  value: unknown,
): LaunchLibrary2Launch['mission'] | undefined {
  if (!isRecord(value)) return undefined
  const name = readString(value.name)
  if (name === undefined) return undefined
  const type = readString(value.type)
  const orbit = isRecord(value.orbit) ? readString(value.orbit.name) : undefined
  const description = readString(value.description)
  return {
    name,
    ...(type !== undefined ? { type } : {}),
    ...(orbit !== undefined ? { orbit } : {}),
    ...(description !== undefined ? { description } : {}),
  }
}

function parsePad(value: unknown): LaunchLibrary2Launch['pad'] | undefined {
  if (!isRecord(value)) return undefined
  const name = readString(value.name)
  if (name === undefined) return undefined
  const location = parseLocation(value.location)
  const mapUrl = readString(value.map_url)
  return {
    name,
    ...(location !== undefined ? { location } : {}),
    ...(mapUrl !== undefined ? { mapUrl } : {}),
  }
}

function parseLocation(value: unknown): LaunchLibrary2Location | undefined {
  if (!isRecord(value)) return undefined
  const name = readString(value.name)
  if (name === undefined) return undefined
  const country = isRecord(value.country) ? readString(value.country.name) : undefined
  const latitude = readNumber(value.latitude)
  const longitude = readNumber(value.longitude)
  return {
    name,
    ...(country !== undefined ? { country } : {}),
    ...(latitude !== undefined ? { latitude } : {}),
    ...(longitude !== undefined ? { longitude } : {}),
  }
}

function parseVideoUrl(
  value: unknown,
): LaunchLibrary2Event['videoUrls'][number] | undefined {
  if (!isRecord(value)) return undefined
  const url = readString(value.url)
  if (url === undefined) return undefined
  const title = readString(value.title)
  const publisher = readString(value.publisher)
  const startTime = readString(value.start_time)
  const live = readBoolean(value.live)
  return {
    url,
    ...(title !== undefined ? { title } : {}),
    ...(publisher !== undefined ? { publisher } : {}),
    ...(startTime !== undefined ? { startTime } : {}),
    ...(live !== undefined ? { live } : {}),
  }
}

function parseNamedObject(
  value: unknown,
): { name: string; abbrev?: string | undefined } | undefined {
  if (!isRecord(value)) return undefined
  const name = readString(value.name)
  if (name === undefined) return undefined
  const abbrev = readString(value.abbrev)
  return {
    name,
    ...(abbrev !== undefined ? { abbrev } : {}),
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

function readNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

function readBoolean(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined
}

function normalizeBaseUrl(value: string): string {
  return value.endsWith('/') ? value : `${value}/`
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}
