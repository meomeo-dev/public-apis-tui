import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export const VELIB_DEFAULT_BASE_URL = 'https://velib-metropole-opendata.smovengo.cloud/opendata/Velib_Metropole'
export const VELIB_DEFAULT_LIMIT = 100
export const VELIB_MAX_LIMIT = 500
export const VELIB_DEFAULT_SORT = 'bikes'

export type VelibStationsInput = {
  query?: string | undefined
  stationCode?: string | undefined
  minBikes?: number | undefined
  minDocks?: number | undefined
  renting?: boolean | undefined
  returning?: boolean | undefined
  sort?: string | undefined
  limit?: number | undefined
}

export type NormalizedVelibStationsInput = {
  sort: VelibStationsSort
  limit: number
  query?: string | undefined
  stationCode?: string | undefined
  minBikes?: number | undefined
  minDocks?: number | undefined
  renting?: boolean | undefined
  returning?: boolean | undefined
}

export type VelibStationsSort = 'bikes' | 'docks' | 'capacity' | 'updated' | 'name'

export type VelibStation = {
  stationId: string
  stationCode?: string | undefined
  name: string
  latitude: number
  longitude: number
  capacity?: number | undefined
  rentalMethods: string[]
  bikesAvailable: number
  mechanicalBikes: number
  ebikes: number
  docksAvailable: number
  isInstalled: boolean
  isRenting: boolean
  isReturning: boolean
  lastReported?: number | undefined
}

export type VelibStationsResponse = {
  stations: VelibStation[]
  totalStations: number
  informationLastUpdated?: number | undefined
  statusLastUpdated?: number | undefined
  ttl?: number | undefined
}

type VelibInformationFeed = {
  stations: Array<Record<string, unknown>>
  lastUpdated?: number | undefined
  ttl?: number | undefined
}

type VelibStatusFeed = {
  stations: Array<Record<string, unknown>>
  lastUpdated?: number | undefined
  ttl?: number | undefined
}

export class VelibClient {
  constructor(private readonly options: { baseUrl?: string | undefined; fetchImpl?: typeof fetch | undefined } = {}) {}

  async stations(input: NormalizedVelibStationsInput): Promise<VelibStationsResponse> {
    const [information, status] = await Promise.all([this.stationInformation(), this.stationStatus()])
    const statusById = new Map(status.stations.map(entry => [String(entry.station_id ?? ''), entry]))
    const merged = information.stations.map(station => parseStation(station, statusById.get(String(station.station_id ?? ''))))
    const filtered = filterStations(merged, input)
    return {
      stations: sortStations(filtered, input.sort).slice(0, input.limit),
      totalStations: merged.length,
      informationLastUpdated: information.lastUpdated,
      statusLastUpdated: status.lastUpdated,
      ttl: status.ttl ?? information.ttl,
    }
  }

  private async stationInformation(): Promise<VelibInformationFeed> {
    const parsed = await this.fetchJson('station_information.json')
    return parseFeed(parsed, 'station_information')
  }

  private async stationStatus(): Promise<VelibStatusFeed> {
    const parsed = await this.fetchJson('station_status.json')
    return parseFeed(parsed, 'station_status')
  }

  private async fetchJson(path: string): Promise<unknown> {
    const url = new URL(path, normalizeBaseUrl(this.options.baseUrl ?? VELIB_DEFAULT_BASE_URL))
    const fetchImpl = this.options.fetchImpl ?? globalThis.fetch
    let response: Response
    try {
      response = await fetchImpl(url, { headers: { accept: 'application/json', 'user-agent': 'public-apis-tui-cli' } })
    } catch (error) {
      throw new RuntimeFailure('OPEN_API_FAILED', `Velib request failed: ${String(error)}`, { provider: 'velib', endpoint: url.href })
    }

    let parsed: unknown
    try {
      parsed = await response.json()
    } catch (error) {
      throw new RuntimeFailure('OPEN_API_FAILED', `Velib returned a non-JSON response: ${String(error)}`, { provider: 'velib', endpoint: url.href, status: response.status })
    }

    if (!response.ok) {
      throw new RuntimeFailure('OPEN_API_FAILED', readErrorMessage(parsed) ?? `Velib request failed with HTTP ${response.status}.`, { provider: 'velib', endpoint: url.href, status: response.status, response: parsed })
    }

    return parsed
  }
}

export function normalizeVelibStationsInput(input: VelibStationsInput = {}): NormalizedVelibStationsInput {
  return {
    sort: normalizeSort(input.sort ?? VELIB_DEFAULT_SORT),
    limit: normalizeInteger(input.limit ?? VELIB_DEFAULT_LIMIT, '--limit', 1, VELIB_MAX_LIMIT),
    ...(input.query !== undefined ? { query: normalizeText(input.query, '--query') } : {}),
    ...(input.stationCode !== undefined ? { stationCode: normalizeStationCode(input.stationCode) } : {}),
    ...(input.minBikes !== undefined ? { minBikes: normalizeInteger(input.minBikes, '--min-bikes', 0, 1000) } : {}),
    ...(input.minDocks !== undefined ? { minDocks: normalizeInteger(input.minDocks, '--min-docks', 0, 1000) } : {}),
    ...(input.renting !== undefined ? { renting: input.renting } : {}),
    ...(input.returning !== undefined ? { returning: input.returning } : {}),
  }
}

function parseFeed(value: unknown, feedName: string): VelibInformationFeed {
  if (!isRecord(value) || !isRecord(value.data) || !Array.isArray(value.data.stations)) {
    throw new RuntimeFailure('OPEN_API_FAILED', `Velib ${feedName} response must include data.stations[].`)
  }
  return {
    stations: value.data.stations.filter(isRecord),
    lastUpdated: optionalNumber(value.lastUpdatedOther ?? value.last_updated),
    ttl: optionalNumber(value.ttl),
  }
}

function parseStation(information: Record<string, unknown>, status: Record<string, unknown> | undefined): VelibStation {
  const stationId = information.station_id
  const name = information.name
  const latitude = information.lat
  const longitude = information.lon
  if ((typeof stationId !== 'string' && typeof stationId !== 'number') || typeof name !== 'string' || typeof latitude !== 'number' || typeof longitude !== 'number') {
    throw new RuntimeFailure('OPEN_API_FAILED', 'Velib station_information rows must include station_id, name, lat, and lon.')
  }

  const bikeTypes = Array.isArray(status?.num_bikes_available_types) ? status.num_bikes_available_types.filter(isRecord) : []
  return {
    stationId: String(stationId),
    stationCode: optionalString(information.stationCode ?? status?.stationCode),
    name,
    latitude,
    longitude,
    capacity: optionalNumber(information.capacity),
    rentalMethods: Array.isArray(information.rental_methods) ? information.rental_methods.filter((entry): entry is string => typeof entry === 'string') : [],
    bikesAvailable: readNumber(status?.num_bikes_available ?? status?.numBikesAvailable),
    mechanicalBikes: readBikeType(bikeTypes, 'mechanical'),
    ebikes: readBikeType(bikeTypes, 'ebike'),
    docksAvailable: readNumber(status?.num_docks_available ?? status?.numDocksAvailable),
    isInstalled: status?.is_installed === 1 || status?.is_installed === true,
    isRenting: status?.is_renting === 1 || status?.is_renting === true,
    isReturning: status?.is_returning === 1 || status?.is_returning === true,
    lastReported: optionalNumber(status?.last_reported),
  }
}

function filterStations(stations: VelibStation[], input: NormalizedVelibStationsInput): VelibStation[] {
  const normalizedQuery = input.query?.toLowerCase()
  return stations.filter(station => {
    if (normalizedQuery !== undefined) {
      const haystack = `${station.name} ${station.stationCode ?? ''} ${station.stationId}`.toLowerCase()
      if (!haystack.includes(normalizedQuery)) return false
    }
    if (input.stationCode !== undefined && station.stationCode !== input.stationCode) return false
    if (input.minBikes !== undefined && station.bikesAvailable < input.minBikes) return false
    if (input.minDocks !== undefined && station.docksAvailable < input.minDocks) return false
    if (input.renting !== undefined && station.isRenting !== input.renting) return false
    if (input.returning !== undefined && station.isReturning !== input.returning) return false
    return true
  })
}

function sortStations(stations: VelibStation[], sort: VelibStationsSort): VelibStation[] {
  return [...stations].sort((left, right) => {
    if (sort === 'name') return left.name.localeCompare(right.name)
    if (sort === 'capacity') return (right.capacity ?? 0) - (left.capacity ?? 0)
    if (sort === 'docks') return right.docksAvailable - left.docksAvailable
    if (sort === 'updated') return (right.lastReported ?? 0) - (left.lastReported ?? 0)
    return right.bikesAvailable - left.bikesAvailable
  })
}

function readBikeType(entries: Array<Record<string, unknown>>, key: string): number {
  const entry = entries.find(candidate => typeof candidate[key] === 'number')
  return entry === undefined ? 0 : Number(entry[key])
}

function readNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

function optionalNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() !== '' ? value : undefined
}

function normalizeText(value: string, label: string): string {
  const normalized = value.trim()
  if (normalized === '') throw new RuntimeFailure('INVALID_ARGUMENT', `${label} cannot be empty.`)
  if (normalized.length > 120) throw new RuntimeFailure('INVALID_ARGUMENT', `${label} must be 120 characters or fewer.`)
  return normalized
}

function normalizeStationCode(value: string): string {
  const normalized = normalizeText(value, '--station-code')
  if (!/^[\w-]{1,40}$/u.test(normalized)) {
    throw new RuntimeFailure('INVALID_ARGUMENT', '--station-code must be 1-40 letters, numbers, underscores, or dashes.')
  }
  return normalized
}

function normalizeSort(value: string): VelibStationsSort {
  const normalized = value.trim().toLowerCase()
  if (normalized === 'bikes' || normalized === 'docks' || normalized === 'capacity' || normalized === 'updated' || normalized === 'name') {
    return normalized
  }
  throw new RuntimeFailure('INVALID_ARGUMENT', '--sort must be one of bikes, docks, capacity, updated, or name.')
}

function normalizeInteger(value: number, label: string, min: number, max: number): number {
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new RuntimeFailure('INVALID_ARGUMENT', `${label} must be an integer between ${min} and ${max}.`)
  }
  return value
}

function readErrorMessage(value: unknown): string | undefined {
  if (!isRecord(value)) return undefined
  const error = value.error ?? value.message
  return typeof error === 'string' && error.trim() !== '' ? error : undefined
}

function normalizeBaseUrl(value: string): string {
  return value.endsWith('/') ? value : `${value}/`
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}
