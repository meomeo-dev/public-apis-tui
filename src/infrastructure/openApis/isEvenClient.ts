import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export const ISEVEN_DEFAULT_BASE_URL = 'https://api.isevenapi.xyz/api'
export const ISEVEN_DEFAULT_NUMBER = 6
export const ISEVEN_FREE_MIN = 0
export const ISEVEN_FREE_MAX = 999_999

export type IsEvenQuery = {
  number: number
}

export type IsEvenResponse = {
  isEven: boolean
  ad?: string | undefined
}

export class IsEvenClient {
  constructor(
    private readonly baseUrl = ISEVEN_DEFAULT_BASE_URL,
    private readonly fetchImpl: typeof fetch = globalThis.fetch,
  ) {}

  async check(query: IsEvenQuery): Promise<IsEvenResponse> {
    const url = this.createUrl(query.number)
    const parsed = await this.fetchJson(url)
    if (!isRecord(parsed) || typeof parsed.iseven !== 'boolean') {
      throw new RuntimeFailure(
        'OPEN_API_FAILED',
        'isEven response did not match the documented JSON shape.',
      )
    }

    return {
      isEven: parsed.iseven,
      ...(typeof parsed.ad === 'string' ? { ad: parsed.ad } : {}),
    }
  }

  private createUrl(number: number): URL {
    return new URL(`${normalizeBaseUrl(this.baseUrl)}/iseven/${String(number)}/`)
  }

  private async fetchJson(url: URL): Promise<unknown> {
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
        `isEven request failed: ${String(error)}`,
        { provider: 'iseven', url: url.toString() },
      )
    }
    const body = await response.text()

    if (isCloudflareChallenge(response, body)) {
      throw new RuntimeFailure(
        'OPEN_API_FAILED',
        [
          'isEven is currently returning a Cloudflare challenge HTML page',
          'instead of the documented JSON API response; retry later or use',
          'cached/offline data.',
        ].join(' '),
        createResponseDetails(response, url),
      )
    }

    let parsed: unknown
    try {
      parsed = JSON.parse(body) as unknown
    } catch (error) {
      throw new RuntimeFailure(
        'OPEN_API_FAILED',
        `isEven API returned non-JSON content: ${String(error)}`,
        createResponseDetails(response, url),
      )
    }

    if (!response.ok) {
      throw new RuntimeFailure(
        'OPEN_API_FAILED',
        readError(parsed) ?? `isEven request failed with HTTP ${response.status}.`,
        {
          ...createResponseDetails(response, url),
          response: parsed,
        },
      )
    }

    return parsed
  }
}

export function normalizeIsEvenQuery(
  input: { number?: number | undefined } = {},
): IsEvenQuery {
  const number = input.number ?? ISEVEN_DEFAULT_NUMBER
  if (!Number.isInteger(number)) {
    throw new RuntimeFailure(
      'INVALID_ARGUMENT',
      'isEven --number must be an integer.',
      { number: input.number },
    )
  }
  if (number < ISEVEN_FREE_MIN || number > ISEVEN_FREE_MAX) {
    throw new RuntimeFailure(
      'INVALID_ARGUMENT',
      `isEven --number must be between ${ISEVEN_FREE_MIN} and ${ISEVEN_FREE_MAX}.`,
      { number: input.number },
    )
  }
  return { number }
}

function readError(value: unknown): string | undefined {
  if (!isRecord(value)) return undefined
  if (typeof value.error === 'string') return value.error
  return isRecord(value.error) ? readError(value.error) : undefined
}

function createResponseDetails(response: Response, url: URL): Record<string, unknown> {
  return {
    provider: 'iseven',
    status: response.status,
    statusText: response.statusText,
    contentType: response.headers.get('content-type') ?? undefined,
    url: url.toString(),
  }
}

function isCloudflareChallenge(response: Response, body: string): boolean {
  const server = response.headers.get('server')?.toLowerCase() ?? ''
  const mitigated = response.headers.get('cf-mitigated')?.toLowerCase() ?? ''
  const contentType = response.headers.get('content-type')?.toLowerCase() ?? ''
  return (
    (response.status === 403 || response.status === 429) &&
    contentType.includes('text/html') &&
    (
      mitigated === 'challenge' ||
      server.includes('cloudflare') ||
      /<title>\s*just a moment/i.test(body)
    )
  )
}

function normalizeBaseUrl(value: string): string {
  return value.replace(/\/+$/u, '')
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}
