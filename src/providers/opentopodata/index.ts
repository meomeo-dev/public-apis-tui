import { z } from 'zod'
import { lookupOpenTopoData, type OpenTopoDataLookupInput } from '../../application/usecases/openTopoData.js'
import {
  OPEN_TOPO_DATA_DEFAULT_DATASET,
  OPEN_TOPO_DATA_DEFAULT_INTERPOLATION,
  OPEN_TOPO_DATA_DEFAULT_LOCATIONS,
  OPEN_TOPO_DATA_DOCS_URL,
  OPEN_TOPO_DATA_HOME_URL,
  OPEN_TOPO_DATA_MAX_LOCATIONS,
  OPEN_TOPO_DATA_SUPPORTED_DATASETS,
  normalizeOpenTopoDataLookupInput,
} from '../../infrastructure/openApis/openTopoDataClient.js'
import type { PublicApiOperationDefinition, PublicApiProviderModule } from '../providerTypes.js'

const lookupParamsSchema = z.object({
  locations: z.string().optional(),
  dataset: z.string().optional(),
  interpolation: z.string().optional(),
}) satisfies z.ZodType<OpenTopoDataLookupInput>

const lookupOperation: PublicApiOperationDefinition<OpenTopoDataLookupInput> = {
  id: 'opentopodata.lookup',
  providerId: 'opentopodata',
  name: 'Lookup elevation',
  commandPath: ['opentopodata', 'lookup'],
  rpcMethod: 'opentopodata.lookup',
  description: 'Look up elevation or bathymetry for one or more latitude/longitude points using Open Topo Data.',
  category: 'geocoding',
  options: [
    {
      name: 'locations',
      flag: '--locations <lat,lon[|lat,lon]>',
      description: `Pipe-separated lat,lon pairs, default ${OPEN_TOPO_DATA_DEFAULT_LOCATIONS}, max ${String(OPEN_TOPO_DATA_MAX_LOCATIONS)}`,
      exposure: 'primary',
      group: 'query',
      reason: 'The documented endpoint requires locations in lat,lon order; the CLI bounds the number of points for the public demo server.',
      defaultValue: OPEN_TOPO_DATA_DEFAULT_LOCATIONS,
    },
    {
      name: 'dataset',
      flag: '--dataset <name>',
      description: `Dataset name, default ${OPEN_TOPO_DATA_DEFAULT_DATASET}`,
      exposure: 'primary',
      group: 'filters',
      reason: 'Dataset choice controls whether users query land elevation, bathymetry, or merged global data.',
      defaultValue: OPEN_TOPO_DATA_DEFAULT_DATASET,
    },
    {
      name: 'interpolation',
      flag: '--interpolation <nearest|bilinear|cubic>',
      description: `Interpolation mode, default ${OPEN_TOPO_DATA_DEFAULT_INTERPOLATION}`,
      exposure: 'advanced',
      group: 'filters',
      reason: 'Interpolation is documented and useful for precision, but secondary to selecting locations and dataset.',
      defaultValue: OPEN_TOPO_DATA_DEFAULT_INTERPOLATION,
    },
  ],
  paramsSchema: lookupParamsSchema,
  execute: params => lookupOpenTopoData(params),
  normalizeParams: params => lookupParamsSchema.parse(params),
  createCacheKeyParams: params => normalizeOpenTopoDataLookupInput(params),
  resultKind: 'opentopodata.lookup',
  defaultFormat: 'text',
}

export const openTopoDataProvider: PublicApiProviderModule = {
  manifest: {
    id: 'opentopodata',
    name: 'Open Topo Data',
    description: 'No-auth HTTPS JSON elevation and ocean-depth lookups by latitude/longitude.',
    publicApisCategory: 'Geocoding',
    homepageUrl: OPEN_TOPO_DATA_HOME_URL,
    docsUrl: OPEN_TOPO_DATA_DOCS_URL,
    auth: {
      mode: 'none',
      notes: ['Public demo API requires no API keys, OAuth, cookies, browser sessions, or account setup.'],
    },
    tags: ['geocoding', 'elevation', 'bathymetry', 'topography', 'json', 'no-auth'],
    freePlanNotes: [
      `Supported CLI datasets: ${OPEN_TOPO_DATA_SUPPORTED_DATASETS.join(', ')}.`,
      `CLI limits each request to ${String(OPEN_TOPO_DATA_MAX_LOCATIONS)} locations for the public demo server.`,
      'Docs recommend self-hosting Open Topo Data for high-volume use.',
    ],
  },
  operations: [lookupOperation],
  endpoints: [
    {
      id: 'opentopodata-lookup',
      method: 'GET',
      urlPattern: 'https://api.opentopodata.org/v1/*',
      category: 'public-apis:geocoding',
      evidenceStatus: 'confirmed',
      description: 'Open Topo Data elevation/bathymetry lookup endpoint for a selected dataset.',
      siteIds: ['public-apis-tui'],
      observedOn: '2026-05-08',
      sampleSources: [OPEN_TOPO_DATA_DOCS_URL, 'https://api.opentopodata.org/v1/srtm90m?locations=39.7471,-104.9963', 'https://api.opentopodata.org/v1/gebco2020?locations=0,0'],
      consumedBy: ['public-apis apis run opentopodata.lookup'],
      notes: ['No authentication required.', 'Public demo server should be used lightly; self-host for production/high-volume use.', 'CLI exposes only bounded GET lookups and curated datasets.'],
    },
  ],
}

export type { OpenTopoDataLookupInput } from '../../application/usecases/openTopoData.js'
