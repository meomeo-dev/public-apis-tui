import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export const NPM_REGISTRY_DEFAULT_BASE_URL = 'https://registry.npmjs.org'
export const NPM_REGISTRY_DEFAULT_SEARCH_QUERY = 'typescript'
export const NPM_REGISTRY_SEARCH_DEFAULT_SIZE = 250
export const NPM_REGISTRY_SEARCH_MAX_SIZE = 250
export const NPM_REGISTRY_DEFAULT_FROM = 0
export const NPM_REGISTRY_DEFAULT_PACKAGE = 'typescript'
export const NPM_REGISTRY_DEFAULT_VERSION_LIMIT = 20
export const NPM_REGISTRY_MAX_VERSION_LIMIT = 100

export type NpmRegistrySearchInput = {
  query?: string | undefined
  size?: number | undefined
  from?: number | undefined
  quality?: number | string | undefined
  popularity?: number | string | undefined
  maintenance?: number | string | undefined
}

export type NpmRegistryPackageInput = {
  packageName?: string | undefined
  versionLimit?: number | undefined
}

export type NormalizedNpmRegistrySearchInput = {
  query: string
  size: number
  from: number
  quality?: number | undefined
  popularity?: number | undefined
  maintenance?: number | undefined
}

export type NormalizedNpmRegistryPackageInput = {
  packageName: string
  versionLimit: number
}

export type NpmRegistrySearchPackage = {
  name: string
  version?: string | undefined
  description?: string | undefined
  date?: string | undefined
  keywords: string[]
  links: Record<string, string>
  publisher?: string | undefined
  maintainerCount: number
}

export type NpmRegistrySearchObject = {
  package: NpmRegistrySearchPackage
  score: {
    final?: number | undefined
    quality?: number | undefined
    popularity?: number | undefined
    maintenance?: number | undefined
  }
  searchScore?: number | undefined
}

export type NpmRegistrySearchResponse = {
  objects: NpmRegistrySearchObject[]
  total: number
  time?: string | undefined
}

export type NpmRegistryPackageMetadata = {
  name: string
  description?: string | undefined
  distTags: Record<string, string>
  created?: string | undefined
  modified?: string | undefined
  author?: string | undefined
  license?: string | undefined
  homepage?: string | undefined
  repository?: string | undefined
  bugs?: string | undefined
  keywords: string[]
  maintainersCount: number
  versionCount: number
  latestVersion?: {
    version: string
    license?: string | undefined
    homepage?: string | undefined
    repository?: string | undefined
    dependenciesCount: number
    devDependenciesCount: number
    unpackedSize?: number | undefined
    tarball?: string | undefined
  } | undefined
  versions: Array<{
    version: string
    publishedAt?: string | undefined
  }>
}

export type NpmRegistryClientOptions = {
  baseUrl?: string | undefined
  fetchImpl?: typeof fetch | undefined
}

export class NpmRegistryClient {
  private readonly baseUrl: string
  private readonly fetchImpl: typeof fetch

  constructor(options: NpmRegistryClientOptions = {}) {
    this.baseUrl = normalizeBaseUrl(options.baseUrl ?? NPM_REGISTRY_DEFAULT_BASE_URL)
    this.fetchImpl = options.fetchImpl ?? fetch
  }

  async search(input: NpmRegistrySearchInput = {}): Promise<NpmRegistrySearchResponse> {
    const query = normalizeNpmRegistrySearchInput(input)
    const parsed = await this.getJson('/-/v1/search', {
      text: query.query,
      size: query.size,
      from: query.from,
      ...(query.quality !== undefined ? { quality: query.quality } : {}),
      ...(query.popularity !== undefined ? { popularity: query.popularity } : {}),
      ...(query.maintenance !== undefined ? { maintenance: query.maintenance } : {}),
    })
    return parseSearchResponse(parsed)
  }

  async getPackageMetadata(input: NpmRegistryPackageInput = {}): Promise<NpmRegistryPackageMetadata> {
    const query = normalizeNpmRegistryPackageInput(input)
    const parsed = await this.getJson(`/${encodeNpmPackagePathSegment(query.packageName)}`, {})
    return parsePackageMetadata(parsed, query.versionLimit)
  }

  private async getJson(path: string, query: Record<string, string | number>): Promise<unknown> {
    const url = new URL(`${this.baseUrl}${path}`)
    for (const [key, value] of Object.entries(query)) {
      url.searchParams.set(key, String(value))
    }

    let response: Response
    try {
      response = await this.fetchImpl(url, {
        method: 'GET',
        headers: {
          accept: 'application/json',
          'user-agent': 'public-apis-tui no-auth CLI (https://github.com/meomeo-dev/public-apis-tui)',
        },
      })
    } catch (error) {
      throw new RuntimeFailure('OPEN_API_FAILED', `npm Registry request failed: ${String(error)}`, {
        provider: 'npm-registry',
        endpoint: url.href,
      })
    }

    let parsed: unknown
    try {
      parsed = await response.json()
    } catch {
      throw new RuntimeFailure('OPEN_API_FAILED', 'npm Registry returned a non-JSON response.', {
        provider: 'npm-registry',
        status: response.status,
        endpoint: url.href,
      })
    }

    if (!response.ok) {
      throw new RuntimeFailure('OPEN_API_FAILED', readErrorMessage(parsed) ?? response.statusText ?? 'npm Registry request failed.', {
        provider: 'npm-registry',
        status: response.status,
        endpoint: url.href,
        response: parsed,
      })
    }

    return parsed
  }
}

export function normalizeNpmRegistrySearchInput(input: NpmRegistrySearchInput = {}): NormalizedNpmRegistrySearchInput {
  return {
    query: normalizeSearchQuery(input.query),
    size: normalizeInteger(input.size, NPM_REGISTRY_SEARCH_DEFAULT_SIZE, NPM_REGISTRY_SEARCH_MAX_SIZE, 'size', 1),
    from: normalizeInteger(input.from, NPM_REGISTRY_DEFAULT_FROM, Number.MAX_SAFE_INTEGER, 'from', 0),
    ...normalizeOptionalWeight(input.quality, 'quality'),
    ...normalizeOptionalWeight(input.popularity, 'popularity'),
    ...normalizeOptionalWeight(input.maintenance, 'maintenance'),
  }
}

export function normalizeNpmRegistryPackageInput(input: NpmRegistryPackageInput = {}): NormalizedNpmRegistryPackageInput {
  return {
    packageName: normalizeNpmPackageName(input.packageName),
    versionLimit: normalizeInteger(input.versionLimit, NPM_REGISTRY_DEFAULT_VERSION_LIMIT, NPM_REGISTRY_MAX_VERSION_LIMIT, 'version-limit', 1),
  }
}

function parseSearchResponse(value: unknown): NpmRegistrySearchResponse {
  if (!isRecord(value) || !Array.isArray(value.objects)) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'npm Registry search response must include an objects array.')
  }
  return {
    objects: value.objects.map(parseSearchObject),
    total: typeof value.total === 'number' ? value.total : value.objects.length,
    ...(typeof value.time === 'string' ? { time: value.time } : {}),
  }
}

function parseSearchObject(value: unknown): NpmRegistrySearchObject {
  if (!isRecord(value)) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'npm Registry search result must be an object.')
  }
  return {
    package: parseSearchPackage(value.package),
    score: parseSearchScore(value.score),
    ...(typeof value.searchScore === 'number' ? { searchScore: value.searchScore } : {}),
  }
}

function parseSearchPackage(value: unknown): NpmRegistrySearchPackage {
  if (!isRecord(value) || typeof value.name !== 'string' || value.name.trim() === '') {
    throw new RuntimeFailure('OPEN_API_FAILED', 'npm Registry search package row must include a name.')
  }
  return {
    name: value.name,
    ...(typeof value.version === 'string' ? { version: value.version } : {}),
    ...(typeof value.description === 'string' ? { description: value.description } : {}),
    ...(typeof value.date === 'string' ? { date: value.date } : {}),
    keywords: parseStringArray(value.keywords),
    links: parseStringRecord(value.links),
    ...(isRecord(value.publisher) && typeof value.publisher.username === 'string' ? { publisher: value.publisher.username } : {}),
    maintainerCount: Array.isArray(value.maintainers) ? value.maintainers.length : 0,
  }
}

function parseSearchScore(value: unknown): NpmRegistrySearchObject['score'] {
  if (!isRecord(value)) {
    return {}
  }
  const detail = isRecord(value.detail) ? value.detail : {}
  return {
    ...(typeof value.final === 'number' ? { final: value.final } : {}),
    ...(typeof detail.quality === 'number' ? { quality: detail.quality } : {}),
    ...(typeof detail.popularity === 'number' ? { popularity: detail.popularity } : {}),
    ...(typeof detail.maintenance === 'number' ? { maintenance: detail.maintenance } : {}),
  }
}

function parsePackageMetadata(value: unknown, versionLimit: number): NpmRegistryPackageMetadata {
  if (!isRecord(value) || typeof value.name !== 'string' || value.name.trim() === '') {
    throw new RuntimeFailure('OPEN_API_FAILED', 'npm Registry package metadata must include a package name.')
  }
  const distTags = parseStringRecord(value['dist-tags'])
  const versionsRecord = isRecord(value.versions) ? value.versions : {}
  const timeRecord = parseStringRecord(value.time)
  const versionRows = Object.keys(versionsRecord)
    .map(version => ({ version, publishedAt: timeRecord[version] }))
    .sort((left, right) => String(right.publishedAt ?? '').localeCompare(String(left.publishedAt ?? '')))
  const latestVersionName = distTags.latest
  const latestVersionRecord = latestVersionName !== undefined && isRecord(versionsRecord[latestVersionName])
    ? versionsRecord[latestVersionName]
    : undefined

  return {
    name: value.name,
    ...(typeof value.description === 'string' ? { description: value.description } : {}),
    distTags,
    ...(typeof timeRecord.created === 'string' ? { created: timeRecord.created } : {}),
    ...(typeof timeRecord.modified === 'string' ? { modified: timeRecord.modified } : {}),
    ...(readPersonName(value.author) !== undefined ? { author: readPersonName(value.author) } : {}),
    ...(typeof value.license === 'string' ? { license: value.license } : {}),
    ...(typeof value.homepage === 'string' ? { homepage: value.homepage } : {}),
    ...(readRepositoryUrl(value.repository) !== undefined ? { repository: readRepositoryUrl(value.repository) } : {}),
    ...(readBugsUrl(value.bugs) !== undefined ? { bugs: readBugsUrl(value.bugs) } : {}),
    keywords: parseStringArray(value.keywords),
    maintainersCount: Array.isArray(value.maintainers) ? value.maintainers.length : 0,
    versionCount: Object.keys(versionsRecord).length,
    ...(latestVersionRecord !== undefined ? { latestVersion: parseLatestVersion(latestVersionRecord, latestVersionName ?? '') } : {}),
    versions: versionRows.slice(0, versionLimit),
  }
}

function parseLatestVersion(value: Record<string, unknown>, fallbackVersion: string): NonNullable<NpmRegistryPackageMetadata['latestVersion']> {
  const dist = isRecord(value.dist) ? value.dist : {}
  return {
    version: typeof value.version === 'string' ? value.version : fallbackVersion,
    ...(typeof value.license === 'string' ? { license: value.license } : {}),
    ...(typeof value.homepage === 'string' ? { homepage: value.homepage } : {}),
    ...(readRepositoryUrl(value.repository) !== undefined ? { repository: readRepositoryUrl(value.repository) } : {}),
    dependenciesCount: isRecord(value.dependencies) ? Object.keys(value.dependencies).length : 0,
    devDependenciesCount: isRecord(value.devDependencies) ? Object.keys(value.devDependencies).length : 0,
    ...(typeof dist.unpackedSize === 'number' ? { unpackedSize: dist.unpackedSize } : {}),
    ...(typeof dist.tarball === 'string' ? { tarball: dist.tarball } : {}),
  }
}

function normalizeSearchQuery(value: string | undefined): string {
  const query = (value ?? NPM_REGISTRY_DEFAULT_SEARCH_QUERY).trim()
  if (query.length < 1 || query.length > 256) {
    throw new RuntimeFailure('INVALID_ARGUMENT', 'npm Registry --query must be between 1 and 256 characters.', { query: value })
  }
  return query
}

function normalizeNpmPackageName(value: string | undefined): string {
  const packageName = (value ?? NPM_REGISTRY_DEFAULT_PACKAGE).trim()
  if (packageName === '') {
    throw new RuntimeFailure('INVALID_ARGUMENT', 'npm Registry --package cannot be empty.')
  }
  if (packageName.length > 214 || !/^(?:@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*$/u.test(packageName)) {
    throw new RuntimeFailure('INVALID_ARGUMENT', 'npm Registry --package must be a valid npm package name.', { packageName })
  }
  return packageName
}

function normalizeInteger(
  value: number | undefined,
  defaultValue: number,
  maxValue: number,
  optionName: string,
  minValue: number,
): number {
  if (value === undefined) {
    return defaultValue
  }
  if (!Number.isInteger(value) || value < minValue || value > maxValue) {
    throw new RuntimeFailure('INVALID_ARGUMENT', `npm Registry --${optionName} must be an integer between ${minValue} and ${maxValue}.`, { value })
  }
  return value
}

function normalizeOptionalWeight(value: number | string | undefined, label: 'quality' | 'popularity' | 'maintenance'): Partial<NormalizedNpmRegistrySearchInput> {
  if (value === undefined) {
    return {}
  }
  const parsed = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 1) {
    throw new RuntimeFailure('INVALID_ARGUMENT', `npm Registry --${label} must be a number between 0 and 1.`, { value })
  }
  return { [label]: parsed }
}

function encodeNpmPackagePathSegment(packageName: string): string {
  return packageName.startsWith('@') ? packageName.split('/').map(part => encodeURIComponent(part)).join('/') : encodeURIComponent(packageName)
}

function readRepositoryUrl(value: unknown): string | undefined {
  if (typeof value === 'string') {
    return value
  }
  if (isRecord(value) && typeof value.url === 'string') {
    return value.url
  }
  return undefined
}

function readBugsUrl(value: unknown): string | undefined {
  if (typeof value === 'string') {
    return value
  }
  if (isRecord(value) && typeof value.url === 'string') {
    return value.url
  }
  return undefined
}

function readPersonName(value: unknown): string | undefined {
  if (typeof value === 'string') {
    return value
  }
  if (isRecord(value) && typeof value.name === 'string') {
    return value.name
  }
  return undefined
}

function parseStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === 'string') : []
}

function parseStringRecord(value: unknown): Record<string, string> {
  if (!isRecord(value)) {
    return {}
  }
  return Object.fromEntries(Object.entries(value).filter((entry): entry is [string, string] => typeof entry[1] === 'string'))
}

function readErrorMessage(value: unknown): string | undefined {
  if (isRecord(value) && typeof value.error === 'string') {
    return value.error
  }
  if (isRecord(value) && typeof value.message === 'string') {
    return value.message
  }
  if (isRecord(value) && isRecord(value.error) && typeof value.error.message === 'string') {
    return value.error.message
  }
  return undefined
}

function normalizeBaseUrl(value: string): string {
  return value.replace(/\/+$/u, '')
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}
