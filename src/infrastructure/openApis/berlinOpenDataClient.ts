import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export const BERLIN_OPEN_DATA_DEFAULT_BASE_URL = 'https://datenregister.berlin.de/api/3/action'
export const BERLIN_OPEN_DATA_DEFAULT_QUERY = 'verkehr'
export const BERLIN_OPEN_DATA_SEARCH_DEFAULT_LIMIT = 100
export const BERLIN_OPEN_DATA_SEARCH_MAX_LIMIT = 1000
export const BERLIN_OPEN_DATA_DEFAULT_PACKAGE_ID = '727ae619-b46c-4437-9525-4d8b964fd841'

export type BerlinOpenDataSearchInput = {
  query?: string | undefined
  limit?: number | undefined
}

export type NormalizedBerlinOpenDataSearchInput = {
  query: string
  limit: number
}

export type BerlinOpenDataPackageInput = {
  packageId?: string | undefined
}

export type NormalizedBerlinOpenDataPackageInput = {
  packageId: string
}

export type BerlinOpenDataResource = {
  id: string
  name?: string | undefined
  format?: string | undefined
  url?: string | undefined
  datastoreActive: boolean
}

export type BerlinOpenDataDataset = {
  id: string
  name?: string | undefined
  title?: string | undefined
  notes?: string | undefined
  organizationTitle?: string | undefined
  licenseTitle?: string | undefined
  licenseUrl?: string | undefined
  resources: BerlinOpenDataResource[]
}

export type BerlinOpenDataPackageSearch = {
  count?: number | undefined
  results: BerlinOpenDataDataset[]
}

export class BerlinOpenDataClient {
  constructor(private readonly options: { baseUrl?: string | undefined; fetchImpl?: typeof fetch | undefined } = {}) {}

  async searchDatasets(input: NormalizedBerlinOpenDataSearchInput): Promise<BerlinOpenDataPackageSearch> {
    const url = this.createActionUrl('/package_search')
    url.searchParams.set('q', input.query)
    url.searchParams.set('rows', String(input.limit))
    const parsed = await this.fetchAction(url)
    return parsePackageSearch(parsed)
  }

  async showDataset(input: NormalizedBerlinOpenDataPackageInput): Promise<BerlinOpenDataDataset> {
    const url = this.createActionUrl('/package_show')
    url.searchParams.set('id', input.packageId)
    const parsed = await this.fetchAction(url)
    return parseDataset(parsed)
  }

  private createActionUrl(pathname: string): URL {
    return new URL(`${this.options.baseUrl ?? BERLIN_OPEN_DATA_DEFAULT_BASE_URL}${pathname}`)
  }

  private async fetchAction(url: URL): Promise<unknown> {
    const fetchImpl = this.options.fetchImpl ?? globalThis.fetch
    let response: Response
    try {
      response = await fetchImpl(url, { headers: { accept: 'application/json' } })
    } catch (error) {
      throw new RuntimeFailure('OPEN_API_FAILED', `Berlin Open Data request failed: ${String(error)}`, {
        provider: 'berlinopendata',
        endpoint: url.href,
      })
    }

    let body: string
    try {
      body = await response.text()
    } catch (error) {
      throw new RuntimeFailure('OPEN_API_FAILED', `Berlin Open Data response body could not be read: ${String(error)}`, {
        provider: 'berlinopendata',
        status: response.status,
        endpoint: url.href,
      })
    }

    if (isCloudflareChallenge(response, body)) {
      throw new RuntimeFailure(
        'OPEN_API_FAILED',
        'Berlin Open Data is currently returning a Cloudflare challenge HTML page instead of the documented CKAN JSON API response; retry later or use cached/offline data.',
        {
          provider: 'berlinopendata',
          status: response.status,
          endpoint: url.href,
          contentType: response.headers.get('content-type') ?? undefined,
        },
      )
    }

    let parsed: unknown
    try {
      parsed = JSON.parse(body)
    } catch (error) {
      throw new RuntimeFailure('OPEN_API_FAILED', `Berlin Open Data returned a non-JSON response: ${String(error)}`, {
        provider: 'berlinopendata',
        status: response.status,
        endpoint: url.href,
        contentType: response.headers.get('content-type') ?? undefined,
      })
    }

    if (!response.ok) {
      throw new RuntimeFailure('OPEN_API_FAILED', readErrorMessage(parsed) ?? `Berlin Open Data request failed with HTTP ${response.status}.`, {
        provider: 'berlinopendata',
        status: response.status,
        endpoint: url.href,
        response: parsed,
      })
    }

    if (!isRecord(parsed) || parsed.success !== true || parsed.result === undefined) {
      throw new RuntimeFailure('OPEN_API_FAILED', readErrorMessage(parsed) ?? 'Berlin Open Data action response was not successful.')
    }

    return parsed.result
  }
}

export function normalizeBerlinOpenDataSearchInput(input: BerlinOpenDataSearchInput = {}): NormalizedBerlinOpenDataSearchInput {
  const query = (input.query ?? BERLIN_OPEN_DATA_DEFAULT_QUERY).trim()
  if (query.length < 2 || query.length > 120) {
    throw new RuntimeFailure('INVALID_ARGUMENT', '--query must be between 2 and 120 characters.')
  }
  return { query, limit: normalizeLimit(input.limit, BERLIN_OPEN_DATA_SEARCH_DEFAULT_LIMIT, BERLIN_OPEN_DATA_SEARCH_MAX_LIMIT) }
}

export function normalizeBerlinOpenDataPackageInput(input: BerlinOpenDataPackageInput = {}): NormalizedBerlinOpenDataPackageInput {
  const packageId = (input.packageId ?? BERLIN_OPEN_DATA_DEFAULT_PACKAGE_ID).trim()
  if (!isUuid(packageId) && !isPackageName(packageId)) {
    throw new RuntimeFailure('INVALID_ARGUMENT', '--package-id must be a CKAN dataset UUID or package name.')
  }
  return { packageId }
}

function parsePackageSearch(value: unknown): BerlinOpenDataPackageSearch {
  if (!isRecord(value) || !Array.isArray(value.results)) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'Berlin Open Data package_search result did not include results[].')
  }
  return {
    count: typeof value.count === 'number' ? value.count : undefined,
    results: value.results.map(parseDataset).filter((dataset): dataset is BerlinOpenDataDataset => dataset !== undefined),
  }
}

function parseDataset(value: unknown): BerlinOpenDataDataset {
  if (!isRecord(value) || typeof value.id !== 'string') {
    throw new RuntimeFailure('OPEN_API_FAILED', 'Berlin Open Data dataset result did not include an id.')
  }
  return {
    id: value.id,
    name: readOptionalString(value.name),
    title: readLocalizedString(value.title) ?? readOptionalString(value.title),
    notes: readLocalizedString(value.notes_translated) ?? readOptionalString(value.notes),
    organizationTitle: readOrganizationTitle(value.organization) ?? readLocalizedString(value.org_title_at_publication),
    licenseTitle: readOptionalString(value.license_title),
    licenseUrl: readOptionalString(value.license_url),
    resources: Array.isArray(value.resources) ? value.resources.map(parseResource).filter((resource): resource is BerlinOpenDataResource => resource !== undefined) : [],
  }
}

function parseResource(value: unknown): BerlinOpenDataResource | undefined {
  if (!isRecord(value) || typeof value.id !== 'string') {
    return undefined
  }
  return {
    id: value.id,
    name: readLocalizedString(value.name_translated) ?? readOptionalString(value.name),
    format: readOptionalString(value.format),
    url: readOptionalString(value.url),
    datastoreActive: value.datastore_active === true,
  }
}

function normalizeLimit(value: number | undefined, defaultValue: number, maxValue: number): number {
  const limit = value ?? defaultValue
  if (!Number.isInteger(limit) || limit < 1 || limit > maxValue) {
    throw new RuntimeFailure('INVALID_ARGUMENT', `--limit must be an integer between 1 and ${maxValue}.`)
  }
  return limit
}

function readErrorMessage(value: unknown): string | undefined {
  if (!isRecord(value)) {
    return undefined
  }
  if (typeof value.error === 'string') {
    return value.error
  }
  if (isRecord(value.error)) {
    return readOptionalString(value.error.message) ?? readOptionalString(value.error.__type)
  }
  return readOptionalString(value.message)
}

function readOrganizationTitle(value: unknown): string | undefined {
  if (!isRecord(value)) {
    return undefined
  }
  return readOptionalString(value.title) ?? readLocalizedString(value.title_translated)
}

function readLocalizedString(value: unknown): string | undefined {
  if (typeof value === 'string' && value.trim().startsWith('{')) {
    try {
      return readLocalizedString(JSON.parse(value) as unknown)
    } catch {
      return undefined
    }
  }
  if (!isRecord(value)) {
    return undefined
  }
  return readOptionalString(value.en) ?? readOptionalString(value.fr)
}

function readOptionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu.test(value)
}

function isPackageName(value: string): boolean {
  return /^[a-z0-9][a-z0-9_-]{1,120}$/iu.test(value)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
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
