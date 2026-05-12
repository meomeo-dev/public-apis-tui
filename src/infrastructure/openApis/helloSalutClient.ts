import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export const HELLO_SALUT_BASE_URL = 'https://hellosalut.stefanbohacek.com'
export const HELLO_SALUT_DEFAULT_LANGUAGE = 'fr'

export type HelloSalutInput = {
  language?: string | undefined
}

export type NormalizedHelloSalutInput = {
  language: string
}

export type HelloSalutTranslation = {
  code: string
  hello: string
  matched: boolean
}

export class HelloSalutClient {
  constructor(private readonly options: { baseUrl?: string | undefined; fetchImpl?: typeof fetch | undefined } = {}) {}

  async translate(input: NormalizedHelloSalutInput): Promise<HelloSalutTranslation> {
    const url = new URL('/', this.options.baseUrl ?? HELLO_SALUT_BASE_URL)
    url.searchParams.set('lang', input.language)
    const parsed = await this.fetchJson(url)
    return parseTranslation(parsed, input.language)
  }

  private async fetchJson(url: URL): Promise<unknown> {
    const fetchImpl = this.options.fetchImpl ?? globalThis.fetch
    let response: Response
    try {
      response = await fetchImpl(url, { headers: { accept: 'application/json' } })
    } catch (error) {
      throw new RuntimeFailure('OPEN_API_FAILED', `HelloSalut request failed: ${String(error)}`, {
        provider: 'hellosalut',
        endpoint: url.href,
      })
    }

    let body: string
    try {
      body = await response.text()
    } catch (error) {
      throw new RuntimeFailure('OPEN_API_FAILED', `HelloSalut response body could not be read: ${String(error)}`, {
        provider: 'hellosalut',
        status: response.status,
        endpoint: url.href,
      })
    }

    if (isCloudflareChallenge(response, body)) {
      throw new RuntimeFailure('OPEN_API_FAILED', 'HelloSalut is currently returning a Cloudflare challenge HTML page instead of the documented JSON API response; retry later or use cached/offline data.', {
        provider: 'hellosalut',
        status: response.status,
        endpoint: url.href,
      })
    }

    let parsed: unknown
    try {
      parsed = JSON.parse(body)
    } catch (error) {
      throw new RuntimeFailure('OPEN_API_FAILED', `HelloSalut returned a non-JSON response: ${String(error)}`, {
        provider: 'hellosalut',
        status: response.status,
        endpoint: url.href,
        contentType: response.headers.get('content-type') ?? undefined,
      })
    }

    if (!response.ok) {
      throw new RuntimeFailure('OPEN_API_FAILED', `HelloSalut request failed with HTTP ${response.status}.`, {
        provider: 'hellosalut',
        status: response.status,
        endpoint: url.href,
        response: parsed,
      })
    }

    return parsed
  }
}

export function normalizeHelloSalutInput(input: HelloSalutInput = {}): NormalizedHelloSalutInput {
  const language = (input.language ?? HELLO_SALUT_DEFAULT_LANGUAGE).trim().toLowerCase()
  if (!/^[a-z]{2,3}(?:-[a-z]{2})?$/u.test(language)) {
    throw new RuntimeFailure('INVALID_ARGUMENT', '--language must be a 2-3 letter language code such as en, fr, es, or pt-br.')
  }
  return { language }
}

function parseTranslation(value: unknown, requestedLanguage: string): HelloSalutTranslation {
  if (!isRecord(value) || typeof value.code !== 'string' || typeof value.hello !== 'string') {
    throw new RuntimeFailure('OPEN_API_FAILED', 'HelloSalut response had an unexpected schema.', { response: value })
  }
  const code = value.code.trim()
  const hello = value.hello.trim()
  if (code === '' || hello === '') {
    throw new RuntimeFailure('OPEN_API_FAILED', 'HelloSalut response was missing translation fields.', { response: value })
  }
  return {
    code,
    hello,
    matched: code.toLowerCase() === requestedLanguage.toLowerCase(),
  }
}

function isCloudflareChallenge(response: Response, body: string): boolean {
  const server = response.headers.get('server')?.toLowerCase()
  const mitigated = response.headers.get('cf-mitigated')?.toLowerCase()
  return response.status === 403 && (mitigated === 'challenge' || server === 'cloudflare' || body.includes('Just a moment...'))
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}
