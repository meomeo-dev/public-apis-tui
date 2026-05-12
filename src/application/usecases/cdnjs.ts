import { CdnjsClient, type CdnjsAsset, type CdnjsLibrarySummary } from '../../infrastructure/openApis/cdnjsClient.js'

export const CDNJS_DEFAULT_QUERY = 'jquery'
export const CDNJS_DEFAULT_LIBRARY = 'jquery'
export const CDNJS_DEFAULT_VERSION = '3.7.1'
export const CDNJS_DEFAULT_LIMIT = 1000
export const CDNJS_LIMIT_CAP = 1000
export const CDNJS_DEFAULT_VERSION_LIMIT = 20
export const CDNJS_VERSION_LIMIT_CAP = 200
export const CDNJS_DEFAULT_FILE_LIMIT = 50
export const CDNJS_FILE_LIMIT_CAP = 500

const SEARCH_FIELDS = ['name', 'filename', 'description', 'keywords'] as const
const DEFAULT_SEARCH_FIELDS = ['name', 'description', 'keywords'] as const
const LIBRARY_FIELDS = ['filename', 'description', 'version', 'keywords', 'license', 'homepage', 'repository', 'github', 'assets', 'sri'] as const
const VERSION_FIELDS = ['files', 'sri'] as const

export type CdnjsSearchInput = {
  query?: string | undefined
  searchFields?: string | undefined
  limit?: number | undefined
}

export type CdnjsLibraryInput = {
  name?: string | undefined
  versionLimit?: number | undefined
  fileLimit?: number | undefined
}

export type CdnjsVersionInput = {
  name?: string | undefined
  version?: string | undefined
  fileLimit?: number | undefined
}

export type CdnjsSearchResult = {
  kind: 'cdnjs.search'
  api: CdnjsApiMetadata & {
    endpoint: 'GET /libraries'
    documentedMaximumLimit: 'not documented'
    defaultLimit: number
    limitCap: number
  }
  query: {
    query: string
    searchFields: string[]
    limit: number
  }
  pagination: {
    total: number
    available: number
    shown: number
  }
  count: number
  libraries: CdnjsLibraryProjection[]
}

export type CdnjsLibraryResult = {
  kind: 'cdnjs.library'
  api: CdnjsApiMetadata & {
    endpoint: 'GET /libraries/{library}'
    versionLimitCap: number
    fileLimitCap: number
  }
  query: {
    name: string
    versionLimit: number
    fileLimit: number
  }
  library: CdnjsLibraryProjection & {
    assets: CdnjsAssetProjection[]
  }
  count: number
}

export type CdnjsVersionResult = {
  kind: 'cdnjs.version'
  api: CdnjsApiMetadata & {
    endpoint: 'GET /libraries/{library}/{version}'
    fileLimitCap: number
  }
  query: {
    name: string
    version: string
    fileLimit: number
  }
  count: number
  totalFiles: number
  files: CdnjsFileProjection[]
}

type CdnjsApiMetadata = {
  provider: 'cdnjs'
  authentication: 'none'
  usesBrowserClickstream: false
  docs: 'https://cdnjs.com/api'
  homepage: 'https://cdnjs.com/'
  rateLimit: 'not documented'
  transport: 'HTTPS JSON'
}

type CdnjsLibraryProjection = {
  name: string
  latest: string
  version?: string | undefined
  filename?: string | undefined
  description?: string | undefined
  keywords: string[]
  license?: string | undefined
  homepage?: string | undefined
  repositoryUrl?: string | undefined
  github?: {
    user?: string | undefined
    repo?: string | undefined
    stars?: number | undefined
    forks?: number | undefined
    subscribers?: number | undefined
  } | undefined
  sri?: string | undefined
}

type CdnjsAssetProjection = {
  version: string
  fileCount: number
  files: CdnjsFileProjection[]
}

type CdnjsFileProjection = {
  name: string
  url: string
  sri?: string | undefined
}

export async function searchCdnjsLibraries(input: CdnjsSearchInput = {}): Promise<CdnjsSearchResult> {
  const query = normalizeCdnjsSearchInput(input)
  const client = new CdnjsClient()
  const response = await client.searchLibraries({
    search: query.query,
    fields: [...LIBRARY_FIELDS],
    searchFields: query.searchFields,
    limit: query.limit,
  })

  return {
    kind: 'cdnjs.search',
    api: {
      ...createMetadata(),
      endpoint: 'GET /libraries',
      documentedMaximumLimit: 'not documented',
      defaultLimit: CDNJS_DEFAULT_LIMIT,
      limitCap: CDNJS_LIMIT_CAP,
    },
    query,
    pagination: {
      total: response.total,
      available: response.available,
      shown: response.results.length,
    },
    count: response.results.length,
    libraries: response.results.map(projectLibrary),
  }
}

export async function getCdnjsLibrary(input: CdnjsLibraryInput = {}): Promise<CdnjsLibraryResult> {
  const query = normalizeCdnjsLibraryInput(input)
  const client = new CdnjsClient()
  const library = await client.getLibrary(query.name, { fields: [...LIBRARY_FIELDS] })
  return {
    kind: 'cdnjs.library',
    api: {
      ...createMetadata(),
      endpoint: 'GET /libraries/{library}',
      versionLimitCap: CDNJS_VERSION_LIMIT_CAP,
      fileLimitCap: CDNJS_FILE_LIMIT_CAP,
    },
    query,
    library: {
      ...projectLibrary(library),
      assets: library.assets.slice(0, query.versionLimit).map(asset => projectAsset(library.name, asset, query.fileLimit)),
    },
    count: Math.min(library.assets.length, query.versionLimit),
  }
}

export async function getCdnjsVersion(input: CdnjsVersionInput = {}): Promise<CdnjsVersionResult> {
  const query = normalizeCdnjsVersionInput(input)
  const client = new CdnjsClient()
  const version = await client.getVersion(query.name, query.version, { fields: [...VERSION_FIELDS] })
  const files = version.files.slice(0, query.fileLimit).map(file => ({
    name: file,
    url: createAssetUrl(query.name, query.version, file),
    ...(version.sri[file] !== undefined ? { sri: version.sri[file] } : {}),
  }))

  return {
    kind: 'cdnjs.version',
    api: {
      ...createMetadata(),
      endpoint: 'GET /libraries/{library}/{version}',
      fileLimitCap: CDNJS_FILE_LIMIT_CAP,
    },
    query,
    count: files.length,
    totalFiles: version.files.length,
    files,
  }
}

export function normalizeCdnjsSearchInput(input: CdnjsSearchInput): CdnjsSearchResult['query'] {
  const searchFields = normalizeSearchFields(input.searchFields)
  return {
    query: normalizeText(input.query, CDNJS_DEFAULT_QUERY),
    searchFields,
    limit: normalizeCount(input.limit, CDNJS_DEFAULT_LIMIT, CDNJS_LIMIT_CAP, 'limit'),
  }
}

export function normalizeCdnjsLibraryInput(input: CdnjsLibraryInput): CdnjsLibraryResult['query'] {
  return {
    name: normalizeText(input.name, CDNJS_DEFAULT_LIBRARY),
    versionLimit: normalizeCount(input.versionLimit, CDNJS_DEFAULT_VERSION_LIMIT, CDNJS_VERSION_LIMIT_CAP, 'versionLimit'),
    fileLimit: normalizeCount(input.fileLimit, CDNJS_DEFAULT_FILE_LIMIT, CDNJS_FILE_LIMIT_CAP, 'fileLimit'),
  }
}

export function normalizeCdnjsVersionInput(input: CdnjsVersionInput): CdnjsVersionResult['query'] {
  return {
    name: normalizeText(input.name, CDNJS_DEFAULT_LIBRARY),
    version: normalizeText(input.version, CDNJS_DEFAULT_VERSION),
    fileLimit: normalizeCount(input.fileLimit, CDNJS_DEFAULT_FILE_LIMIT, CDNJS_FILE_LIMIT_CAP, 'fileLimit'),
  }
}

function normalizeSearchFields(value: string | undefined): string[] {
  if (value === undefined || value.trim() === '') {
    return [...DEFAULT_SEARCH_FIELDS]
  }
  const fields = value.split(',').map(field => field.trim()).filter(field => field !== '')
  if (fields.length === 0) {
    return [...DEFAULT_SEARCH_FIELDS]
  }
  const unsupported = fields.filter(field => !SEARCH_FIELDS.includes(field as (typeof SEARCH_FIELDS)[number]))
  if (unsupported.length > 0) {
    throw new Error(`CDNJS search fields must be a comma-separated subset of ${SEARCH_FIELDS.join(', ')}.`)
  }

  return [...new Set(fields)]
}

function normalizeText(value: string | undefined, fallback: string): string {
  if (value === undefined) {
    return fallback
  }
  const trimmed = value.trim()
  return trimmed === '' ? fallback : trimmed
}

function normalizeCount(value: number | undefined, fallback: number, cap: number, name: string): number {
  if (value === undefined) {
    return fallback
  }
  if (!Number.isInteger(value) || value < 1 || value > cap) {
    throw new Error(`CDNJS ${name} must be an integer between 1 and ${cap}.`)
  }

  return value
}

function projectLibrary(library: CdnjsLibrarySummary): CdnjsLibraryProjection {
  return {
    name: library.name,
    latest: library.latest,
    ...(library.version !== undefined ? { version: library.version } : {}),
    ...(library.filename !== undefined ? { filename: library.filename } : {}),
    ...(library.description !== undefined ? { description: library.description } : {}),
    keywords: library.keywords,
    ...(library.license !== undefined ? { license: library.license } : {}),
    ...(library.homepage !== undefined ? { homepage: library.homepage } : {}),
    ...(library.repository?.url !== undefined ? { repositoryUrl: library.repository.url } : {}),
    ...(library.github !== undefined ? { github: projectGithub(library.github) } : {}),
    ...(library.sri !== undefined ? { sri: library.sri } : {}),
  }
}

function projectGithub(github: NonNullable<CdnjsLibrarySummary['github']>): NonNullable<CdnjsLibraryProjection['github']> {
  return {
    ...(github.user !== undefined ? { user: github.user } : {}),
    ...(github.repo !== undefined ? { repo: github.repo } : {}),
    ...(github.stargazersCount !== undefined ? { stars: github.stargazersCount } : {}),
    ...(github.forks !== undefined ? { forks: github.forks } : {}),
    ...(github.subscribersCount !== undefined ? { subscribers: github.subscribersCount } : {}),
  }
}

function projectAsset(libraryName: string, asset: CdnjsAsset, fileLimit: number): CdnjsAssetProjection {
  return {
    version: asset.version,
    fileCount: asset.files.length,
    files: asset.files.slice(0, fileLimit).map(file => ({
      name: file,
      url: createAssetUrl(libraryName, asset.version, file),
      ...(asset.sri[file] !== undefined ? { sri: asset.sri[file] } : {}),
    })),
  }
}

function createAssetUrl(libraryName: string, version: string, file: string): string {
  return `https://cdnjs.cloudflare.com/ajax/libs/${libraryName}/${version}/${file}`
}

function createMetadata(): CdnjsApiMetadata {
  return {
    provider: 'cdnjs',
    authentication: 'none',
    usesBrowserClickstream: false,
    docs: 'https://cdnjs.com/api',
    homepage: 'https://cdnjs.com/',
    rateLimit: 'not documented',
    transport: 'HTTPS JSON',
  }
}
