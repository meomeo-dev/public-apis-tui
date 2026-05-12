import { z } from 'zod'
import { listDcOpenDataBusinessLicenses, listDcOpenDataDatasets } from '../../application/usecases/dcOpenData.js'
import {
  DC_OPEN_DATA_DEFAULT_DATASET_LIMIT,
  DC_OPEN_DATA_DEFAULT_DATASET_QUERY,
  DC_OPEN_DATA_DEFAULT_LICENSE_LIMIT,
  DC_OPEN_DATA_DEFAULT_LICENSE_STATUS,
  normalizeDcOpenDataBusinessLicensesInput,
  normalizeDcOpenDataDatasetsInput,
  type DcOpenDataBusinessLicensesInput,
  type DcOpenDataDatasetsInput,
} from '../../infrastructure/openApis/dcOpenDataClient.js'
import type { PublicApiOperationDefinition, PublicApiProviderModule } from '../providerTypes.js'

const datasetsParamsSchema = z.object({
  query: z.string().optional(),
  limit: z.coerce.number().optional(),
}) satisfies z.ZodType<DcOpenDataDatasetsInput>

const businessLicensesParamsSchema = z.object({
  status: z.string().optional(),
  limit: z.coerce.number().optional(),
}) satisfies z.ZodType<DcOpenDataBusinessLicensesInput>

const datasetsOperation: PublicApiOperationDefinition<DcOpenDataDatasetsInput> = {
  id: 'dcopendata.datasets',
  providerId: 'dcopendata',
  name: 'Datasets',
  commandPath: ['dcopendata', 'datasets'],
  rpcMethod: 'dcopendata.datasets',
  description: 'Search District of Columbia Open Data ArcGIS Hub dataset metadata.',
  category: 'government',
  options: [
    {
      name: 'query',
      flag: '--query <text>',
      description: `Hub dataset search query, default ${DC_OPEN_DATA_DEFAULT_DATASET_QUERY}`,
      exposure: 'primary',
      group: 'query',
      reason: 'The DC catalog is broad; text search keeps the default output commercially useful and terminal-readable.',
      defaultValue: DC_OPEN_DATA_DEFAULT_DATASET_QUERY,
    },
    {
      name: 'limit',
      flag: '--limit <count>',
      description: `Datasets to request, default/cap ${DC_OPEN_DATA_DEFAULT_DATASET_LIMIT}`,
      exposure: 'primary',
      group: 'pagination',
      reason: 'ArcGIS Hub search is rate-limited; 100 is a bounded single-page maximum for readable output and offline caching.',
      valueType: 'integer',
      defaultValue: String(DC_OPEN_DATA_DEFAULT_DATASET_LIMIT),
    },
  ],
  paramsSchema: datasetsParamsSchema,
  execute: params => listDcOpenDataDatasets(params),
  normalizeParams: params => datasetsParamsSchema.parse(params),
  createCacheKeyParams: params => normalizeDcOpenDataDatasetsInput(params),
  resultKind: 'dcopendata.datasets',
  defaultFormat: 'text',
}

const businessLicensesOperation: PublicApiOperationDefinition<DcOpenDataBusinessLicensesInput> = {
  id: 'dcopendata.businessLicenses',
  providerId: 'dcopendata',
  name: 'Business Licenses',
  commandPath: ['dcopendata', 'business-licenses'],
  rpcMethod: 'dcopendata.businessLicenses',
  description: 'Read DC Basic Business Licenses from the public ArcGIS FeatureServer.',
  category: 'government',
  options: [
    {
      name: 'status',
      flag: '--status <name>',
      description: `License status filter, default ${DC_OPEN_DATA_DEFAULT_LICENSE_STATUS}`,
      exposure: 'primary',
      group: 'filters',
      reason: 'Status is the safest high-value business filter and avoids exposing raw ArcGIS SQL in CLI UX.',
      defaultValue: DC_OPEN_DATA_DEFAULT_LICENSE_STATUS,
    },
    {
      name: 'limit',
      flag: '--limit <count>',
      description: `Rows to request, default/cap ${DC_OPEN_DATA_DEFAULT_LICENSE_LIMIT}`,
      exposure: 'primary',
      group: 'pagination',
      reason: '1000 maximizes a bounded ArcGIS query page while staying safe for terminal rendering and offline persistence.',
      valueType: 'integer',
      defaultValue: String(DC_OPEN_DATA_DEFAULT_LICENSE_LIMIT),
    },
  ],
  paramsSchema: businessLicensesParamsSchema,
  execute: params => listDcOpenDataBusinessLicenses(params),
  normalizeParams: params => businessLicensesParamsSchema.parse(params),
  createCacheKeyParams: params => normalizeDcOpenDataBusinessLicensesInput(params),
  resultKind: 'dcopendata.businessLicenses',
  defaultFormat: 'text',
}

export const dcOpenDataProvider: PublicApiProviderModule = {
  manifest: {
    id: 'dcopendata',
    name: 'District of Columbia Open Data',
    description: 'No-auth Open Data DC ArcGIS Hub catalog and Basic Business Licenses API integration.',
    publicApisCategory: 'Government',
    homepageUrl: 'https://opendata.dc.gov/',
    docsUrl: 'https://opendata.dc.gov/pages/using-apis',
    auth: {
      mode: 'none',
      notes: ['Implemented ArcGIS Hub and FeatureServer reads require no API key, OAuth, cookies, browser session, or account setup.'],
    },
    tags: ['government', 'dc', 'arcgis-hub', 'business-licenses', 'municipal-data', 'commercial-analysis', 'no-auth', 'json'],
    freePlanNotes: [
      'Hub search responses include unauthenticated rate-limit headers; callers can persist and replay results offline to avoid unnecessary live calls.',
      'Business license rows default/cap is 1000 to maximize one bounded ArcGIS query page without exposing raw SQL.',
    ],
  },
  operations: [datasetsOperation, businessLicensesOperation],
  endpoints: [
    {
      id: 'dcopendata-hub-dataset-search',
      method: 'GET',
      urlPattern: 'https://opendata.dc.gov/api/search/v1/collections/dataset/items',
      category: 'public-apis:government',
      evidenceStatus: 'confirmed',
      description: 'ArcGIS Hub OGC API Features dataset collection search for Open Data DC.',
      observedOn: '2026-05-04',
      sampleSources: ['https://opendata.dc.gov/pages/using-apis', 'https://opendata.dc.gov/api/search/v1/collections/dataset/items?limit=3&q=business'],
      consumedBy: ['public-apis apis run dcopendata.datasets'],
      notes: ['No API key observed; response exposes portal_search_throttler rate-limit headers.'],
    },
    {
      id: 'dcopendata-basic-business-licenses',
      method: 'GET',
      urlPattern: 'https://maps2.dcgis.dc.gov/dcgis/rest/services/FEEDS/DCRA/FeatureServer/0/query',
      category: 'public-apis:government',
      evidenceStatus: 'confirmed',
      description: 'ArcGIS FeatureServer query endpoint for DC Basic Business Licenses.',
      observedOn: '2026-05-04',
      sampleSources: ['https://opendata.dc.gov/api/search/v1/collections/dataset/items?limit=3&q=business'],
      consumedBy: ['public-apis apis run dcopendata.businessLicenses'],
      notes: ['No API key observed; CLI exposes status and limit instead of raw ArcGIS SQL.'],
    },
  ],
}
