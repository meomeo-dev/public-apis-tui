import { z } from 'zod'
import { searchOpenGovernmentCanadaDatasets, showOpenGovernmentCanadaDataset } from '../../application/usecases/openGovernmentCanada.js'
import {
  OPEN_GOVERNMENT_CANADA_DEFAULT_PACKAGE_ID,
  OPEN_GOVERNMENT_CANADA_DEFAULT_QUERY,
  OPEN_GOVERNMENT_CANADA_SEARCH_DEFAULT_LIMIT,
  normalizeOpenGovernmentCanadaPackageInput,
  normalizeOpenGovernmentCanadaSearchInput,
  type OpenGovernmentCanadaPackageInput,
  type OpenGovernmentCanadaSearchInput,
} from '../../infrastructure/openApis/openGovernmentCanadaClient.js'
import type { PublicApiOperationDefinition, PublicApiProviderModule } from '../providerTypes.js'

const searchParamsSchema = z.object({
  query: z.string().optional(),
  limit: z.coerce.number().optional(),
}) satisfies z.ZodType<OpenGovernmentCanadaSearchInput>

const datasetParamsSchema = z.object({
  packageId: z.string().optional(),
}) satisfies z.ZodType<OpenGovernmentCanadaPackageInput>

const searchOperation: PublicApiOperationDefinition<OpenGovernmentCanadaSearchInput> = {
  id: 'opengovernmentcanada.search',
  providerId: 'opengovernmentcanada',
  name: 'Dataset Search',
  commandPath: ['opengovernmentcanada', 'search'],
  rpcMethod: 'opengovernmentcanada.search',
  description: 'Search Canadian Open Government datasets through the no-auth CKAN Action API.',
  category: 'government',
  options: [
    {
      name: 'query',
      flag: '--query <text>',
      description: `Dataset search text, default ${OPEN_GOVERNMENT_CANADA_DEFAULT_QUERY}`,
      exposure: 'primary',
      group: 'query',
      reason: 'Dataset search is the safest entrypoint before selecting a CKAN package UUID.',
      defaultValue: OPEN_GOVERNMENT_CANADA_DEFAULT_QUERY,
    },
    {
      name: 'limit',
      flag: '--limit <count>',
      description: `Datasets to request, default/cap ${OPEN_GOVERNMENT_CANADA_SEARCH_DEFAULT_LIMIT}`,
      exposure: 'primary',
      group: 'pagination',
      reason: 'Live probes show package_search returns at most 1000 rows even when higher rows are requested, so the CLI default uses that cap.',
      valueType: 'integer',
      defaultValue: String(OPEN_GOVERNMENT_CANADA_SEARCH_DEFAULT_LIMIT),
    },
  ],
  paramsSchema: searchParamsSchema,
  execute: params => searchOpenGovernmentCanadaDatasets(params),
  normalizeParams: params => searchParamsSchema.parse(params),
  createCacheKeyParams: params => normalizeOpenGovernmentCanadaSearchInput(params),
  resultKind: 'opengovernmentcanada.search',
  defaultFormat: 'text',
}

const datasetOperation: PublicApiOperationDefinition<OpenGovernmentCanadaPackageInput> = {
  id: 'opengovernmentcanada.dataset',
  providerId: 'opengovernmentcanada',
  name: 'Dataset Detail',
  commandPath: ['opengovernmentcanada', 'dataset'],
  rpcMethod: 'opengovernmentcanada.dataset',
  description: 'Read one Canadian Open Government CKAN dataset metadata document.',
  category: 'government',
  options: [
    {
      name: 'packageId',
      flag: '--package-id <uuid>',
      description: `CKAN package UUID, default Open Government API ${OPEN_GOVERNMENT_CANADA_DEFAULT_PACKAGE_ID}`,
      exposure: 'primary',
      group: 'query',
      reason: 'Dataset detail reads require a CKAN package UUID; default documents the official no-auth Open Government API package.',
      defaultValue: OPEN_GOVERNMENT_CANADA_DEFAULT_PACKAGE_ID,
    },
  ],
  paramsSchema: datasetParamsSchema,
  execute: params => showOpenGovernmentCanadaDataset(params),
  normalizeParams: params => datasetParamsSchema.parse(params),
  createCacheKeyParams: params => normalizeOpenGovernmentCanadaPackageInput(params),
  resultKind: 'opengovernmentcanada.dataset',
  defaultFormat: 'text',
}

export const openGovernmentCanadaProvider: PublicApiProviderModule = {
  manifest: {
    id: 'opengovernmentcanada',
    name: 'Open Government Canada',
    description: 'No-auth open.canada.ca CKAN dataset search and dataset detail.',
    publicApisCategory: 'Government',
    homepageUrl: 'https://open.canada.ca/data/en/dataset',
    docsUrl: 'https://open.canada.ca/data/dataset/2d90548d-50ef-4802-91f8-c59c5cf68251/resource/36830ed0-cd83-4fea-b2ae-15890116c68e/download/openapi-en.json',
    auth: {
      mode: 'none',
      notes: ['Official OpenAPI description states read-only public portal API calls can be made without an API key.'],
    },
    tags: ['government', 'canada', 'ckan', 'datasets', 'commercial-analysis', 'openapi', 'no-auth', 'json'],
    freePlanNotes: [
      'Dataset search defaults/caps at the observed portal maximum of 1000 rows.',
      'Dataset detail defaults to the official Open Government API package for a stable metadata example.',
      'Mutating CKAN registry operations and restricted registry server are intentionally not exposed.',
    ],
  },
  operations: [searchOperation, datasetOperation],
  endpoints: [
    {
      id: 'opengovernmentcanada-package-search',
      method: 'GET',
      urlPattern: 'https://open.canada.ca/data/en/api/3/action/package_search',
      category: 'public-apis:government',
      evidenceStatus: 'confirmed',
      description: 'open.canada.ca CKAN package_search endpoint.',
      observedOn: '2026-05-04',
      sampleSources: ['https://open.canada.ca/data/dataset/2d90548d-50ef-4802-91f8-c59c5cf68251', 'https://open.canada.ca/data/en/api/3/action/package_search?q=business&rows=3'],
      consumedBy: ['public-apis apis run opengovernmentcanada.search'],
      notes: ['No authentication required for read-only public portal calls; no browser clickstream or scraping required.'],
    },
    {
      id: 'opengovernmentcanada-package-show',
      method: 'GET',
      urlPattern: 'https://open.canada.ca/data/en/api/3/action/package_show',
      category: 'public-apis:government',
      evidenceStatus: 'confirmed',
      description: 'open.canada.ca CKAN package_show endpoint.',
      observedOn: '2026-05-04',
      sampleSources: [`https://open.canada.ca/data/en/api/3/action/package_show?id=${OPEN_GOVERNMENT_CANADA_DEFAULT_PACKAGE_ID}`],
      consumedBy: ['public-apis apis run opengovernmentcanada.dataset'],
      notes: ['No authentication required for read-only public portal calls; package id is required by CKAN.'],
    },
  ],
}
