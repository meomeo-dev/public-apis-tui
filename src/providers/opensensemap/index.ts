import { z } from 'zod'
import {
  getOpenSenseMapSensors,
  getOpenSenseMapStats,
  listOpenSenseMapBoxes,
  type OpenSenseMapBoxesResult,
  type OpenSenseMapSensorsResult,
  type OpenSenseMapStatsResult,
} from '../../application/usecases/openSenseMap.js'
import {
  normalizeOpenSenseMapBoxesInput,
  normalizeOpenSenseMapSensorsInput,
  normalizeOpenSenseMapStatsInput,
  OPENSENSEMAP_BOXES_DEFAULT_LIMIT,
  OPENSENSEMAP_BOXES_MAX_LIMIT,
  OPENSENSEMAP_DEFAULT_BOX_ID,
  OPENSENSEMAP_DEFAULT_BOX_NAME,
  OPENSENSEMAP_SENSORS_DEFAULT_COUNT,
  OPENSENSEMAP_SENSORS_MAX_COUNT,
  type OpenSenseMapBoxesInput,
  type OpenSenseMapSensorsInput,
  type OpenSenseMapStatsInput,
} from '../../infrastructure/openApis/openSenseMapClient.js'
import type { PublicApiOperationDefinition, PublicApiProviderModule } from '../providerTypes.js'

const statsParamsSchema = z.object({
  human: z.boolean().optional(),
}) satisfies z.ZodType<OpenSenseMapStatsInput>

const boxesParamsSchema = z.object({
  name: z.string().min(1).optional(),
  bbox: z.string().min(1).optional(),
  phenomenon: z.string().min(1).optional(),
  date: z.string().min(1).optional(),
  exposure: z.string().min(1).optional(),
  minimal: z.boolean().optional(),
  limit: z.coerce.number().int().optional(),
}) satisfies z.ZodType<OpenSenseMapBoxesInput>

const sensorsParamsSchema = z.object({
  boxId: z.string().min(1).optional(),
  count: z.coerce.number().int().optional(),
}) satisfies z.ZodType<OpenSenseMapSensorsInput>

const statsOperation: PublicApiOperationDefinition<OpenSenseMapStatsInput> = {
  id: 'opensensemap.stats',
  providerId: 'opensensemap',
  name: 'Stats',
  commandPath: ['opensensemap', 'stats'],
  rpcMethod: 'opensensemap.stats',
  description: 'Read openSenseMap database-level senseBox and measurement counts.',
  category: 'weather',
  options: [
    { name: 'human', flag: '--human <true|false>', description: 'Return human-readable count strings', exposure: 'advanced', group: 'presentation', reason: 'Human-readable counts are useful for terminal summaries but numeric counts are better for automation.', valueType: 'boolean', defaultValue: 'false' },
  ],
  paramsSchema: statsParamsSchema,
  execute: params => getOpenSenseMapStats(params),
  normalizeParams: params => statsParamsSchema.parse(params),
  createCacheKeyParams: params => normalizeOpenSenseMapStatsInput(params),
  resultKind: 'opensensemap.stats',
  defaultFormat: 'text',
}

const boxesOperation: PublicApiOperationDefinition<OpenSenseMapBoxesInput> = {
  id: 'opensensemap.boxes',
  providerId: 'opensensemap',
  name: 'Boxes',
  commandPath: ['opensensemap', 'boxes'],
  rpcMethod: 'opensensemap.boxes',
  description: 'Search openSenseMap senseBoxes by name, bounding box, phenomenon, and exposure.',
  category: 'weather',
  options: [
    { name: 'name', flag: '--name <text>', description: `Search boxes by name, default ${OPENSENSEMAP_DEFAULT_BOX_NAME}`, exposure: 'primary', group: 'query', reason: 'Name search is the safest first-run discovery path and the docs state it ignores other filters.', defaultValue: OPENSENSEMAP_DEFAULT_BOX_NAME },
    { name: 'bbox', flag: '--bbox <west,south,east,north>', description: 'Filter by WGS84 bounding box', exposure: 'primary', group: 'filters', reason: 'Bounding boxes are the documented spatial filter for weather station discovery.' },
    { name: 'phenomenon', flag: '--phenomenon <text>', description: 'Filter boxes by sensor phenomenon', exposure: 'primary', group: 'filters', reason: 'Phenomenon is the documented way to find stations measuring temperature, humidity, UV intensity, and similar data.' },
    { name: 'date', flag: '--date <rfc3339[,rfc3339]>', description: 'Filter boxes with measurements around one or two timestamps', exposure: 'advanced', group: 'filters', reason: 'Date filtering is useful with phenomenon but less common for first-run station discovery.' },
    { name: 'exposure', flag: '--exposure <indoor|outdoor|mobile|unknown>', description: 'Filter by exposure class', exposure: 'primary', group: 'filters', reason: 'Exposure is a compact quality/use-context filter for environmental observations.' },
    { name: 'minimal', flag: '--minimal <true|false>', description: 'Request the documented minimal metadata shape', exposure: 'advanced', group: 'content', reason: 'Minimal metadata can speed large spatial searches while preserving discovery fields.', valueType: 'boolean', defaultValue: 'false' },
    { name: 'limit', flag: '--limit <count>', description: `Boxes to show, docs default ${OPENSENSEMAP_BOXES_DEFAULT_LIMIT}, CLI cap ${OPENSENSEMAP_BOXES_MAX_LIMIT}`, exposure: 'primary', group: 'pagination', reason: 'Docs publish a default but no maximum; the CLI caps output to avoid huge station lists.', valueType: 'integer', defaultValue: String(OPENSENSEMAP_BOXES_DEFAULT_LIMIT) },
  ],
  paramsSchema: boxesParamsSchema,
  execute: params => listOpenSenseMapBoxes(params),
  normalizeParams: params => boxesParamsSchema.parse(params),
  createCacheKeyParams: params => normalizeOpenSenseMapBoxesInput(params),
  resultKind: 'opensensemap.boxes',
  defaultFormat: 'text',
}

const sensorsOperation: PublicApiOperationDefinition<OpenSenseMapSensorsInput> = {
  id: 'opensensemap.sensors',
  providerId: 'opensensemap',
  name: 'Sensors',
  commandPath: ['opensensemap', 'sensors'],
  rpcMethod: 'opensensemap.sensors',
  description: 'Read latest openSenseMap sensor measurements for one senseBox.',
  category: 'weather',
  options: [
    { name: 'boxId', flag: '--box-id <id>', description: `senseBox id, default ${OPENSENSEMAP_DEFAULT_BOX_ID}`, exposure: 'primary', group: 'query', reason: 'The latest-measurements route is keyed by senseBox id returned by the boxes search.', defaultValue: OPENSENSEMAP_DEFAULT_BOX_ID },
    { name: 'count', flag: '--count <count>', description: `Measurements per sensor, default/cap ${OPENSENSEMAP_SENSORS_DEFAULT_COUNT}`, exposure: 'primary', group: 'pagination', reason: 'Docs allow 1-100 latest measurements per sensor; defaulting to 100 maximizes one request while the renderer still summarizes.', valueType: 'integer', defaultValue: String(OPENSENSEMAP_SENSORS_DEFAULT_COUNT) },
  ],
  paramsSchema: sensorsParamsSchema,
  execute: params => getOpenSenseMapSensors(params),
  normalizeParams: params => sensorsParamsSchema.parse(params),
  createCacheKeyParams: params => normalizeOpenSenseMapSensorsInput(params),
  resultKind: 'opensensemap.sensors',
  defaultFormat: 'text',
}

export const openSenseMapProvider: PublicApiProviderModule = {
  manifest: {
    id: 'opensensemap',
    name: 'openSenseMap',
    description: 'Open environmental sensor data from senseBoxes.',
    publicApisCategory: 'Weather',
    homepageUrl: 'https://opensensemap.org/',
    docsUrl: 'https://docs.opensensemap.org/',
    auth: { mode: 'none', notes: ['Selected GET routes are explicitly listed as requiring no authentication by the API root route listing.'] },
    tags: ['weather', 'iot', 'sensors', 'environment', 'open-data', 'no-auth'],
    freePlanNotes: [
      'Only documented read-only GET routes are implemented; JWT user routes and mutating measurement submission routes are intentionally excluded.',
      `Boxes use docs default ${OPENSENSEMAP_BOXES_DEFAULT_LIMIT} with CLI cap ${OPENSENSEMAP_BOXES_MAX_LIMIT}.`,
      `Sensors default/cap ${OPENSENSEMAP_SENSORS_MAX_COUNT} follows the documented count range.`,
    ],
  },
  operations: [statsOperation, boxesOperation, sensorsOperation],
  endpoints: [
    { id: 'opensensemap-stats', method: 'GET', urlPattern: 'https://api.opensensemap.org/stats*', category: 'public-api:weather', evidenceStatus: 'confirmed', observedOn: '2026-05-05', sampleSources: ['https://api.opensensemap.org/', 'https://docs.opensensemap.org/#api-Misc-getStatistics'], consumedBy: ['opensensemap.stats'], description: 'openSenseMap database statistics route.', notes: ['No API key/OAuth required.'] },
    { id: 'opensensemap-boxes', method: 'GET', urlPattern: 'https://api.opensensemap.org/boxes*', category: 'public-api:weather', evidenceStatus: 'confirmed', observedOn: '2026-05-05', sampleSources: ['https://api.opensensemap.org/', 'https://docs.opensensemap.org/#api-Boxes-getBoxes'], consumedBy: ['opensensemap.boxes'], description: 'openSenseMap senseBox discovery route.', notes: ['No API key/OAuth required.', 'Docs publish limit default 5 but no maximum.'] },
    { id: 'opensensemap-box-sensors', method: 'GET', urlPattern: 'https://api.opensensemap.org/boxes/*/sensors*', category: 'public-api:weather', evidenceStatus: 'confirmed', observedOn: '2026-05-05', sampleSources: ['https://api.opensensemap.org/', 'https://docs.opensensemap.org/#api-Measurements-getLatestMeasurements'], consumedBy: ['opensensemap.sensors'], description: 'openSenseMap latest measurements for all sensors on one senseBox.', notes: ['No API key/OAuth required.', 'Docs allow count 1-100.'] },
  ],
}

export type { OpenSenseMapBoxesResult, OpenSenseMapSensorsResult, OpenSenseMapStatsResult }
