import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export const RANDOM_FOX_DEFAULT_BASE_URL = 'https://randomfox.ca'

export type RandomFoxFloof = {
  image: string
  link: string
}

export type RandomFoxClientOptions = {
  baseUrl?: string | undefined
  fetchImpl?: typeof fetch | undefined
}

export class RandomFoxClient {
  private readonly baseUrl: string
  private readonly fetchImpl: typeof fetch

  constructor(options: RandomFoxClientOptions = {}) {
    this.baseUrl = normalizeBaseUrl(options.baseUrl ?? RANDOM_FOX_DEFAULT_BASE_URL)
    this.fetchImpl = options.fetchImpl ?? fetch
  }

  async getFloof(): Promise<RandomFoxFloof> {
    const response = await this.fetchImpl(`${this.baseUrl}/floof/`, {
      method: 'GET',
      headers: {
        accept: 'application/json',
      },
    })

    let parsed: unknown
    try {
      parsed = await response.json()
    } catch {
      throw new RuntimeFailure('OPEN_API_FAILED', 'RandomFox returned a non-JSON response.', {
        status: response.status,
        statusText: response.statusText,
      })
    }

    if (!response.ok) {
      throw new RuntimeFailure('OPEN_API_FAILED', response.statusText || 'RandomFox request failed.', {
        status: response.status,
        response: parsed,
      })
    }

    return parseFloof(parsed)
  }
}

function normalizeBaseUrl(value: string): string {
  return value.replace(/\/+$/u, '')
}

function parseFloof(value: unknown): RandomFoxFloof {
  if (!isRecord(value)) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'RandomFox floof response must be an object.')
  }
  return {
    image: readString(value, 'image'),
    link: readString(value, 'link'),
  }
}

function readString(record: Record<string, unknown>, key: string): string {
  const value = record[key]
  if (typeof value !== 'string') {
    throw new RuntimeFailure('OPEN_API_FAILED', `RandomFox field ${key} must be a string.`)
  }
  return value
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}
