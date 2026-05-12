import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export const FAKER_API_DEFAULT_BASE_URL = 'https://fakerapi.it/api/v2'
export const FAKER_API_DEFAULT_QUANTITY = 10
export const FAKER_API_MAX_QUANTITY = 100
export const FAKER_API_DEFAULT_LOCALE = 'en_US'

export type FakerApiCommonInput = {
  quantity?: number | undefined
  locale?: string | undefined
  seed?: number | undefined
}

export type NormalizedFakerApiCommonInput = {
  quantity: number
  locale?: string | undefined
  seed?: number | undefined
}

export type FakerApiRateLimit = {
  limit?: string | undefined
  remaining?: string | undefined
}

export type FakerApiEnvelope<T> = {
  status: string
  code: number
  total: number
  data: T[]
  rateLimit: FakerApiRateLimit
}

export type FakerApiAddress = {
  id?: number | undefined
  street?: string | undefined
  streetName?: string | undefined
  buildingNumber?: string | undefined
  city?: string | undefined
  zipcode?: string | undefined
  country?: string | undefined
  countryCode?: string | undefined
  latitude?: number | undefined
  longitude?: number | undefined
}

export type FakerApiPerson = {
  id: number
  firstName: string
  lastName: string
  email?: string | undefined
  phone?: string | undefined
  birthday?: string | undefined
  gender?: string | undefined
  address?: FakerApiAddress | undefined
  website?: string | undefined
  image?: string | undefined
}

export type FakerApiCompany = {
  id: number
  name: string
  email?: string | undefined
  vat?: string | undefined
  phone?: string | undefined
  country?: string | undefined
  addresses: FakerApiAddress[]
  website?: string | undefined
  image?: string | undefined
  contact?: FakerApiPerson | undefined
}

export class FakerApiClient {
  constructor(private readonly options: { baseUrl?: string | undefined; fetchImpl?: typeof fetch | undefined } = {}) {}

  async listPersons(input: NormalizedFakerApiCommonInput): Promise<FakerApiEnvelope<FakerApiPerson>> {
    const { parsed, rateLimit } = await this.fetchJson('/persons', input)
    return parseEnvelope(parsed, rateLimit, parsePerson, 'persons')
  }

  async listCompanies(input: NormalizedFakerApiCommonInput): Promise<FakerApiEnvelope<FakerApiCompany>> {
    const { parsed, rateLimit } = await this.fetchJson('/companies', input)
    return parseEnvelope(parsed, rateLimit, parseCompany, 'companies')
  }

  private async fetchJson(path: string, input: NormalizedFakerApiCommonInput): Promise<{ parsed: unknown; rateLimit: FakerApiRateLimit }> {
    const url = new URL(path.replace(/^\/+/u, ''), normalizeBaseUrl(this.options.baseUrl ?? FAKER_API_DEFAULT_BASE_URL))
    url.searchParams.set('_quantity', String(input.quantity))
    if (input.locale !== undefined) {
      url.searchParams.set('_locale', input.locale)
    }
    if (input.seed !== undefined) {
      url.searchParams.set('_seed', String(input.seed))
    }

    const fetchImpl = this.options.fetchImpl ?? globalThis.fetch
    let response: Response
    try {
      response = await fetchImpl(url, { headers: { accept: 'application/json' } })
    } catch (error) {
      throw new RuntimeFailure('OPEN_API_FAILED', `FakerAPI request failed: ${String(error)}`, {
        provider: 'fakerapi',
        endpoint: url.href,
      })
    }

    let parsed: unknown
    try {
      parsed = await response.json()
    } catch (error) {
      throw new RuntimeFailure('OPEN_API_FAILED', `FakerAPI returned a non-JSON response: ${String(error)}`, {
        provider: 'fakerapi',
        status: response.status,
        endpoint: url.href,
      })
    }

    if (!response.ok) {
      throw new RuntimeFailure('OPEN_API_FAILED', `FakerAPI request failed with HTTP ${response.status}.`, {
        provider: 'fakerapi',
        status: response.status,
        endpoint: url.href,
        response: parsed,
      })
    }

    return { parsed, rateLimit: readRateLimit(response.headers) }
  }
}

export function normalizeFakerApiCommonInput(input: FakerApiCommonInput = {}): NormalizedFakerApiCommonInput {
  return {
    quantity: normalizeQuantity(input.quantity),
    ...(input.locale !== undefined ? { locale: normalizeLocale(input.locale) } : {}),
    ...(input.seed !== undefined ? { seed: normalizeSeed(input.seed) } : {}),
  }
}

function normalizeQuantity(value: number | undefined): number {
  const quantity = value ?? FAKER_API_DEFAULT_QUANTITY
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > FAKER_API_MAX_QUANTITY) {
    throw new RuntimeFailure('INVALID_ARGUMENT', `--quantity must be an integer from 1 to ${FAKER_API_MAX_QUANTITY}.`)
  }
  return quantity
}

function normalizeLocale(value: string): string {
  const locale = value.trim()
  if (!/^[a-z]{2}_[A-Z]{2}$/u.test(locale)) {
    throw new RuntimeFailure('INVALID_ARGUMENT', '--locale must use FakerAPI locale format like en_US or it_IT.')
  }
  return locale
}

function normalizeSeed(value: number): number {
  if (!Number.isInteger(value) || value < 0) {
    throw new RuntimeFailure('INVALID_ARGUMENT', '--seed must be a non-negative integer.')
  }
  return value
}

function parseEnvelope<T>(value: unknown, rateLimit: FakerApiRateLimit, parseItem: (item: unknown) => T, label: string): FakerApiEnvelope<T> {
  if (!isRecord(value) || typeof value.status !== 'string' || typeof value.code !== 'number' || typeof value.total !== 'number' || !Array.isArray(value.data)) {
    throw new RuntimeFailure('OPEN_API_FAILED', `FakerAPI ${label} response had an unexpected schema.`)
  }
  return {
    status: value.status,
    code: value.code,
    total: value.total,
    data: value.data.map(parseItem),
    rateLimit,
  }
}

function parsePerson(value: unknown): FakerApiPerson {
  if (!isRecord(value) || typeof value.id !== 'number' || typeof value.firstname !== 'string' || typeof value.lastname !== 'string') {
    throw new RuntimeFailure('OPEN_API_FAILED', 'FakerAPI person item had an unexpected schema.')
  }
  return {
    id: value.id,
    firstName: value.firstname,
    lastName: value.lastname,
    email: optionalString(value.email),
    phone: optionalString(value.phone),
    birthday: optionalString(value.birthday),
    gender: optionalString(value.gender),
    address: value.address === undefined ? undefined : parseAddress(value.address),
    website: optionalString(value.website),
    image: optionalString(value.image),
  }
}

function parseCompany(value: unknown): FakerApiCompany {
  if (!isRecord(value) || typeof value.id !== 'number' || typeof value.name !== 'string') {
    throw new RuntimeFailure('OPEN_API_FAILED', 'FakerAPI company item had an unexpected schema.')
  }
  return {
    id: value.id,
    name: value.name,
    email: optionalString(value.email),
    vat: optionalString(value.vat),
    phone: optionalString(value.phone),
    country: optionalString(value.country),
    addresses: Array.isArray(value.addresses) ? value.addresses.map(parseAddress) : [],
    website: optionalString(value.website),
    image: optionalString(value.image),
    contact: value.contact === undefined ? undefined : parsePerson(value.contact),
  }
}

function parseAddress(value: unknown): FakerApiAddress {
  if (!isRecord(value)) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'FakerAPI address item had an unexpected schema.')
  }
  return {
    id: optionalNumber(value.id),
    street: optionalString(value.street),
    streetName: optionalString(value.streetName),
    buildingNumber: optionalString(value.buildingNumber),
    city: optionalString(value.city),
    zipcode: optionalString(value.zipcode),
    country: optionalString(value.country),
    countryCode: optionalString(value.country_code),
    latitude: optionalNumber(value.latitude),
    longitude: optionalNumber(value.longitude),
  }
}

function readRateLimit(headers: Headers): FakerApiRateLimit {
  return {
    ...(headers.get('x-ratelimit-limit') !== null ? { limit: String(headers.get('x-ratelimit-limit')) } : {}),
    ...(headers.get('x-ratelimit-remaining') !== null ? { remaining: String(headers.get('x-ratelimit-remaining')) } : {}),
  }
}

function normalizeBaseUrl(value: string): string {
  return value.endsWith('/') ? value : `${value}/`
}

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined
}

function optionalNumber(value: unknown): number | undefined {
  return typeof value === 'number' ? value : undefined
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}
