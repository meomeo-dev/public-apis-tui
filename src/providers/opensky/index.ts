import { z } from 'zod'
import { listOpenSkyStates, type OpenSkyStatesResult } from '../../application/usecases/openSky.js'
import {
  OPENSKY_DEFAULT_LAMAX,
  OPENSKY_DEFAULT_LAMIN,
  OPENSKY_DEFAULT_LIMIT,
  OPENSKY_DEFAULT_LOMAX,
  OPENSKY_DEFAULT_LOMIN,
  OPENSKY_MAX_LIMIT,
  normalizeOpenSkyStatesInput,
  type OpenSkyStatesInput,
} from '../../infrastructure/openApis/openSkyClient.js'
import type { PublicApiOperationDefinition, PublicApiProviderModule } from '../providerTypes.js'

const statesParamsSchema = z.object({
  lamin: z.coerce.number().optional(),
  lomin: z.coerce.number().optional(),
  lamax: z.coerce.number().optional(),
  lomax: z.coerce.number().optional(),
  icao24: z.string().min(1).optional(),
  time: z.coerce.number().int().optional(),
  extended: z.coerce.boolean().optional(),
  limit: z.coerce.number().int().optional(),
}) satisfies z.ZodType<OpenSkyStatesInput>

const statesOperation: PublicApiOperationDefinition<OpenSkyStatesInput> = {
  id: 'opensky.states',
  providerId: 'opensky',
  name: 'States',
  commandPath: ['opensky', 'states'],
  rpcMethod: 'opensky.states',
  description: 'List anonymous OpenSky state vectors inside a curated bounding box.',
  category: 'transportation',
  options: [
    { name: 'lamin', flag: '--lamin <degrees>', description: `Minimum latitude, default ${OPENSKY_DEFAULT_LAMIN}`, exposure: 'primary', group: 'filters', reason: 'Bounding boxes are the documented quota-conscious way to query anonymous OpenSky states.', defaultValue: String(OPENSKY_DEFAULT_LAMIN) },
    { name: 'lomin', flag: '--lomin <degrees>', description: `Minimum longitude, default ${OPENSKY_DEFAULT_LOMIN}`, exposure: 'primary', group: 'filters', reason: 'Bounding boxes are the documented quota-conscious way to query anonymous OpenSky states.', defaultValue: String(OPENSKY_DEFAULT_LOMIN) },
    { name: 'lamax', flag: '--lamax <degrees>', description: `Maximum latitude, default ${OPENSKY_DEFAULT_LAMAX}`, exposure: 'primary', group: 'filters', reason: 'Bounding boxes are the documented quota-conscious way to query anonymous OpenSky states.', defaultValue: String(OPENSKY_DEFAULT_LAMAX) },
    { name: 'lomax', flag: '--lomax <degrees>', description: `Maximum longitude, default ${OPENSKY_DEFAULT_LOMAX}`, exposure: 'primary', group: 'filters', reason: 'Bounding boxes are the documented quota-conscious way to query anonymous OpenSky states.', defaultValue: String(OPENSKY_DEFAULT_LOMAX) },
    { name: 'icao24', flag: '--icao24 <hex>', description: 'Optional 6-character ICAO24 aircraft address filter', exposure: 'advanced', group: 'filters', reason: 'Useful for a known aircraft without forcing global anonymous scans.' },
    { name: 'time', flag: '--time <unix-seconds>', description: 'Optional Unix timestamp snapshot query', exposure: 'advanced', group: 'query', reason: 'Documented parameter; advanced because anonymous users usually need current states.' , valueType: 'integer' },
    { name: 'extended', flag: '--extended <true|false>', description: 'Include extended state vector fields when supported', exposure: 'advanced', group: 'content', reason: 'Documented optional field expansion; disabled by default to keep payloads compact.', valueType: 'boolean' },
    { name: 'limit', flag: '--limit <count>', description: `Aircraft rows to return, 1-${OPENSKY_MAX_LIMIT}; default ${OPENSKY_DEFAULT_LIMIT}`, exposure: 'primary', group: 'pagination', reason: 'Bounds terminal output while preserving enough aircraft for operational awareness.', valueType: 'integer', defaultValue: String(OPENSKY_DEFAULT_LIMIT) },
  ],
  paramsSchema: statesParamsSchema,
  execute: params => listOpenSkyStates(params),
  normalizeParams: params => statesParamsSchema.parse(params),
  createCacheKeyParams: params => normalizeOpenSkyStatesInput(params),
  resultKind: 'opensky.states',
  defaultFormat: 'text',
}

export const openSkyProvider: PublicApiProviderModule = {
  manifest: {
    id: 'opensky',
    name: 'OpenSky Network',
    description: 'Anonymous read-only OpenSky ADS-B state vectors for quota-conscious bounding boxes.',
    publicApisCategory: 'Transportation',
    homepageUrl: 'https://opensky-network.org',
    docsUrl: 'https://openskynetwork.github.io/opensky-api/rest.html',
    auth: { mode: 'none', notes: ['This provider implements only the anonymous GET /states/all path. OAuth-protected own/flights/tracks endpoints are intentionally excluded.'] },
    tags: ['transportation', 'aviation', 'ads-b', 'aircraft', 'no-auth'],
    freePlanNotes: ['Docs describe 400 anonymous daily credits and bbox-dependent request costs; default bbox is intentionally small.'],
  },
  operations: [statesOperation],
  endpoints: [
    { id: 'opensky-states-all', method: 'GET', urlPattern: 'https://opensky-network.org/api/states/all?lamin={lat}&lomin={lon}&lamax={lat}&lomax={lon}', category: 'public-api:transportation', evidenceStatus: 'confirmed', observedOn: '2026-05-04', sampleSources: ['https://openskynetwork.github.io/opensky-api/rest.html'], consumedBy: ['opensky.states'], description: 'OpenSky anonymous state vectors endpoint for aircraft inside a bounding box.', notes: ['No Authorization header required for anonymous /states/all requests.', 'OAuth-only own/flights/tracks endpoints are excluded from this no-auth provider.', 'Anonymous quota is credit-limited; default bbox uses a low-cost regional query.'] },
  ],
}

export type { OpenSkyStatesResult }
