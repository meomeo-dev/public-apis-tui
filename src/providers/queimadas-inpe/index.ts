import { z } from 'zod'
import { getQueimadasInpeLatest10Min, type QueimadasInpeLatestInput } from '../../application/usecases/queimadasInpe.js'
import {
  QUEIMADAS_INPE_10MIN_CSV_INDEX_URL,
  QUEIMADAS_INPE_DEFAULT_LIMIT,
  QUEIMADAS_INPE_DOCS_URL,
  QUEIMADAS_INPE_MAX_LIMIT,
  normalizeQueimadasInpeLatestInput,
} from '../../infrastructure/openApis/queimadasInpeClient.js'
import type { PublicApiOperationDefinition, PublicApiProviderModule } from '../providerTypes.js'

const latestParamsSchema = z.object({
  limit: z.coerce.number().int().optional(),
}) satisfies z.ZodType<QueimadasInpeLatestInput>

const latestOperation: PublicApiOperationDefinition<QueimadasInpeLatestInput> = {
  id: 'queimadas-inpe.latest10min',
  providerId: 'queimadas-inpe',
  name: 'Latest 10-minute heat focuses',
  commandPath: ['queimadas-inpe', 'latest-10min'],
  rpcMethod: 'queimadas-inpe.latest10min',
  description: 'Read the latest official INPE Queimadas 10-minute CSV heat-focus file with a bounded record limit.',
  category: 'geocoding',
  options: [
    {
      name: 'limit',
      flag: '--limit <count>',
      description: `Records to show from the latest 10-minute CSV, default ${String(QUEIMADAS_INPE_DEFAULT_LIMIT)}, max ${String(QUEIMADAS_INPE_MAX_LIMIT)}`,
      exposure: 'primary',
      group: 'pagination',
      reason: 'Latest CSV files can contain many observations; CLI caps terminal output and cache payload size.',
      valueType: 'integer',
      defaultValue: String(QUEIMADAS_INPE_DEFAULT_LIMIT),
    },
  ],
  paramsSchema: latestParamsSchema,
  execute: params => getQueimadasInpeLatest10Min(params),
  normalizeParams: params => latestParamsSchema.parse(params),
  createCacheKeyParams: params => normalizeQueimadasInpeLatestInput(params),
  resultKind: 'queimadas-inpe.latest10min',
  defaultFormat: 'text',
}

export const queimadasInpeProvider: PublicApiProviderModule = {
  manifest: {
    id: 'queimadas-inpe',
    name: 'Queimadas INPE',
    description: 'No-auth official INPE open CSV heat-focus observations for environmental monitoring.',
    publicApisCategory: 'Geocoding',
    homepageUrl: QUEIMADAS_INPE_DOCS_URL,
    docsUrl: QUEIMADAS_INPE_DOCS_URL,
    auth: {
      mode: 'none',
      notes: ['Official open-data pages and CSV directory files require no API keys, OAuth, cookies, browser sessions, or account setup.'],
    },
    tags: ['geocoding', 'environment', 'wildfire', 'satellite', 'csv', 'open-data', 'no-auth'],
    freePlanNotes: [
      'Public-safety boundary: heat-focus observations are monitoring data, not emergency dispatch/command data.',
      'CLI exposes only latest 10-minute CSV sampling; annual/monthly/daily bulk archives and KML surfaces are intentionally out of scope.',
      'Near-real-time satellite detections can be delayed, false-positive, duplicated, or incomplete.',
    ],
  },
  operations: [latestOperation],
  endpoints: [
    {
      id: 'queimadas-inpe-10min-csv-index',
      method: 'GET',
      urlPattern: QUEIMADAS_INPE_10MIN_CSV_INDEX_URL,
      category: 'public-apis:geocoding',
      evidenceStatus: 'confirmed',
      description: 'INPE Queimadas 10-minute CSV directory index listing current focos_10min files.',
      siteIds: ['public-apis-tui'],
      observedOn: '2026-05-08',
      sampleSources: [QUEIMADAS_INPE_DOCS_URL, QUEIMADAS_INPE_10MIN_CSV_INDEX_URL],
      consumedBy: ['public-apis apis run queimadas-inpe.latest10min'],
      notes: ['No authentication required.', 'Directory index is used only to select the latest CSV file.', 'Public-safety caveat is shown in JSON/TUI output.'],
    },
    {
      id: 'queimadas-inpe-10min-csv-file',
      method: 'GET',
      urlPattern: 'regex:^https://dataserver-coids\\.inpe\\.br/queimadas/queimadas/focos/csv/10min/focos_10min_[0-9]{8}_[0-9]{4}\\.csv$',
      category: 'public-apis:geocoding',
      evidenceStatus: 'confirmed',
      description: 'INPE Queimadas latest 10-minute CSV heat-focus observation file.',
      siteIds: ['public-apis-tui'],
      observedOn: '2026-05-08',
      sampleSources: [QUEIMADAS_INPE_DOCS_URL, `${QUEIMADAS_INPE_10MIN_CSV_INDEX_URL}focos_10min_20260508_1410.csv`],
      consumedBy: ['public-apis apis run queimadas-inpe.latest10min'],
      notes: ['No authentication required.', 'CSV schema observed as lat,lon,satelite,data.', 'CLI caps rows and does not expose bulk archive downloads.'],
    },
  ],
}

export type { QueimadasInpeLatestInput } from '../../application/usecases/queimadasInpe.js'
