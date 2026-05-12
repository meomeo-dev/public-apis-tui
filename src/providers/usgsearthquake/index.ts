import { z } from 'zod'
import {
  getUsgsEarthquakeEvent,
  normalizeUsgsEarthquakeEventInput,
  normalizeUsgsEarthquakeSearchInput,
  searchUsgsEarthquakes,
  type UsgsEarthquakeEventInput,
  type UsgsEarthquakeSearchInput,
} from '../../application/usecases/usgsEarthquake.js'
import {
  USGS_EARTHQUAKE_APPLICATION_URL,
  USGS_EARTHQUAKE_BASE_URL,
  USGS_EARTHQUAKE_DEFAULT_EVENT_ID,
  USGS_EARTHQUAKE_DEFAULT_LIMIT,
  USGS_EARTHQUAKE_DEFAULT_MIN_MAGNITUDE,
  USGS_EARTHQUAKE_DEFAULT_OFFSET,
  USGS_EARTHQUAKE_DEFAULT_ORDER_BY,
  USGS_EARTHQUAKE_DOCS_URL,
  USGS_EARTHQUAKE_MAX_LIMIT,
  USGS_EARTHQUAKE_ORDER_BY,
} from '../../infrastructure/openApis/usgsEarthquakeClient.js'
import type {
  PublicApiOperationDefinition,
  PublicApiProviderModule,
} from '../providerTypes.js'

const searchParamsSchema = z.object({
  minMagnitude: z.coerce.number().optional(),
  limit: z.coerce.number().int().optional(),
  offset: z.coerce.number().int().optional(),
  orderBy: z.string().optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
}) satisfies z.ZodType<UsgsEarthquakeSearchInput>

const eventParamsSchema = z.object({
  eventId: z.string().optional(),
}) satisfies z.ZodType<UsgsEarthquakeEventInput>

const searchOperation: PublicApiOperationDefinition<UsgsEarthquakeSearchInput> = {
  id: 'usgsearthquake.search',
  providerId: 'usgsearthquake',
  name: 'Earthquake search',
  commandPath: ['usgsearthquake', 'search'],
  rpcMethod: 'usgsearthquake.search',
  description: 'Search recent USGS earthquake events as bounded GeoJSON.',
  category: 'science',
  options: [
    {
      name: 'minMagnitude',
      flag: '--min-magnitude <number>',
      description: [
        `Minimum magnitude, default ${USGS_EARTHQUAKE_DEFAULT_MIN_MAGNITUDE}.`,
      ].join(' '),
      exposure: 'primary',
      group: 'filters',
      reason: 'Maps to documented minmagnitude and keeps output relevant.',
      valueType: 'string',
      defaultValue: String(USGS_EARTHQUAKE_DEFAULT_MIN_MAGNITUDE),
    },
    {
      name: 'limit',
      flag: '--limit <count>',
      description: [
        `Events to return, default ${USGS_EARTHQUAKE_DEFAULT_LIMIT},`,
        `cap ${USGS_EARTHQUAKE_MAX_LIMIT}.`,
      ].join(' '),
      exposure: 'primary',
      group: 'pagination',
      reason: 'Maps to documented limit with a tighter terminal cap.',
      valueType: 'integer',
      defaultValue: String(USGS_EARTHQUAKE_DEFAULT_LIMIT),
    },
    {
      name: 'offset',
      flag: '--offset <count>',
      description: [
        `One-based result offset, default`,
        `${USGS_EARTHQUAKE_DEFAULT_OFFSET}.`,
      ].join(' '),
      exposure: 'advanced',
      group: 'pagination',
      reason: 'Maps to documented offset while bounding catalog traversal.',
      valueType: 'integer',
      defaultValue: String(USGS_EARTHQUAKE_DEFAULT_OFFSET),
    },
    {
      name: 'orderBy',
      flag: '--order-by <time|time-asc|magnitude|magnitude-asc>',
      description: [
        `Ordering, default ${USGS_EARTHQUAKE_DEFAULT_ORDER_BY}; one of`,
        USGS_EARTHQUAKE_ORDER_BY.join(', '),
      ].join(' '),
      exposure: 'primary',
      group: 'presentation',
      reason: 'Maps to documented orderby values useful for terminal scanning.',
      defaultValue: USGS_EARTHQUAKE_DEFAULT_ORDER_BY,
    },
    {
      name: 'startTime',
      flag: '--start-time <YYYY-MM-DD>',
      description: 'Optional inclusive start date.',
      exposure: 'advanced',
      group: 'filters',
      reason: 'Maps to documented starttime date filter.',
    },
    {
      name: 'endTime',
      flag: '--end-time <YYYY-MM-DD>',
      description: 'Optional inclusive end date.',
      exposure: 'advanced',
      group: 'filters',
      reason: 'Maps to documented endtime date filter.',
    },
  ],
  paramsSchema: searchParamsSchema,
  execute: params => searchUsgsEarthquakes(params),
  normalizeParams: params => searchParamsSchema.parse(params),
  createCacheKeyParams: params => normalizeUsgsEarthquakeSearchInput(params),
  resultKind: 'usgsearthquake.search',
  defaultFormat: 'text',
}

const eventOperation: PublicApiOperationDefinition<UsgsEarthquakeEventInput> = {
  id: 'usgsearthquake.event',
  providerId: 'usgsearthquake',
  name: 'Earthquake event',
  commandPath: ['usgsearthquake', 'event'],
  rpcMethod: 'usgsearthquake.event',
  description: 'Show one USGS earthquake event by event id.',
  category: 'science',
  options: [
    {
      name: 'eventId',
      flag: '--event-id <id>',
      description: `USGS event id, default ${USGS_EARTHQUAKE_DEFAULT_EVENT_ID}.`,
      exposure: 'primary',
      group: 'query',
      reason: 'Maps to documented eventid query parameter.',
      defaultValue: USGS_EARTHQUAKE_DEFAULT_EVENT_ID,
    },
  ],
  paramsSchema: eventParamsSchema,
  execute: params => getUsgsEarthquakeEvent(params),
  normalizeParams: params => eventParamsSchema.parse(params),
  createCacheKeyParams: params => normalizeUsgsEarthquakeEventInput(params),
  resultKind: 'usgsearthquake.event',
  defaultFormat: 'text',
}

export const usgsEarthquakeProvider: PublicApiProviderModule = {
  manifest: {
    id: 'usgsearthquake',
    name: 'USGS Earthquake Hazards Program',
    description: [
      'No-auth HTTPS GeoJSON access to USGS FDSN earthquake event search',
      'and event detail records.',
    ].join(' '),
    publicApisCategory: 'Science & Math',
    homepageUrl: USGS_EARTHQUAKE_DOCS_URL,
    docsUrl: USGS_EARTHQUAKE_DOCS_URL,
    auth: {
      mode: 'none',
      notes: [
        [
          'Official docs and live probes confirmed selected FDSN event JSON',
          'routes return data without API key, OAuth, cookies, account setup,',
          'or browser session requirements.',
        ].join(' '),
      ],
    },
    tags: [
      'science',
      'earthquake',
      'usgs',
      'hazards',
      'geojson',
      'fdsn',
      'no-auth',
    ],
    freePlanNotes: [
      'Docs recommend real-time GeoJSON feeds for display workloads.',
      [
        'CLI uses bounded query requests and does not mirror real-time feeds',
        'or expose product attachment downloads.',
      ].join(' '),
      [
        'Near-real-time earthquake data can be revised; validate emergency',
        'or operational decisions against official USGS products.',
      ].join(' '),
    ],
  },
  operations: [searchOperation, eventOperation],
  endpoints: [
    {
      id: 'usgsearthquake-query',
      method: 'GET',
      urlPattern: 'https://earthquake.usgs.gov/fdsnws/event/1/query?*',
      category: 'public-apis:science',
      evidenceStatus: 'confirmed',
      observedOn: '2026-05-11',
      description: 'USGS FDSN Event query endpoint returning GeoJSON.',
      siteIds: ['public-apis-tui'],
      sampleSources: [
        USGS_EARTHQUAKE_DOCS_URL,
        USGS_EARTHQUAKE_APPLICATION_URL,
        [
          `${USGS_EARTHQUAKE_BASE_URL}/query?format=geojson`,
          '&limit=2&orderby=time&minmagnitude=4.5',
        ].join(''),
      ],
      consumedBy: ['usgsearthquake.search', 'usgsearthquake.event'],
      notes: [
        'No authentication required.',
        [
          'CLI forces format=geojson and eventtype=earthquake for search,',
          'projects event metadata only, and excludes product downloads.',
        ].join(' '),
      ],
    },
    {
      id: 'usgsearthquake-application-json',
      method: 'GET',
      urlPattern: USGS_EARTHQUAKE_APPLICATION_URL,
      category: 'public-apis:science',
      evidenceStatus: 'confirmed',
      observedOn: '2026-05-11',
      description: 'USGS FDSN Event application metadata JSON.',
      siteIds: ['public-apis-tui'],
      sampleSources: [USGS_EARTHQUAKE_DOCS_URL, USGS_EARTHQUAKE_APPLICATION_URL],
      consumedBy: ['provider metadata only'],
      notes: [
        'No authentication required.',
        'Used as documentation evidence, not exposed as an arbitrary proxy.',
      ],
    },
  ],
}

export type {
  UsgsEarthquakeEventInput,
  UsgsEarthquakeSearchInput,
} from '../../application/usecases/usgsEarthquake.js'
