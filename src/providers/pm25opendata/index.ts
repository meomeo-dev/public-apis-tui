import { z } from 'zod'
import { listPm25OpenDataAirbox, listPm25OpenDataLass } from '../../application/usecases/pm25OpenData.js'
import {
  PM25_OPEN_DATA_AIRBOX_DEFAULT_LIMIT,
  PM25_OPEN_DATA_AIRBOX_MAX_LIMIT,
  PM25_OPEN_DATA_LASS_DEFAULT_LIMIT,
  PM25_OPEN_DATA_LASS_MAX_LIMIT,
  normalizePm25OpenDataAirboxInput,
  normalizePm25OpenDataLassInput,
  type Pm25OpenDataFeedInput,
} from '../../infrastructure/openApis/pm25OpenDataClient.js'
import type { PublicApiOperationDefinition, PublicApiProviderModule } from '../providerTypes.js'

const feedParamsSchema = z.object({
  limit: z.coerce.number().optional(),
}) satisfies z.ZodType<Pm25OpenDataFeedInput>

const airboxOperation: PublicApiOperationDefinition<Pm25OpenDataFeedInput> = {
  id: 'pm25opendata.airbox',
  providerId: 'pm25opendata',
  name: 'AirBox Feed',
  commandPath: ['pm25opendata', 'airbox'],
  rpcMethod: 'pm25opendata.airbox',
  description: 'Read the latest PM2.5 Open Data AirBox sensor feed.',
  category: 'environment',
  options: [
    {
      name: 'limit',
      flag: '--limit <count>',
      description: `AirBox feed rows to show, default/cap ${PM25_OPEN_DATA_AIRBOX_DEFAULT_LIMIT}`,
      exposure: 'primary',
      group: 'pagination',
      reason: 'The live AirBox JSON feed currently returns 506 rows; default uses the full observed feed to maximize each limited request.',
      valueType: 'integer',
      defaultValue: String(PM25_OPEN_DATA_AIRBOX_DEFAULT_LIMIT),
    },
  ],
  paramsSchema: feedParamsSchema,
  execute: params => listPm25OpenDataAirbox(params),
  normalizeParams: params => feedParamsSchema.parse(params),
  createCacheKeyParams: params => normalizePm25OpenDataAirboxInput(params),
  resultKind: 'pm25opendata.airbox',
  defaultFormat: 'text',
}

const lassOperation: PublicApiOperationDefinition<Pm25OpenDataFeedInput> = {
  id: 'pm25opendata.lass',
  providerId: 'pm25opendata',
  name: 'LASS Feed',
  commandPath: ['pm25opendata', 'lass'],
  rpcMethod: 'pm25opendata.lass',
  description: 'Read the latest PM2.5 Open Data LASS sensor feed.',
  category: 'environment',
  options: [
    {
      name: 'limit',
      flag: '--limit <count>',
      description: `LASS feed rows to show, default/cap ${PM25_OPEN_DATA_LASS_DEFAULT_LIMIT}`,
      exposure: 'primary',
      group: 'pagination',
      reason: 'The live LASS JSON feed currently returns 10 rows; default uses the full observed feed to maximize each limited request.',
      valueType: 'integer',
      defaultValue: String(PM25_OPEN_DATA_LASS_DEFAULT_LIMIT),
    },
  ],
  paramsSchema: feedParamsSchema,
  execute: params => listPm25OpenDataLass(params),
  normalizeParams: params => feedParamsSchema.parse(params),
  createCacheKeyParams: params => normalizePm25OpenDataLassInput(params),
  resultKind: 'pm25opendata.lass',
  defaultFormat: 'text',
}

export const pm25OpenDataProvider: PublicApiProviderModule = {
  manifest: {
    id: 'pm25opendata',
    name: 'PM2.5 Open Data Portal',
    description: 'No-auth PM2.5 Open Data Portal AirBox and LASS sensor feeds.',
    publicApisCategory: 'Environment',
    homepageUrl: 'https://pm25.lass-net.org/#apis',
    docsUrl: 'https://pm25.lass-net.org/#apis',
    auth: {
      mode: 'none',
      notes: ['Static HTTPS JSON feeds work without API key, OAuth, cookies, browser session, or account setup.'],
    },
    tags: ['environment', 'air-quality', 'pm25', 'sensors', 'taiwan', 'no-auth', 'json'],
    freePlanNotes: [
      `AirBox default/cap ${PM25_OPEN_DATA_AIRBOX_MAX_LIMIT} and LASS default/cap ${PM25_OPEN_DATA_LASS_MAX_LIMIT} mirror observed full live feeds.`,
      'Feeds are static JSON snapshots and may update frequently; offline replay is supported through the shared SQLite cache.',
    ],
  },
  operations: [airboxOperation, lassOperation],
  endpoints: [
    {
      id: 'pm25opendata-last-all-airbox',
      method: 'GET',
      urlPattern: 'https://pm25.lass-net.org/data/last-all-airbox.json',
      category: 'open-api',
      evidenceStatus: 'confirmed',
      description: 'PM2.5 Open Data AirBox latest JSON feed.',
      siteIds: ['public-apis-tui'],
      observedOn: '2026-05-04',
      sampleSources: ['https://pm25.lass-net.org/#apis', 'https://pm25.lass-net.org/data/last-all-airbox.json'],
      consumedBy: ['pm25opendata airbox'],
      notes: ['No API key required.', 'Live probe returned 506 AirBox feed rows.'],
    },
    {
      id: 'pm25opendata-last-all-lass',
      method: 'GET',
      urlPattern: 'https://pm25.lass-net.org/data/last-all-lass.json',
      category: 'open-api',
      evidenceStatus: 'confirmed',
      description: 'PM2.5 Open Data LASS latest JSON feed.',
      siteIds: ['public-apis-tui'],
      observedOn: '2026-05-04',
      sampleSources: ['https://pm25.lass-net.org/#apis', 'https://pm25.lass-net.org/data/last-all-lass.json'],
      consumedBy: ['pm25opendata lass'],
      notes: ['No API key required.', 'Live probe returned 10 LASS feed rows.'],
    },
  ],
}
