import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export const NHTSA_DEFAULT_BASE_URL = 'https://vpic.nhtsa.dot.gov/api'
export const NHTSA_DEFAULT_VIN = '1HGCM82633A004352'
export const NHTSA_DEFAULT_MODEL_YEAR = 2003
export const NHTSA_DEFAULT_VEHICLE_TYPE = 'car'
export const NHTSA_MAKES_DEFAULT_LIMIT = 200
export const NHTSA_MAKES_MAX_LIMIT = 500

export type NhtsaDecodeVinInput = {
  vin?: string | undefined
  modelYear?: number | undefined
}

export type NormalizedNhtsaDecodeVinInput = {
  vin: string
  modelYear?: number | undefined
}

export type NhtsaMakesForTypeInput = {
  vehicleType?: string | undefined
  limit?: number | undefined
}

export type NormalizedNhtsaMakesForTypeInput = {
  vehicleType: string
  limit: number
}

export type NhtsaEnvelope<T> = {
  count: number
  message: string
  searchCriteria: string
  results: T[]
}

export type NhtsaVinDecode = {
  vin?: string | undefined
  make?: string | undefined
  model?: string | undefined
  modelYear?: string | undefined
  trim?: string | undefined
  vehicleType?: string | undefined
  bodyClass?: string | undefined
  doors?: string | undefined
  driveType?: string | undefined
  engineModel?: string | undefined
  fuelTypePrimary?: string | undefined
  plantCountry?: string | undefined
  manufacturer?: string | undefined
  errorCode?: string | undefined
  errorText?: string | undefined
}

export type NhtsaMakeForVehicleType = {
  makeId: number
  makeName: string
  vehicleTypeId: number
  vehicleTypeName: string
}

export class NhtsaClient {
  constructor(private readonly options: { baseUrl?: string | undefined; fetchImpl?: typeof fetch | undefined } = {}) {}

  async decodeVin(input: NormalizedNhtsaDecodeVinInput): Promise<NhtsaEnvelope<NhtsaVinDecode>> {
    const url = this.createUrl(`/vehicles/DecodeVinValues/${encodeURIComponent(input.vin)}`)
    url.searchParams.set('format', 'json')
    if (input.modelYear !== undefined) {
      url.searchParams.set('modelyear', String(input.modelYear))
    }
    const parsed = await this.fetchJson(url)
    return parseEnvelope(parsed, parseVinDecode, 'DecodeVinValues')
  }

  async getMakesForVehicleType(input: NormalizedNhtsaMakesForTypeInput): Promise<NhtsaEnvelope<NhtsaMakeForVehicleType>> {
    const url = this.createUrl(`/vehicles/GetMakesForVehicleType/${encodeURIComponent(input.vehicleType)}`)
    url.searchParams.set('format', 'json')
    const parsed = await this.fetchJson(url)
    const envelope = parseEnvelope(parsed, parseMakeForVehicleType, 'GetMakesForVehicleType')
    return { ...envelope, results: envelope.results.slice(0, input.limit) }
  }

  private createUrl(path: string): URL {
    return new URL(path.replace(/^\/+/u, ''), normalizeBaseUrl(this.options.baseUrl ?? NHTSA_DEFAULT_BASE_URL))
  }

  private async fetchJson(url: URL): Promise<unknown> {
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
      throw new RuntimeFailure('OPEN_API_FAILED', `NHTSA vPIC request failed: ${String(error)}`, {
        provider: 'nhtsa',
        endpoint: url.href,
      })
    }

    let parsed: unknown
    try {
      parsed = await response.json()
    } catch (error) {
      throw new RuntimeFailure('OPEN_API_FAILED', `NHTSA vPIC returned a non-JSON response: ${String(error)}`, {
        provider: 'nhtsa',
        status: response.status,
        endpoint: url.href,
      })
    }

    if (!response.ok) {
      throw new RuntimeFailure('OPEN_API_FAILED', `NHTSA vPIC request failed with HTTP ${response.status}.`, {
        provider: 'nhtsa',
        status: response.status,
        endpoint: url.href,
        response: parsed,
      })
    }

    return parsed
  }
}

export function normalizeNhtsaDecodeVinInput(input: NhtsaDecodeVinInput = {}): NormalizedNhtsaDecodeVinInput {
  return {
    vin: normalizeVin(input.vin ?? NHTSA_DEFAULT_VIN),
    ...(input.modelYear !== undefined ? { modelYear: normalizeModelYear(input.modelYear) } : { modelYear: NHTSA_DEFAULT_MODEL_YEAR }),
  }
}

export function normalizeNhtsaMakesForTypeInput(input: NhtsaMakesForTypeInput = {}): NormalizedNhtsaMakesForTypeInput {
  return {
    vehicleType: normalizeText(input.vehicleType ?? NHTSA_DEFAULT_VEHICLE_TYPE, '--vehicle-type'),
    limit: normalizeLimit(input.limit),
  }
}

function normalizeVin(value: string): string {
  const vin = value.trim().toUpperCase()
  if (!/^[A-HJ-NPR-Z0-9*]{3,17}$/u.test(vin)) {
    throw new RuntimeFailure('INVALID_ARGUMENT', '--vin must be 3 to 17 VIN characters; I, O, and Q are not valid VIN letters.')
  }
  return vin
}

function normalizeModelYear(value: number): number {
  if (!Number.isInteger(value) || value < 1900 || value > 2100) {
    throw new RuntimeFailure('INVALID_ARGUMENT', '--model-year must be an integer from 1900 to 2100.')
  }
  return value
}

function normalizeLimit(value: number | undefined): number {
  const limit = value ?? NHTSA_MAKES_DEFAULT_LIMIT
  if (!Number.isInteger(limit) || limit < 1 || limit > NHTSA_MAKES_MAX_LIMIT) {
    throw new RuntimeFailure('INVALID_ARGUMENT', `--limit must be an integer from 1 to ${NHTSA_MAKES_MAX_LIMIT}.`)
  }
  return limit
}

function normalizeText(value: string, label: string): string {
  const text = value.trim()
  if (text.length === 0) {
    throw new RuntimeFailure('INVALID_ARGUMENT', `${label} must not be empty.`)
  }
  return text
}

function parseEnvelope<T>(value: unknown, parseItem: (value: unknown) => T, label: string): NhtsaEnvelope<T> {
  if (!isRecord(value) || typeof value.Count !== 'number' || typeof value.Message !== 'string' || typeof value.SearchCriteria !== 'string' || !Array.isArray(value.Results)) {
    throw new RuntimeFailure('OPEN_API_FAILED', `NHTSA vPIC ${label} response had an unexpected schema.`)
  }
  return {
    count: value.Count,
    message: value.Message,
    searchCriteria: value.SearchCriteria,
    results: value.Results.map(parseItem),
  }
}

function parseVinDecode(value: unknown): NhtsaVinDecode {
  if (!isRecord(value)) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'NHTSA vPIC VIN decode item had an unexpected schema.')
  }
  return {
    vin: optionalString(value.VIN),
    make: optionalString(value.Make),
    model: optionalString(value.Model),
    modelYear: optionalString(value.ModelYear),
    trim: optionalString(value.Trim),
    vehicleType: optionalString(value.VehicleType),
    bodyClass: optionalString(value.BodyClass),
    doors: optionalString(value.Doors),
    driveType: optionalString(value.DriveType),
    engineModel: optionalString(value.EngineModel),
    fuelTypePrimary: optionalString(value.FuelTypePrimary),
    plantCountry: optionalString(value.PlantCountry),
    manufacturer: optionalString(value.Manufacturer),
    errorCode: optionalString(value.ErrorCode),
    errorText: optionalString(value.ErrorText),
  }
}

function parseMakeForVehicleType(value: unknown): NhtsaMakeForVehicleType {
  if (!isRecord(value) || typeof value.MakeId !== 'number' || typeof value.MakeName !== 'string' || typeof value.VehicleTypeId !== 'number' || typeof value.VehicleTypeName !== 'string') {
    throw new RuntimeFailure('OPEN_API_FAILED', 'NHTSA vPIC make item had an unexpected schema.')
  }
  return {
    makeId: value.MakeId,
    makeName: value.MakeName,
    vehicleTypeId: value.VehicleTypeId,
    vehicleTypeName: value.VehicleTypeName,
  }
}

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value !== '' ? value : undefined
}

function normalizeBaseUrl(value: string): string {
  return value.endsWith('/') ? value : `${value}/`
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}
