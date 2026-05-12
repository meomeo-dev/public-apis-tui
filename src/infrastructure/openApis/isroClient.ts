import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export const ISRO_DEFAULT_BASE_URL = 'https://isro.vercel.app/api'

export const ISRO_RESOURCES = [
  'spacecrafts',
  'launchers',
  'customer_satellites',
  'centres',
] as const

export type IsroResource = (typeof ISRO_RESOURCES)[number]

export type IsroSpacecraft = {
  id: number
  name: string
}

export type IsroLauncher = {
  id: string
}

export type IsroCustomerSatellite = {
  id: string
  country: string
  launchDate: string
  mass: string
  launcher: string
}

export type IsroCentre = {
  id: number
  name: string
  place: string
  state: string
}

export type IsroResourceItems = {
  spacecrafts: IsroSpacecraft[]
  launchers: IsroLauncher[]
  customer_satellites: IsroCustomerSatellite[]
  centres: IsroCentre[]
}

export type IsroCatalogItem =
  | IsroSpacecraft
  | IsroLauncher
  | IsroCustomerSatellite
  | IsroCentre

export class IsroClient {
  constructor(
    private readonly baseUrl = ISRO_DEFAULT_BASE_URL,
    private readonly fetchImpl: typeof fetch = globalThis.fetch,
  ) {}

  async listResource<TResource extends IsroResource>(
    resource: TResource,
  ): Promise<IsroResourceItems[TResource]> {
    const parsed = await this.fetchJson(this.createUrl(resource))
    if (!isRecord(parsed) || !Array.isArray(parsed[resource])) {
      throw new RuntimeFailure(
        'OPEN_API_FAILED',
        'ISRO response did not match the documented JSON catalog shape.',
        { provider: 'isro', resource },
      )
    }

    const items = parsed[resource]
      .map(item => parseItem(resource, item))
      .filter((item): item is IsroCatalogItem => item !== undefined)

    return items as IsroResourceItems[TResource]
  }

  private createUrl(resource: IsroResource): URL {
    return new URL(`${normalizeBaseUrl(this.baseUrl)}/${resource}`)
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
        `ISRO request failed: ${String(error)}`,
        { provider: 'isro', url: url.toString() },
      )
    }

    const text = await response.text()

    if (isCloudflareChallenge(response, text)) {
      throw new RuntimeFailure(
        'OPEN_API_FAILED',
        [
          'ISRO is currently returning a Cloudflare challenge HTML page',
          'instead of the documented JSON API response; retry later or use',
          'cached/offline data.',
        ].join(' '),
        createResponseDetails(response, url),
      )
    }

    let parsed: unknown
    try {
      parsed = JSON.parse(text) as unknown
    } catch {
      throw new RuntimeFailure(
        'OPEN_API_FAILED',
        'ISRO response was not JSON.',
        {
          ...createResponseDetails(response, url),
          preview: text.slice(0, 120),
        },
      )
    }

    if (!response.ok) {
      throw new RuntimeFailure(
        'OPEN_API_FAILED',
        `ISRO request failed with HTTP ${response.status}.`,
        {
          ...createResponseDetails(response, url),
          response: parsed,
        },
      )
    }

    return parsed
  }
}

export function normalizeIsroResource(value: unknown): IsroResource {
  const normalized = String(value ?? 'spacecrafts')
    .trim()
    .toLowerCase()
    .replace(/-/gu, '_')

  if (isIsroResource(normalized)) return normalized

  throw new RuntimeFailure(
    'INVALID_ARGUMENT',
    `ISRO --resource must be one of ${ISRO_RESOURCES.join(', ')}.`,
    { resource: value },
  )
}

function parseItem(
  resource: IsroResource,
  value: unknown,
): IsroCatalogItem | undefined {
  if (!isRecord(value)) return undefined
  if (resource === 'spacecrafts') return parseSpacecraft(value)
  if (resource === 'launchers') return parseLauncher(value)
  if (resource === 'customer_satellites') return parseCustomerSatellite(value)
  return parseCentre(value)
}

function parseSpacecraft(value: Record<string, unknown>): IsroSpacecraft | undefined {
  const id = readFiniteNumber(value.id)
  const name = readString(value.name)
  return id === undefined || name === undefined ? undefined : { id, name }
}

function parseLauncher(value: Record<string, unknown>): IsroLauncher | undefined {
  const id = readString(value.id)
  return id === undefined ? undefined : { id }
}

function parseCustomerSatellite(
  value: Record<string, unknown>,
): IsroCustomerSatellite | undefined {
  const id = readString(value.id)
  const country = readString(value.country)
  const launchDate = readString(value.launch_date)
  const mass = readString(value.mass) ?? ''
  const launcher = readString(value.launcher)
  if (
    id === undefined ||
    country === undefined ||
    launchDate === undefined ||
    launcher === undefined
  ) {
    return undefined
  }
  return { id, country, launchDate, mass, launcher }
}

function parseCentre(value: Record<string, unknown>): IsroCentre | undefined {
  const id = readFiniteNumber(value.id)
  const name = readString(value.name)
  const place = readString(value.Place)
  const state = readString(value.State)
  if (
    id === undefined ||
    name === undefined ||
    place === undefined ||
    state === undefined
  ) {
    return undefined
  }
  return { id, name, place, state }
}

function isIsroResource(value: string): value is IsroResource {
  return (ISRO_RESOURCES as readonly string[]).includes(value)
}

function createResponseDetails(response: Response, url: URL): Record<string, unknown> {
  return {
    provider: 'isro',
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
