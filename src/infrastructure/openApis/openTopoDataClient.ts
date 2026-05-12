import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export const OPEN_TOPO_DATA_BASE_URL = 'https://api.opentopodata.org'
export const OPEN_TOPO_DATA_HOME_URL = 'https://www.opentopodata.org/'
export const OPEN_TOPO_DATA_DOCS_URL = 'https://www.opentopodata.org/api/'
export const OPEN_TOPO_DATA_DEFAULT_DATASET = 'srtm90m'
export const OPEN_TOPO_DATA_DEFAULT_LOCATIONS = '39.7471,-104.9963'
export const OPEN_TOPO_DATA_MAX_LOCATIONS = 5
export const OPEN_TOPO_DATA_DEFAULT_INTERPOLATION = 'bilinear'

export const OPEN_TOPO_DATA_SUPPORTED_DATASETS = [
  'srtm90m',
  'srtm30m',
  'aster30m',
  'mapzen',
  'gebco2020',
  'etopo1',
  'emod2018',
  'eudem25m',
  'ned10m',
  'nzdem8m',
  'bkg200m',
] as const

const SUPPORTED_DATASETS = new Set<string>(OPEN_TOPO_DATA_SUPPORTED_DATASETS)
const SUPPORTED_INTERPOLATIONS = new Set(['nearest', 'bilinear', 'cubic'])

export type OpenTopoDataDataset = (typeof OPEN_TOPO_DATA_SUPPORTED_DATASETS)[number]

export type OpenTopoDataLookupInput = {
  locations?: string | undefined
  dataset?: string | undefined
  interpolation?: string | undefined
}

export type NormalizedOpenTopoDataLookupInput = {
  locations: string
  dataset: OpenTopoDataDataset
  interpolation: 'nearest' | 'bilinear' | 'cubic'
  points: OpenTopoDataPoint[]
}

export type OpenTopoDataPoint = {
  latitude: number
  longitude: number
}

export type OpenTopoDataElevation = {
  dataset: string
  elevation: number | null
  location: OpenTopoDataPoint
}

type OpenTopoDataClientOptions = {
  baseUrl?: string | undefined
  fetchImpl?: typeof fetch | undefined
}

export class OpenTopoDataClient {
  constructor(private readonly options: OpenTopoDataClientOptions = {}) {}

  async lookup(input: NormalizedOpenTopoDataLookupInput): Promise<OpenTopoDataElevation[]> {
    const url = new URL(`/v1/${input.dataset}`, this.options.baseUrl ?? OPEN_TOPO_DATA_BASE_URL)
    url.searchParams.set('locations', input.locations)
    url.searchParams.set('interpolation', input.interpolation)
    const parsed = await this.fetchJson(url)
    return parseLookupResponse(parsed)
  }

  private async fetchJson(url: URL): Promise<unknown> {
    const fetchImpl = this.options.fetchImpl ?? globalThis.fetch
    let response: Response
    try {
      response = await fetchImpl(url, { headers: { accept: 'application/json' } })
    } catch (error) {
      throw new RuntimeFailure('OPEN_API_FAILED', `Open Topo Data request failed: ${String(error)}`, {
        provider: 'opentopodata',
        endpoint: url.href,
      })
    }

    let body: string
    try {
      body = await response.text()
    } catch (error) {
      throw new RuntimeFailure('OPEN_API_FAILED', `Open Topo Data response body could not be read: ${String(error)}`, {
        provider: 'opentopodata',
        status: response.status,
        endpoint: url.href,
      })
    }

    if (isCloudflareChallenge(response, body)) {
      throw new RuntimeFailure('OPEN_API_FAILED', 'Open Topo Data is currently returning a Cloudflare challenge HTML page instead of the documented JSON API response; retry later or use cached/offline data.', {
        provider: 'opentopodata',
        status: response.status,
        endpoint: url.href,
      })
    }

    let parsed: unknown
    try {
      parsed = JSON.parse(body)
    } catch (error) {
      throw new RuntimeFailure('OPEN_API_FAILED', `Open Topo Data returned a non-JSON response: ${String(error)}`, {
        provider: 'opentopodata',
        status: response.status,
        endpoint: url.href,
        contentType: response.headers.get('content-type') ?? undefined,
      })
    }

    if (!response.ok || isProviderError(parsed)) {
      throw new RuntimeFailure('OPEN_API_FAILED', readError(parsed) ?? `Open Topo Data request failed with HTTP ${response.status}.`, {
        provider: 'opentopodata',
        status: response.status,
        endpoint: url.href,
        response: parsed,
      })
    }

    return parsed
  }
}

export function normalizeOpenTopoDataLookupInput(input: OpenTopoDataLookupInput = {}): NormalizedOpenTopoDataLookupInput {
  const dataset = normalizeDataset(input.dataset)
  const interpolation = normalizeInterpolation(input.interpolation)
  const points = parseLocations(input.locations ?? OPEN_TOPO_DATA_DEFAULT_LOCATIONS)
  return {
    locations: points.map(point => `${String(point.latitude)},${String(point.longitude)}`).join('|'),
    dataset,
    interpolation,
    points,
  }
}

function normalizeDataset(value: string | undefined): OpenTopoDataDataset {
  const dataset = (value ?? OPEN_TOPO_DATA_DEFAULT_DATASET).trim().toLowerCase()
  if (!SUPPORTED_DATASETS.has(dataset)) {
    throw new RuntimeFailure('INVALID_ARGUMENT', `--dataset must be one of: ${OPEN_TOPO_DATA_SUPPORTED_DATASETS.join(', ')}.`)
  }
  return dataset as OpenTopoDataDataset
}

function normalizeInterpolation(value: string | undefined): 'nearest' | 'bilinear' | 'cubic' {
  const interpolation = (value ?? OPEN_TOPO_DATA_DEFAULT_INTERPOLATION).trim().toLowerCase()
  if (!SUPPORTED_INTERPOLATIONS.has(interpolation)) {
    throw new RuntimeFailure('INVALID_ARGUMENT', '--interpolation must be nearest, bilinear, or cubic.')
  }
  return interpolation as 'nearest' | 'bilinear' | 'cubic'
}

function parseLocations(value: string): OpenTopoDataPoint[] {
  const rawLocations = value.split('|').map(entry => entry.trim()).filter(entry => entry !== '')
  if (rawLocations.length === 0) {
    throw new RuntimeFailure('INVALID_ARGUMENT', '--locations must include at least one lat,lon pair.')
  }
  if (rawLocations.length > OPEN_TOPO_DATA_MAX_LOCATIONS) {
    throw new RuntimeFailure('INVALID_ARGUMENT', `--locations supports at most ${String(OPEN_TOPO_DATA_MAX_LOCATIONS)} lat,lon pairs per request.`)
  }
  return rawLocations.map((entry, index) => parseLocation(entry, index + 1))
}

function parseLocation(entry: string, position: number): OpenTopoDataPoint {
  const parts = entry.split(',').map(part => part.trim())
  if (parts.length !== 2 || parts[0] === '' || parts[1] === '') {
    throw new RuntimeFailure('INVALID_ARGUMENT', `Location ${String(position)} must use lat,lon format.`)
  }
  const latitude = Number(parts[0])
  const longitude = Number(parts[1])
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
    throw new RuntimeFailure('INVALID_ARGUMENT', `Location ${String(position)} latitude must be a number between -90 and 90.`)
  }
  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    throw new RuntimeFailure('INVALID_ARGUMENT', `Location ${String(position)} longitude must be a number between -180 and 180.`)
  }
  return { latitude, longitude }
}

function parseLookupResponse(value: unknown): OpenTopoDataElevation[] {
  if (!isRecord(value)) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'Open Topo Data response was not a JSON object.', { provider: 'opentopodata', response: value })
  }
  if (!Array.isArray(value.results)) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'Open Topo Data response did not include a results array.', { provider: 'opentopodata', response: value })
  }
  return value.results.map(parseElevation)
}

function parseElevation(value: unknown): OpenTopoDataElevation {
  if (!isRecord(value) || !isRecord(value.location) || typeof value.dataset !== 'string') {
    throw new RuntimeFailure('OPEN_API_FAILED', 'Open Topo Data result had an unexpected schema.', { provider: 'opentopodata', response: value })
  }
  const latitude = readNumber(value.location, 'lat')
  const longitude = readNumber(value.location, 'lng')
  const elevation = value.elevation === null ? null : readNumber(value, 'elevation')
  return {
    dataset: value.dataset,
    elevation,
    location: { latitude, longitude },
  }
}

function readNumber(record: Record<string, unknown>, key: string): number {
  const value = record[key]
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new RuntimeFailure('OPEN_API_FAILED', `Open Topo Data response did not include numeric ${key}.`, { provider: 'opentopodata', response: record })
  }
  return value
}

function isProviderError(value: unknown): boolean {
  return isRecord(value) && typeof value.status === 'string' && value.status !== 'OK'
}

function readError(value: unknown): string | undefined {
  if (!isRecord(value)) {
    return undefined
  }
  return typeof value.error === 'string' && value.error.trim() !== '' ? value.error : undefined
}

function isCloudflareChallenge(response: Response, body: string): boolean {
  const server = response.headers.get('server')?.toLowerCase()
  const mitigated = response.headers.get('cf-mitigated')?.toLowerCase()
  return response.status === 403 && (mitigated === 'challenge' || server === 'cloudflare' || body.includes('Just a moment...'))
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}
