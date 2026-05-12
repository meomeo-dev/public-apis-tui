import { z } from 'zod'
import { searchOpenGovernmentUkDatasets, showOpenGovernmentUkDataset } from '../../application/usecases/openGovernmentUk.js'
import {
  OPEN_GOVERNMENT_UK_DEFAULT_PACKAGE_ID,
  OPEN_GOVERNMENT_UK_DEFAULT_QUERY,
  OPEN_GOVERNMENT_UK_SEARCH_DEFAULT_LIMIT,
  normalizeOpenGovernmentUkPackageInput,
  normalizeOpenGovernmentUkSearchInput,
  type OpenGovernmentUkPackageInput,
  type OpenGovernmentUkSearchInput,
} from '../../infrastructure/openApis/openGovernmentUkClient.js'
import type { PublicApiOperationDefinition, PublicApiProviderModule } from '../providerTypes.js'

const searchParamsSchema = z.object({
  query: z.string().optional(),
  limit: z.coerce.number().optional(),
}) satisfies z.ZodType<OpenGovernmentUkSearchInput>

const datasetParamsSchema = z.object({
  packageId: z.string().optional(),
}) satisfies z.ZodType<OpenGovernmentUkPackageInput>

const searchOperation: PublicApiOperationDefinition<OpenGovernmentUkSearchInput> = {
  id: 'opengovernmentuk.search',
  providerId: 'opengovernmentuk',
  name: 'Dataset Search',
  commandPath: ['opengovernmentuk', 'search'],
  rpcMethod: 'opengovernmentuk.search',
  description: 'Search UK data.gov.uk datasets through the no-auth CKAN Action API.',
  category: 'government',
  options: [
    {
      name: 'query',
      flag: '--query <text>',
      description: `Dataset search text, default ${OPEN_GOVERNMENT_UK_DEFAULT_QUERY}`,
      exposure: 'primary',
      group: 'query',
      reason: 'Dataset search is the safest entrypoint before selecting a CKAN package UUID.',
      defaultValue: OPEN_GOVERNMENT_UK_DEFAULT_QUERY,
    },
    {
      name: 'limit',
      flag: '--limit <count>',
      description: `Datasets to request, default/cap ${OPEN_GOVERNMENT_UK_SEARCH_DEFAULT_LIMIT}`,
      exposure: 'primary',
      group: 'pagination',
      reason: 'Live probes show package_search returns at most 1000 rows even when higher rows are requested, so the CLI default uses that cap.',
      valueType: 'integer',
      defaultValue: String(OPEN_GOVERNMENT_UK_SEARCH_DEFAULT_LIMIT),
    },
  ],
  paramsSchema: searchParamsSchema,
  execute: params => searchOpenGovernmentUkDatasets(params),
  normalizeParams: params => searchParamsSchema.parse(params),
  createCacheKeyParams: params => normalizeOpenGovernmentUkSearchInput(params),
  resultKind: 'opengovernmentuk.search',
  defaultFormat: 'text',
}

const datasetOperation: PublicApiOperationDefinition<OpenGovernmentUkPackageInput> = {
  id: 'opengovernmentuk.dataset',
  providerId: 'opengovernmentuk',
  name: 'Dataset Detail',
  commandPath: ['opengovernmentuk', 'dataset'],
  rpcMethod: 'opengovernmentuk.dataset',
  description: 'Read one UK data.gov.uk CKAN dataset metadata document.',
  category: 'government',
  options: [
    {
      name: 'packageId',
      flag: '--package-id <uuid>',
      description: `CKAN package UUID, default Business Rates Small Business Rate Relief ${OPEN_GOVERNMENT_UK_DEFAULT_PACKAGE_ID}`,
      exposure: 'primary',
      group: 'query',
      reason: 'Dataset detail reads require a CKAN package UUID; default documents a business-rates dataset with useful commercial-analysis metadata.',
      defaultValue: OPEN_GOVERNMENT_UK_DEFAULT_PACKAGE_ID,
    },
  ],
  paramsSchema: datasetParamsSchema,
  execute: params => showOpenGovernmentUkDataset(params),
  normalizeParams: params => datasetParamsSchema.parse(params),
  createCacheKeyParams: params => normalizeOpenGovernmentUkPackageInput(params),
  resultKind: 'opengovernmentuk.dataset',
  defaultFormat: 'text',
}

export const openGovernmentUkProvider: PublicApiProviderModule = {
  manifest: {
    id: 'opengovernmentuk',
    name: 'Open Government UK',
    description: 'No-auth data.gov.uk CKAN dataset search and dataset detail.',
    publicApisCategory: 'Government',
    homepageUrl: 'https://data.gov.uk/',
    docsUrl: 'https://guidance.data.gov.uk/publish_and_manage_data/harvest_or_add_data/using_the_api/',
    auth: {
      mode: 'none',
      notes: ['Official data.gov.uk API guidance says no API key is required and live probes require no authentication.'],
    },
    tags: ['government', 'uk', 'data-gov-uk', 'ckan', 'datasets', 'business-rates', 'commercial-analysis', 'no-auth', 'json'],
    freePlanNotes: [
      'Dataset search defaults/caps at the observed portal maximum of 1000 rows.',
      'Dataset detail defaults to a business-rates package with resources for a stable commercial-analysis metadata example.',
      'Mutating CKAN operations and raw datastore/SQL surfaces are intentionally not exposed.',
    ],
  },
  operations: [searchOperation, datasetOperation],
  endpoints: [
    {
      id: 'opengovernmentuk-package-search',
      method: 'GET',
      urlPattern: 'https://ckan.publishing.service.gov.uk/api/action/package_search',
      category: 'public-apis:government',
      evidenceStatus: 'confirmed',
      description: 'data.gov.uk CKAN package_search endpoint.',
      observedOn: '2026-05-04',
      sampleSources: ['https://data.gov.uk/', 'https://ckan.publishing.service.gov.uk/api/action/package_search?q=business&rows=3'],
      consumedBy: ['public-apis apis run opengovernmentuk.search'],
      notes: ['No authentication required for read-only public CKAN calls; no browser clickstream or scraping required.'],
    },
    {
      id: 'opengovernmentuk-package-show',
      method: 'GET',
      urlPattern: 'https://ckan.publishing.service.gov.uk/api/action/package_show',
      category: 'public-apis:government',
      evidenceStatus: 'confirmed',
      description: 'data.gov.uk CKAN package_show endpoint.',
      observedOn: '2026-05-04',
      sampleSources: [`https://ckan.publishing.service.gov.uk/api/action/package_show?id=${OPEN_GOVERNMENT_UK_DEFAULT_PACKAGE_ID}`],
      consumedBy: ['public-apis apis run opengovernmentuk.dataset'],
      notes: ['No authentication required for read-only public CKAN calls; package id is required by CKAN.'],
    },
  ],
}
