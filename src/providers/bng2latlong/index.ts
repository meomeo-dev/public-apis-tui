import { z } from 'zod'
import { convertBng2LatLong, type Bng2LatLongInput } from '../../application/usecases/bng2LatLong.js'
import {
  BNG2LATLONG_DEFAULT_EASTING,
  BNG2LATLONG_DEFAULT_NORTHING,
  BNG2LATLONG_MAX_EASTING,
  BNG2LATLONG_MAX_NORTHING,
  normalizeBng2LatLongInput,
} from '../../infrastructure/openApis/bng2LatLongClient.js'
import type { PublicApiOperationDefinition, PublicApiProviderModule } from '../providerTypes.js'

const convertParamsSchema = z.object({
  easting: z.coerce.number().int().optional(),
  northing: z.coerce.number().int().optional(),
}) satisfies z.ZodType<Bng2LatLongInput>

const convertOperation: PublicApiOperationDefinition<Bng2LatLongInput> = {
  id: 'bng2latlong.convert',
  providerId: 'bng2latlong',
  name: 'Convert BNG to WGS84',
  commandPath: ['bng2latlong', 'convert'],
  rpcMethod: 'bng2latlong.convert',
  description: 'Convert British National Grid OSGB36 eastings/northings to WGS84 latitude/longitude.',
  category: 'geocoding',
  options: [
    {
      name: 'easting',
      flag: '--easting <integer>',
      description: `British National Grid easting, default ${String(BNG2LATLONG_DEFAULT_EASTING)}`,
      exposure: 'primary',
      group: 'query',
      reason: 'The documented endpoint requires the OSGB36 easting path segment.',
      valueType: 'integer',
      defaultValue: String(BNG2LATLONG_DEFAULT_EASTING),
    },
    {
      name: 'northing',
      flag: '--northing <integer>',
      description: `British National Grid northing, default ${String(BNG2LATLONG_DEFAULT_NORTHING)}`,
      exposure: 'primary',
      group: 'query',
      reason: 'The documented endpoint requires the OSGB36 northing path segment.',
      valueType: 'integer',
      defaultValue: String(BNG2LATLONG_DEFAULT_NORTHING),
    },
  ],
  paramsSchema: convertParamsSchema,
  execute: params => convertBng2LatLong(params),
  normalizeParams: params => convertParamsSchema.parse(params),
  createCacheKeyParams: params => normalizeBng2LatLongInput(params),
  resultKind: 'bng2latlong.convert',
  defaultFormat: 'text',
}

export const bng2LatLongProvider: PublicApiProviderModule = {
  manifest: {
    id: 'bng2latlong',
    name: 'bng2latlong',
    description: 'No-auth JSON coordinate conversion from British National Grid eastings/northings to WGS84 latitude/longitude.',
    publicApisCategory: 'Geocoding',
    homepageUrl: 'https://www.getthedata.com/bng2latlong',
    docsUrl: 'https://www.getthedata.com/bng2latlong',
    auth: {
      mode: 'none',
      notes: ['The implemented api.getthedata.com endpoint returns JSON without API keys, OAuth, cookies, browser sessions, or account setup.'],
    },
    tags: ['geocoding', 'british-national-grid', 'osgb36', 'wgs84', 'coordinate-conversion', 'json', 'no-auth'],
    freePlanNotes: [
      'The public HTML documentation page may return a Cloudflare challenge to CLI clients; the JSON API host is reachable directly.',
      'The CLI consumes only the JSON format and does not expose XML or invalid format variants.',
      `Eastings are validated from 1 to ${String(BNG2LATLONG_MAX_EASTING)} and northings from 1 to ${String(BNG2LATLONG_MAX_NORTHING)} before network calls.`,
    ],
  },
  operations: [convertOperation],
  endpoints: [
    {
      id: 'bng2latlong-convert-json',
      method: 'GET',
      urlPattern: 'https://api.getthedata.com/bng2latlong/{easting}/{northing}/json',
      category: 'public-apis:geocoding',
      evidenceStatus: 'confirmed',
      description: 'bng2latlong JSON endpoint converting British National Grid OSGB36 coordinates to WGS84 latitude/longitude.',
      siteIds: ['public-apis-tui'],
      observedOn: '2026-05-08',
      sampleSources: ['https://www.getthedata.com/bng2latlong', 'https://api.getthedata.com/bng2latlong/319421/174588/json'],
      consumedBy: ['public-apis apis run bng2latlong.convert'],
      notes: ['No authentication required.', 'Returns application/json with status, easting, northing, latitude, and longitude.', 'XML format exists but is intentionally not consumed by this JSON-only provider.'],
    },
  ],
}

export type { Bng2LatLongInput } from '../../application/usecases/bng2LatLong.js'
