import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export const BINLIST_DEFAULT_BASE_URL = 'https://lookup.binlist.net'
export const BINLIST_DEFAULT_BIN = '45717360'

export type BinlistLookupInput = {
  bin?: string | undefined
}

export type NormalizedBinlistLookupInput = {
  bin: string
}

export type BinlistLookupResult = {
  number: Record<string, unknown>
  scheme?: string | undefined
  type?: string | undefined
  brand?: string | undefined
  prepaid?: boolean | undefined
  country?: Record<string, unknown> | undefined
  bank?: Record<string, unknown> | undefined
}

export class BinlistClient {
  constructor(private readonly options: { baseUrl?: string | undefined; fetchImpl?: typeof fetch } = {}) {}

  async lookup(input: NormalizedBinlistLookupInput): Promise<BinlistLookupResult> {
    const url = new URL(`/${encodeURIComponent(input.bin)}`, normalizeBaseUrl(this.options.baseUrl ?? BINLIST_DEFAULT_BASE_URL))
    const parsed = await this.fetchJson(url)
    return parseLookupResponse(parsed)
  }

  private async fetchJson(url: URL): Promise<unknown> {
    const fetchImpl = this.options.fetchImpl ?? globalThis.fetch
    let response: Response
    try {
      response = await fetchImpl(url, { headers: { accept: 'application/json', 'accept-version': '3' } })
    } catch (error) {
      throw new RuntimeFailure('OPEN_API_FAILED', `Binlist request failed: ${String(error)}`, {
        provider: 'binlist',
        endpoint: url.href,
      })
    }

    let parsed: unknown
    try {
      parsed = await response.json()
    } catch (error) {
      throw new RuntimeFailure('OPEN_API_FAILED', `Binlist returned a non-JSON response: ${String(error)}`, {
        provider: 'binlist',
        status: response.status,
        endpoint: url.href,
      })
    }

    if (!response.ok) {
      throw new RuntimeFailure('OPEN_API_FAILED', readApiError(parsed) ?? `Binlist request failed with HTTP ${response.status}.`, {
        provider: 'binlist',
        status: response.status,
        endpoint: url.href,
        response: parsed,
      })
    }

    return parsed
  }
}

export function normalizeBinlistLookupInput(input: BinlistLookupInput = {}): NormalizedBinlistLookupInput {
  return { bin: normalizeBin(input.bin) }
}

function normalizeBin(value: string | undefined): string {
  const normalized = (value ?? BINLIST_DEFAULT_BIN).replace(/[\s-]/gu, '')
  if (!/^\d{6,19}$/u.test(normalized)) {
    throw new RuntimeFailure('INVALID_ARGUMENT', '--bin must contain 6 to 19 digits, with optional spaces or hyphens.')
  }
  return normalized
}

function parseLookupResponse(value: unknown): BinlistLookupResult {
  if (!isRecord(value)) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'Binlist response had an unexpected schema.')
  }
  return {
    number: isRecord(value.number) ? value.number : {},
    ...(typeof value.scheme === 'string' ? { scheme: value.scheme } : {}),
    ...(typeof value.type === 'string' ? { type: value.type } : {}),
    ...(typeof value.brand === 'string' ? { brand: value.brand } : {}),
    ...(typeof value.prepaid === 'boolean' ? { prepaid: value.prepaid } : {}),
    ...(isRecord(value.country) ? { country: value.country } : {}),
    ...(isRecord(value.bank) ? { bank: value.bank } : {}),
  }
}

function readApiError(value: unknown): string | undefined {
  if (!isRecord(value)) {
    return undefined
  }
  if (typeof value.message === 'string') {
    return value.message
  }
  if (typeof value.error === 'string') {
    return value.error
  }
  return undefined
}

function normalizeBaseUrl(value: string): string {
  return value.endsWith('/') ? value : `${value}/`
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}
