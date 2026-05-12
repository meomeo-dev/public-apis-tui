import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export const PHP_NOISE_DEFAULT_BASE_URL = 'https://php-noise.com/noise.php'

export type PhpNoiseGenerateQuery = {
  hex?: string | undefined
  tiles?: number | undefined
  tileSize?: number | undefined
  borderWidth?: number | undefined
  mode?: 'brightness' | 'around' | undefined
  multi?: string | undefined
  steps?: number | undefined
}

export type PhpNoiseGenerateResponse = {
  base64: string
}

export type PhpNoiseClientOptions = {
  baseUrl?: string | undefined
  fetchImpl?: typeof fetch | undefined
}

export class PhpNoiseClient {
  private readonly baseUrl: string
  private readonly fetchImpl: typeof fetch

  constructor(options: PhpNoiseClientOptions = {}) {
    this.baseUrl = options.baseUrl ?? PHP_NOISE_DEFAULT_BASE_URL
    this.fetchImpl = options.fetchImpl ?? fetch
  }

  async generate(query: PhpNoiseGenerateQuery = {}): Promise<PhpNoiseGenerateResponse> {
    const url = new URL(this.baseUrl)
    url.searchParams.set('base64', '')
    appendOptionalStringParam(url, 'hex', query.hex)
    appendOptionalNumberParam(url, 'tiles', query.tiles)
    appendOptionalNumberParam(url, 'tileSize', query.tileSize)
    appendOptionalNumberParam(url, 'borderWidth', query.borderWidth)
    appendOptionalStringParam(url, 'mode', query.mode)
    appendOptionalStringParam(url, 'multi', query.multi)
    appendOptionalNumberParam(url, 'steps', query.steps)

    const response = await this.fetchImpl(url, {
      method: 'GET',
      headers: {
        accept: 'application/json',
        'user-agent': 'public-apis-tui no-auth CLI',
      },
    })

    let parsed: unknown
    try {
      parsed = await response.json()
    } catch {
      throw new RuntimeFailure('OPEN_API_FAILED', 'PHP-Noise returned a non-JSON response; JSON requires the base64 parameter.', {
        status: response.status,
        statusText: response.statusText,
      })
    }

    if (!response.ok) {
      throw new RuntimeFailure('OPEN_API_FAILED', readErrorMessage(parsed) ?? response.statusText ?? 'PHP-Noise request failed.', {
        status: response.status,
        response: parsed,
      })
    }

    return parseGenerateResponse(parsed)
  }
}

function appendOptionalStringParam(url: URL, key: string, value: string | undefined): void {
  if (value !== undefined && value.trim() !== '') {
    url.searchParams.set(key, value.trim())
  }
}

function appendOptionalNumberParam(url: URL, key: string, value: number | undefined): void {
  if (value !== undefined) {
    url.searchParams.set(key, String(value))
  }
}

function parseGenerateResponse(value: unknown): PhpNoiseGenerateResponse {
  if (!isRecord(value)) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'PHP-Noise base64 response must be an object.')
  }
  const base64 = value.base64
  if (typeof base64 !== 'string' || !base64.startsWith('data:image/png;base64,')) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'PHP-Noise base64 field must be a PNG data URL.')
  }
  return { base64 }
}

function readErrorMessage(value: unknown): string | undefined {
  if (!isRecord(value)) {
    return undefined
  }
  const message = value.message ?? value.error
  return typeof message === 'string' && message.trim() !== '' ? message : undefined
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}
