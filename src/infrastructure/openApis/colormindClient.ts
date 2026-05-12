import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export const COLORMIND_DEFAULT_BASE_URL = 'http://colormind.io'

export type ColormindColorInput = [number, number, number] | 'N'

export type ColormindPaletteQuery = {
  model?: string | undefined
  input?: ColormindColorInput[] | undefined
}

export type ColormindPaletteResponse = {
  result: Array<[number, number, number]>
}

export type ColormindModelsResponse = {
  result: string[]
}

export type ColormindClientOptions = {
  baseUrl?: string | undefined
  fetchImpl?: typeof fetch | undefined
}

export class ColormindClient {
  private readonly baseUrl: string
  private readonly fetchImpl: typeof fetch

  constructor(options: ColormindClientOptions = {}) {
    this.baseUrl = normalizeBaseUrl(options.baseUrl ?? COLORMIND_DEFAULT_BASE_URL)
    this.fetchImpl = options.fetchImpl ?? fetch
  }

  async generatePalette(query: ColormindPaletteQuery = {}): Promise<ColormindPaletteResponse> {
    const response = await this.fetchImpl(`${this.baseUrl}/api/`, {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        'user-agent': 'public-apis-tui no-auth CLI',
      },
      body: JSON.stringify({
        model: query.model ?? 'default',
        ...(query.input !== undefined ? { input: query.input } : {}),
      }),
    })

    const parsed = await readJson(response, 'Colormind palette endpoint')
    if (!response.ok) {
      throw new RuntimeFailure('OPEN_API_FAILED', readErrorMessage(parsed) ?? response.statusText ?? 'Colormind palette request failed.', {
        status: response.status,
        response: parsed,
      })
    }
    return parsePaletteResponse(parsed)
  }

  async listModels(): Promise<ColormindModelsResponse> {
    const response = await this.fetchImpl(`${this.baseUrl}/list/`, {
      method: 'GET',
      headers: {
        accept: 'application/json',
        'user-agent': 'public-apis-tui no-auth CLI',
      },
    })

    const parsed = await readJson(response, 'Colormind list endpoint')
    if (!response.ok) {
      throw new RuntimeFailure('OPEN_API_FAILED', readErrorMessage(parsed) ?? response.statusText ?? 'Colormind model list request failed.', {
        status: response.status,
        response: parsed,
      })
    }
    return parseModelsResponse(parsed)
  }
}

async function readJson(response: Response, label: string): Promise<unknown> {
  try {
    return await response.json()
  } catch {
    throw new RuntimeFailure('OPEN_API_FAILED', `${label} returned a non-JSON response.`, {
      status: response.status,
      statusText: response.statusText,
    })
  }
}

function parsePaletteResponse(value: unknown): ColormindPaletteResponse {
  if (!isRecord(value)) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'Colormind palette response must be an object.')
  }
  const result = value.result
  if (!Array.isArray(result)) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'Colormind palette response must include a result array.')
  }
  return {
    result: result.map(parseRgbTriplet),
  }
}

function parseModelsResponse(value: unknown): ColormindModelsResponse {
  if (!isRecord(value)) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'Colormind models response must be an object.')
  }
  const result = value.result
  if (!Array.isArray(result)) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'Colormind models response must include a result array.')
  }
  return {
    result: result.filter((model): model is string => typeof model === 'string' && model.trim() !== ''),
  }
}

function parseRgbTriplet(value: unknown): [number, number, number] {
  if (!Array.isArray(value) || value.length !== 3) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'Colormind color entries must be RGB triplets.')
  }
  const channels = value.map(channel => {
    if (typeof channel !== 'number' || !Number.isInteger(channel) || channel < 0 || channel > 255) {
      throw new RuntimeFailure('OPEN_API_FAILED', 'Colormind RGB channel must be an integer from 0 to 255.', {
        channel,
      })
    }
    return channel
  })
  return [channels[0] ?? 0, channels[1] ?? 0, channels[2] ?? 0]
}

function readErrorMessage(value: unknown): string | undefined {
  if (!isRecord(value)) {
    return undefined
  }
  const message = value.message ?? value.error
  return typeof message === 'string' && message.trim() !== '' ? message : undefined
}

function normalizeBaseUrl(value: string): string {
  return value.replace(/\/+$/u, '')
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}
