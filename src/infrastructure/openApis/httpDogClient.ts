import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export const HTTP_DOG_DEFAULT_BASE_URL = 'https://http.dog'

export type HttpDogStatusImageSet = {
  jpg: string
  webp: string
  avif: string
  jxl: string
}

export type HttpDogStatus = {
  status_code: number
  title: string
  url: string
  image: HttpDogStatusImageSet
}

export type HttpDogClientOptions = {
  baseUrl?: string | undefined
  fetchImpl?: typeof fetch | undefined
}

export class HttpDogClient {
  private readonly baseUrl: string
  private readonly fetchImpl: typeof fetch

  constructor(options: HttpDogClientOptions = {}) {
    this.baseUrl = normalizeBaseUrl(options.baseUrl ?? HTTP_DOG_DEFAULT_BASE_URL)
    this.fetchImpl = options.fetchImpl ?? fetch
  }

  async getStatus(statusCode: number): Promise<HttpDogStatus> {
    const response = await this.fetchImpl(`${this.baseUrl}/${statusCode}.json`, {
      method: 'GET',
      headers: {
        accept: 'application/json',
      },
    })

    let parsed: unknown
    try {
      parsed = await response.json()
    } catch {
      throw new RuntimeFailure('OPEN_API_FAILED', 'HTTP Dog returned a non-JSON response.', {
        status: response.status,
        statusText: response.statusText,
      })
    }

    if (!response.ok) {
      throw new RuntimeFailure('OPEN_API_FAILED', response.statusText || 'HTTP Dog request failed.', {
        status: response.status,
        response: parsed,
      })
    }

    return parseHttpDogStatus(parsed)
  }
}

function normalizeBaseUrl(value: string): string {
  return value.replace(/\/+$/u, '')
}

function parseHttpDogStatus(value: unknown): HttpDogStatus {
  if (!isRecord(value)) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'HTTP Dog status response must be an object.')
  }

  const image = value.image
  if (!isRecord(image)) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'HTTP Dog status image field must be an object.')
  }

  return {
    status_code: readNumber(value, 'status_code'),
    title: readString(value, 'title'),
    url: readString(value, 'url'),
    image: {
      jpg: readString(image, 'jpg'),
      webp: readString(image, 'webp'),
      avif: readString(image, 'avif'),
      jxl: readString(image, 'jxl'),
    },
  }
}

function readString(record: Record<string, unknown>, key: string): string {
  const value = record[key]
  if (typeof value !== 'string') {
    throw new RuntimeFailure('OPEN_API_FAILED', `HTTP Dog field ${key} must be a string.`)
  }
  return value
}

function readNumber(record: Record<string, unknown>, key: string): number {
  const value = record[key]
  if (typeof value !== 'number') {
    throw new RuntimeFailure('OPEN_API_FAILED', `HTTP Dog field ${key} must be a number.`)
  }
  return value
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}
