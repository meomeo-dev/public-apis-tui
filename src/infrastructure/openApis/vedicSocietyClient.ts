import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export const VEDIC_SOCIETY_DEFAULT_BASE_URL =
  'https://indica-1hwj.onrender.com/vs/v2'

export type VedicSocietyEntry = {
  word: string
  nagari: string
  description: string
  category: string
}

type VedicSocietyEntryPayload = {
  word?: unknown
  nagari?: unknown
  description?: unknown
  category?: unknown
}

export class VedicSocietyClient {
  constructor(
    private readonly baseUrl = VEDIC_SOCIETY_DEFAULT_BASE_URL,
    private readonly fetchImpl: typeof fetch = globalThis.fetch,
  ) {}

  async words(word: string): Promise<VedicSocietyEntry[]> {
    return this.fetchEntries(`/words/${encodeURIComponent(word)}`)
  }

  async descriptions(description: string): Promise<VedicSocietyEntry[]> {
    return this.fetchEntries(`/descriptions/${encodeURIComponent(description)}`)
  }

  async category(category: string): Promise<VedicSocietyEntry[]> {
    return this.fetchEntries(`/categories/${encodeURIComponent(category)}`)
  }

  private async fetchEntries(path: string): Promise<VedicSocietyEntry[]> {
    const url = new URL(`${normalizeBaseUrl(this.baseUrl)}${path}`)
    let response: Response
    try {
      response = await this.fetchImpl(url, {
        method: 'GET',
        headers: {
          accept: 'application/json',
          'user-agent': 'public-apis-tui no-auth CLI',
        },
      })
    } catch (error) {
      throw new RuntimeFailure(
        'OPEN_API_FAILED',
        `Vedic Society request failed: ${String(error)}`,
        { provider: 'vedicsociety', url: url.toString() },
      )
    }

    const body = await response.text()
    if (isChallengeResponse(response, body)) {
      throw new RuntimeFailure(
        'OPEN_API_FAILED',
        [
          'Vedic Society is currently returning a Cloudflare challenge HTML',
          'page instead of the documented JSON API response; retry later or',
          'use cached/offline data.',
        ].join(' '),
        createResponseDetails(response, url),
      )
    }

    const details = createResponseDetails(response, url)
    const contentType = response.headers.get('content-type') ?? undefined
    if (!contentType?.toLowerCase().includes('application/json')) {
      if (response.ok && isKnownEmptyText(body)) return []
      throw new RuntimeFailure(
        'OPEN_API_FAILED',
        'Vedic Society response was not JSON.',
        {
          ...details,
          preview: body.slice(0, 160),
        },
      )
    }

    let parsed: unknown
    try {
      parsed = JSON.parse(body) as unknown
    } catch {
      throw new RuntimeFailure(
        'OPEN_API_FAILED',
        'Vedic Society response could not be parsed as JSON.',
        {
          ...details,
          preview: body.slice(0, 160),
        },
      )
    }

    if (!response.ok) {
      throw new RuntimeFailure(
        'OPEN_API_FAILED',
        `Vedic Society request failed with HTTP ${response.status}.`,
        {
          ...details,
          response: parsed,
        },
      )
    }

    return parseEntries(parsed)
  }
}

function createResponseDetails(
  response: Response,
  url: URL,
): Record<string, unknown> {
  return {
    provider: 'vedicsociety',
    status: response.status,
    statusText: response.statusText,
    contentType: response.headers.get('content-type') ?? undefined,
    url: url.toString(),
  }
}

function isChallengeResponse(response: Response, body: string): boolean {
  const server = response.headers.get('server')?.toLowerCase() ?? ''
  const mitigated = response.headers.get('cf-mitigated')?.toLowerCase() ?? ''
  const contentType = response.headers.get('content-type')?.toLowerCase() ?? ''
  return (
    (response.status === 403 || response.status === 429)
    && contentType.includes('text/html')
    && (
      mitigated === 'challenge'
      || server.includes('cloudflare')
      || /<title>\s*just a moment/i.test(body)
      || /captcha|access denied|attention required/i.test(body)
    )
  )
}

function parseEntries(value: unknown): VedicSocietyEntry[] {
  if (!Array.isArray(value)) {
    throw new RuntimeFailure(
      'OPEN_API_FAILED',
      'Vedic Society response did not match the documented JSON array shape.',
      { provider: 'vedicsociety' },
    )
  }

  return value.map(parseEntry)
}

function parseEntry(value: unknown): VedicSocietyEntry {
  if (!isRecord(value)) {
    throw new RuntimeFailure(
      'OPEN_API_FAILED',
      'Vedic Society entry was not a JSON object.',
      { provider: 'vedicsociety' },
    )
  }

  const payload = value as VedicSocietyEntryPayload
  return {
    word: readString(payload.word, 'word'),
    nagari: readString(payload.nagari, 'nagari'),
    description: readString(payload.description, 'description'),
    category: readString(payload.category, 'category'),
  }
}

function readString(value: unknown, key: string): string {
  if (typeof value === 'string' && value.trim() !== '') return value.trim()
  throw new RuntimeFailure(
    'OPEN_API_FAILED',
    `Vedic Society entry is missing string field ${key}.`,
    { provider: 'vedicsociety', key },
  )
}

function isKnownEmptyText(value: string): boolean {
  return value.trim().toLowerCase().startsWith('not found.')
}

function normalizeBaseUrl(value: string): string {
  return value.replace(/\/+$/u, '')
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}
