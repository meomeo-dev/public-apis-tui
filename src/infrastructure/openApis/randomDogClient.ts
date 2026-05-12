import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export const RANDOM_DOG_DEFAULT_BASE_URL = 'https://random.dog'

export type RandomDogWoof = {
  fileSizeBytes: number
  url: string
}

export type RandomDogClientOptions = {
  baseUrl?: string | undefined
  fetchImpl?: typeof fetch | undefined
}

export class RandomDogClient {
  private readonly baseUrl: string
  private readonly fetchImpl: typeof fetch

  constructor(options: RandomDogClientOptions = {}) {
    this.baseUrl = normalizeBaseUrl(options.baseUrl ?? RANDOM_DOG_DEFAULT_BASE_URL)
    this.fetchImpl = options.fetchImpl ?? fetch
  }

  async getRandomWoof(): Promise<RandomDogWoof> {
    return parseWoof(await this.getJson('/woof.json'))
  }

  async listFiles(): Promise<string[]> {
    const value = await this.getJson('/doggos')
    if (!Array.isArray(value)) {
      throw new RuntimeFailure('OPEN_API_FAILED', 'RandomDog doggos response must be an array.')
    }
    return value.filter((entry): entry is string => typeof entry === 'string')
  }

  private async getJson(path: string): Promise<unknown> {
    const response = await this.fetchImpl(`${this.baseUrl}${path}`, {
      method: 'GET',
      headers: {
        accept: 'application/json',
      },
    })

    let parsed: unknown
    try {
      parsed = await response.json()
    } catch {
      throw new RuntimeFailure('OPEN_API_FAILED', 'RandomDog returned a non-JSON response.', {
        status: response.status,
        statusText: response.statusText,
      })
    }

    if (!response.ok) {
      throw new RuntimeFailure('OPEN_API_FAILED', response.statusText || 'RandomDog request failed.', {
        status: response.status,
        response: parsed,
      })
    }

    return parsed
  }
}

function normalizeBaseUrl(value: string): string {
  return value.replace(/\/+$/u, '')
}

function parseWoof(value: unknown): RandomDogWoof {
  if (!isRecord(value)) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'RandomDog woof response must be an object.')
  }
  return {
    fileSizeBytes: readNumber(value, 'fileSizeBytes'),
    url: readString(value, 'url'),
  }
}

function readString(record: Record<string, unknown>, key: string): string {
  const value = record[key]
  if (typeof value !== 'string') {
    throw new RuntimeFailure('OPEN_API_FAILED', `RandomDog field ${key} must be a string.`)
  }
  return value
}

function readNumber(record: Record<string, unknown>, key: string): number {
  const value = record[key]
  if (typeof value !== 'number') {
    throw new RuntimeFailure('OPEN_API_FAILED', `RandomDog field ${key} must be a number.`)
  }
  return value
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}
