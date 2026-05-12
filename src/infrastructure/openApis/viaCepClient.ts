import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export const VIA_CEP_BASE_URL = 'https://viacep.com.br'
export const VIA_CEP_DOCS_URL = 'https://viacep.com.br/'
export const VIA_CEP_DEFAULT_CEP = '01001000'
export const VIA_CEP_DEFAULT_STATE = 'SP'
export const VIA_CEP_DEFAULT_CITY = 'São Paulo'
export const VIA_CEP_DEFAULT_STREET = 'Paulista'
export const VIA_CEP_DEFAULT_LIMIT = 10
export const VIA_CEP_MAX_LIMIT = 50

const BRAZILIAN_STATES = [
  'AC',
  'AL',
  'AP',
  'AM',
  'BA',
  'CE',
  'DF',
  'ES',
  'GO',
  'MA',
  'MT',
  'MS',
  'MG',
  'PA',
  'PB',
  'PR',
  'PE',
  'PI',
  'RJ',
  'RN',
  'RS',
  'RO',
  'RR',
  'SC',
  'SP',
  'SE',
  'TO',
] as const

export type ViaCepLookupInput = {
  cep?: string | undefined
}

export type ViaCepSearchInput = {
  state?: string | undefined
  city?: string | undefined
  street?: string | undefined
  limit?: number | undefined
}

export type NormalizedViaCepLookupInput = {
  cep: string
}

export type NormalizedViaCepSearchInput = {
  state: string
  city: string
  street: string
  limit: number
}

export type ViaCepAddress = {
  cep: string
  street?: string | undefined
  complement?: string | undefined
  unit?: string | undefined
  neighborhood?: string | undefined
  city?: string | undefined
  state?: string | undefined
  stateName?: string | undefined
  region?: string | undefined
  ibge?: string | undefined
  gia?: string | undefined
  ddd?: string | undefined
  siafi?: string | undefined
}

type ViaCepClientOptions = {
  baseUrl?: string | undefined
  fetchImpl?: typeof fetch | undefined
}

export class ViaCepClient {
  constructor(private readonly options: ViaCepClientOptions = {}) {}

  async lookup(input: NormalizedViaCepLookupInput): Promise<ViaCepAddress | undefined> {
    const url = new URL(`/ws/${input.cep}/json/`, this.options.baseUrl ?? VIA_CEP_BASE_URL)
    const parsed = await this.fetchJson(url)
    if (isViaCepError(parsed)) {
      return undefined
    }
    return parseViaCepAddress(parsed)
  }

  async search(input: NormalizedViaCepSearchInput): Promise<ViaCepAddress[]> {
    const url = new URL(
      `/ws/${input.state}/${encodeURIComponent(input.city)}/${encodeURIComponent(input.street)}/json/`,
      this.options.baseUrl ?? VIA_CEP_BASE_URL,
    )
    const parsed = await this.fetchJson(url)
    if (!Array.isArray(parsed)) {
      throw new RuntimeFailure('OPEN_API_FAILED', 'ViaCep search response was not a JSON array.', {
        provider: 'viacep',
        response: parsed,
      })
    }
    return parsed.map(parseViaCepAddress).slice(0, input.limit)
  }

  private async fetchJson(url: URL): Promise<unknown> {
    const fetchImpl = this.options.fetchImpl ?? globalThis.fetch
    let response: Response
    try {
      response = await fetchImpl(url, { headers: { accept: 'application/json' } })
    } catch (error) {
      throw new RuntimeFailure('OPEN_API_FAILED', `ViaCep request failed: ${String(error)}`, {
        provider: 'viacep',
        endpoint: url.href,
      })
    }

    let body: string
    try {
      body = await response.text()
    } catch (error) {
      throw new RuntimeFailure('OPEN_API_FAILED', `ViaCep response body could not be read: ${String(error)}`, {
        provider: 'viacep',
        endpoint: url.href,
        status: response.status,
      })
    }

    if (isCloudflareChallenge(response, body)) {
      throw new RuntimeFailure('OPEN_API_FAILED', 'ViaCep is currently returning a Cloudflare challenge HTML page instead of the documented JSON API response; retry later or use cached/offline data.', {
        provider: 'viacep',
        endpoint: url.href,
        status: response.status,
      })
    }

    let parsed: unknown
    try {
      parsed = JSON.parse(body)
    } catch (error) {
      throw new RuntimeFailure('OPEN_API_FAILED', `ViaCep returned a non-JSON response: ${String(error)}`, {
        provider: 'viacep',
        endpoint: url.href,
        status: response.status,
        contentType: response.headers.get('content-type') ?? undefined,
      })
    }

    if (!response.ok) {
      throw new RuntimeFailure('OPEN_API_FAILED', `ViaCep request failed with HTTP ${response.status}.`, {
        provider: 'viacep',
        endpoint: url.href,
        status: response.status,
        response: parsed,
      })
    }
    return parsed
  }
}

export function normalizeViaCepLookupInput(input: ViaCepLookupInput = {}): NormalizedViaCepLookupInput {
  return { cep: normalizeCep(input.cep ?? VIA_CEP_DEFAULT_CEP) }
}

export function normalizeViaCepSearchInput(input: ViaCepSearchInput = {}): NormalizedViaCepSearchInput {
  return {
    state: normalizeState(input.state ?? VIA_CEP_DEFAULT_STATE),
    city: normalizePathText(input.city ?? VIA_CEP_DEFAULT_CITY, '--city'),
    street: normalizePathText(input.street ?? VIA_CEP_DEFAULT_STREET, '--street'),
    limit: normalizeInteger(input.limit, VIA_CEP_DEFAULT_LIMIT, 1, VIA_CEP_MAX_LIMIT, '--limit'),
  }
}

function normalizeCep(value: string): string {
  const cep = value.trim().replace(/\D/gu, '')
  if (!/^\d{8}$/u.test(cep)) {
    throw new RuntimeFailure('INVALID_ARGUMENT', '--cep must contain exactly 8 digits, such as 01001000 or 01001-000.')
  }
  return cep
}

function normalizeState(value: string): string {
  const state = value.trim().toUpperCase()
  if (!BRAZILIAN_STATES.includes(state as (typeof BRAZILIAN_STATES)[number])) {
    throw new RuntimeFailure('INVALID_ARGUMENT', `--state must be a Brazilian UF code: ${BRAZILIAN_STATES.join(', ')}.`)
  }
  return state
}

function normalizePathText(value: string, label: string): string {
  const text = value.trim().replace(/\s+/gu, ' ')
  if (text.length < 3 || text.length > 80 || /[/?#\\]/u.test(text)) {
    throw new RuntimeFailure('INVALID_ARGUMENT', `${label} must be 3-80 characters and cannot contain URL path/query separators.`)
  }
  return text
}

function normalizeInteger(value: number | undefined, fallback: number, min: number, max: number, label: string): number {
  const parsed = value ?? fallback
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    throw new RuntimeFailure('INVALID_ARGUMENT', `${label} must be an integer between ${String(min)} and ${String(max)}.`)
  }
  return parsed
}

function isViaCepError(value: unknown): boolean {
  return isRecord(value) && (value.erro === true || value.erro === 'true')
}

function parseViaCepAddress(value: unknown): ViaCepAddress {
  if (!isRecord(value)) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'ViaCep address entry had an unexpected schema.', {
      provider: 'viacep',
      response: value,
    })
  }
  return {
    cep: readRequiredString(value, 'cep'),
    ...readOptionalStringAs(value, 'logradouro', 'street'),
    ...readOptionalStringAs(value, 'complemento', 'complement'),
    ...readOptionalStringAs(value, 'unidade', 'unit'),
    ...readOptionalStringAs(value, 'bairro', 'neighborhood'),
    ...readOptionalStringAs(value, 'localidade', 'city'),
    ...readOptionalStringAs(value, 'uf', 'state'),
    ...readOptionalStringAs(value, 'estado', 'stateName'),
    ...readOptionalStringAs(value, 'regiao', 'region'),
    ...readOptionalStringAs(value, 'ibge', 'ibge'),
    ...readOptionalStringAs(value, 'gia', 'gia'),
    ...readOptionalStringAs(value, 'ddd', 'ddd'),
    ...readOptionalStringAs(value, 'siafi', 'siafi'),
  }
}

function readRequiredString(record: Record<string, unknown>, key: string): string {
  const value = record[key]
  if (typeof value !== 'string' || value.trim() === '') {
    throw new RuntimeFailure('OPEN_API_FAILED', `ViaCep response was missing required field ${key}.`, {
      provider: 'viacep',
      response: record,
    })
  }
  return value.trim()
}

function readOptionalStringAs(record: Record<string, unknown>, sourceKey: string, targetKey: keyof ViaCepAddress): Partial<ViaCepAddress> {
  const value = record[sourceKey]
  return typeof value === 'string' && value.trim() !== '' ? { [targetKey]: value.trim() } : {}
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function isCloudflareChallenge(response: Response, body: string): boolean {
  const server = response.headers.get('server')?.toLowerCase()
  const mitigated = response.headers.get('cf-mitigated')?.toLowerCase()
  const contentType = response.headers.get('content-type')?.toLowerCase()
  return (
    mitigated === 'challenge' ||
    body.includes('Just a moment...') ||
    ((response.status === 403 || response.status === 429) && server === 'cloudflare' && contentType?.includes('text/html') === true)
  )
}
