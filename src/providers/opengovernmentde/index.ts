import { z } from 'zod'
import { searchOpenGovernmentGermanyDatasets, showOpenGovernmentGermanyDataset } from '../../application/usecases/openGovernmentGermany.js'
import {
  OPEN_GOVERNMENT_GERMANY_DEFAULT_PACKAGE_ID,
  OPEN_GOVERNMENT_GERMANY_DEFAULT_QUERY,
  OPEN_GOVERNMENT_GERMANY_SEARCH_DEFAULT_LIMIT,
  normalizeOpenGovernmentGermanyPackageInput,
  normalizeOpenGovernmentGermanySearchInput,
  type OpenGovernmentGermanyPackageInput,
  type OpenGovernmentGermanySearchInput,
} from '../../infrastructure/openApis/openGovernmentGermanyClient.js'
import type { PublicApiOperationDefinition, PublicApiProviderModule } from '../providerTypes.js'

const searchParamsSchema = z.object({
  query: z.string().optional(),
  limit: z.coerce.number().optional(),
}) satisfies z.ZodType<OpenGovernmentGermanySearchInput>

const datasetParamsSchema = z.object({
  packageId: z.string().optional(),
}) satisfies z.ZodType<OpenGovernmentGermanyPackageInput>

const searchOperation: PublicApiOperationDefinition<OpenGovernmentGermanySearchInput> = {
  id: 'opengovernmentde.search',
  providerId: 'opengovernmentde',
  name: 'Dataset Search',
  commandPath: ['opengovernmentde', 'search'],
  rpcMethod: 'opengovernmentde.search',
  description: 'Search German GovData datasets through the no-auth CKAN Action API.',
  category: 'government',
  options: [
    {
      name: 'query',
      flag: '--query <text>',
      description: `Dataset search text, default ${OPEN_GOVERNMENT_GERMANY_DEFAULT_QUERY}`,
      exposure: 'primary',
      group: 'query',
      reason: 'Dataset search is the safest entrypoint before selecting a CKAN package UUID or package name.',
      defaultValue: OPEN_GOVERNMENT_GERMANY_DEFAULT_QUERY,
    },
    {
      name: 'limit',
      flag: '--limit <count>',
      description: `Datasets to request, default/cap ${OPEN_GOVERNMENT_GERMANY_SEARCH_DEFAULT_LIMIT}`,
      exposure: 'primary',
      group: 'pagination',
      reason: 'Live probes show package_search returns at most 1000 rows even when higher rows are requested, so the CLI default uses that cap.',
      valueType: 'integer',
      defaultValue: String(OPEN_GOVERNMENT_GERMANY_SEARCH_DEFAULT_LIMIT),
    },
  ],
  paramsSchema: searchParamsSchema,
  execute: params => searchOpenGovernmentGermanyDatasets(params),
  normalizeParams: params => searchParamsSchema.parse(params),
  createCacheKeyParams: params => normalizeOpenGovernmentGermanySearchInput(params),
  resultKind: 'opengovernmentde.search',
  defaultFormat: 'text',
}

const datasetOperation: PublicApiOperationDefinition<OpenGovernmentGermanyPackageInput> = {
  id: 'opengovernmentde.dataset',
  providerId: 'opengovernmentde',
  name: 'Dataset Detail',
  commandPath: ['opengovernmentde', 'dataset'],
  rpcMethod: 'opengovernmentde.dataset',
  description: 'Read one German GovData CKAN dataset metadata document.',
  category: 'government',
  options: [
    {
      name: 'packageId',
      flag: '--package-id <id>',
      description: `CKAN package UUID or name, default GovData Metadatenkatalog ${OPEN_GOVERNMENT_GERMANY_DEFAULT_PACKAGE_ID}`,
      exposure: 'primary',
      group: 'query',
      reason: 'Dataset detail reads require a CKAN package UUID or package name; default documents the GovData metadata catalog package.',
      defaultValue: OPEN_GOVERNMENT_GERMANY_DEFAULT_PACKAGE_ID,
    },
  ],
  paramsSchema: datasetParamsSchema,
  execute: params => showOpenGovernmentGermanyDataset(params),
  normalizeParams: params => datasetParamsSchema.parse(params),
  createCacheKeyParams: params => normalizeOpenGovernmentGermanyPackageInput(params),
  resultKind: 'opengovernmentde.dataset',
  defaultFormat: 'text',
}

export const openGovernmentGermanyProvider: PublicApiProviderModule = {
  manifest: {
    id: 'opengovernmentde',
    name: 'Open Government Germany',
    description: 'No-auth GovData CKAN dataset search and dataset detail.',
    publicApisCategory: 'Government',
    homepageUrl: 'https://www.govdata.de/',
    docsUrl: 'https://www.govdata.de/ckan/api/3/action/help_show?name=package_search',
    auth: {
      mode: 'none',
      notes: ['GovData CKAN package_search and package_show are public read-only JSON endpoints and live probes require no API key.'],
    },
    tags: ['government', 'germany', 'govdata', 'ckan', 'datasets', 'commercial-analysis', 'no-auth', 'json'],
    freePlanNotes: [
      'Dataset search defaults/caps at the observed portal maximum of 1000 rows.',
      'Dataset detail defaults to the GovData Metadatenkatalog package for a stable catalog metadata example.',
      'Mutating CKAN operations, raw SQL, and catalog file downloads are intentionally not exposed.',
    ],
  },
  operations: [searchOperation, datasetOperation],
  endpoints: [
    {
      id: 'opengovernmentde-package-search',
      method: 'GET',
      urlPattern: 'https://ckan.govdata.de/api/3/action/package_search',
      category: 'public-apis:government',
      evidenceStatus: 'confirmed',
      description: 'GovData CKAN package_search endpoint.',
      observedOn: '2026-05-04',
      sampleSources: ['https://www.govdata.de/daten/-/details/govdata-metadatenkatalog', 'https://ckan.govdata.de/api/3/action/package_search?q=verkehr&rows=3'],
      consumedBy: ['public-apis apis run opengovernmentde.search'],
      notes: ['No authentication required for read-only public CKAN calls; no browser clickstream or scraping required.'],
    },
    {
      id: 'opengovernmentde-package-show',
      method: 'GET',
      urlPattern: 'https://ckan.govdata.de/api/3/action/package_show',
      category: 'public-apis:government',
      evidenceStatus: 'confirmed',
      description: 'GovData CKAN package_show endpoint.',
      observedOn: '2026-05-04',
      sampleSources: [`https://ckan.govdata.de/api/3/action/package_show?id=${OPEN_GOVERNMENT_GERMANY_DEFAULT_PACKAGE_ID}`],
      consumedBy: ['public-apis apis run opengovernmentde.dataset'],
      notes: ['No authentication required for read-only public CKAN calls; package id or name is required by CKAN.'],
    },
  ],
}
