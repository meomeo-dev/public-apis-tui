import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export const OPENSKY_DEFAULT_BASE_URL = 'https://opensky-network.org/api'
export const OPENSKY_DEFAULT_LAMIN = 45.8
export const OPENSKY_DEFAULT_LOMIN = -124
export const OPENSKY_DEFAULT_LAMAX = 49.2
export const OPENSKY_DEFAULT_LOMAX = -116
export const OPENSKY_DEFAULT_LIMIT = 100
export const OPENSKY_MAX_LIMIT = 500

export type OpenSkyStatesInput = {
  lamin?: number | undefined
  lomin?: number | undefined
  lamax?: number | undefined
  lomax?: number | undefined
  icao24?: string | undefined
  time?: number | undefined
  extended?: boolean | undefined
  limit?: number | undefined
}

export type NormalizedOpenSkyStatesInput = {
  lamin: number
  lomin: number
  lamax: number
  lomax: number
  limit: number
  icao24?: string | undefined
  time?: number | undefined
  extended?: boolean | undefined
}

export type OpenSkyStateVector = {
  icao24: string
  callsign?: string | undefined
  originCountry: string
  timePosition?: number | undefined
  lastContact: number
  longitude?: number | undefined
  latitude?: number | undefined
  baroAltitude?: number | undefined
  onGround: boolean
  velocity?: number | undefined
  trueTrack?: number | undefined
  verticalRate?: number | undefined
  sensors?: number[] | undefined
  geoAltitude?: number | undefined
  squawk?: string | undefined
  spi: boolean
  positionSource: number
  category?: number | undefined
}

export type OpenSkyStatesResponse = {
  time: number
  states: OpenSkyStateVector[]
  rateLimit: {
    remaining?: string | undefined
  }
}

export class OpenSkyClient {
  constructor(private readonly options: { baseUrl?: string | undefined; fetchImpl?: typeof fetch | undefined } = {}) {}

  async states(input: NormalizedOpenSkyStatesInput): Promise<OpenSkyStatesResponse> {
    const url = this.createUrl('/states/all')
    url.searchParams.set('lamin', String(input.lamin))
    url.searchParams.set('lomin', String(input.lomin))
    url.searchParams.set('lamax', String(input.lamax))
    url.searchParams.set('lomax', String(input.lomax))
    if (input.icao24 !== undefined) url.searchParams.set('icao24', input.icao24)
    if (input.time !== undefined) url.searchParams.set('time', String(input.time))
    if (input.extended !== undefined) url.searchParams.set('extended', String(input.extended))

    const { parsed, response } = await this.fetchJson(url)
    const envelope = parseStatesEnvelope(parsed)
    return {
      ...envelope,
      states: envelope.states.slice(0, input.limit),
      rateLimit: {
        remaining: response.headers.get('x-rate-limit-remaining') ?? undefined,
      },
    }
  }

  private createUrl(path: string): URL {
    return new URL(path.replace(/^\/+/, ''), normalizeBaseUrl(this.options.baseUrl ?? OPENSKY_DEFAULT_BASE_URL))
  }

  private async fetchJson(url: URL): Promise<{ parsed: unknown; response: Response }> {
    const fetchImpl = this.options.fetchImpl ?? globalThis.fetch
    let response: Response
    try {
      response = await fetchImpl(url, {
        headers: {
          accept: 'application/json',
          'user-agent': 'public-apis-tui no-auth CLI (https://github.com/meomeo-dev/public-apis-tui)',
        },
      })
    } catch (error) {
      throw new RuntimeFailure('OPEN_API_FAILED', `OpenSky request failed: ${String(error)}`, {
        provider: 'opensky',
        endpoint: url.href,
      })
    }

    let parsed: unknown
    try {
      parsed = await response.json()
    } catch (error) {
      throw new RuntimeFailure('OPEN_API_FAILED', `OpenSky returned a non-JSON response: ${String(error)}`, {
        provider: 'opensky',
        status: response.status,
        endpoint: url.href,
      })
    }

    if (!response.ok) {
      throw new RuntimeFailure('OPEN_API_FAILED', readErrorMessage(parsed) ?? `OpenSky request failed with HTTP ${response.status}.`, {
        provider: 'opensky',
        status: response.status,
        endpoint: url.href,
        response: parsed,
      })
    }

    return { parsed, response }
  }
}

export function normalizeOpenSkyStatesInput(input: OpenSkyStatesInput = {}): NormalizedOpenSkyStatesInput {
  const lamin = normalizeCoordinate(input.lamin ?? OPENSKY_DEFAULT_LAMIN, '--lamin', -90, 90)
  const lomin = normalizeCoordinate(input.lomin ?? OPENSKY_DEFAULT_LOMIN, '--lomin', -180, 180)
  const lamax = normalizeCoordinate(input.lamax ?? OPENSKY_DEFAULT_LAMAX, '--lamax', -90, 90)
  const lomax = normalizeCoordinate(input.lomax ?? OPENSKY_DEFAULT_LOMAX, '--lomax', -180, 180)
  if (lamin >= lamax) {
    throw new RuntimeFailure('INVALID_ARGUMENT', '--lamin must be lower than --lamax.')
  }
  if (lomin >= lomax) {
    throw new RuntimeFailure('INVALID_ARGUMENT', '--lomin must be lower than --lomax.')
  }
  return {
    lamin,
    lomin,
    lamax,
    lomax,
    limit: normalizeInteger(input.limit ?? OPENSKY_DEFAULT_LIMIT, '--limit', 1, OPENSKY_MAX_LIMIT),
    ...(input.icao24 !== undefined ? { icao24: normalizeIcao24(input.icao24) } : {}),
    ...(input.time !== undefined ? { time: normalizeInteger(input.time, '--time', 0, 4_102_444_800) } : {}),
    ...(input.extended !== undefined ? { extended: input.extended } : {}),
  }
}

function parseStatesEnvelope(value: unknown): { time: number; states: OpenSkyStateVector[] } {
  if (!isRecord(value) || typeof value.time !== 'number') {
    throw new RuntimeFailure('OPEN_API_FAILED', 'OpenSky response must include numeric time.')
  }
  if (value.states !== null && !Array.isArray(value.states)) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'OpenSky response states must be an array or null.')
  }
  return {
    time: value.time,
    states: Array.isArray(value.states) ? value.states.map(parseStateVector) : [],
  }
}

function parseStateVector(value: unknown): OpenSkyStateVector {
  if (!Array.isArray(value)) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'OpenSky state vector rows must be arrays.')
  }
  const icao24 = value[0]
  const originCountry = value[2]
  const lastContact = value[4]
  const onGround = value[8]
  const spi = value[15]
  const positionSource = value[16]
  if (typeof icao24 !== 'string' || typeof originCountry !== 'string' || typeof lastContact !== 'number' || typeof onGround !== 'boolean' || typeof spi !== 'boolean' || typeof positionSource !== 'number') {
    throw new RuntimeFailure('OPEN_API_FAILED', 'OpenSky state vector rows are missing required fields.')
  }
  return {
    icao24,
    callsign: optionalTrimmedString(value[1]),
    originCountry,
    timePosition: optionalNumber(value[3]),
    lastContact,
    longitude: optionalNumber(value[5]),
    latitude: optionalNumber(value[6]),
    baroAltitude: optionalNumber(value[7]),
    onGround,
    velocity: optionalNumber(value[9]),
    trueTrack: optionalNumber(value[10]),
    verticalRate: optionalNumber(value[11]),
    sensors: Array.isArray(value[12]) ? value[12].filter((entry): entry is number => typeof entry === 'number') : undefined,
    geoAltitude: optionalNumber(value[13]),
    squawk: optionalTrimmedString(value[14]),
    spi,
    positionSource,
    category: optionalNumber(value[17]),
  }
}

function normalizeCoordinate(value: number, label: string, min: number, max: number): number {
  if (!Number.isFinite(value) || value < min || value > max) {
    throw new RuntimeFailure('INVALID_ARGUMENT', `${label} must be a number between ${min} and ${max}.`)
  }
  return Number(value.toFixed(6))
}

function normalizeInteger(value: number, label: string, min: number, max: number): number {
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new RuntimeFailure('INVALID_ARGUMENT', `${label} must be an integer between ${min} and ${max}.`)
  }
  return value
}

function normalizeIcao24(value: string): string {
  const normalized = value.trim().toLowerCase()
  if (!/^[a-f0-9]{6}$/u.test(normalized)) {
    throw new RuntimeFailure('INVALID_ARGUMENT', '--icao24 must be a 6-character hexadecimal ICAO24 address.')
  }
  return normalized
}

function optionalTrimmedString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed === '' ? undefined : trimmed
}

function optionalNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

function readErrorMessage(value: unknown): string | undefined {
  if (!isRecord(value)) return undefined
  const error = value.error ?? value.message ?? value.path
  return typeof error === 'string' && error.trim() !== '' ? error : undefined
}

function normalizeBaseUrl(value: string): string {
  return value.endsWith('/') ? value : `${value}/`
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}
