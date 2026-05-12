import { z } from 'zod'
import { getRainViewerMaps, type RainViewerMapsResult } from '../../application/usecases/rainViewer.js'
import {
  normalizeRainViewerMapsInput,
  RAINVIEWER_DEFAULT_COLOR,
  RAINVIEWER_DEFAULT_LATITUDE,
  RAINVIEWER_DEFAULT_LIMIT,
  RAINVIEWER_DEFAULT_LONGITUDE,
  RAINVIEWER_DEFAULT_SIZE,
  RAINVIEWER_DEFAULT_ZOOM,
  RAINVIEWER_MAX_LIMIT,
  type RainViewerMapsInput,
} from '../../infrastructure/openApis/rainViewerClient.js'
import type { PublicApiOperationDefinition, PublicApiProviderModule } from '../providerTypes.js'

const mapsParamsSchema = z.object({
  limit: z.coerce.number().int().optional(),
  size: z.coerce.number().int().optional(),
  zoom: z.coerce.number().int().optional(),
  latitude: z.coerce.number().optional(),
  longitude: z.coerce.number().optional(),
  color: z.coerce.number().int().optional(),
  smooth: z.boolean().optional(),
  snow: z.boolean().optional(),
}) satisfies z.ZodType<RainViewerMapsInput>

const mapsOperation: PublicApiOperationDefinition<RainViewerMapsInput> = {
  id: 'rainviewer.maps',
  providerId: 'rainviewer',
  name: 'Weather Maps',
  commandPath: ['rainviewer', 'maps'],
  rpcMethod: 'rainviewer.maps',
  description: 'Read RainViewer radar frame metadata and sample tile URLs.',
  category: 'weather',
  options: [
    { name: 'limit', flag: '--limit <count>', description: `Radar frames to show, default/cap ${RAINVIEWER_DEFAULT_LIMIT}`, exposure: 'primary', group: 'pagination', reason: 'Docs describe past 2 hours at 10-minute intervals; cap 13 covers the full observed radar frame list.', valueType: 'integer', defaultValue: String(RAINVIEWER_DEFAULT_LIMIT) },
    { name: 'size', flag: '--size <256|512>', description: `Tile size for sample URLs, default ${RAINVIEWER_DEFAULT_SIZE}`, exposure: 'advanced', group: 'presentation', reason: 'Tile size changes generated URLs but the CLI does not fetch images by default.', valueType: 'integer', defaultValue: String(RAINVIEWER_DEFAULT_SIZE) },
    { name: 'zoom', flag: '--zoom <0-7>', description: `Zoom for sample coordinate tile URLs, default ${RAINVIEWER_DEFAULT_ZOOM}`, exposure: 'advanced', group: 'presentation', reason: 'Zoom is needed only when generating a sample tile URL for a coordinate.', valueType: 'integer', defaultValue: String(RAINVIEWER_DEFAULT_ZOOM) },
    { name: 'latitude', flag: '--latitude <number>', description: `Latitude for sample tile URLs, default ${RAINVIEWER_DEFAULT_LATITUDE}`, exposure: 'advanced', group: 'query', reason: 'Latitude is local presentation input for sample tile URLs, not an API query parameter.', valueType: 'string', defaultValue: String(RAINVIEWER_DEFAULT_LATITUDE) },
    { name: 'longitude', flag: '--longitude <number>', description: `Longitude for sample tile URLs, default ${RAINVIEWER_DEFAULT_LONGITUDE}`, exposure: 'advanced', group: 'query', reason: 'Longitude is local presentation input for sample tile URLs, not an API query parameter.', valueType: 'string', defaultValue: String(RAINVIEWER_DEFAULT_LONGITUDE) },
    { name: 'color', flag: '--color <0-8>', description: `RainViewer color scheme for sample tile URLs, default ${RAINVIEWER_DEFAULT_COLOR}`, exposure: 'advanced', group: 'presentation', reason: 'Color scheme affects generated image URLs only.', valueType: 'integer', defaultValue: String(RAINVIEWER_DEFAULT_COLOR) },
    { name: 'smooth', flag: '--smooth <true|false>', description: 'Enable smooth sample tile URLs, default true', exposure: 'advanced', group: 'presentation', reason: 'Smoothing affects generated image URLs only.', valueType: 'boolean', defaultValue: 'true' },
    { name: 'snow', flag: '--snow <true|false>', description: 'Show snow in sample tile URLs, default false', exposure: 'advanced', group: 'presentation', reason: 'Snow overlay affects generated image URLs only.', valueType: 'boolean', defaultValue: 'false' },
  ],
  paramsSchema: mapsParamsSchema,
  execute: params => getRainViewerMaps(params),
  normalizeParams: params => mapsParamsSchema.parse(params),
  createCacheKeyParams: params => normalizeRainViewerMapsInput(params),
  resultKind: 'rainviewer.maps',
  defaultFormat: 'text',
}

export const rainViewerProvider: PublicApiProviderModule = {
  manifest: {
    id: 'rainviewer',
    name: 'RainViewer',
    description: 'RainViewer radar weather map frame metadata and tile URL templates.',
    publicApisCategory: 'Weather',
    homepageUrl: 'https://www.rainviewer.com/api.html',
    docsUrl: 'https://www.rainviewer.com/api/weather-maps-api.html',
    auth: { mode: 'none', notes: ['weather-maps.json requires no API key, OAuth, cookies, account setup, or browser session.'] },
    tags: ['weather', 'radar', 'maps', 'tiles', 'no-auth'],
    freePlanNotes: [
      'Docs describe free usage for personal or educational use; commercial use should contact RainViewer.',
      'CLI fetches only JSON metadata and returns tile URL templates; it does not fetch PNG tile images by default.',
      `Frame default/cap ${RAINVIEWER_MAX_LIMIT} covers the observed full past radar frame list.`,
    ],
  },
  operations: [mapsOperation],
  endpoints: [
    { id: 'rainviewer-weather-maps', method: 'GET', urlPattern: 'https://api.rainviewer.com/public/weather-maps.json', category: 'public-api:weather', evidenceStatus: 'confirmed', observedOn: '2026-05-05', sampleSources: ['https://www.rainviewer.com/api/weather-maps-api.html', 'https://api.rainviewer.com/public/weather-maps.json'], consumedBy: ['rainviewer.maps'], description: 'RainViewer JSON metadata feed for radar and satellite weather map frames.', notes: ['No API key/OAuth required.', 'Returns tile host/path metadata; PNG tiles are not fetched by the CLI by default.'] },
  ],
}

export type { RainViewerMapsResult }
