import {
  NPM_REGISTRY_DEFAULT_VERSION_LIMIT,
  NPM_REGISTRY_MAX_VERSION_LIMIT,
  NPM_REGISTRY_SEARCH_DEFAULT_SIZE,
  NPM_REGISTRY_SEARCH_MAX_SIZE,
  NpmRegistryClient,
  normalizeNpmRegistryPackageInput,
  normalizeNpmRegistrySearchInput,
  type NpmRegistryPackageInput,
  type NpmRegistryPackageMetadata,
  type NpmRegistrySearchInput,
  type NpmRegistrySearchObject,
} from '../../infrastructure/openApis/npmRegistryClient.js'

export type NpmRegistrySearchResult = {
  kind: 'npmregistry.search'
  api: NpmRegistryApiMetadata & {
    endpoint: 'GET /-/v1/search'
    documentedDefaultSize: 20
    documentedMaxSize: 250
    cliDefaultSize: 250
  }
  query: {
    query: string
    size: number
    from: number
    quality?: number | undefined
    popularity?: number | undefined
    maintenance?: number | undefined
  }
  pagination: {
    from: number
    size: number
    returned: number
    total: number
    hasNextPage: boolean
    nextFrom?: number | undefined
  }
  search: {
    time?: string | undefined
    packages: ProjectedSearchPackage[]
  }
}

export type NpmRegistryPackageResult = {
  kind: 'npmregistry.package'
  api: NpmRegistryApiMetadata & {
    endpoint: 'GET /{package}'
    versionLimitDefault: number
    versionLimitCap: number
    packumentProjection: 'summary-only-no-readme-or-full-versions'
  }
  query: {
    packageName: string
    versionLimit: number
  }
  package: ProjectedPackageMetadata
  pagination: {
    shownVersions: number
    totalVersions: number
  }
}

type NpmRegistryApiMetadata = {
  provider: 'npm-registry'
  authentication: 'none'
  usesBrowserClickstream: false
  docs: 'https://github.com/npm/registry/blob/master/docs/REGISTRY-API.md'
  homepage: 'https://registry.npmjs.org'
  transport: 'HTTPS JSON'
  rateLimit: 'public npm registry; no API key documented for read endpoints'
  publicApisProject: 'https://github.com/public-apis/public-apis'
}

type ProjectedSearchPackage = {
  name: string
  version?: string | undefined
  description?: string | undefined
  date?: string | undefined
  keywords: string[]
  links: Record<string, string>
  publisher?: string | undefined
  maintainerCount: number
  score: {
    final?: number | undefined
    quality?: number | undefined
    popularity?: number | undefined
    maintenance?: number | undefined
  }
  searchScore?: number | undefined
}

type ProjectedPackageMetadata = Omit<NpmRegistryPackageMetadata, 'versions'> & {
  versions: NpmRegistryPackageMetadata['versions']
}

export type { NpmRegistryPackageInput, NpmRegistrySearchInput }

export async function searchNpmRegistry(input: NpmRegistrySearchInput = {}): Promise<NpmRegistrySearchResult> {
  const query = normalizeNpmRegistrySearchInput(input)
  const client = new NpmRegistryClient()
  const response = await client.search(query)
  const nextFrom = query.from + response.objects.length
  return {
    kind: 'npmregistry.search',
    api: {
      ...createNpmRegistryApiMetadata(),
      endpoint: 'GET /-/v1/search',
      documentedDefaultSize: 20,
      documentedMaxSize: NPM_REGISTRY_SEARCH_MAX_SIZE,
      cliDefaultSize: NPM_REGISTRY_SEARCH_DEFAULT_SIZE,
    },
    query,
    pagination: {
      from: query.from,
      size: query.size,
      returned: response.objects.length,
      total: response.total,
      hasNextPage: nextFrom < response.total,
      ...(nextFrom < response.total ? { nextFrom } : {}),
    },
    search: {
      ...(response.time !== undefined ? { time: response.time } : {}),
      packages: response.objects.map(projectSearchPackage),
    },
  }
}

export async function getNpmRegistryPackage(input: NpmRegistryPackageInput = {}): Promise<NpmRegistryPackageResult> {
  const query = normalizeNpmRegistryPackageInput(input)
  const client = new NpmRegistryClient()
  const packageMetadata = await client.getPackageMetadata(query)
  return {
    kind: 'npmregistry.package',
    api: {
      ...createNpmRegistryApiMetadata(),
      endpoint: 'GET /{package}',
      versionLimitDefault: NPM_REGISTRY_DEFAULT_VERSION_LIMIT,
      versionLimitCap: NPM_REGISTRY_MAX_VERSION_LIMIT,
      packumentProjection: 'summary-only-no-readme-or-full-versions',
    },
    query,
    package: packageMetadata,
    pagination: {
      shownVersions: packageMetadata.versions.length,
      totalVersions: packageMetadata.versionCount,
    },
  }
}

function projectSearchPackage(value: NpmRegistrySearchObject): ProjectedSearchPackage {
  return {
    ...value.package,
    score: value.score,
    ...(value.searchScore !== undefined ? { searchScore: value.searchScore } : {}),
  }
}

function createNpmRegistryApiMetadata(): NpmRegistryApiMetadata {
  return {
    provider: 'npm-registry',
    authentication: 'none',
    usesBrowserClickstream: false,
    docs: 'https://github.com/npm/registry/blob/master/docs/REGISTRY-API.md',
    homepage: 'https://registry.npmjs.org',
    transport: 'HTTPS JSON',
    rateLimit: 'public npm registry; no API key documented for read endpoints',
    publicApisProject: 'https://github.com/public-apis/public-apis',
  }
}
