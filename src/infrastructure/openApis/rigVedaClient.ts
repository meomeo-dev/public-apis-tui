import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export const RIG_VEDA_DEFAULT_BASE_URL =
  'https://indica-1hwj.onrender.com/rv/v2/meta'

export type RigVedaRecord = {
  mandal: number
  sukta: number
  meter: string
  sungby: string
  sungbycategory: string
  sungfor: string
  sungforcategory: string
}

type RigVedaRecordPayload = {
  mandal?: unknown
  sukta?: unknown
  meter?: unknown
  sungby?: unknown
  sungbycategory?: unknown
  sungfor?: unknown
  sungforcategory?: unknown
}

export class RigVedaClient {
  constructor(
    private readonly baseUrl = RIG_VEDA_DEFAULT_BASE_URL,
    private readonly fetchImpl: typeof fetch = globalThis.fetch,
  ) {}

  async book(mandal: number): Promise<RigVedaRecord[]> {
    return this.fetchRecords(`/book/${String(mandal)}`)
  }

  async meter(meter: string): Promise<RigVedaRecord[]> {
    return this.fetchRecords(`/meter/${encodeURIComponent(meter)}`)
  }

  async poet(sungBy: string): Promise<RigVedaRecord[]> {
    return this.fetchRecords(`/poet/${encodeURIComponent(sungBy)}`)
  }

  async poetCategory(category: string): Promise<RigVedaRecord[]> {
    return this.fetchRecords(`/poetcategory/${encodeURIComponent(category)}`)
  }

  async god(sungFor: string): Promise<RigVedaRecord[]> {
    return this.fetchRecords(`/god/${encodeURIComponent(sungFor)}`)
  }

  async godInBook(sungFor: string, mandal: number): Promise<RigVedaRecord[]> {
    return this.fetchRecords(`/god/${encodeURIComponent(sungFor)}/${String(mandal)}`)
  }

  async godByPoet(sungFor: string, sungBy: string): Promise<RigVedaRecord[]> {
    return this.fetchRecords(
      `/godbypoet/${encodeURIComponent(sungFor)}/${encodeURIComponent(sungBy)}`,
    )
  }

  async godCategory(category: string): Promise<RigVedaRecord[]> {
    return this.fetchRecords(`/godcategory/${encodeURIComponent(category)}`)
  }

  async godCategoryByPoetCategory(
    godCategory: string,
    poetCategory: string,
  ): Promise<RigVedaRecord[]> {
    return this.fetchRecords([
      '/godcategorybypoetcategory',
      `/${encodeURIComponent(godCategory)}`,
      `/${encodeURIComponent(poetCategory)}`,
    ].join(''))
  }

  private async fetchRecords(path: string): Promise<RigVedaRecord[]> {
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
        `Rig Veda request failed: ${String(error)}`,
        { provider: 'rigveda', url: url.toString() },
      )
    }

    const body = await response.text()

    if (isCloudflareChallenge(response, body)) {
      throw new RuntimeFailure(
        'OPEN_API_FAILED',
        [
          'Rig Veda is currently returning a Cloudflare challenge HTML page',
          'instead of the documented JSON API response; retry later or use',
          'cached/offline data.',
        ].join(' '),
        createResponseDetails(response, url),
      )
    }

    const details = createResponseDetails(response, url)
    const contentType = response.headers.get('content-type') ?? undefined
    if (!contentType?.toLowerCase().includes('application/json')) {
      throw new RuntimeFailure(
        'OPEN_API_FAILED',
        'Rig Veda response was not JSON.',
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
        'Rig Veda response could not be parsed as JSON.',
        {
          ...details,
          preview: body.slice(0, 160),
        },
      )
    }

    if (!response.ok) {
      throw new RuntimeFailure(
        'OPEN_API_FAILED',
        `Rig Veda request failed with HTTP ${response.status}.`,
        {
          ...details,
          response: parsed,
        },
      )
    }

    return parseRecords(parsed)
  }
}

function createResponseDetails(
  response: Response,
  url: URL,
): Record<string, unknown> {
  return {
    provider: 'rigveda',
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

function parseRecords(value: unknown): RigVedaRecord[] {
  if (!Array.isArray(value)) {
    throw new RuntimeFailure(
      'OPEN_API_FAILED',
      'Rig Veda response did not match the documented JSON array shape.',
      { provider: 'rigveda' },
    )
  }

  return value.map(parseRecord)
}

function parseRecord(value: unknown): RigVedaRecord {
  if (!isRecord(value)) {
    throw new RuntimeFailure(
      'OPEN_API_FAILED',
      'Rig Veda record was not a JSON object.',
      { provider: 'rigveda' },
    )
  }

  const payload = value as RigVedaRecordPayload
  return {
    mandal: readInteger(payload.mandal, 'mandal'),
    sukta: readInteger(payload.sukta, 'sukta'),
    meter: readString(payload.meter, 'meter'),
    sungby: readString(payload.sungby, 'sungby'),
    sungbycategory: readString(payload.sungbycategory, 'sungbycategory'),
    sungfor: readString(payload.sungfor, 'sungfor'),
    sungforcategory: readString(payload.sungforcategory, 'sungforcategory'),
  }
}

function readInteger(value: unknown, key: string): number {
  if (typeof value === 'number' && Number.isInteger(value)) return value
  throw new RuntimeFailure(
    'OPEN_API_FAILED',
    `Rig Veda record is missing integer field ${key}.`,
    { provider: 'rigveda', key },
  )
}

function readString(value: unknown, key: string): string {
  if (typeof value === 'string' && value.trim() !== '') return value.trim()
  throw new RuntimeFailure(
    'OPEN_API_FAILED',
    `Rig Veda record is missing string field ${key}.`,
    { provider: 'rigveda', key },
  )
}

function normalizeBaseUrl(value: string): string {
  return value.replace(/\/+$/u, '')
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}
