import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export const ANIME_CHAN_DEFAULT_BASE_URL = 'https://api.animechan.io/v1'

export type AnimeChanRandomQuoteQuery = {
  anime?: string | undefined
  character?: string | undefined
}

export type AnimeChanQuote = {
  content: string
  anime: {
    id: number
    name: string
    altName?: string | undefined
  }
  character: {
    id: number
    name: string
  }
}

export type AnimeChanClientOptions = {
  baseUrl?: string | undefined
  fetchImpl?: typeof fetch | undefined
}

export class AnimeChanClient {
  private readonly baseUrl: string
  private readonly fetchImpl: typeof fetch

  constructor(options: AnimeChanClientOptions = {}) {
    this.baseUrl = normalizeBaseUrl(options.baseUrl ?? ANIME_CHAN_DEFAULT_BASE_URL)
    this.fetchImpl = options.fetchImpl ?? fetch
  }

  async getRandomQuote(query: AnimeChanRandomQuoteQuery = {}): Promise<AnimeChanQuote> {
    const url = new URL(`${this.baseUrl}/quotes/random`)
    if (query.anime !== undefined) {
      url.searchParams.set('anime', query.anime)
    }
    if (query.character !== undefined) {
      url.searchParams.set('character', query.character)
    }

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
      throw new RuntimeFailure('OPEN_API_FAILED', 'AnimeChan returned a non-JSON response.', {
        status: response.status,
        statusText: response.statusText,
      })
    }

    if (!response.ok) {
      throw new RuntimeFailure('OPEN_API_FAILED', readErrorMessage(parsed) ?? response.statusText ?? 'AnimeChan request failed.', {
        status: response.status,
        response: parsed,
      })
    }

    return parseQuoteEnvelope(parsed)
  }
}

function normalizeBaseUrl(value: string): string {
  return value.replace(/\/+$/u, '')
}

function parseQuoteEnvelope(value: unknown): AnimeChanQuote {
  if (!isRecord(value)) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'AnimeChan quote response must be an object.')
  }

  const data = value.data
  if (!isRecord(data)) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'AnimeChan quote response must include a data object.')
  }

  const anime = data.anime
  const character = data.character
  if (!isRecord(anime) || !isRecord(character)) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'AnimeChan quote response must include anime and character objects.')
  }

  return {
    content: readString(data, 'content'),
    anime: {
      id: readNumber(anime, 'id'),
      name: readString(anime, 'name'),
      ...readOptionalStringProperty(anime, 'altName'),
    },
    character: {
      id: readNumber(character, 'id'),
      name: readString(character, 'name'),
    },
  }
}

function readErrorMessage(value: unknown): string | undefined {
  if (!isRecord(value)) {
    return undefined
  }
  return typeof value.message === 'string' ? value.message : undefined
}

function readString(record: Record<string, unknown>, key: string): string {
  const value = record[key]
  if (typeof value !== 'string') {
    throw new RuntimeFailure('OPEN_API_FAILED', `AnimeChan field ${key} must be a string.`)
  }
  return value
}

function readNumber(record: Record<string, unknown>, key: string): number {
  const value = record[key]
  if (typeof value !== 'number') {
    throw new RuntimeFailure('OPEN_API_FAILED', `AnimeChan field ${key} must be a number.`)
  }
  return value
}

function readOptionalStringProperty(record: Record<string, unknown>, key: string): { altName?: string | undefined } {
  const value = record[key]
  if (value === undefined || value === null) {
    return {}
  }
  if (typeof value !== 'string') {
    throw new RuntimeFailure('OPEN_API_FAILED', `AnimeChan field ${key} must be a string when present.`)
  }
  return { altName: value }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}
