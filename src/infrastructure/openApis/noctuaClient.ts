import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export const NOCTUA_DEFAULT_BASE_URL = 'https://api.noctuasky.com/api/v1'

export type NoctuaStatsResponse = {
  total: number
  byTypes: NoctuaSkySourceTypeCount[]
}

export type NoctuaSkySourceTypeCount = {
  type: string
  count: number
}

export type NoctuaSkySourceResponse = {
  shortName: string
  match?: string | undefined
  model?: string | undefined
  names: string[]
  types: string[]
  interest?: number | undefined
  modelData: Record<string, unknown>
}

type NoctuaStatsPayload = {
  nb_skysources?: unknown
  by_types?: unknown
}

type NoctuaSkySourcePayload = {
  short_name?: unknown
  match?: unknown
  model?: unknown
  names?: unknown
  types?: unknown
  interest?: unknown
  model_data?: unknown
}

export class NoctuaClient {
  constructor(
    private readonly baseUrl = NOCTUA_DEFAULT_BASE_URL,
    private readonly fetchImpl: typeof fetch = globalThis.fetch,
  ) {}

  async stats(): Promise<NoctuaStatsResponse> {
    return parseStatsPayload(await this.fetchJson(this.createUrl('/skysources/stats/')))
  }

  async sourceByName(name: string): Promise<NoctuaSkySourceResponse> {
    const encodedName = encodeURIComponent(name)
    return parseSkySourcePayload(
      await this.fetchJson(this.createUrl(`/skysources/name/${encodedName}`)),
    )
  }

  private createUrl(path: string): URL {
    return new URL(`${normalizeBaseUrl(this.baseUrl)}${path}`)
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
        `Noctua request failed: ${String(error)}`,
        { provider: 'noctua', url: url.toString() },
      )
    }

    const body = await response.text()

    if (isCloudflareChallenge(response, body)) {
      throw new RuntimeFailure(
        'OPEN_API_FAILED',
        [
          'Noctua is currently returning a Cloudflare challenge HTML page',
          'instead of the documented JSON API response; retry later or use',
          'cached/offline data.',
        ].join(' '),
        createResponseDetails(response, url),
      )
    }

    let parsed: unknown
    try {
      parsed = JSON.parse(body) as unknown
    } catch {
      throw new RuntimeFailure(
        'OPEN_API_FAILED',
        'Noctua response was not JSON.',
        {
          ...createResponseDetails(response, url),
          preview: body.slice(0, 120),
        },
      )
    }

    if (!response.ok) {
      const message = readNoctuaError(parsed)
      throw new RuntimeFailure(
        'OPEN_API_FAILED',
        message ?? `Noctua request failed with HTTP ${response.status}.`,
        {
          ...createResponseDetails(response, url),
          response: parsed,
        },
      )
    }

    return parsed
  }
}

function createResponseDetails(
  response: Response,
  url: URL,
): Record<string, unknown> {
  return {
    provider: 'noctua',
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

function parseStatsPayload(value: unknown): NoctuaStatsResponse {
  if (!isRecord(value)) {
    throw new RuntimeFailure(
      'OPEN_API_FAILED',
      'Noctua stats response did not match the documented JSON object shape.',
    )
  }

  const payload = value as NoctuaStatsPayload
  const total = readFiniteNumber(payload.nb_skysources)
  if (total === undefined || !Array.isArray(payload.by_types)) {
    throw new RuntimeFailure(
      'OPEN_API_FAILED',
      'Noctua stats response did not include skysource counts.',
    )
  }

  const byTypes = payload.by_types
    .map(parseTypeCount)
    .filter((entry): entry is NoctuaSkySourceTypeCount => entry !== undefined)

  if (byTypes.length === 0) {
    throw new RuntimeFailure(
      'OPEN_API_FAILED',
      'Noctua stats response did not include usable type counts.',
    )
  }

  return {
    total,
    byTypes: byTypes.sort((left, right) => right.count - left.count),
  }
}

function parseTypeCount(value: unknown): NoctuaSkySourceTypeCount | undefined {
  if (!isRecord(value)) return undefined
  const type = readString(value._id)
  const count = readFiniteNumber(value.count)
  return type === undefined || count === undefined ? undefined : { type, count }
}

function parseSkySourcePayload(value: unknown): NoctuaSkySourceResponse {
  if (!isRecord(value)) {
    throw new RuntimeFailure(
      'OPEN_API_FAILED',
      'Noctua skysource response did not match the documented JSON object shape.',
    )
  }

  const payload = value as NoctuaSkySourcePayload
  const shortName = readString(payload.short_name)
  if (shortName === undefined) {
    throw new RuntimeFailure(
      'OPEN_API_FAILED',
      'Noctua skysource response did not include a short_name string.',
    )
  }

  return {
    shortName,
    match: readString(payload.match),
    model: readString(payload.model),
    names: readStringArray(payload.names),
    types: readStringArray(payload.types),
    interest: readFiniteNumber(payload.interest),
    modelData: isRecord(payload.model_data) ? payload.model_data : {},
  }
}

function readNoctuaError(value: unknown): string | undefined {
  if (!isRecord(value)) return undefined
  return readString(value.message) ?? readString(value.status)
}

function readStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value
    .map(readString)
    .filter((entry): entry is string => entry !== undefined)
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() !== ''
    ? value.trim()
    : undefined
}

function readFiniteNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

function normalizeBaseUrl(value: string): string {
  return value.replace(/\/+$/u, '')
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}
