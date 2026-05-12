import {
  normalizeWorldBankCountry,
  normalizeWorldBankDate,
  normalizeWorldBankIndicator,
  normalizeWorldBankPage,
  normalizeWorldBankPerPage,
  WorldBankClient,
  WORLD_BANK_DEFAULT_COUNTRY,
  WORLD_BANK_DEFAULT_DATE,
  WORLD_BANK_DEFAULT_INDICATOR,
  WORLD_BANK_DEFAULT_PER_PAGE,
  WORLD_BANK_MAX_PER_PAGE,
  type WorldBankCountry,
  type WorldBankIndicatorMetadata,
  type WorldBankIndicatorPoint,
  type WorldBankPagination,
} from '../../infrastructure/openApis/worldBankClient.js'

export type WorldBankCountriesInput = {
  page?: number | undefined
  perPage?: number | undefined
}

export type WorldBankIndicatorInput = {
  country?: string | undefined
  indicator?: string | undefined
  date?: string | undefined
  page?: number | undefined
  perPage?: number | undefined
}

export type WorldBankCountriesQuery = {
  page: number
  perPage: number
}

export type WorldBankIndicatorQuery = {
  country: string
  indicator: string
  date: string
  page: number
  perPage: number
}

export type WorldBankCountriesResult = {
  kind: 'worldbank.countries'
  api: WorldBankApiMeta & {
    endpoint: 'GET /country'
  }
  query: WorldBankCountriesQuery
  pagination: WorldBankPagination
  countries: WorldBankCountry[]
}

export type WorldBankIndicatorResult = {
  kind: 'worldbank.indicator'
  api: WorldBankApiMeta & {
    endpoint: 'GET /country/{country}/indicator/{indicator}'
  }
  query: WorldBankIndicatorQuery
  pagination: WorldBankPagination
  indicator?: WorldBankIndicatorMetadata | undefined
  points: WorldBankIndicatorPoint[]
}

type WorldBankApiMeta = {
  provider: 'worldbank'
  docsUrl: 'https://datahelpdesk.worldbank.org/knowledgebase/articles/889392'
  apiUrl: 'https://api.worldbank.org/v2/'
  authentication: 'none'
  usesBrowserClickstream: false
  transport: 'HTTPS JSON REST'
  boundary: string
  limitPolicy: string
}

export async function listWorldBankCountries(
  input: WorldBankCountriesInput = {},
): Promise<WorldBankCountriesResult> {
  const query = normalizeWorldBankCountriesInput(input)
  const response = await new WorldBankClient().listCountries(query)
  return {
    kind: 'worldbank.countries',
    api: {
      ...createApiMeta(),
      endpoint: 'GET /country',
    },
    query,
    pagination: response.pagination,
    countries: response.countries,
  }
}

export async function getWorldBankIndicator(
  input: WorldBankIndicatorInput = {},
): Promise<WorldBankIndicatorResult> {
  const query = normalizeWorldBankIndicatorInput(input)
  const client = new WorldBankClient()
  const [series, metadata] = await Promise.all([
    client.getIndicatorSeries(query),
    client.getIndicatorMetadata(query.indicator),
  ])
  return {
    kind: 'worldbank.indicator',
    api: {
      ...createApiMeta(),
      endpoint: 'GET /country/{country}/indicator/{indicator}',
    },
    query,
    pagination: series.pagination,
    indicator: metadata.indicators[0],
    points: series.points,
  }
}

export function normalizeWorldBankCountriesInput(
  input: WorldBankCountriesInput = {},
): WorldBankCountriesQuery {
  return {
    page: normalizeWorldBankPage(input.page),
    perPage: normalizeWorldBankPerPage(input.perPage),
  }
}

export function normalizeWorldBankIndicatorInput(
  input: WorldBankIndicatorInput = {},
): WorldBankIndicatorQuery {
  return {
    country: normalizeWorldBankCountry(input.country),
    indicator: normalizeWorldBankIndicator(input.indicator),
    date: normalizeWorldBankDate(input.date),
    page: normalizeWorldBankPage(input.page),
    perPage: normalizeWorldBankPerPage(input.perPage),
  }
}

function createApiMeta(): WorldBankApiMeta {
  return {
    provider: 'worldbank',
    docsUrl: 'https://datahelpdesk.worldbank.org/knowledgebase/articles/889392',
    apiUrl: 'https://api.worldbank.org/v2/',
    authentication: 'none',
    usesBrowserClickstream: false,
    transport: 'HTTPS JSON REST',
    boundary: [
      'Read-only World Bank API v2 JSON routes only; no API key, OAuth,',
      'account setup, browser clickstream, bulk download mirroring, arbitrary',
      'route proxying, XML/HTML output, binary payload, or base64 payload.',
    ].join(' '),
    limitPolicy: [
      `The CLI fixes format=json and caps per_page at ${WORLD_BANK_MAX_PER_PAGE}.`,
      'Date ranges are capped at 60 years to avoid bulk historical dumps.',
    ].join(' '),
  }
}

export {
  WORLD_BANK_DEFAULT_COUNTRY,
  WORLD_BANK_DEFAULT_DATE,
  WORLD_BANK_DEFAULT_INDICATOR,
  WORLD_BANK_DEFAULT_PER_PAGE,
  WORLD_BANK_MAX_PER_PAGE,
}
