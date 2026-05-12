import { z } from 'zod'
import { listLaMetroRoutes, listLaMetroStops, type LaMetroRoutesResult, type LaMetroStopsResult } from '../../application/usecases/laMetro.js'
import {
  LA_METRO_DEFAULT_AGENCY,
  LA_METRO_DEFAULT_DAY_TYPE,
  LA_METRO_DEFAULT_ROUTE_CODE,
  LA_METRO_MAX_LIMIT,
  LA_METRO_ROUTES_DEFAULT_LIMIT,
  LA_METRO_STOPS_DEFAULT_LIMIT,
  normalizeLaMetroRoutesInput,
  normalizeLaMetroStopsInput,
  type LaMetroRoutesInput,
  type LaMetroStopsInput,
} from '../../infrastructure/openApis/laMetroClient.js'
import type { PublicApiOperationDefinition, PublicApiProviderModule } from '../providerTypes.js'

const routesParamsSchema = z.object({
  agency: z.string().min(1).optional(),
  query: z.string().min(1).optional(),
  routeType: z.string().min(1).optional(),
  active: z.coerce.boolean().optional(),
  limit: z.coerce.number().int().optional(),
}) satisfies z.ZodType<LaMetroRoutesInput>

const stopsParamsSchema = z.object({
  agency: z.string().min(1).optional(),
  routeCode: z.string().min(1).optional(),
  dayType: z.string().min(1).optional(),
  directionId: z.coerce.number().int().optional(),
  limit: z.coerce.number().int().optional(),
}) satisfies z.ZodType<LaMetroStopsInput>

const routesOperation: PublicApiOperationDefinition<LaMetroRoutesInput> = {
  id: 'lametro.routes',
  providerId: 'lametro',
  name: 'Routes',
  commandPath: ['lametro', 'routes'],
  rpcMethod: 'lametro.routes',
  description: 'List LA Metro route overview rows with local search filters.',
  category: 'transportation',
  options: [
    { name: 'agency', flag: '--agency <LACMTA|LACMTA_Rail>', description: `Agency id, default ${LA_METRO_DEFAULT_AGENCY}`, exposure: 'advanced', group: 'filters', reason: 'Most users want LACMTA bus routes; rail remains available for focused exploration.', defaultValue: LA_METRO_DEFAULT_AGENCY },
    { name: 'query', flag: '--query <text>', description: 'Search route code, terminals, description, or arterials', exposure: 'primary', group: 'query', reason: 'Text search is the most useful way to narrow a large all-routes response.' },
    { name: 'routeType', flag: '--route-type <type>', description: 'Filter route_type such as bus, rail, or busway', exposure: 'primary', group: 'filters', reason: 'Route type is a high-signal LA Metro planning filter.' },
    { name: 'active', flag: '--active <true|false>', description: 'Filter active/inactive routes', exposure: 'advanced', group: 'filters', reason: 'Active status is useful for data quality checks but not required for common browsing.', valueType: 'boolean' },
    { name: 'limit', flag: '--limit <count>', description: `Routes to return, 1-${LA_METRO_MAX_LIMIT}; default ${LA_METRO_ROUTES_DEFAULT_LIMIT}`, exposure: 'primary', group: 'pagination', reason: 'Bounds terminal output after local filtering.', valueType: 'integer', defaultValue: String(LA_METRO_ROUTES_DEFAULT_LIMIT) },
  ],
  paramsSchema: routesParamsSchema,
  execute: params => listLaMetroRoutes(params),
  normalizeParams: params => routesParamsSchema.parse(params),
  createCacheKeyParams: params => normalizeLaMetroRoutesInput(params),
  resultKind: 'lametro.routes',
  defaultFormat: 'text',
}

const stopsOperation: PublicApiOperationDefinition<LaMetroStopsInput> = {
  id: 'lametro.stops',
  providerId: 'lametro',
  name: 'Stops',
  commandPath: ['lametro', 'stops'],
  rpcMethod: 'lametro.stops',
  description: 'List scheduled LA Metro stops for a route and day type.',
  category: 'transportation',
  options: [
    { name: 'routeCode', flag: '--route-code <code>', description: `Route code, default ${LA_METRO_DEFAULT_ROUTE_CODE}`, exposure: 'primary', group: 'query', reason: 'Route code is required by the documented route_stops endpoint.', defaultValue: LA_METRO_DEFAULT_ROUTE_CODE },
    { name: 'dayType', flag: '--day-type <all|weekday|saturday|sunday>', description: `Schedule day type, default ${LA_METRO_DEFAULT_DAY_TYPE}`, exposure: 'primary', group: 'filters', reason: 'Day type is the documented schedule dimension users need most.', defaultValue: LA_METRO_DEFAULT_DAY_TYPE },
    { name: 'directionId', flag: '--direction-id <0|1>', description: 'Optional route direction id filter', exposure: 'advanced', group: 'filters', reason: 'Direction filtering is helpful after a route is selected but too specific for first-run browsing.', valueType: 'integer' },
    { name: 'agency', flag: '--agency <LACMTA|LACMTA_Rail>', description: `Agency id, default ${LA_METRO_DEFAULT_AGENCY}`, exposure: 'advanced', group: 'filters', reason: 'Most route stop lookups use LACMTA; rail remains available for focused exploration.', defaultValue: LA_METRO_DEFAULT_AGENCY },
    { name: 'limit', flag: '--limit <count>', description: `Stops to return, 1-${LA_METRO_MAX_LIMIT}; default ${LA_METRO_STOPS_DEFAULT_LIMIT}`, exposure: 'primary', group: 'pagination', reason: 'Bounds terminal output while preserving enough stops for route inspection.', valueType: 'integer', defaultValue: String(LA_METRO_STOPS_DEFAULT_LIMIT) },
  ],
  paramsSchema: stopsParamsSchema,
  execute: params => listLaMetroStops(params),
  normalizeParams: params => stopsParamsSchema.parse(params),
  createCacheKeyParams: params => normalizeLaMetroStopsInput(params),
  resultKind: 'lametro.stops',
  defaultFormat: 'text',
}

export const laMetroProvider: PublicApiProviderModule = {
  manifest: {
    id: 'lametro',
    name: 'LA Metro',
    description: 'No-auth LA Metro JSON API for route overview and scheduled route stops.',
    publicApisCategory: 'Transportation',
    homepageUrl: 'https://developer.metro.net/api/',
    docsUrl: 'https://api.metro.net/',
    auth: { mode: 'none', notes: ['Selected route_overview and route_stops endpoints return JSON without API keys, OAuth, cookies, browser sessions, or account preparation.'] },
    tags: ['transportation', 'los-angeles', 'transit', 'gtfs', 'no-auth'],
    freePlanNotes: ['No public quota was found in the OpenAPI page; persistence/offline replay is recommended for repeated route browsing.'],
  },
  operations: [routesOperation, stopsOperation],
  endpoints: [
    { id: 'lametro-route-overview', method: 'GET', urlPattern: 'https://api.metro.net/{agency_id}/route_overview', category: 'public-api:transportation', evidenceStatus: 'confirmed', observedOn: '2026-05-04', sampleSources: ['https://api.metro.net/'], consumedBy: ['lametro.routes'], description: 'LA Metro route overview endpoint.', notes: ['No authentication required for selected static route data.'] },
    { id: 'lametro-route-stops', method: 'GET', urlPattern: 'https://api.metro.net/{agency_id}/route_stops/{route_code}?daytype={daytype}', category: 'public-api:transportation', evidenceStatus: 'confirmed', observedOn: '2026-05-04', sampleSources: ['https://api.metro.net/'], consumedBy: ['lametro.stops'], description: 'LA Metro scheduled route stops endpoint.', notes: ['No authentication required for selected static schedule stop data.'] },
  ],
}

export type { LaMetroRoutesResult, LaMetroStopsResult }
