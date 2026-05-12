import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export const OPENSENSEMAP_DEFAULT_BASE_URL = 'https://api.opensensemap.org'
export const OPENSENSEMAP_DEFAULT_BOX_NAME = 'Berlin'
export const OPENSENSEMAP_DEFAULT_BOX_ID = '5391be52a8341554157792e6'
export const OPENSENSEMAP_BOXES_DEFAULT_LIMIT = 5
export const OPENSENSEMAP_BOXES_MAX_LIMIT = 100
export const OPENSENSEMAP_SENSORS_DEFAULT_COUNT = 100
export const OPENSENSEMAP_SENSORS_MAX_COUNT = 100
const OPENSENSEMAP_EXPOSURES = ['unknown', 'indoor', 'outdoor', 'mobile'] as const

export type OpenSenseMapStatsInput = {
  human?: boolean | undefined
}

export type NormalizedOpenSenseMapStatsInput = {
  human: boolean
}

export type OpenSenseMapBoxesInput = {
  name?: string | undefined
  bbox?: string | undefined
  phenomenon?: string | undefined
  date?: string | undefined
  exposure?: string | undefined
  minimal?: boolean | undefined
  limit?: number | undefined
}

export type NormalizedOpenSenseMapBoxesInput = {
  name?: string | undefined
  bbox?: string | undefined
  phenomenon?: string | undefined
  date?: string | undefined
  exposure?: string | undefined
  minimal: boolean
  limit: number
}

export type OpenSenseMapSensorsInput = {
  boxId?: string | undefined
  count?: number | undefined
}

export type NormalizedOpenSenseMapSensorsInput = {
  boxId: string
  count: number
}

export type OpenSenseMapStats = {
  senseBoxes: number | string
  measurements: number | string
  measurementsLastMinute: number | string
}

export type OpenSenseMapLocation = {
  longitude?: number | undefined
  latitude?: number | undefined
  height?: number | undefined
  timestamp?: string | undefined
}

export type OpenSenseMapSensor = {
  id: string
  title?: string | undefined
  unit?: string | undefined
  sensorType?: string | undefined
  lastMeasurement?: {
    value?: string | number | undefined
    createdAt?: string | undefined
  } | undefined
}

export type OpenSenseMapBox = {
  id: string
  name: string
  exposure?: string | undefined
  model?: string | undefined
  updatedAt?: string | undefined
  lastMeasurementAt?: string | undefined
  location?: OpenSenseMapLocation | undefined
  sensors: OpenSenseMapSensor[]
}

export class OpenSenseMapClient {
  constructor(private readonly options: { baseUrl?: string | undefined; fetchImpl?: typeof fetch | undefined } = {}) {}

  async stats(input: NormalizedOpenSenseMapStatsInput): Promise<OpenSenseMapStats> {
    const url = new URL('/stats', this.options.baseUrl ?? OPENSENSEMAP_DEFAULT_BASE_URL)
    if (input.human) {
      url.searchParams.set('human', 'true')
    }
    const parsed = await this.fetchJson(url)
    return parseStats(parsed)
  }

  async boxes(input: NormalizedOpenSenseMapBoxesInput): Promise<OpenSenseMapBox[]> {
    const url = new URL('/boxes', this.options.baseUrl ?? OPENSENSEMAP_DEFAULT_BASE_URL)
    url.searchParams.set('format', 'json')
    url.searchParams.set('limit', String(input.limit))
    url.searchParams.set('minimal', String(input.minimal))
    if (input.name !== undefined) url.searchParams.set('name', input.name)
    if (input.bbox !== undefined) url.searchParams.set('bbox', input.bbox)
    if (input.phenomenon !== undefined) url.searchParams.set('phenomenon', input.phenomenon)
    if (input.date !== undefined) url.searchParams.set('date', input.date)
    if (input.exposure !== undefined) url.searchParams.set('exposure', input.exposure)
    const parsed = await this.fetchJson(url)
    if (!Array.isArray(parsed)) {
      throw new RuntimeFailure('OPEN_API_FAILED', 'openSenseMap boxes response must be a JSON array.', { provider: 'opensensemap' })
    }
    return parsed.filter(isRecord).map(parseBox).slice(0, input.limit)
  }

  async sensors(input: NormalizedOpenSenseMapSensorsInput): Promise<OpenSenseMapBox> {
    const url = new URL(`/boxes/${encodeURIComponent(input.boxId)}/sensors`, this.options.baseUrl ?? OPENSENSEMAP_DEFAULT_BASE_URL)
    url.searchParams.set('count', String(input.count))
    const parsed = await this.fetchJson(url)
    return parseBox(requireRecord(parsed, 'openSenseMap sensors response'))
  }

  private async fetchJson(url: URL): Promise<unknown> {
    const fetchImpl = this.options.fetchImpl ?? globalThis.fetch
    let response: Response
    try {
      response = await fetchImpl(url, { headers: { accept: 'application/json', 'user-agent': 'public-apis-tui-cli' } })
    } catch (error) {
      throw new RuntimeFailure('OPEN_API_FAILED', `openSenseMap request failed: ${String(error)}`, { provider: 'opensensemap', endpoint: url.href })
    }

    let parsed: unknown
    try {
      parsed = await response.json()
    } catch (error) {
      throw new RuntimeFailure('OPEN_API_FAILED', `openSenseMap returned a non-JSON response: ${String(error)}`, {
        provider: 'opensensemap',
        endpoint: url.href,
        status: response.status,
      })
    }

    if (!response.ok) {
      throw new RuntimeFailure('OPEN_API_FAILED', readErrorMessage(parsed) ?? `openSenseMap request failed with HTTP ${response.status}.`, {
        provider: 'opensensemap',
        endpoint: url.href,
        status: response.status,
        response: parsed,
      })
    }
    return parsed
  }
}

export function normalizeOpenSenseMapStatsInput(input: OpenSenseMapStatsInput = {}): NormalizedOpenSenseMapStatsInput {
  return { human: input.human === true }
}

export function normalizeOpenSenseMapBoxesInput(input: OpenSenseMapBoxesInput = {}): NormalizedOpenSenseMapBoxesInput {
  const hasLocator = input.name !== undefined || input.bbox !== undefined
  const name = normalizeOptionalText(input.name ?? (hasLocator ? undefined : OPENSENSEMAP_DEFAULT_BOX_NAME), '--name')
  const bbox = normalizeOptionalBbox(input.bbox)
  const phenomenon = normalizeOptionalText(input.phenomenon, '--phenomenon')
  const date = normalizeOptionalText(input.date, '--date')
  const exposure = normalizeOptionalExposure(input.exposure)
  return {
    minimal: input.minimal === true,
    limit: normalizeInteger(input.limit ?? OPENSENSEMAP_BOXES_DEFAULT_LIMIT, '--limit', 1, OPENSENSEMAP_BOXES_MAX_LIMIT),
    ...(name !== undefined ? { name } : {}),
    ...(bbox !== undefined ? { bbox } : {}),
    ...(phenomenon !== undefined ? { phenomenon } : {}),
    ...(date !== undefined ? { date } : {}),
    ...(exposure !== undefined ? { exposure } : {}),
  }
}

export function normalizeOpenSenseMapSensorsInput(input: OpenSenseMapSensorsInput = {}): NormalizedOpenSenseMapSensorsInput {
  return {
    boxId: normalizeId(input.boxId ?? OPENSENSEMAP_DEFAULT_BOX_ID, '--box-id'),
    count: normalizeInteger(input.count ?? OPENSENSEMAP_SENSORS_DEFAULT_COUNT, '--count', 1, OPENSENSEMAP_SENSORS_MAX_COUNT),
  }
}

function parseStats(value: unknown): OpenSenseMapStats {
  if (!Array.isArray(value) || value.length < 3) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'openSenseMap stats response must be a three-item JSON array.', { provider: 'opensensemap' })
  }
  return {
    senseBoxes: parseStatValue(value[0]),
    measurements: parseStatValue(value[1]),
    measurementsLastMinute: parseStatValue(value[2]),
  }
}

function parseBox(record: Record<string, unknown>): OpenSenseMapBox {
  const location = parseLocation(record.currentLocation)
  return {
    id: readString(record._id) ?? readString(record.id) ?? '',
    name: readString(record.name) ?? 'unnamed senseBox',
    exposure: readString(record.exposure),
    model: readString(record.model),
    updatedAt: readString(record.updatedAt),
    lastMeasurementAt: readString(record.lastMeasurementAt),
    location,
    sensors: Array.isArray(record.sensors) ? record.sensors.filter(isRecord).map(parseSensor) : [],
  }
}

function parseSensor(record: Record<string, unknown>): OpenSenseMapSensor {
  return {
    id: readString(record._id) ?? readString(record.id) ?? '',
    title: readString(record.title),
    unit: readString(record.unit),
    sensorType: readString(record.sensorType),
    lastMeasurement: parseMeasurement(record.lastMeasurement),
  }
}

function parseMeasurement(value: unknown): OpenSenseMapSensor['lastMeasurement'] {
  if (!isRecord(value)) {
    return undefined
  }
  return {
    value: readString(value.value) ?? readNumber(value.value),
    createdAt: readString(value.createdAt),
  }
}

function parseLocation(value: unknown): OpenSenseMapLocation | undefined {
  if (!isRecord(value)) {
    return undefined
  }
  const coordinates = Array.isArray(value.coordinates) ? value.coordinates : []
  return {
    longitude: readNumber(coordinates[0]),
    latitude: readNumber(coordinates[1]),
    height: readNumber(coordinates[2]),
    timestamp: readString(value.timestamp),
  }
}

function parseStatValue(value: unknown): number | string {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }
  if (typeof value === 'string') {
    return value
  }
  return 0
}

function normalizeOptionalText(value: string | undefined, optionName: string): string | undefined {
  if (value === undefined) {
    return undefined
  }
  const normalized = value.trim()
  if (normalized === '') {
    throw new RuntimeFailure('INVALID_ARGUMENT', `${optionName} must not be empty.`)
  }
  if (normalized.length > 160) {
    throw new RuntimeFailure('INVALID_ARGUMENT', `${optionName} must be 160 characters or fewer.`)
  }
  return normalized
}

function normalizeOptionalBbox(value: string | undefined): string | undefined {
  const normalized = normalizeOptionalText(value, '--bbox')
  if (normalized === undefined) {
    return undefined
  }
  const coordinates = normalized.split(',').map(entry => Number(entry.trim()))
  if (coordinates.length !== 4 || coordinates.some(coordinate => !Number.isFinite(coordinate))) {
    throw new RuntimeFailure('INVALID_ARGUMENT', '--bbox must contain four comma-separated WGS84 numbers.', { value })
  }
  return coordinates.join(',')
}

function normalizeOptionalExposure(value: string | undefined): string | undefined {
  const normalized = normalizeOptionalText(value, '--exposure')?.toLowerCase()
  if (normalized === undefined) {
    return undefined
  }
  if (!OPENSENSEMAP_EXPOSURES.includes(normalized as typeof OPENSENSEMAP_EXPOSURES[number])) {
    throw new RuntimeFailure('INVALID_ARGUMENT', `--exposure must be one of ${OPENSENSEMAP_EXPOSURES.join(', ')}.`, { value })
  }
  return normalized
}

function normalizeId(value: string, optionName: string): string {
  const normalized = normalizeOptionalText(value, optionName)
  if (normalized === undefined || !/^[a-f0-9]{24}$/iu.test(normalized)) {
    throw new RuntimeFailure('INVALID_ARGUMENT', `${optionName} must be a 24-character senseBox id.`, { value })
  }
  return normalized
}

function normalizeInteger(value: number, optionName: string, min: number, max: number): number {
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new RuntimeFailure('INVALID_ARGUMENT', `${optionName} must be an integer between ${min} and ${max}.`, { min, max, value })
  }
  return value
}

function requireRecord(value: unknown, label: string): Record<string, unknown> {
  if (!isRecord(value)) {
    throw new RuntimeFailure('OPEN_API_FAILED', `${label} must be a JSON object.`, { provider: 'opensensemap' })
  }
  return value
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() !== '' ? value : undefined
}

function readNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

function readErrorMessage(value: unknown): string | undefined {
  if (!isRecord(value)) {
    return undefined
  }
  return readString(value.message) ?? readString(value.error)
}
