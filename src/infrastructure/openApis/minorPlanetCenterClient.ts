import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export const MINOR_PLANET_CENTER_DEFAULT_BASE_URL = 'https://www.asterank.com'

export type MinorPlanetCenterMpcQuery = {
  queryJson?: Record<string, unknown> | undefined
  limit: number
}

export type MinorPlanetCenterAsteroid = {
  designation?: string | undefined
  readableDesignation: string
  absoluteMagnitude?: number | undefined
  slopeParameter?: number | undefined
  eccentricity?: number | undefined
  semiMajorAxisAu?: number | undefined
  inclinationDeg?: number | undefined
  meanAnomalyDeg?: number | undefined
  longitudeAscendingNodeDeg?: number | undefined
  argumentPerihelionDeg?: number | undefined
  epoch?: string | undefined
  observations?: number | undefined
  oppositions?: number | undefined
  lastObservation?: string | undefined
  reference?: string | undefined
  rms?: number | undefined
  flags?: string | undefined
}

export class MinorPlanetCenterClient {
  constructor(
    private readonly baseUrl = MINOR_PLANET_CENTER_DEFAULT_BASE_URL,
    private readonly fetchImpl: typeof fetch = globalThis.fetch,
  ) {}

  async search(query: MinorPlanetCenterMpcQuery): Promise<MinorPlanetCenterAsteroid[]> {
    const url = this.createUrl(query)
    const parsed = await this.fetchJson(url)
    if (!Array.isArray(parsed)) {
      throw new RuntimeFailure(
        'OPEN_API_FAILED',
        'Asterank MPC response did not match the documented JSON array shape.',
      )
    }
    return parsed
      .map(parseAsteroid)
      .filter((item): item is MinorPlanetCenterAsteroid => item !== undefined)
  }

  private createUrl(query: MinorPlanetCenterMpcQuery): URL {
    const url = new URL('/api/mpc', normalizeBaseUrl(this.baseUrl))
    if (query.queryJson !== undefined && Object.keys(query.queryJson).length > 0) {
      url.searchParams.set('query', JSON.stringify(query.queryJson))
    }
    url.searchParams.set('limit', String(query.limit))
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
        `Asterank MPC request failed: ${String(error)}`,
        { provider: 'minorplanetcenter', url: url.toString() },
      )
    }

    const body = await response.text()

    if (isCloudflareChallenge(response, body)) {
      throw new RuntimeFailure(
        'OPEN_API_FAILED',
        [
          'Asterank MPC is currently returning a Cloudflare challenge HTML',
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
        'Asterank MPC response was not JSON.',
        {
          ...createResponseDetails(response, url),
          preview: body.slice(0, 120),
        },
      )
    }

    if (!response.ok) {
      throw new RuntimeFailure(
        'OPEN_API_FAILED',
        `Asterank MPC request failed with HTTP ${response.status}.`,
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
    provider: 'minorplanetcenter',
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

function parseAsteroid(value: unknown): MinorPlanetCenterAsteroid | undefined {
  if (!isRecord(value)) return undefined
  const readableDesignation = readString(value.readable_des)
  if (readableDesignation === undefined) return undefined
  return {
    readableDesignation,
    ...readOptionalString('designation', value.des),
    ...readOptionalNumber('absoluteMagnitude', value.H),
    ...readOptionalNumber('slopeParameter', value.G),
    ...readOptionalNumber('eccentricity', value.e),
    ...readOptionalNumber('semiMajorAxisAu', value.a),
    ...readOptionalNumber('inclinationDeg', value.i),
    ...readOptionalNumber('meanAnomalyDeg', value.M),
    ...readOptionalNumber('longitudeAscendingNodeDeg', value.om),
    ...readOptionalNumber('argumentPerihelionDeg', value.w),
    ...readOptionalString('epoch', value.epoch),
    ...readOptionalNumber('observations', value.num_obs),
    ...readOptionalNumber('oppositions', value.num_opp),
    ...readOptionalString('lastObservation', value.last_obs),
    ...readOptionalString('reference', value.ref),
    ...readOptionalNumber('rms', value.rms),
    ...readOptionalString('flags', value.flags),
  }
}

function readOptionalString(
  key: keyof MinorPlanetCenterAsteroid,
  value: unknown,
): Partial<MinorPlanetCenterAsteroid> {
  const text = readString(value)
  return text === undefined ? {} : { [key]: text }
}

function readOptionalNumber(
  key: keyof MinorPlanetCenterAsteroid,
  value: unknown,
): Partial<MinorPlanetCenterAsteroid> {
  const number = readNumber(value)
  return number === undefined ? {} : { [key]: number }
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() !== ''
    ? value.trim()
    : undefined
}

function readNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value !== 'string' || value.trim() === '') return undefined
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

function normalizeBaseUrl(value: string): string {
  return value.replace(/\/+$/u, '')
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}
