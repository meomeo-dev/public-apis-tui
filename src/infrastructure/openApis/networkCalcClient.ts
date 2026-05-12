import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export const NETWORKCALC_DEFAULT_BASE_URL = 'https://networkcalc.com'
export const NETWORKCALC_DEFAULT_IP = '10.5.1.0'
export const NETWORKCALC_DEFAULT_CIDR = 27
export const NETWORKCALC_DEFAULT_BINARY = true
export const NETWORKCALC_DEFAULT_BINARY_VALUE = '1e7d6d'
export const NETWORKCALC_DEFAULT_FROM_BASE = 16
export const NETWORKCALC_DEFAULT_TO_BASE = 2

const supportedBases = [2, 8, 10, 16] as const

type SupportedBase = typeof supportedBases[number]

export type NetworkCalcSubnetInput = {
  ip?: string | undefined
  cidr?: number | undefined
  binary?: boolean | undefined
}

export type NormalizedNetworkCalcSubnetInput = {
  ip: string
  cidr: number
  binary: boolean
}

export type NetworkCalcBinaryInput = {
  value?: string | undefined
  from?: number | undefined
  to?: number | undefined
}

export type NormalizedNetworkCalcBinaryInput = {
  value: string
  from: SupportedBase
  to: SupportedBase
}

export type NetworkCalcSubnetPayload = {
  status: string
  meta?: {
    permalink?: string | undefined
    next_address?: string | undefined
  } | undefined
  address?: Record<string, unknown> | undefined
  error?: string | undefined
}

export type NetworkCalcBinaryPayload = {
  status: string
  original?: string | undefined
  converted?: string | undefined
  from?: string | undefined
  to?: string | undefined
  error?: string | undefined
}

export type NetworkCalcClientOptions = {
  baseUrl?: string | undefined
  fetchImpl?: typeof fetch | undefined
}

export class NetworkCalcClient {
  private readonly baseUrl: string
  private readonly fetchImpl: typeof fetch

  constructor(options: NetworkCalcClientOptions = {}) {
    this.baseUrl = normalizeBaseUrl(options.baseUrl ?? NETWORKCALC_DEFAULT_BASE_URL)
    this.fetchImpl = options.fetchImpl ?? fetch
  }

  async subnet(input: NetworkCalcSubnetInput | NormalizedNetworkCalcSubnetInput = {}): Promise<NetworkCalcSubnetPayload & { requestUrl: string }> {
    const query = isNormalizedSubnetInput(input) ? input : normalizeNetworkCalcSubnetInput(input)
    const url = createNetworkCalcSubnetUrl(this.baseUrl, query)
    const payload = await this.fetchJson<NetworkCalcSubnetPayload>(url, 'subnet')
    return { ...payload, requestUrl: url.href }
  }

  async binary(input: NetworkCalcBinaryInput | NormalizedNetworkCalcBinaryInput = {}): Promise<NetworkCalcBinaryPayload & { requestUrl: string }> {
    const query = normalizeNetworkCalcBinaryInput(input)
    const url = createNetworkCalcBinaryUrl(this.baseUrl, query)
    const payload = await this.fetchJson<NetworkCalcBinaryPayload>(url, 'binary')
    return { ...payload, requestUrl: url.href }
  }

  private async fetchJson<T extends { status?: string | undefined; error?: string | undefined }>(url: URL, operation: string): Promise<T> {
    let response: Response
    try {
      response = await this.fetchImpl(url, {
        method: 'GET',
        headers: {
          accept: 'application/json',
          'user-agent': 'public-apis-tui no-auth CLI (https://github.com/meomeo-dev/public-apis-tui)',
        },
      })
    } catch (error) {
      throw new RuntimeFailure('OPEN_API_FAILED', `NetworkCalc ${operation} request failed: ${String(error)}`, {
        provider: 'networkcalc',
        endpoint: url.href,
      })
    }

    const contentType = response.headers.get('content-type') ?? ''
    const body = await response.text()
    if (!contentType.includes('application/json')) {
      throw new RuntimeFailure('OPEN_API_FAILED', 'NetworkCalc returned a non-JSON response.', {
        provider: 'networkcalc',
        operation,
        endpoint: url.href,
        status: response.status,
        contentType,
        responsePreview: body.slice(0, 300),
      })
    }

    let payload: T
    try {
      payload = JSON.parse(body) as T
    } catch (error) {
      throw new RuntimeFailure('OPEN_API_FAILED', `NetworkCalc returned invalid JSON: ${String(error)}`, {
        provider: 'networkcalc',
        operation,
        endpoint: url.href,
        status: response.status,
        responsePreview: body.slice(0, 300),
      })
    }

    if (!response.ok || payload.status !== 'OK') {
      throw new RuntimeFailure('OPEN_API_FAILED', `NetworkCalc ${operation} request failed with status ${payload.status ?? response.status}.`, {
        provider: 'networkcalc',
        operation,
        endpoint: url.href,
        httpStatus: response.status,
        status: payload.status,
        error: payload.error,
      })
    }

    return payload
  }
}

export function normalizeNetworkCalcSubnetInput(input: NetworkCalcSubnetInput = {}): NormalizedNetworkCalcSubnetInput {
  return {
    ip: normalizeIp(input.ip),
    cidr: normalizeCidr(input.cidr),
    binary: input.binary ?? NETWORKCALC_DEFAULT_BINARY,
  }
}

export function normalizeNetworkCalcBinaryInput(input: NetworkCalcBinaryInput = {}): NormalizedNetworkCalcBinaryInput {
  const from = normalizeBase(input.from, NETWORKCALC_DEFAULT_FROM_BASE, 'from')
  const to = normalizeBase(input.to, NETWORKCALC_DEFAULT_TO_BASE, 'to')
  return {
    value: normalizeBinaryValue(input.value, from),
    from,
    to,
  }
}

export function createNetworkCalcSubnetUrl(baseUrl: string, input: NormalizedNetworkCalcSubnetInput): URL {
  const url = new URL(`${normalizeBaseUrl(baseUrl)}/api/ip/${input.ip}/${String(input.cidr)}`)
  url.searchParams.set('binary', input.binary ? 'true' : 'false')
  return url
}

export function createNetworkCalcBinaryUrl(baseUrl: string, input: NormalizedNetworkCalcBinaryInput): URL {
  const url = new URL(`${normalizeBaseUrl(baseUrl)}/api/binary/${input.value}`)
  url.searchParams.set('from', String(input.from))
  url.searchParams.set('to', String(input.to))
  return url
}

function normalizeIp(value: string | undefined): string {
  const ip = (value ?? NETWORKCALC_DEFAULT_IP).trim()
  const parts = ip.split('.')
  if (parts.length !== 4) {
    throw new RuntimeFailure('INVALID_ARGUMENT', 'NetworkCalc --ip must be an IPv4 address.', { ip: value })
  }
  for (const part of parts) {
    if (!/^\d{1,3}$/u.test(part)) {
      throw new RuntimeFailure('INVALID_ARGUMENT', 'NetworkCalc --ip must be an IPv4 address.', { ip: value })
    }
    const octet = Number(part)
    if (!Number.isInteger(octet) || octet < 0 || octet > 255) {
      throw new RuntimeFailure('INVALID_ARGUMENT', 'NetworkCalc --ip octets must be integers from 0 to 255.', { ip: value })
    }
  }
  return ip
}

function normalizeCidr(value: number | undefined): number {
  const cidr = value ?? NETWORKCALC_DEFAULT_CIDR
  if (!Number.isInteger(cidr) || cidr < 0 || cidr > 32) {
    throw new RuntimeFailure('INVALID_ARGUMENT', 'NetworkCalc --cidr must be an integer from 0 to 32.', { cidr: value })
  }
  return cidr
}

function normalizeBase(value: number | undefined, defaultValue: SupportedBase, optionName: string): SupportedBase {
  const base = value ?? defaultValue
  if (supportedBases.includes(base as SupportedBase)) {
    return base as SupportedBase
  }
  throw new RuntimeFailure('INVALID_ARGUMENT', `NetworkCalc --${optionName} must be one of: ${supportedBases.join(', ')}.`, { base: value })
}

function normalizeBinaryValue(value: string | undefined, from: SupportedBase): string {
  const normalized = (value ?? NETWORKCALC_DEFAULT_BINARY_VALUE).trim()
  if (normalized.length < 1 || normalized.length > 128) {
    throw new RuntimeFailure('INVALID_ARGUMENT', 'NetworkCalc --value must be between 1 and 128 characters.', { value })
  }
  const pattern = patternForBase(from)
  if (!pattern.test(normalized)) {
    throw new RuntimeFailure('INVALID_ARGUMENT', `NetworkCalc --value contains digits outside base ${String(from)}.`, { value, from })
  }
  return normalized.toLowerCase()
}

function patternForBase(base: SupportedBase): RegExp {
  switch (base) {
    case 2:
      return /^[01]+$/u
    case 8:
      return /^[0-7]+$/u
    case 10:
      return /^\d+$/u
    case 16:
      return /^[0-9a-fA-F]+$/u
  }
}

function normalizeBaseUrl(value: string): string {
  return value.replace(/\/+$/u, '')
}

function isNormalizedSubnetInput(value: NetworkCalcSubnetInput | NormalizedNetworkCalcSubnetInput): value is NormalizedNetworkCalcSubnetInput {
  return typeof value.ip === 'string' && typeof value.cidr === 'number' && typeof value.binary === 'boolean'
}
