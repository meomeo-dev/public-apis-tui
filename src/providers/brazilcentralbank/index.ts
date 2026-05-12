import { z } from 'zod'
import { getBrazilCentralBankSgsLatest, searchBrazilCentralBankDatasets } from '../../application/usecases/brazilCentralBank.js'
import {
  BRAZIL_CENTRAL_BANK_DEFAULT_QUERY,
  BRAZIL_CENTRAL_BANK_DEFAULT_ROWS,
  BRAZIL_CENTRAL_BANK_DEFAULT_SERIES_CODE,
  BRAZIL_CENTRAL_BANK_DEFAULT_SERIES_LIMIT,
  normalizeBrazilCentralBankDatasetsInput,
  normalizeBrazilCentralBankSgsLatestInput,
  type BrazilCentralBankDatasetsInput,
  type BrazilCentralBankSgsLatestInput,
} from '../../infrastructure/openApis/brazilCentralBankClient.js'
import type { PublicApiOperationDefinition, PublicApiProviderModule } from '../providerTypes.js'

const datasetsParamsSchema = z.object({
  query: z.string().optional(),
  rows: z.coerce.number().optional(),
  start: z.coerce.number().optional(),
}) satisfies z.ZodType<BrazilCentralBankDatasetsInput>

const sgsLatestParamsSchema = z.object({
  seriesCode: z.coerce.number().optional(),
  limit: z.coerce.number().optional(),
}) satisfies z.ZodType<BrazilCentralBankSgsLatestInput>

const datasetsOperation: PublicApiOperationDefinition<BrazilCentralBankDatasetsInput> = {
  id: 'brazilcentralbank.datasets',
  providerId: 'brazilcentralbank',
  name: 'Open Data Datasets',
  commandPath: ['brazilcentralbank', 'datasets'],
  rpcMethod: 'brazilcentralbank.datasets',
  description: 'Search Banco Central do Brasil CKAN open-data packages.',
  category: 'government',
  options: [
    {
      name: 'query',
      flag: '--query <text>',
      description: `CKAN search query, default ${BRAZIL_CENTRAL_BANK_DEFAULT_QUERY}`,
      exposure: 'primary',
      group: 'query',
      reason: 'Dataset discovery needs a compact search term; default SELIC is commercially useful and avoids dumping the whole catalog.',
      defaultValue: BRAZIL_CENTRAL_BANK_DEFAULT_QUERY,
    },
    {
      name: 'rows',
      flag: '--rows <count>',
      description: `Datasets to request, default/cap ${BRAZIL_CENTRAL_BANK_DEFAULT_ROWS}`,
      exposure: 'primary',
      group: 'pagination',
      reason: 'CKAN supports rows/start pagination; 100 maximizes one bounded terminal request when no hard maximum is documented.',
      valueType: 'integer',
      defaultValue: String(BRAZIL_CENTRAL_BANK_DEFAULT_ROWS),
    },
    {
      name: 'start',
      flag: '--start <count>',
      description: 'Pagination offset, default 0',
      exposure: 'advanced',
      group: 'pagination',
      reason: 'Offset is only needed when continuing beyond the first bounded catalog page.',
      valueType: 'integer',
      defaultValue: '0',
    },
  ],
  paramsSchema: datasetsParamsSchema,
  execute: params => searchBrazilCentralBankDatasets(params),
  normalizeParams: params => datasetsParamsSchema.parse(params),
  createCacheKeyParams: params => normalizeBrazilCentralBankDatasetsInput(params),
  resultKind: 'brazilcentralbank.datasets',
  defaultFormat: 'text',
}

const sgsLatestOperation: PublicApiOperationDefinition<BrazilCentralBankSgsLatestInput> = {
  id: 'brazilcentralbank.sgsLatest',
  providerId: 'brazilcentralbank',
  name: 'SGS Latest Series Points',
  commandPath: ['brazilcentralbank', 'sgs-latest'],
  rpcMethod: 'brazilcentralbank.sgsLatest',
  description: 'Read latest Banco Central do Brasil SGS time-series points.',
  category: 'government',
  options: [
    {
      name: 'seriesCode',
      flag: '--series-code <code>',
      description: `SGS series code, default ${BRAZIL_CENTRAL_BANK_DEFAULT_SERIES_CODE} (SELIC)`,
      exposure: 'primary',
      group: 'query',
      reason: 'Series code is the stable SGS identifier; default 11 gives a useful SELIC rate starting point.',
      valueType: 'integer',
      defaultValue: String(BRAZIL_CENTRAL_BANK_DEFAULT_SERIES_CODE),
    },
    {
      name: 'limit',
      flag: '--limit <count>',
      description: `Latest points to request, default/cap ${BRAZIL_CENTRAL_BANK_DEFAULT_SERIES_LIMIT}`,
      exposure: 'primary',
      group: 'pagination',
      reason: 'SGS ultimos accepts a count path segment; 20 matches the upstream maximum returned by the API and maximizes one bounded terminal request.',
      valueType: 'integer',
      defaultValue: String(BRAZIL_CENTRAL_BANK_DEFAULT_SERIES_LIMIT),
    },
  ],
  paramsSchema: sgsLatestParamsSchema,
  execute: params => getBrazilCentralBankSgsLatest(params),
  normalizeParams: params => sgsLatestParamsSchema.parse(params),
  createCacheKeyParams: params => normalizeBrazilCentralBankSgsLatestInput(params),
  resultKind: 'brazilcentralbank.sgsLatest',
  defaultFormat: 'text',
}

export const brazilCentralBankProvider: PublicApiProviderModule = {
  manifest: {
    id: 'brazilcentralbank',
    name: 'Brazil Central Bank Open Data',
    description: 'No-auth Banco Central do Brasil open-data APIs for CKAN catalog discovery and SGS economic time series.',
    publicApisCategory: 'Government',
    homepageUrl: 'https://dadosabertos.bcb.gov.br/',
    docsUrl: 'https://dadosabertos.bcb.gov.br/',
    auth: {
      mode: 'none',
      notes: ['Public CKAN and SGS JSON endpoints require no API key, OAuth, cookies, browser session, or account setup.'],
    },
    tags: ['government', 'central-bank', 'brazil', 'finance', 'economic-data', 'commercial-analysis', 'no-auth', 'json'],
    freePlanNotes: [
      'CKAN package_search supports dataset discovery for Banco Central do Brasil open data.',
      'SGS latest series endpoint returns JSON with date/value observations for public series codes.',
      'CKAN defaults/caps at 100 rows; SGS latest defaults/caps at 20 points, matching the upstream maximum returned by the API.',
    ],
  },
  operations: [datasetsOperation, sgsLatestOperation],
  endpoints: [
    {
      id: 'brazilcentralbank-package-search',
      method: 'GET',
      urlPattern: 'https://dadosabertos.bcb.gov.br/api/3/action/package_search',
      category: 'open-api',
      evidenceStatus: 'confirmed',
      description: 'Banco Central do Brasil CKAN package search endpoint.',
      siteIds: ['public-apis-tui'],
      observedOn: '2026-05-04',
      sampleSources: ['https://dadosabertos.bcb.gov.br/', 'https://dadosabertos.bcb.gov.br/api/3/action/package_search?q=selic&rows=2'],
      consumedBy: ['brazilcentralbank datasets'],
      notes: ['No API key required.', 'HTTPS JSON CKAN API.', 'No browser clickstream or scraping required.'],
    },
    {
      id: 'brazilcentralbank-sgs-latest',
      method: 'GET',
      urlPattern: 'https://api.bcb.gov.br/dados/serie/bcdata.sgs.*/dados/ultimos/*',
      category: 'open-api',
      evidenceStatus: 'confirmed',
      description: 'Banco Central do Brasil SGS latest time-series observations endpoint.',
      siteIds: ['public-apis-tui'],
      observedOn: '2026-05-04',
      sampleSources: ['https://api.bcb.gov.br/dados/serie/bcdata.sgs.11/dados/ultimos/10?formato=json'],
      consumedBy: ['brazilcentralbank sgs-latest'],
      notes: ['No API key required.', 'HTTPS JSON API.', 'No browser clickstream or scraping required.'],
    },
  ],
}
