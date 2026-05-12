import {
  AdresseClient,
  ADRESSE_MAX_LIMIT,
  normalizeAdresseReverseInput,
  normalizeAdresseSearchInput,
  type AdresseFeature,
  type AdresseReverseInput,
  type AdresseSearchInput,
} from '../../infrastructure/openApis/adresseClient.js'

export type AdresseSearchResult = {
  kind: 'adresse.search'
  api: AdresseApiMeta
  query: ReturnType<typeof normalizeAdresseSearchInput>
  pagination: AdressePagination
  rateLimit: AdresseRateLimit
  results: AdresseFeature[]
}

export type AdresseReverseResult = {
  kind: 'adresse.reverse'
  api: AdresseApiMeta
  query: ReturnType<typeof normalizeAdresseReverseInput>
  pagination: AdressePagination
  rateLimit: AdresseRateLimit
  results: AdresseFeature[]
}

type AdresseApiMeta = {
  providerId: 'adresse'
  providerName: 'adresse.data.gouv.fr'
  endpoint: 'GET /geocodage/search' | 'GET /geocodage/reverse'
  documentation: 'https://data.geopf.fr/geocodage/getCapabilities'
  authentication: 'none'
  usesBrowserClickstream: false
  transport: 'HTTPS JSON GeoJSON REST'
  migration: 'api-adresse.data.gouv.fr is deprecated; CLI uses data.geopf.fr/geocodage.'
  privacy: 'Geocoding and reverse geocoding queries can reveal locations; CLI keeps user-provided queries bounded and cacheable only when --persist is requested.'
}

type AdressePagination = {
  returned: number
  limit: number
  maxLimit: number
}

type AdresseRateLimit = {
  documented: '1 request/second observed from x-ratelimit-limit-second; ratelimit-limit header observed as 50.'
}

const commonApiMeta = {
  providerId: 'adresse',
  providerName: 'adresse.data.gouv.fr',
  documentation: 'https://data.geopf.fr/geocodage/getCapabilities',
  authentication: 'none',
  usesBrowserClickstream: false,
  transport: 'HTTPS JSON GeoJSON REST',
  migration: 'api-adresse.data.gouv.fr is deprecated; CLI uses data.geopf.fr/geocodage.',
  privacy: 'Geocoding and reverse geocoding queries can reveal locations; CLI keeps user-provided queries bounded and cacheable only when --persist is requested.',
} satisfies Omit<AdresseApiMeta, 'endpoint'>

const rateLimit = {
  documented: '1 request/second observed from x-ratelimit-limit-second; ratelimit-limit header observed as 50.',
} satisfies AdresseRateLimit

export async function searchAdresse(input: AdresseSearchInput = {}): Promise<AdresseSearchResult> {
  const query = normalizeAdresseSearchInput(input)
  const collection = await new AdresseClient().search(query)
  return {
    kind: 'adresse.search',
    api: {
      ...commonApiMeta,
      endpoint: 'GET /geocodage/search',
    },
    query,
    pagination: {
      returned: collection.features.length,
      limit: query.limit,
      maxLimit: ADRESSE_MAX_LIMIT,
    },
    rateLimit,
    results: collection.features,
  }
}

export async function reverseAdresse(input: AdresseReverseInput = {}): Promise<AdresseReverseResult> {
  const query = normalizeAdresseReverseInput(input)
  const collection = await new AdresseClient().reverse(query)
  return {
    kind: 'adresse.reverse',
    api: {
      ...commonApiMeta,
      endpoint: 'GET /geocodage/reverse',
    },
    query,
    pagination: {
      returned: collection.features.length,
      limit: query.limit,
      maxLimit: ADRESSE_MAX_LIMIT,
    },
    rateLimit,
    results: collection.features,
  }
}

export type { AdresseReverseInput, AdresseSearchInput }
