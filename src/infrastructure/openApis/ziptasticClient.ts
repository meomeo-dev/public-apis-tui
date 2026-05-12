import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export const ZIPTASTIC_BASE_URL = 'https://ziptasticapi.com'
export const ZIPTASTIC_DOCS_URL = 'https://ziptasticapi.com/'
export const ZIPTASTIC_DEFAULT_ZIP = '90210'

export type ZiptasticLookupInput = {
  zip?: string | undefined
}

export type NormalizedZiptasticLookupInput = {
  zip: string
}

export type ZiptasticAddress = {
  country: string
  state: string
  city: string
}

type ZiptasticClientOptions = {
  baseUrl?: string | undefined
  fetchImpl?: typeof fetch | undefined
}

export class ZiptasticClient {
  constructor(private readonly options: ZiptasticClientOptions = {}) {}

  async lookup(input: NormalizedZiptasticLookupInput): Promise<ZiptasticAddress | undefined> {
    const url = new URL(`/${input.zip}`, this.options.baseUrl ?? ZIPTASTIC_BASE_URL)
    const parsed = await this.fetchJsonText(url)
    if (isRecord(parsed) && typeof parsed.error === 'string') {
      return undefined
    }
    return parseAddress(parsed)
  }

  private async fetchJsonText(url: URL): Promise<unknown> {
    const fetchImpl = this.options.fetchImpl ?? globalThis.fetch
    let response: Response
    try {
      response = await fetchImpl(url, { headers: { accept: 'application/json' } })
    } catch (error) {
      throw new RuntimeFailure('OPEN_API_FAILED', `Ziptastic request failed: ${String(error)}`, {
        provider: 'ziptastic',
        endpoint: url.href,
      })
    }

    const body = await response.text()
    if (isCloudflareChallenge(response, body)) {
      throw new RuntimeFailure(
        'OPEN_API_FAILED',
        'Ziptastic is currently returning a Cloudflare challenge HTML page instead of the documented JSON-body response; retry later or use cached/offline data.',
        {
          provider: 'ziptastic',
          endpoint: url.href,
          status: response.status,
          contentType: response.headers.get('content-type') ?? undefined,
        },
      )
    }
    let parsed: unknown
    try {
      parsed = JSON.parse(body)
    } catch (error) {
      throw new RuntimeFailure('OPEN_API_FAILED', `Ziptastic returned a non-JSON response body: ${String(error)}`, {
        provider: 'ziptastic',
        endpoint: url.href,
        status: response.status,
        contentType: response.headers.get('content-type') ?? undefined,
      })
    }

    if (!response.ok) {
      throw new RuntimeFailure('OPEN_API_FAILED', `Ziptastic request failed with HTTP ${response.status}.`, {
        provider: 'ziptastic',
        endpoint: url.href,
        status: response.status,
        response: parsed,
      })
    }
    return parsed
  }
}

export function normalizeZiptasticLookupInput(input: ZiptasticLookupInput = {}): NormalizedZiptasticLookupInput {
  return { zip: normalizeZip(input.zip ?? ZIPTASTIC_DEFAULT_ZIP) }
}

function normalizeZip(value: string): string {
  const zip = value.trim()
  if (!/^[A-Za-z0-9][A-Za-z0-9 -]{1,14}[A-Za-z0-9]$/u.test(zip) || /[/?#\\]/u.test(zip)) {
    throw new RuntimeFailure('INVALID_ARGUMENT', '--zip must be a path-safe postal code such as 90210 or 01001.')
  }
  return zip.toUpperCase().replace(/\s+/gu, ' ')
}

function parseAddress(value: unknown): ZiptasticAddress {
  if (!isRecord(value)) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'Ziptastic response was not a JSON object.', { provider: 'ziptastic', response: value })
  }
  return {
    country: readRequiredString(value, 'country'),
    state: readRequiredString(value, 'state'),
    city: readRequiredString(value, 'city'),
  }
}

function readRequiredString(record: Record<string, unknown>, key: keyof ZiptasticAddress): string {
  const value = record[key]
  if (typeof value !== 'string' || value.trim() === '') {
    throw new RuntimeFailure('OPEN_API_FAILED', `Ziptastic response was missing required field ${key}.`, {
      provider: 'ziptastic',
      response: record,
    })
  }
  return value.trim()
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function isCloudflareChallenge(response: Response, body: string): boolean {
  const contentType = response.headers.get('content-type')?.toLowerCase() ?? ''
  const server = response.headers.get('server')?.toLowerCase() ?? ''
  const cfMitigated = response.headers.get('cf-mitigated')?.toLowerCase() ?? ''
  const bodyLower = body.toLowerCase()
  return (
    cfMitigated === 'challenge' ||
    (server.includes('cloudflare') &&
      contentType.includes('text/html') &&
      (response.status === 403 || response.status === 429) &&
      (bodyLower.includes('<title>just a moment...</title>') || bodyLower.includes('cloudflare')))
  )
}
