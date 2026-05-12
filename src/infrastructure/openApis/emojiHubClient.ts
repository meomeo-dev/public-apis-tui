import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export const EMOJI_HUB_DEFAULT_BASE_URL = 'https://emojihub.yurace.pro/api'

export type EmojiHubEmoji = {
  name: string
  category: string
  group: string
  htmlCode: string[]
  unicode: string[]
}

export type EmojiHubClientOptions = {
  baseUrl?: string | undefined
  fetchImpl?: typeof fetch | undefined
}

export class EmojiHubClient {
  private readonly baseUrl: string
  private readonly fetchImpl: typeof fetch

  constructor(options: EmojiHubClientOptions = {}) {
    this.baseUrl = normalizeBaseUrl(options.baseUrl ?? EMOJI_HUB_DEFAULT_BASE_URL)
    this.fetchImpl = options.fetchImpl ?? fetch
  }

  async getRandomEmoji(): Promise<EmojiHubEmoji> {
    return parseEmoji(await this.getJson('/random'))
  }

  async searchEmojis(query: { query?: string | undefined; category?: string | undefined; group?: string | undefined }): Promise<EmojiHubEmoji[]> {
    if (query.category !== undefined) {
      return this.getEmojiList(`/all/category/${encodeURIComponent(query.category)}`)
    }
    if (query.group !== undefined) {
      return this.getEmojiList(`/all/group/${encodeURIComponent(query.group)}`)
    }
    const url = new URL(`${this.baseUrl}/search`)
    url.searchParams.set('q', query.query ?? '')
    return parseEmojiArray(await this.fetchJson(url))
  }

  async listCategories(): Promise<string[]> {
    return parseStringArray(await this.getJson('/categories'), 'categories')
  }

  async listGroups(): Promise<string[]> {
    return parseStringArray(await this.getJson('/groups'), 'groups')
  }

  private async getEmojiList(path: string): Promise<EmojiHubEmoji[]> {
    return parseEmojiArray(await this.getJson(path))
  }

  private async getJson(path: string): Promise<unknown> {
    return this.fetchJson(new URL(`${this.baseUrl}${path}`))
  }

  private async fetchJson(url: URL): Promise<unknown> {
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
      throw new RuntimeFailure('OPEN_API_FAILED', 'EmojiHub returned a non-JSON response.', {
        status: response.status,
        statusText: response.statusText,
      })
    }

    if (!response.ok) {
      throw new RuntimeFailure('OPEN_API_FAILED', readErrorMessage(parsed) ?? response.statusText ?? 'EmojiHub request failed.', {
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

function parseEmojiArray(value: unknown): EmojiHubEmoji[] {
  if (!Array.isArray(value)) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'EmojiHub emoji list response must be an array.')
  }
  return value.filter(isRecord).map(parseEmoji)
}

function parseEmoji(value: unknown): EmojiHubEmoji {
  if (!isRecord(value)) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'EmojiHub emoji response must be an object.')
  }
  return {
    name: readString(value, 'name'),
    category: readString(value, 'category'),
    group: readString(value, 'group'),
    htmlCode: readStringArray(value, 'htmlCode'),
    unicode: readStringArray(value, 'unicode'),
  }
}

function parseStringArray(value: unknown, label: string): string[] {
  if (!Array.isArray(value)) {
    throw new RuntimeFailure('OPEN_API_FAILED', `EmojiHub ${label} response must be an array.`)
  }
  return value.filter((entry): entry is string => typeof entry === 'string' && entry.trim() !== '')
}

function readString(record: Record<string, unknown>, key: string): string {
  const value = record[key]
  if (typeof value !== 'string') {
    throw new RuntimeFailure('OPEN_API_FAILED', `EmojiHub field ${key} must be a string.`)
  }
  return value
}

function readStringArray(record: Record<string, unknown>, key: string): string[] {
  const value = record[key]
  if (!Array.isArray(value)) {
    throw new RuntimeFailure('OPEN_API_FAILED', `EmojiHub field ${key} must be an array.`)
  }
  return value.filter((entry): entry is string => typeof entry === 'string')
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
