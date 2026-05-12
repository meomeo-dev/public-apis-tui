import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export const FIPE_DEFAULT_BASE_URL = 'https://parallelum.com.br/fipe/api/v1'
export const FIPE_DEFAULT_VEHICLE_TYPE = 'carros'
export const FIPE_DEFAULT_BRAND_CODE = '59'
export const FIPE_DEFAULT_MODEL_CODE = '5940'
export const FIPE_DEFAULT_YEAR_CODE = '2014-3'
export const FIPE_DEFAULT_LIMIT = 100
export const FIPE_MAX_LIMIT = 1000

export type FipeVehicleType = 'carros' | 'motos' | 'caminhoes'

export type FipeListInput = {
  vehicleType?: string | undefined
  query?: string | undefined
  limit?: number | undefined
}

export type FipeModelsInput = FipeListInput & {
  brandCode?: string | undefined
}

export type FipeYearsInput = FipeModelsInput & {
  modelCode?: string | undefined
}

export type FipePriceInput = {
  vehicleType?: string | undefined
  brandCode?: string | undefined
  modelCode?: string | undefined
  yearCode?: string | undefined
}

export type NormalizedFipeListInput = {
  vehicleType: FipeVehicleType
  limit: number
  query?: string | undefined
}

export type NormalizedFipeModelsInput = NormalizedFipeListInput & {
  brandCode: string
}

export type NormalizedFipeYearsInput = NormalizedFipeModelsInput & {
  modelCode: string
}

export type NormalizedFipePriceInput = {
  vehicleType: FipeVehicleType
  brandCode: string
  modelCode: string
  yearCode: string
}

export type FipeOption = {
  code: string
  name: string
}

export type FipeRateLimit = {
  limit?: string | undefined
  remaining?: string | undefined
  reset?: string | undefined
}

export type FipeListResponse = {
  items: FipeOption[]
  totalItems: number
  rateLimit: FipeRateLimit
}

export type FipePrice = {
  vehicleTypeCode?: number | undefined
  value: string
  brand: string
  model: string
  modelYear: number
  fuel: string
  fipeCode: string
  referenceMonth: string
  fuelAcronym?: string | undefined
}

export type FipePriceResponse = {
  price: FipePrice
  rateLimit: FipeRateLimit
}

export class FipeClient {
  constructor(private readonly options: { baseUrl?: string | undefined; fetchImpl?: typeof fetch | undefined } = {}) {}

  async brands(input: NormalizedFipeListInput): Promise<FipeListResponse> {
    return this.readOptions(`${input.vehicleType}/marcas`, input)
  }

  async models(input: NormalizedFipeModelsInput): Promise<FipeListResponse> {
    return this.readOptions(`${input.vehicleType}/marcas/${input.brandCode}/modelos`, input, 'modelos')
  }

  async years(input: NormalizedFipeYearsInput): Promise<FipeListResponse> {
    return this.readOptions(`${input.vehicleType}/marcas/${input.brandCode}/modelos/${input.modelCode}/anos`, input)
  }

  async price(input: NormalizedFipePriceInput): Promise<FipePriceResponse> {
    const { parsed, response } = await this.fetchJson(`${input.vehicleType}/marcas/${input.brandCode}/modelos/${input.modelCode}/anos/${input.yearCode}`)
    return {
      price: parsePrice(parsed),
      rateLimit: readRateLimit(response),
    }
  }

  private async readOptions(path: string, input: NormalizedFipeListInput, nestedKey?: string): Promise<FipeListResponse> {
    const { parsed, response } = await this.fetchJson(path)
    const options = parseOptions(nestedKey === undefined ? parsed : isRecord(parsed) ? parsed[nestedKey] : undefined)
    const filtered = filterOptions(options, input.query)
    return {
      items: filtered.slice(0, input.limit),
      totalItems: options.length,
      rateLimit: readRateLimit(response),
    }
  }

  private async fetchJson(path: string): Promise<{ parsed: unknown; response: Response }> {
    const url = new URL(path, normalizeBaseUrl(this.options.baseUrl ?? FIPE_DEFAULT_BASE_URL))
    const fetchImpl = this.options.fetchImpl ?? globalThis.fetch
    let response: Response
    try {
      response = await fetchImpl(url, { headers: { accept: 'application/json', 'user-agent': 'public-apis-tui-cli' } })
    } catch (error) {
      throw new RuntimeFailure('OPEN_API_FAILED', `Fipe request failed: ${String(error)}`, { provider: 'fipe', endpoint: url.href })
    }

    let parsed: unknown
    try {
      parsed = await response.json()
    } catch (error) {
      throw new RuntimeFailure('OPEN_API_FAILED', `Fipe returned a non-JSON response: ${String(error)}`, { provider: 'fipe', endpoint: url.href, status: response.status })
    }

    if (!response.ok) {
      throw new RuntimeFailure('OPEN_API_FAILED', readErrorMessage(parsed) ?? `Fipe request failed with HTTP ${response.status}.`, { provider: 'fipe', endpoint: url.href, status: response.status, response: parsed })
    }

    return { parsed, response }
  }
}

export function normalizeFipeListInput(input: FipeListInput = {}): NormalizedFipeListInput {
  return {
    vehicleType: normalizeVehicleType(input.vehicleType ?? FIPE_DEFAULT_VEHICLE_TYPE),
    limit: normalizeInteger(input.limit ?? FIPE_DEFAULT_LIMIT, '--limit', 1, FIPE_MAX_LIMIT),
    ...(input.query !== undefined ? { query: normalizeText(input.query, '--query') } : {}),
  }
}

export function normalizeFipeModelsInput(input: FipeModelsInput = {}): NormalizedFipeModelsInput {
  return {
    ...normalizeFipeListInput(input),
    brandCode: normalizeCode(input.brandCode ?? FIPE_DEFAULT_BRAND_CODE, '--brand-code'),
  }
}

export function normalizeFipeYearsInput(input: FipeYearsInput = {}): NormalizedFipeYearsInput {
  return {
    ...normalizeFipeModelsInput(input),
    modelCode: normalizeCode(input.modelCode ?? FIPE_DEFAULT_MODEL_CODE, '--model-code'),
  }
}

export function normalizeFipePriceInput(input: FipePriceInput = {}): NormalizedFipePriceInput {
  return {
    vehicleType: normalizeVehicleType(input.vehicleType ?? FIPE_DEFAULT_VEHICLE_TYPE),
    brandCode: normalizeCode(input.brandCode ?? FIPE_DEFAULT_BRAND_CODE, '--brand-code'),
    modelCode: normalizeCode(input.modelCode ?? FIPE_DEFAULT_MODEL_CODE, '--model-code'),
    yearCode: normalizeYearCode(input.yearCode ?? FIPE_DEFAULT_YEAR_CODE),
  }
}

function parseOptions(value: unknown): FipeOption[] {
  if (!Array.isArray(value)) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'Fipe option response must be an array.')
  }
  return value.filter(isRecord).map(entry => {
    const code = entry.codigo
    const name = entry.nome
    if ((typeof code !== 'string' && typeof code !== 'number') || typeof name !== 'string') {
      throw new RuntimeFailure('OPEN_API_FAILED', 'Fipe option rows must include codigo/nome.')
    }
    return { code: String(code), name }
  })
}

function parsePrice(value: unknown): FipePrice {
  if (!isRecord(value) || typeof value.Valor !== 'string' || typeof value.Marca !== 'string' || typeof value.Modelo !== 'string' || typeof value.AnoModelo !== 'number' || typeof value.Combustivel !== 'string' || typeof value.CodigoFipe !== 'string' || typeof value.MesReferencia !== 'string') {
    throw new RuntimeFailure('OPEN_API_FAILED', 'Fipe price response must include Valor, Marca, Modelo, AnoModelo, Combustivel, CodigoFipe, and MesReferencia.')
  }
  return {
    vehicleTypeCode: typeof value.TipoVeiculo === 'number' ? value.TipoVeiculo : undefined,
    value: value.Valor,
    brand: value.Marca,
    model: value.Modelo,
    modelYear: value.AnoModelo,
    fuel: value.Combustivel,
    fipeCode: value.CodigoFipe,
    referenceMonth: value.MesReferencia,
    fuelAcronym: typeof value.SiglaCombustivel === 'string' ? value.SiglaCombustivel : undefined,
  }
}

function filterOptions(options: FipeOption[], query: string | undefined): FipeOption[] {
  if (query === undefined) return options
  const normalizedQuery = query.toLowerCase()
  return options.filter(option => `${option.code} ${option.name}`.toLowerCase().includes(normalizedQuery))
}

function normalizeVehicleType(value: string): FipeVehicleType {
  const normalized = value.trim().toLowerCase()
  if (normalized === 'carros' || normalized === 'motos' || normalized === 'caminhoes') {
    return normalized
  }
  throw new RuntimeFailure('INVALID_ARGUMENT', '--vehicle-type must be one of carros, motos, or caminhoes.')
}

function normalizeCode(value: string, label: string): string {
  const normalized = normalizeText(value, label)
  if (!/^\d{1,8}$/u.test(normalized)) {
    throw new RuntimeFailure('INVALID_ARGUMENT', `${label} must be a numeric code.`)
  }
  return normalized
}

function normalizeYearCode(value: string): string {
  const normalized = normalizeText(value, '--year-code')
  if (!/^\d{4}-\d$/u.test(normalized) && !/^32000-\d$/u.test(normalized)) {
    throw new RuntimeFailure('INVALID_ARGUMENT', '--year-code must look like 2014-3 or 32000-1.')
  }
  return normalized
}

function normalizeText(value: string, label: string): string {
  const normalized = value.trim()
  if (normalized === '') throw new RuntimeFailure('INVALID_ARGUMENT', `${label} cannot be empty.`)
  if (normalized.length > 120) throw new RuntimeFailure('INVALID_ARGUMENT', `${label} must be 120 characters or fewer.`)
  return normalized
}

function normalizeInteger(value: number, label: string, min: number, max: number): number {
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new RuntimeFailure('INVALID_ARGUMENT', `${label} must be an integer between ${min} and ${max}.`)
  }
  return value
}

function readRateLimit(response: Response): FipeRateLimit {
  return {
    limit: response.headers.get('x-ratelimit-limit') ?? undefined,
    remaining: response.headers.get('x-ratelimit-remaining') ?? undefined,
    reset: response.headers.get('x-ratelimit-reset') ?? undefined,
  }
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
