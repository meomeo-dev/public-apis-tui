import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export const SERIALIF_COLOR_DEFAULT_BASE_URL = 'https://color.serialif.com'
export const SERIALIF_COLOR_DEFAULT_COLOR = 'aquamarine'

export type SerialifColorInput = {
  color?: string | undefined
}

export type NormalizedSerialifColorInput = {
  color: string
}

export type SerialifColorModel = {
  keyword?: string | undefined
  hex?: {
    value?: string | undefined
    composition?: Record<string, unknown> | undefined
  } | undefined
  rgb?: {
    value?: string | undefined
    composition?: Record<string, unknown> | undefined
  } | undefined
  rgba?: {
    value?: string | undefined
    composition?: Record<string, unknown> | undefined
  } | undefined
  hsl?: {
    value?: string | undefined
    composition?: Record<string, unknown> | undefined
  } | undefined
  hsla?: {
    value?: string | undefined
    composition?: Record<string, unknown> | undefined
  } | undefined
}

export type SerialifColorPayload = {
  status: 'success' | 'error'
  base?: SerialifColorModel | undefined
  base_without_alpha?: SerialifColorModel | undefined
  base_without_alpha_contrasted_text?: SerialifColorModel | undefined
  complementary?: SerialifColorModel | undefined
  complementary_without_alpha?: SerialifColorModel | undefined
  complementary_without_alpha_contrasted_text?: SerialifColorModel | undefined
  grayscale?: SerialifColorModel | undefined
  grayscale_without_alpha?: SerialifColorModel | undefined
  grayscale_without_alpha_contrasted_text?: SerialifColorModel | undefined
  error?: {
    type?: string | undefined
    value?: string | undefined
    message?: string | undefined
  } | undefined
}

export type SerialifColorClientOptions = {
  baseUrl?: string | undefined
  fetchImpl?: typeof fetch | undefined
}

export class SerialifColorClient {
  private readonly baseUrl: string
  private readonly fetchImpl: typeof fetch

  constructor(options: SerialifColorClientOptions = {}) {
    this.baseUrl = normalizeBaseUrl(options.baseUrl ?? SERIALIF_COLOR_DEFAULT_BASE_URL)
    this.fetchImpl = options.fetchImpl ?? fetch
  }

  async lookup(input: SerialifColorInput | NormalizedSerialifColorInput = {}): Promise<SerialifColorPayload & { requestUrl: string }> {
    const query = normalizeSerialifColorInput(input)
    const url = createSerialifColorUrl(this.baseUrl, query)

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
      throw new RuntimeFailure('OPEN_API_FAILED', `Serialif Color request failed: ${String(error)}`, {
        provider: 'serialifcolor',
        endpoint: url.href,
      })
    }

    const contentType = response.headers.get('content-type') ?? ''
    const body = await response.text()
    if (!contentType.includes('application/json')) {
      throw new RuntimeFailure('OPEN_API_FAILED', 'Serialif Color returned a non-JSON response.', {
        provider: 'serialifcolor',
        endpoint: url.href,
        status: response.status,
        contentType,
        responsePreview: body.slice(0, 300),
      })
    }

    let payload: SerialifColorPayload
    try {
      payload = JSON.parse(body) as SerialifColorPayload
    } catch (error) {
      throw new RuntimeFailure('OPEN_API_FAILED', `Serialif Color returned invalid JSON: ${String(error)}`, {
        provider: 'serialifcolor',
        endpoint: url.href,
        status: response.status,
        responsePreview: body.slice(0, 300),
      })
    }

    if (!response.ok || payload.status !== 'success') {
      throw new RuntimeFailure('OPEN_API_FAILED', payload.error?.message ?? payload.error?.type ?? `Serialif Color request failed with HTTP ${response.status}.`, {
        provider: 'serialifcolor',
        endpoint: url.href,
        httpStatus: response.status,
        status: payload.status,
        error: payload.error,
      })
    }

    return { ...payload, requestUrl: url.href }
  }
}

export function normalizeSerialifColorInput(input: SerialifColorInput = {}): NormalizedSerialifColorInput {
  const color = (input.color ?? SERIALIF_COLOR_DEFAULT_COLOR).trim().replace(/^#/u, '')
  if (color.length < 1 || color.length > 40) {
    throw new RuntimeFailure('INVALID_ARGUMENT', 'Serialif Color --color must be between 1 and 40 characters.', { color: input.color })
  }
  if (!/^[a-zA-Z]+$|^[0-9a-fA-F]{3,4}$|^[0-9a-fA-F]{6}$|^[0-9a-fA-F]{8}$/u.test(color)) {
    throw new RuntimeFailure('INVALID_ARGUMENT', 'Serialif Color --color must be a CSS keyword or hex color with 3, 4, 6, or 8 hexadecimal digits.', { color: input.color })
  }
  return { color: color.toLowerCase() }
}

export function createSerialifColorUrl(baseUrl: string, input: NormalizedSerialifColorInput): URL {
  return new URL(`${normalizeBaseUrl(baseUrl)}/${encodeURIComponent(input.color)}`)
}

export function projectSerialifColorModel(value: SerialifColorModel | undefined): ProjectedSerialifColorModel | undefined {
  if (value === undefined) {
    return undefined
  }
  const hex = value.hex?.value
  const rgb = value.rgb?.value ?? value.rgba?.value
  const hsl = value.hsl?.value ?? value.hsla?.value
  if (typeof hex !== 'string' && typeof rgb !== 'string' && typeof hsl !== 'string') {
    return undefined
  }
  return {
    ...(typeof value.keyword === 'string' && value.keyword.trim() !== '' ? { keyword: value.keyword } : {}),
    ...(typeof hex === 'string' ? { hex } : {}),
    ...(typeof rgb === 'string' ? { rgb } : {}),
    ...(typeof hsl === 'string' ? { hsl } : {}),
    ...(value.hex?.composition !== undefined ? { hexComposition: value.hex.composition } : {}),
    ...((value.rgb?.composition ?? value.rgba?.composition) !== undefined ? { rgbComposition: value.rgb?.composition ?? value.rgba?.composition } : {}),
    ...((value.hsl?.composition ?? value.hsla?.composition) !== undefined ? { hslComposition: value.hsl?.composition ?? value.hsla?.composition } : {}),
  }
}

export type ProjectedSerialifColorModel = {
  keyword?: string | undefined
  hex?: string | undefined
  rgb?: string | undefined
  hsl?: string | undefined
  hexComposition?: Record<string, unknown> | undefined
  rgbComposition?: Record<string, unknown> | undefined
  hslComposition?: Record<string, unknown> | undefined
}

function normalizeBaseUrl(value: string): string {
  return value.replace(/\/+$/u, '')
}
