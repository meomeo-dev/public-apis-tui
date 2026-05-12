import { z } from 'zod'
import { listVelibStations, type VelibStationsResult } from '../../application/usecases/velib.js'
import {
  VELIB_DEFAULT_LIMIT,
  VELIB_DEFAULT_SORT,
  VELIB_MAX_LIMIT,
  normalizeVelibStationsInput,
  type VelibStationsInput,
} from '../../infrastructure/openApis/velibClient.js'
import type { PublicApiOperationDefinition, PublicApiProviderModule } from '../providerTypes.js'

const stationsParamsSchema = z.object({
  query: z.string().min(1).optional(),
  stationCode: z.string().min(1).optional(),
  minBikes: z.coerce.number().int().optional(),
  minDocks: z.coerce.number().int().optional(),
  renting: z.boolean().optional(),
  returning: z.boolean().optional(),
  sort: z.string().min(1).optional(),
  limit: z.coerce.number().int().optional(),
}) satisfies z.ZodType<VelibStationsInput>

const stationsOperation: PublicApiOperationDefinition<VelibStationsInput> = {
  id: 'velib.stations',
  providerId: 'velib',
  name: 'Stations',
  commandPath: ['velib', 'stations'],
  rpcMethod: 'velib.stations',
  description: 'Explore Velib Metropole GBFS station availability snapshots.',
  category: 'transportation',
  options: [
    { name: 'query', flag: '--query <text>', description: 'Search station name, code, or id', exposure: 'primary', group: 'query', reason: 'Text search is the fastest way to find stations in a large GBFS snapshot.' },
    { name: 'stationCode', flag: '--station-code <code>', description: 'Filter one Velib station code', exposure: 'primary', group: 'query', reason: 'Station code is the compact identifier shown in the official feed.', valueLabel: 'code' },
    { name: 'minBikes', flag: '--min-bikes <count>', description: 'Only show stations with at least this many bikes', exposure: 'primary', group: 'filters', reason: 'Bike availability is the most useful live operations filter.', valueType: 'integer' },
    { name: 'minDocks', flag: '--min-docks <count>', description: 'Only show stations with at least this many empty docks', exposure: 'primary', group: 'filters', reason: 'Dock availability is useful for trip planning and operations monitoring.', valueType: 'integer' },
    { name: 'renting', flag: '--renting <true|false>', description: 'Filter stations that currently allow rentals', exposure: 'advanced', group: 'filters', reason: 'Rental state is a focused operational filter after station discovery.', valueType: 'boolean' },
    { name: 'returning', flag: '--returning <true|false>', description: 'Filter stations that currently allow returns', exposure: 'advanced', group: 'filters', reason: 'Return state helps destination planning but is less common than bikes/docks.', valueType: 'boolean' },
    { name: 'sort', flag: '--sort <bikes|docks|capacity|updated|name>', description: `Sort stations, default ${VELIB_DEFAULT_SORT}`, exposure: 'primary', group: 'presentation', reason: 'Sorting turns full GBFS snapshots into useful terminal-ranked views.', defaultValue: VELIB_DEFAULT_SORT },
    { name: 'limit', flag: '--limit <count>', description: `Stations to show, default ${VELIB_DEFAULT_LIMIT}, cap ${VELIB_MAX_LIMIT}`, exposure: 'primary', group: 'pagination', reason: 'Bounds terminal output after local GBFS filtering.', valueType: 'integer', defaultValue: String(VELIB_DEFAULT_LIMIT) },
  ],
  paramsSchema: stationsParamsSchema,
  execute: params => listVelibStations(params),
  normalizeParams: params => stationsParamsSchema.parse(params),
  createCacheKeyParams: params => normalizeVelibStationsInput(params),
  resultKind: 'velib.stations',
  defaultFormat: 'text',
}

export const velibProvider: PublicApiProviderModule = {
  manifest: {
    id: 'velib',
    name: 'Velib Metropole',
    description: 'Paris Velib Metropole GBFS station information and live availability snapshots.',
    publicApisCategory: 'Transportation',
    homepageUrl: 'https://www.velib-metropole.fr/',
    docsUrl: 'https://www.velib-metropole.fr/donnees-open-data-gbfs-du-service-velib-metropole',
    auth: { mode: 'none', notes: ['GBFS JSON feeds are open data and require no API key, OAuth, cookies, or browser session.'] },
    tags: ['transportation', 'bike-share', 'paris', 'gbfs', 'no-auth'],
    freePlanNotes: ['Feeds are full snapshots with TTL metadata; use --persist and --offline to avoid repeated live fetches.'],
  },
  operations: [stationsOperation],
  endpoints: [
    { id: 'velib-gbfs-station-information', method: 'GET', urlPattern: 'https://velib-metropole-opendata.smovengo.cloud/opendata/Velib_Metropole/station_information.json', category: 'public-api:transportation', evidenceStatus: 'confirmed', observedOn: '2026-05-05', sampleSources: ['https://www.velib-metropole.fr/donnees-open-data-gbfs-du-service-velib-metropole'], consumedBy: ['velib.stations'], description: 'Velib Metropole GBFS station_information feed.', notes: ['No API key/OAuth required.', 'Feed returns a full station snapshot with TTL metadata.'] },
    { id: 'velib-gbfs-station-status', method: 'GET', urlPattern: 'https://velib-metropole-opendata.smovengo.cloud/opendata/Velib_Metropole/station_status.json', category: 'public-api:transportation', evidenceStatus: 'confirmed', observedOn: '2026-05-05', sampleSources: ['https://www.velib-metropole.fr/donnees-open-data-gbfs-du-service-velib-metropole'], consumedBy: ['velib.stations'], description: 'Velib Metropole GBFS station_status feed.', notes: ['No API key/OAuth required.', 'Feed returns bike/dock availability for the full station snapshot.'] },
  ],
}

export type { VelibStationsResult }
