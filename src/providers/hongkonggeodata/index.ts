import { z } from 'zod'
import {
  HONG_KONG_GEODATA_DEFAULT_LIMIT,
  HONG_KONG_GEODATA_DEFAULT_QUERY,
  HONG_KONG_GEODATA_MAX_LIMIT,
  searchHongKongGeoDataLocations,
  type HongKongGeoDataSearchInput,
} from '../../application/usecases/hongKongGeoData.js'
import { normalizeHongKongGeoDataSearchInput } from '../../infrastructure/openApis/hongKongGeoDataClient.js'
import type { PublicApiOperationDefinition, PublicApiProviderModule } from '../providerTypes.js'

const locationSearchParamsSchema = z.object({
  query: z.string().optional(),
  limit: z.coerce.number().optional(),
}) satisfies z.ZodType<HongKongGeoDataSearchInput>

const locationSearchOperation: PublicApiOperationDefinition<HongKongGeoDataSearchInput> = {
  id: 'hongkonggeodata.locationSearch',
  providerId: 'hongkonggeodata',
  name: 'Location search',
  commandPath: ['hongkonggeodata', 'location-search'],
  rpcMethod: 'hongkonggeodata.locationSearch',
  description: 'Search Hong Kong locations by address, building, place, or facility name using the CSDI Location Search API.',
  category: 'geocoding',
  options: [
    {
      name: 'query',
      flag: '--query <text>',
      description: `Search string, default ${HONG_KONG_GEODATA_DEFAULT_QUERY}`,
      exposure: 'primary',
      group: 'query',
      reason: 'The documented API requires a q search string for addresses, buildings, places, or facilities.',
      defaultValue: HONG_KONG_GEODATA_DEFAULT_QUERY,
    },
    {
      name: 'limit',
      flag: '--limit <count>',
      description: `Results to show, default ${String(HONG_KONG_GEODATA_DEFAULT_LIMIT)}, max ${String(HONG_KONG_GEODATA_MAX_LIMIT)}`,
      exposure: 'primary',
      group: 'pagination',
      reason: 'The upstream endpoint can return many rows; the CLI keeps terminal output and cache payloads bounded.',
      valueType: 'integer',
      defaultValue: String(HONG_KONG_GEODATA_DEFAULT_LIMIT),
    },
  ],
  paramsSchema: locationSearchParamsSchema,
  execute: params => searchHongKongGeoDataLocations(params),
  normalizeParams: params => locationSearchParamsSchema.parse(params),
  createCacheKeyParams: params => normalizeHongKongGeoDataSearchInput(params),
  resultKind: 'hongkonggeodata.locationSearch',
  defaultFormat: 'text',
}

export const hongKongGeoDataProvider: PublicApiProviderModule = {
  manifest: {
    id: 'hongkonggeodata',
    name: 'Hong Kong GeoData Store',
    description: 'Hong Kong CSDI Location Search API for public address, building, place, and facility search.',
    publicApisCategory: 'Geocoding',
    homepageUrl: 'https://geodata.gov.hk/gs/',
    docsUrl: 'https://portal.csdi.gov.hk/csdi-webpage/apidoc/LocationSearchAPI',
    auth: {
      mode: 'none',
      notes: ['Implemented endpoint returns JSON without API keys, OAuth, browser sessions, account setup, or a Chrome clickstream.'],
    },
    tags: ['geocoding', 'hong-kong', 'government', 'locations', 'addresses', 'json', 'no-auth'],
    freePlanNotes: [
      'The public-apis hostname geodata.gov.hk now returns 404 for /gs/ after the documented 2026-05-04 migration.',
      'Official CSDI docs state Location Search API moved to www.map.gov.hk and ask applications not to send large request bursts.',
      'Only the safe locationSearch q parameter is exposed; nearby/identify endpoints that can return large facility datasets are not exposed in this pass.',
    ],
  },
  operations: [locationSearchOperation],
  endpoints: [
    {
      id: 'hongkonggeodata-location-search',
      method: 'GET',
      urlPattern: 'https://www.map.gov.hk/gs/api/v1.0.0/locationSearch?q={query}',
      category: 'public-apis:geocoding',
      evidenceStatus: 'confirmed',
      description: 'CSDI Location Search API returning JSON location matches for Hong Kong addresses, buildings, places, or facilities.',
      siteIds: ['public-apis-tui'],
      observedOn: '2026-05-08',
      sampleSources: [
        'https://portal.csdi.gov.hk/csdi-webpage/apidoc/LocationSearchAPI',
        'https://www.map.gov.hk/gs/api/v1.0.0/locationSearch?q=cultural%20centre',
        'https://www.map.gov.hk/gs/api/v1.0.0/locationSearch?q=park',
      ],
      consumedBy: ['public-apis apis run hongkonggeodata.locationSearch'],
      notes: ['No authentication required.', 'Docs describe HTTP status 200, 400, and 500 responses.', 'CLI validates non-empty search text to avoid upstream empty-query HTTP 500 responses.'],
    },
  ],
}

export type { HongKongGeoDataSearchInput } from '../../application/usecases/hongKongGeoData.js'
