import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export const OPEN_GOVERNMENT_US_DEFAULT_BASE_URL = 'https://catalog.data.gov'
export const OPEN_GOVERNMENT_US_DEFAULT_QUERY = 'business'
export const OPEN_GOVERNMENT_US_SEARCH_DEFAULT_LIMIT = 1000
export const OPEN_GOVERNMENT_US_SEARCH_MAX_LIMIT = 1000
export const OPEN_GOVERNMENT_US_ORGANIZATIONS_DEFAULT_LIMIT = 120
export const OPEN_GOVERNMENT_US_ORGANIZATIONS_MAX_LIMIT = 120
export const OPEN_GOVERNMENT_US_KEYWORDS_DEFAULT_LIMIT = 1000
export const OPEN_GOVERNMENT_US_KEYWORDS_MAX_LIMIT = 1000

export type OpenGovernmentUsSearchInput = {
  query?: string | undefined
  limit?: number | undefined
  orgSlug?: string | undefined
  after?: string | undefined
}

export type NormalizedOpenGovernmentUsSearchInput = {
  query: string
  limit: number
  orgSlug?: string | undefined
  after?: string | undefined
}

export type OpenGovernmentUsOrganizationsInput = {
  limit?: number | undefined
}

export type NormalizedOpenGovernmentUsOrganizationsInput = {
  limit: number
}

export type OpenGovernmentUsKeywordsInput = {
  size?: number | undefined
  minCount?: number | undefined
}

export type NormalizedOpenGovernmentUsKeywordsInput = {
  size: number
  minCount: number
}

export type OpenGovernmentUsOrganization = {
  id: string
  name?: string | undefined
  slug?: string | undefined
  organizationType?: string | undefined
  datasetCount?: number | undefined
  sourceCount?: number | undefined
}

export type OpenGovernmentUsResource = {
  title?: string | undefined
  accessUrl?: string | undefined
}

export type OpenGovernmentUsDataset = {
  identifier: string
  slug?: string | undefined
  title?: string | undefined
  publisher?: string | undefined
  accessLevel?: string | undefined
  landingPage?: string | undefined
  organization?: OpenGovernmentUsOrganization | undefined
  keyword: string[]
  distributionTitles: string[]
  resources: OpenGovernmentUsResource[]
  harvestRecord?: string | undefined
  harvestRecordRaw?: string | undefined
  lastHarvestedDate?: string | undefined
}

export type OpenGovernmentUsSearchResult = {
  sort?: string | undefined
  after?: string | undefined
  count?: number | undefined
  results: OpenGovernmentUsDataset[]
}

export type OpenGovernmentUsKeywordsResult = {
  size: number
  minCount: number
  total?: number | undefined
  keywords: Array<{ keyword: string; count: number }>
}

export class OpenGovernmentUsClient {
  constructor(private readonly options: { baseUrl?: string | undefined; fetchImpl?: typeof fetch | undefined } = {}) {}

  async searchDatasets(input: NormalizedOpenGovernmentUsSearchInput): Promise<OpenGovernmentUsSearchResult> {
    const url = this.createUrl('/search')
    url.searchParams.set('q', input.query)
    url.searchParams.set('per_page', String(input.limit))
    if (input.orgSlug) {
      url.searchParams.set('org_slug', input.orgSlug)
    }
    if (input.after) {
      url.searchParams.set('after', input.after)
    }
    const parsed = await this.fetchJson(url)
    return parseSearch(parsed)
  }

  async listOrganizations(input: NormalizedOpenGovernmentUsOrganizationsInput): Promise<OpenGovernmentUsOrganization[]> {
    const url = this.createUrl('/api/organizations')
    const parsed = await this.fetchJson(url)
    return parseOrganizations(parsed, input.limit)
  }

  async listKeywords(input: NormalizedOpenGovernmentUsKeywordsInput): Promise<OpenGovernmentUsKeywordsResult> {
    const url = this.createUrl('/api/keywords')
    url.searchParams.set('size', String(input.size))
    url.searchParams.set('min_count', String(input.minCount))
    const parsed = await this.fetchJson(url)
    return parseKeywords(parsed, input)
  }

  private createUrl(pathname: string): URL {
    return new URL(`${this.options.baseUrl ?? OPEN_GOVERNMENT_US_DEFAULT_BASE_URL}${pathname}`)
  }

  private async fetchJson(url: URL): Promise<unknown> {
    const fetchImpl = this.options.fetchImpl ?? globalThis.fetch
    let lastFailure: RuntimeFailure | undefined
    for (let attempt = 1; attempt <= 2; attempt += 1) {
      let response: Response
      try {
        response = await fetchImpl(url, { headers: { accept: 'application/json' } })
      } catch (error) {
        lastFailure = new RuntimeFailure('OPEN_API_FAILED', `Open Government USA request failed: ${String(error)}`, {
          provider: 'opengovernmentusa',
          endpoint: url.href,
          attempt,
        })
        continue
      }

      let parsed: unknown
      try {
        parsed = await response.json()
      } catch (error) {
        lastFailure = new RuntimeFailure('OPEN_API_FAILED', `Open Government USA returned a non-JSON response: ${String(error)}`, {
          provider: 'opengovernmentusa',
          status: response.status,
          endpoint: url.href,
          attempt,
        })
        continue
      }

      if (!response.ok) {
        throw new RuntimeFailure('OPEN_API_FAILED', readErrorMessage(parsed) ?? `Open Government USA request failed with HTTP ${response.status}.`, {
          provider: 'opengovernmentusa',
          status: response.status,
          endpoint: url.href,
          response: parsed,
        })
      }

      return parsed
    }
    throw lastFailure ?? new RuntimeFailure('OPEN_API_FAILED', 'Open Government USA request failed.')
  }
}

export function normalizeOpenGovernmentUsSearchInput(input: OpenGovernmentUsSearchInput = {}): NormalizedOpenGovernmentUsSearchInput {
  const query = (input.query ?? OPEN_GOVERNMENT_US_DEFAULT_QUERY).trim()
  if (query.length < 2 || query.length > 120) {
    throw new RuntimeFailure('INVALID_ARGUMENT', '--query must be between 2 and 120 characters.')
  }
  return {
    query,
    limit: normalizeLimit(input.limit, OPEN_GOVERNMENT_US_SEARCH_DEFAULT_LIMIT, OPEN_GOVERNMENT_US_SEARCH_MAX_LIMIT),
    orgSlug: readOptionalString(input.orgSlug),
    after: readOptionalString(input.after),
  }
}

export function normalizeOpenGovernmentUsOrganizationsInput(input: OpenGovernmentUsOrganizationsInput = {}): NormalizedOpenGovernmentUsOrganizationsInput {
  return { limit: normalizeLimit(input.limit, OPEN_GOVERNMENT_US_ORGANIZATIONS_DEFAULT_LIMIT, OPEN_GOVERNMENT_US_ORGANIZATIONS_MAX_LIMIT) }
}

export function normalizeOpenGovernmentUsKeywordsInput(input: OpenGovernmentUsKeywordsInput = {}): NormalizedOpenGovernmentUsKeywordsInput {
  return {
    size: normalizeLimit(input.size, OPEN_GOVERNMENT_US_KEYWORDS_DEFAULT_LIMIT, OPEN_GOVERNMENT_US_KEYWORDS_MAX_LIMIT),
    minCount: normalizeMinCount(input.minCount ?? 1),
  }
}

function parseSearch(value: unknown): OpenGovernmentUsSearchResult {
  if (!isRecord(value) || !Array.isArray(value.results)) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'Open Government USA search result did not include results[].')
  }
  return {
    sort: readOptionalString(value.sort),
    after: readOptionalString(value.after),
    count: typeof value.count === 'number' ? value.count : undefined,
    results: value.results.map(parseDataset).filter((dataset): dataset is OpenGovernmentUsDataset => dataset !== undefined),
  }
}

function parseDataset(value: unknown): OpenGovernmentUsDataset | undefined {
  if (!isRecord(value) || typeof value.identifier !== 'string') {
    return undefined
  }
  const dcat = isRecord(value.dcat) ? value.dcat : undefined
  return {
    identifier: value.identifier,
    slug: readOptionalString(value.slug),
    title: readOptionalString(value.title) ?? readOptionalString(dcat?.title),
    publisher: readOptionalString(value.publisher) ?? readOrganizationName(dcat?.publisher),
    accessLevel: readOptionalString(value.accessLevel) ?? readOptionalString(dcat?.accessLevel),
    landingPage: readOptionalString(value.landingPage) ?? readOptionalString(dcat?.landingPage),
    organization: parseOrganization(value.organization),
    keyword: readStringArray(value.keyword),
    distributionTitles: readStringArray(value.distribution_titles),
    resources: dcat && Array.isArray(dcat.distribution) ? dcat.distribution.map(parseResource).filter((resource): resource is OpenGovernmentUsResource => resource !== undefined) : [],
    harvestRecord: readOptionalString(value.harvest_record),
    harvestRecordRaw: readOptionalString(value.harvest_record_raw),
    lastHarvestedDate: readOptionalString(value.last_harvested_date),
  }
}

function parseResource(value: unknown): OpenGovernmentUsResource | undefined {
  if (!isRecord(value)) {
    return undefined
  }
  return {
    title: readOptionalString(value.title),
    accessUrl: readOptionalString(value.accessURL),
  }
}

function parseOrganization(value: unknown): OpenGovernmentUsOrganization | undefined {
  if (!isRecord(value)) {
    return undefined
  }
  return {
    id: readOptionalString(value.id) ?? '',
    name: readOptionalString(value.name),
    slug: readOptionalString(value.slug),
    organizationType: readOptionalString(value.organization_type),
    datasetCount: typeof value.dataset_count === 'number' ? value.dataset_count : undefined,
    sourceCount: typeof value.source_count === 'number' ? value.source_count : undefined,
  }
}

function parseOrganizations(value: unknown, limit: number): OpenGovernmentUsOrganization[] {
  if (!isRecord(value) || !Array.isArray(value.organizations)) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'Open Government USA organizations result did not include organizations[].')
  }
  return value.organizations
    .slice(0, limit)
    .map(parseOrganization)
    .filter((entry): entry is OpenGovernmentUsOrganization => Boolean(entry && entry.id !== ''))
}

function parseKeywords(value: unknown, input: NormalizedOpenGovernmentUsKeywordsInput): OpenGovernmentUsKeywordsResult {
  if (!isRecord(value) || !Array.isArray(value.keywords)) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'Open Government USA keywords result did not include keywords[].')
  }
  return {
    size: input.size,
    minCount: input.minCount,
    total: typeof value.total === 'number' ? value.total : undefined,
    keywords: value.keywords
      .map(entry => {
        if (!isRecord(entry)) {
          return undefined
        }
        const keyword = readOptionalString(entry.keyword)
        if (keyword === undefined) {
          return undefined
        }
        return {
          keyword,
          count: typeof entry.count === 'number' ? entry.count : 0,
        }
      })
      .filter((entry): entry is { keyword: string; count: number } => entry !== undefined),
  }
}

function readStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map(item => String(item).trim()).filter(item => item.length > 0) : []
}

function normalizeLimit(value: number | undefined, defaultValue: number, maxValue: number): number {
  const limit = value ?? defaultValue
  if (!Number.isInteger(limit) || limit < 1 || limit > maxValue) {
    throw new RuntimeFailure('INVALID_ARGUMENT', `--limit must be an integer between 1 and ${maxValue}.`)
  }
  return limit
}

function normalizeMinCount(value: number): number {
  if (!Number.isInteger(value) || value < 1) {
    throw new RuntimeFailure('INVALID_ARGUMENT', '--min-count must be an integer >= 1.')
  }
  return value
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

function readOptionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined
}

function readOrganizationName(value: unknown): string | undefined {
  if (!isRecord(value)) {
    return undefined
  }
  return readOptionalString(value.name) ?? readOptionalString(value.title)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
