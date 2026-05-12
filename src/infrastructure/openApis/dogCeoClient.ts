import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export const DOG_CEO_DEFAULT_BASE_URL = 'https://dog.ceo/api'

export type DogCeoClientOptions = {
  baseUrl?: string | undefined
  fetchImpl?: typeof fetch | undefined
}

export type DogCeoBreedMap = Record<string, string[]>

export type DogCeoRandomImagesQuery = {
  breed?: string | undefined
  subBreed?: string | undefined
  count?: number | undefined
}

export class DogCeoClient {
  private readonly baseUrl: string
  private readonly fetchImpl: typeof fetch

  constructor(options: DogCeoClientOptions = {}) {
    this.baseUrl = normalizeBaseUrl(options.baseUrl ?? DOG_CEO_DEFAULT_BASE_URL)
    this.fetchImpl = options.fetchImpl ?? fetch
  }

  async listBreeds(): Promise<DogCeoBreedMap> {
    return parseBreedMap(await this.getJson('/breeds/list/all'))
  }

  async getRandomImages(query: DogCeoRandomImagesQuery = {}): Promise<string[]> {
    const path = createRandomImagesPath(query)
    return parseStringOrStringArrayMessage(await this.getJson(path))
  }

  async getRandomImage(): Promise<string> {
    const [imageUrl] = await this.getRandomImages()
    if (imageUrl === undefined) {
      throw new RuntimeFailure('OPEN_API_FAILED', 'Dog CEO returned no image URL.')
    }
    return imageUrl
  }

  async getRandomBreedImage(breed: string, subBreed?: string | undefined): Promise<string> {
    const [imageUrl] = await this.getRandomImages({ breed, subBreed })
    if (imageUrl === undefined) {
      throw new RuntimeFailure('OPEN_API_FAILED', 'Dog CEO returned no breed image URL.', { breed, subBreed })
    }
    return imageUrl
  }

  async listSubBreeds(breed: string): Promise<string[]> {
    return parseStringArrayMessage(await this.getJson(`/breed/${encodeURIComponent(breed)}/list`))
  }

  private async getJson(path: string): Promise<unknown> {
    const response = await this.fetchImpl(new URL(`${this.baseUrl}${path}`), {
      method: 'GET',
      headers: {
        accept: 'application/json',
      },
    })

    let parsed: unknown
    try {
      parsed = await response.json()
    } catch {
      throw new RuntimeFailure('OPEN_API_FAILED', 'Dog CEO returned a non-JSON response.', {
        status: response.status,
        statusText: response.statusText,
      })
    }

    if (!response.ok) {
      throw createDogCeoFailure(parsed, response.status, response.statusText)
    }

    assertSuccessStatus(parsed)
    return parsed
  }
}

function normalizeBaseUrl(value: string): string {
  return value.replace(/\/+$/u, '')
}

function createBreedPath(breed: string, subBreed: string | undefined): string {
  const encodedBreed = encodeURIComponent(breed)
  if (subBreed === undefined || subBreed.trim() === '') {
    return encodedBreed
  }
  return `${encodedBreed}/${encodeURIComponent(subBreed.trim())}`
}

function createRandomImagesPath(query: DogCeoRandomImagesQuery): string {
  const countSuffix = query.count === undefined ? '' : `/${query.count}`
  if (query.breed === undefined || query.breed.trim() === '') {
    return `/breeds/image/random${countSuffix}`
  }

  return `/breed/${createBreedPath(query.breed, query.subBreed)}/images/random${countSuffix}`
}

function parseBreedMap(value: unknown): DogCeoBreedMap {
  const message = readMessage(value)
  if (!isRecord(message)) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'Dog CEO breed list message must be an object.')
  }

  const breeds: DogCeoBreedMap = {}
  for (const [breed, subBreeds] of Object.entries(message)) {
    if (Array.isArray(subBreeds)) {
      breeds[breed] = subBreeds.filter((item): item is string => typeof item === 'string')
    }
  }
  return breeds
}

function parseStringOrStringArrayMessage(value: unknown): string[] {
  const message = readMessage(value)
  if (typeof message === 'string') {
    return [message]
  }
  if (!Array.isArray(message)) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'Dog CEO image message must be a string or array.')
  }
  return message.filter((item): item is string => typeof item === 'string')
}

function parseStringArrayMessage(value: unknown): string[] {
  const message = readMessage(value)
  if (!Array.isArray(message)) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'Dog CEO message must be an array.')
  }
  return message.filter((item): item is string => typeof item === 'string')
}

function assertSuccessStatus(value: unknown): void {
  if (!isRecord(value)) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'Dog CEO response must be an object.')
  }
  if (value.status !== 'success') {
    throw new RuntimeFailure('OPEN_API_FAILED', 'Dog CEO response status was not success.', {
      status: value.status,
      message: value.message,
    })
  }
}

function readMessage(value: unknown): unknown {
  if (!isRecord(value)) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'Dog CEO response must be an object.')
  }
  return value.message
}

function createDogCeoFailure(value: unknown, status: number, statusText: string): RuntimeFailure {
  if (isRecord(value)) {
    return new RuntimeFailure('OPEN_API_FAILED', typeof value.message === 'string' ? value.message : statusText, {
      status,
      providerStatus: value.status,
    })
  }
  return new RuntimeFailure('OPEN_API_FAILED', statusText || 'Dog CEO request failed.', { status })
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}
