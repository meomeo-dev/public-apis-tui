import {
  CountryIsClient,
  COUNTRY_IS_DEFAULT_IP,
  normalizeCountryIsLookupInput,
  type CountryIsInfoResponse,
  type CountryIsLookupInput,
  type CountryIsLookupResponse,
} from '../../infrastructure/openApis/countryIsClient.js'

export type CountryIsLookupResult = {
  kind: 'countryis.lookup'
  api: CountryIsApiMeta
  query: ReturnType<typeof normalizeCountryIsLookupInput>
  privacy: {
    classification: 'ip-geolocation'
    note: 'IP geolocation can reveal approximate location and network identity; details are opt-in and results persist only when --persist is requested.'
  }
  lookup: CountryIsLookupResponse
}

export type CountryIsInfoResult = {
  kind: 'countryis.info'
  api: CountryIsApiMeta
  info: CountryIsInfoResponse
}

type CountryIsApiMeta = {
  providerId: 'countryis'
  providerName: 'Country'
  endpoint: 'GET /{ip?}' | 'GET /info'
  documentation: 'https://country.is/'
  openApi: 'https://api.country.is/openapi.json'
  authentication: 'none'
  usesBrowserClickstream: false
  transport: 'HTTPS JSON REST'
  cache: 'Specific IP lookups are cacheable for about 3600 seconds upstream; current-client lookup and /info are no-cache.'
}

const commonApiMeta = {
  providerId: 'countryis',
  providerName: 'Country',
  documentation: 'https://country.is/',
  openApi: 'https://api.country.is/openapi.json',
  authentication: 'none',
  usesBrowserClickstream: false,
  transport: 'HTTPS JSON REST',
  cache: 'Specific IP lookups are cacheable for about 3600 seconds upstream; current-client lookup and /info are no-cache.',
} satisfies Omit<CountryIsApiMeta, 'endpoint'>

export async function lookupCountryIs(input: CountryIsLookupInput = {}): Promise<CountryIsLookupResult> {
  const query = normalizeCountryIsLookupInput(input.ip === undefined && input.includeDetails === undefined ? { ip: COUNTRY_IS_DEFAULT_IP } : input)
  const lookup = await new CountryIsClient().lookup(query)
  return {
    kind: 'countryis.lookup',
    api: { ...commonApiMeta, endpoint: 'GET /{ip?}' },
    query,
    privacy: {
      classification: 'ip-geolocation',
      note: 'IP geolocation can reveal approximate location and network identity; details are opt-in and results persist only when --persist is requested.',
    },
    lookup,
  }
}

export async function getCountryIsInfo(): Promise<CountryIsInfoResult> {
  const info = await new CountryIsClient().info()
  return {
    kind: 'countryis.info',
    api: { ...commonApiMeta, endpoint: 'GET /info' },
    info,
  }
}

export type { CountryIsLookupInput }
