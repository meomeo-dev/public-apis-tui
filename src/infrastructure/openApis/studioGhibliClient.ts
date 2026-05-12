import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export const STUDIO_GHIBLI_DEFAULT_BASE_URL = 'https://ghibliapi.vercel.app'

export type StudioGhibliListQuery = {
  limit?: number | undefined
  fields?: string | undefined
}

export type StudioGhibliFilm = {
  id: string
  title: string
  originalTitle: string
  originalTitleRomanised: string
  description: string
  director: string
  producer: string
  releaseDate: string
  runningTime: string
  rtScore: string
  image?: string | undefined
  movieBanner?: string | undefined
  people: string[]
  species: string[]
  locations: string[]
  vehicles: string[]
  url: string
}

export type StudioGhibliClientOptions = {
  baseUrl?: string | undefined
  fetchImpl?: typeof fetch | undefined
}

export class StudioGhibliClient {
  private readonly baseUrl: string
  private readonly fetchImpl: typeof fetch

  constructor(options: StudioGhibliClientOptions = {}) {
    this.baseUrl = normalizeBaseUrl(options.baseUrl ?? STUDIO_GHIBLI_DEFAULT_BASE_URL)
    this.fetchImpl = options.fetchImpl ?? fetch
  }

  async listFilms(query: StudioGhibliListQuery = {}): Promise<StudioGhibliFilm[]> {
    const value = await this.getJson('/films', query)
    if (!Array.isArray(value)) {
      throw new RuntimeFailure('OPEN_API_FAILED', 'Studio Ghibli films response must be an array.')
    }
    return value.map(parseFilm)
  }

  private async getJson(path: string, query: StudioGhibliListQuery): Promise<unknown> {
    const url = new URL(`${this.baseUrl}${path}`)
    appendOptionalNumberParam(url, 'limit', query.limit)
    appendOptionalStringParam(url, 'fields', query.fields)

    const response = await this.fetchImpl(url, {
      method: 'GET',
      headers: {
        accept: 'application/json',
      },
    })

    let parsed: unknown
    try {
      parsed = await response.json()
    } catch {
      throw new RuntimeFailure('OPEN_API_FAILED', 'Studio Ghibli API returned a non-JSON response.', {
        status: response.status,
        statusText: response.statusText,
      })
    }

    if (!response.ok) {
      throw new RuntimeFailure('OPEN_API_FAILED', response.statusText || 'Studio Ghibli API request failed.', {
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

function appendOptionalNumberParam(url: URL, key: string, value: unknown): void {
  if (typeof value === 'number') {
    url.searchParams.set(key, String(value))
  }
}

function appendOptionalStringParam(url: URL, key: string, value: unknown): void {
  if (typeof value === 'string' && value.trim() !== '') {
    url.searchParams.set(key, value.trim())
  }
}

function parseFilm(value: unknown): StudioGhibliFilm {
  if (!isRecord(value)) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'Studio Ghibli film item must be an object.')
  }
  return {
    id: readString(value, 'id'),
    title: readString(value, 'title'),
    originalTitle: readString(value, 'original_title'),
    originalTitleRomanised: readString(value, 'original_title_romanised'),
    description: readString(value, 'description'),
    director: readString(value, 'director'),
    producer: readString(value, 'producer'),
    releaseDate: readString(value, 'release_date'),
    runningTime: readString(value, 'running_time'),
    rtScore: readString(value, 'rt_score'),
    ...readOptionalString(value, 'image', 'image'),
    ...readOptionalString(value, 'movie_banner', 'movieBanner'),
    people: readStringArray(value, 'people'),
    species: readStringArray(value, 'species'),
    locations: readStringArray(value, 'locations'),
    vehicles: readStringArray(value, 'vehicles'),
    url: readString(value, 'url'),
  }
}

function readString(record: Record<string, unknown>, key: string): string {
  const value = record[key]
  if (typeof value !== 'string') {
    throw new RuntimeFailure('OPEN_API_FAILED', `Studio Ghibli field ${key} must be a string.`)
  }
  return value
}

function readOptionalString(
  record: Record<string, unknown>,
  sourceKey: string,
  targetKey: 'image' | 'movieBanner',
): Partial<StudioGhibliFilm> {
  const value = record[sourceKey]
  return typeof value === 'string' && value.trim() !== '' ? { [targetKey]: value } : {}
}

function readStringArray(record: Record<string, unknown>, key: string): string[] {
  const value = record[key]
  if (!Array.isArray(value)) {
    throw new RuntimeFailure('OPEN_API_FAILED', `Studio Ghibli field ${key} must be an array.`)
  }
  return value.filter((item): item is string => typeof item === 'string')
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}
