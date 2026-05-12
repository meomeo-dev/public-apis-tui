import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export const X_COLORS_DEFAULT_BASE_URL = 'https://x-colors.yurace.pro/api'

export type XColorsRandomQuery = {
  hue?: string | undefined
  number?: number | undefined
  type?: 'dark' | 'light' | undefined
}

export type XColorsConvertOperation =
  | 'hex2rgb'
  | 'hex2hsl'
  | 'rgb2hex'
  | 'rgb2hsl'
  | 'hsl2hex'
  | 'hsl2rgb'

export type XColorsConvertQuery = {
  operation: XColorsConvertOperation
  value: string
}

export type XColorsColorObject = {
  hex?: string | undefined
  rgb?: string | undefined
  hsl?: string | undefined
}

export type XColorsClientOptions = {
  baseUrl?: string | undefined
  fetchImpl?: typeof fetch | undefined
}

export class XColorsClient {
  private readonly baseUrl: string
  private readonly fetchImpl: typeof fetch

  constructor(options: XColorsClientOptions = {}) {
    this.baseUrl = options.baseUrl ?? X_COLORS_DEFAULT_BASE_URL
    this.fetchImpl = options.fetchImpl ?? fetch
  }

  async random(query: XColorsRandomQuery = {}): Promise<XColorsColorObject[]> {
    const url = new URL(`${this.baseUrl.replace(/\/$/u, '')}/random${query.hue === undefined ? '' : `/${encodeURIComponent(query.hue)}`}`)
    if (query.number !== undefined) {
      url.searchParams.set('number', String(query.number))
    }
    if (query.type !== undefined) {
      url.searchParams.set('type', query.type)
    }

    const parsed = await this.requestJson(url)
    const colors = Array.isArray(parsed) ? parsed : [parsed]
    return colors.map(parseColorObject)
  }

  async convert(query: XColorsConvertQuery): Promise<XColorsColorObject> {
    const url = new URL(`${this.baseUrl.replace(/\/$/u, '')}/${query.operation}`)
    url.searchParams.set('value', query.value)

    return parseColorObject(await this.requestJson(url))
  }

  private async requestJson(url: URL): Promise<unknown> {
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
      throw new RuntimeFailure('OPEN_API_FAILED', 'xColors returned a non-JSON response.', {
        status: response.status,
        statusText: response.statusText,
      })
    }

    if (!response.ok) {
      throw new RuntimeFailure('OPEN_API_FAILED', readErrorMessage(parsed) ?? response.statusText ?? 'xColors request failed.', {
        status: response.status,
        response: parsed,
      })
    }

    return parsed
  }
}

function parseColorObject(value: unknown): XColorsColorObject {
  if (!isRecord(value)) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'xColors response must be a JSON object or an array of JSON objects.')
  }

  const color: XColorsColorObject = {}
  if (typeof value.hex === 'string') {
    color.hex = value.hex
  }
  if (typeof value.rgb === 'string') {
    color.rgb = value.rgb
  }
  if (typeof value.hsl === 'string') {
    color.hsl = value.hsl
  }

  if (color.hex === undefined && color.rgb === undefined && color.hsl === undefined) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'xColors color object must include at least one hex, rgb, or hsl field.', {
      response: value,
    })
  }

  return color
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
