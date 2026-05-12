import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export const OPEN_GOVERNMENT_CANADA_DEFAULT_BASE_URL = 'https://open.canada.ca/data/en/api/3/action'
export const OPEN_GOVERNMENT_CANADA_DEFAULT_QUERY = 'business'
export const OPEN_GOVERNMENT_CANADA_SEARCH_DEFAULT_LIMIT = 1000
export const OPEN_GOVERNMENT_CANADA_SEARCH_MAX_LIMIT = 1000
export const OPEN_GOVERNMENT_CANADA_DEFAULT_PACKAGE_ID = '2d90548d-50ef-4802-91f8-c59c5cf68251'

export type OpenGovernmentCanadaSearchInput = {
  query?: string | undefined
  limit?: number | undefined
}

export type NormalizedOpenGovernmentCanadaSearchInput = {
  query: string
  limit: number
}

export type OpenGovernmentCanadaPackageInput = {
  packageId?: string | undefined
}

export type NormalizedOpenGovernmentCanadaPackageInput = {
  packageId: string
}

export type OpenGovernmentCanadaResource = {
  id: string
  name?: string | undefined
  format?: string | undefined
  url?: string | undefined
  datastoreActive: boolean
}

export type OpenGovernmentCanadaDataset = {
  id: string
  name?: string | undefined
  title?: string | undefined
  notes?: string | undefined
  organizationTitle?: string | undefined
  licenseTitle?: string | undefined
  licenseUrl?: string | undefined
  resources: OpenGovernmentCanadaResource[]
}

export type OpenGovernmentCanadaPackageSearch = {
  count?: number | undefined
  results: OpenGovernmentCanadaDataset[]
}

export class OpenGovernmentCanadaClient {
  constructor(private readonly options: { baseUrl?: string | undefined; fetchImpl?: typeof fetch | undefined } = {}) {}

  async searchDatasets(input: NormalizedOpenGovernmentCanadaSearchInput): Promise<OpenGovernmentCanadaPackageSearch> {
    const url = this.createActionUrl('/package_search')
    url.searchParams.set('q', input.query)
    url.searchParams.set('rows', String(input.limit))
    const parsed = await this.fetchAction(url)
    return parsePackageSearch(parsed)
  }

  async showDataset(input: NormalizedOpenGovernmentCanadaPackageInput): Promise<OpenGovernmentCanadaDataset> {
    const url = this.createActionUrl('/package_show')
    url.searchParams.set('id', input.packageId)
    const parsed = await this.fetchAction(url)
    return parseDataset(parsed)
  }

  private createActionUrl(pathname: string): URL {
    return new URL(`${this.options.baseUrl ?? OPEN_GOVERNMENT_CANADA_DEFAULT_BASE_URL}${pathname}`)
  }

  private async fetchAction(url: URL): Promise<unknown> {
    const fetchImpl = this.options.fetchImpl ?? globalThis.fetch
    let response: Response
    try {
      response = await fetchImpl(url, { headers: { accept: 'application/json' } })
    } catch (error) {
      throw new RuntimeFailure('OPEN_API_FAILED', `Open Government Canada request failed: ${String(error)}`, {
        provider: 'opengovernmentcanada',
        endpoint: url.href,
      })
    }

    let parsed: unknown
    try {
      parsed = await response.json()
    } catch (error) {
      throw new RuntimeFailure('OPEN_API_FAILED', `Open Government Canada returned a non-JSON response: ${String(error)}`, {
        provider: 'opengovernmentcanada',
        status: response.status,
        endpoint: url.href,
      })
    }

    if (!response.ok) {
      throw new RuntimeFailure('OPEN_API_FAILED', readErrorMessage(parsed) ?? `Open Government Canada request failed with HTTP ${response.status}.`, {
        provider: 'opengovernmentcanada',
        status: response.status,
        endpoint: url.href,
        response: parsed,
      })
    }

    if (!isRecord(parsed) || parsed.success !== true || parsed.result === undefined) {
      throw new RuntimeFailure('OPEN_API_FAILED', readErrorMessage(parsed) ?? 'Open Government Canada action response was not successful.')
    }

    return parsed.result
  }
}

export function normalizeOpenGovernmentCanadaSearchInput(input: OpenGovernmentCanadaSearchInput = {}): NormalizedOpenGovernmentCanadaSearchInput {
  const query = (input.query ?? OPEN_GOVERNMENT_CANADA_DEFAULT_QUERY).trim()
  if (query.length < 2 || query.length > 120) {
    throw new RuntimeFailure('INVALID_ARGUMENT', '--query must be between 2 and 120 characters.')
  }
  return { query, limit: normalizeLimit(input.limit, OPEN_GOVERNMENT_CANADA_SEARCH_DEFAULT_LIMIT, OPEN_GOVERNMENT_CANADA_SEARCH_MAX_LIMIT) }
}

export function normalizeOpenGovernmentCanadaPackageInput(input: OpenGovernmentCanadaPackageInput = {}): NormalizedOpenGovernmentCanadaPackageInput {
  const packageId = (input.packageId ?? OPEN_GOVERNMENT_CANADA_DEFAULT_PACKAGE_ID).trim()
  if (!isUuid(packageId)) {
    throw new RuntimeFailure('INVALID_ARGUMENT', '--package-id must be a CKAN dataset UUID.')
  }
  return { packageId }
}

function parsePackageSearch(value: unknown): OpenGovernmentCanadaPackageSearch {
  if (!isRecord(value) || !Array.isArray(value.results)) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'Open Government Canada package_search result did not include results[].')
  }
  return {
    count: typeof value.count === 'number' ? value.count : undefined,
    results: value.results.map(parseDataset).filter((dataset): dataset is OpenGovernmentCanadaDataset => dataset !== undefined),
  }
}

function parseDataset(value: unknown): OpenGovernmentCanadaDataset {
  if (!isRecord(value) || typeof value.id !== 'string') {
    throw new RuntimeFailure('OPEN_API_FAILED', 'Open Government Canada dataset result did not include an id.')
  }
  return {
    id: value.id,
    name: readOptionalString(value.name),
    title: readLocalizedString(value.title) ?? readOptionalString(value.title),
    notes: readLocalizedString(value.notes_translated) ?? readOptionalString(value.notes),
    organizationTitle: readOrganizationTitle(value.organization) ?? readLocalizedString(value.org_title_at_publication),
    licenseTitle: readOptionalString(value.license_title),
    licenseUrl: readOptionalString(value.license_url),
    resources: Array.isArray(value.resources) ? value.resources.map(parseResource).filter((resource): resource is OpenGovernmentCanadaResource => resource !== undefined) : [],
  }
}

function parseResource(value: unknown): OpenGovernmentCanadaResource | undefined {
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
