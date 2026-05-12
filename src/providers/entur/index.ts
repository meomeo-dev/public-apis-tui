import { z } from 'zod'
import { listEnturDepartures, searchEnturPlaces, type EnturDeparturesResult, type EnturPlacesResult } from '../../application/usecases/entur.js'
import {
  ENTUR_DEFAULT_CLIENT_NAME,
  ENTUR_DEFAULT_DEPARTURES,
  ENTUR_DEFAULT_LANG,
  ENTUR_DEFAULT_LAYERS,
  ENTUR_DEFAULT_PLACE_TEXT,
  ENTUR_DEFAULT_SIZE,
  ENTUR_DEFAULT_STOP_PLACE_ID,
  ENTUR_MAX_DEPARTURES,
  ENTUR_MAX_SIZE,
  normalizeEnturDeparturesInput,
  normalizeEnturPlacesInput,
  type EnturDeparturesInput,
  type EnturPlacesInput,
} from '../../infrastructure/openApis/enturClient.js'
import type { PublicApiOperationDefinition, PublicApiProviderModule } from '../providerTypes.js'

const placesParamsSchema = z.object({
  text: z.string().min(1).optional(),
  lang: z.string().min(1).optional(),
  layers: z.string().min(1).optional(),
  size: z.coerce.number().int().optional(),
  boundaryCountry: z.string().min(1).optional(),
  clientName: z.string().min(1).optional(),
}) satisfies z.ZodType<EnturPlacesInput>

const departuresParamsSchema = z.object({
  stopPlaceId: z.string().min(1).optional(),
  departures: z.coerce.number().int().optional(),
  transportMode: z.string().min(1).optional(),
  clientName: z.string().min(1).optional(),
}) satisfies z.ZodType<EnturDeparturesInput>

const placesOperation: PublicApiOperationDefinition<EnturPlacesInput> = {
  id: 'entur.places',
  providerId: 'entur',
  name: 'Places',
  commandPath: ['entur', 'places'],
  rpcMethod: 'entur.places',
  description: 'Search Entur geocoder stop places and venues in Norway.',
  category: 'transportation',
  options: [
    { name: 'text', flag: '--text <query>', description: `Place text, default ${ENTUR_DEFAULT_PLACE_TEXT}`, exposure: 'primary', group: 'query', reason: 'Text is the documented autocomplete search input.', defaultValue: ENTUR_DEFAULT_PLACE_TEXT },
    { name: 'size', flag: '--size <count>', description: `Places to return, default/cap ${ENTUR_MAX_SIZE}`, exposure: 'primary', group: 'pagination', reason: 'Entur geocoder documents size; default uses the max to conserve repeat requests.', valueType: 'integer', defaultValue: String(ENTUR_DEFAULT_SIZE) },
    { name: 'lang', flag: '--lang <code>', description: `Language code, default ${ENTUR_DEFAULT_LANG}`, exposure: 'advanced', group: 'presentation', reason: 'Language is useful but not required for common stop-place lookup.', defaultValue: ENTUR_DEFAULT_LANG },
    { name: 'layers', flag: '--layers <names>', description: `Pelias layers, default ${ENTUR_DEFAULT_LAYERS}`, exposure: 'advanced', group: 'filters', reason: 'Layer filtering narrows geocoder results without exposing raw endpoint variants.', defaultValue: ENTUR_DEFAULT_LAYERS },
    { name: 'boundaryCountry', flag: '--boundary-country <ISO3>', description: 'Optional ISO3 country boundary such as NOR', exposure: 'advanced', group: 'filters', reason: 'Country boundary is helpful for geocoder precision while default Norway results work well.' },
    { name: 'clientName', flag: '--client-name <name>', description: `ET-Client-Name header, default ${ENTUR_DEFAULT_CLIENT_NAME}`, exposure: 'advanced', group: 'transport', reason: 'Entur requires a non-secret client identifier header for responsible API use.', defaultValue: ENTUR_DEFAULT_CLIENT_NAME },
  ],
  paramsSchema: placesParamsSchema,
  execute: params => searchEnturPlaces(params),
  normalizeParams: params => placesParamsSchema.parse(params),
  createCacheKeyParams: params => normalizeEnturPlacesInput(params),
  resultKind: 'entur.places',
  defaultFormat: 'text',
}

const departuresOperation: PublicApiOperationDefinition<EnturDeparturesInput> = {
  id: 'entur.departures',
  providerId: 'entur',
  name: 'Departures',
  commandPath: ['entur', 'departures'],
  rpcMethod: 'entur.departures',
  description: 'Read Entur Journey Planner departures for a stop place.',
  category: 'transportation',
  options: [
    { name: 'stopPlaceId', flag: '--stop-place-id <id>', description: `NSR stop place id, default ${ENTUR_DEFAULT_STOP_PLACE_ID}`, exposure: 'primary', group: 'query', reason: 'StopPlace id is the documented Journey Planner lookup key.', defaultValue: ENTUR_DEFAULT_STOP_PLACE_ID },
    { name: 'departures', flag: '--departures <count>', description: `Departures to request, default ${ENTUR_DEFAULT_DEPARTURES}, cap ${ENTUR_MAX_DEPARTURES}`, exposure: 'primary', group: 'pagination', reason: 'Bounds GraphQL response size while keeping useful board output.', valueType: 'integer', defaultValue: String(ENTUR_DEFAULT_DEPARTURES) },
    { name: 'transportMode', flag: '--transport-mode <mode>', description: 'Optional local filter such as rail, bus, tram, metro, or air', exposure: 'primary', group: 'filters', reason: 'Mode filtering is a high-signal transit UX filter after selecting a stop.' },
    { name: 'clientName', flag: '--client-name <name>', description: `ET-Client-Name header, default ${ENTUR_DEFAULT_CLIENT_NAME}`, exposure: 'advanced', group: 'transport', reason: 'Entur requires a non-secret client identifier header for responsible API use.', defaultValue: ENTUR_DEFAULT_CLIENT_NAME },
  ],
  paramsSchema: departuresParamsSchema,
  execute: params => listEnturDepartures(params),
  normalizeParams: params => departuresParamsSchema.parse(params),
  createCacheKeyParams: params => normalizeEnturDeparturesInput(params),
  resultKind: 'entur.departures',
  defaultFormat: 'text',
}

export const enturProvider: PublicApiProviderModule = {
  manifest: {
    id: 'entur',
    name: 'Entur',
    description: 'Norway public transport geocoder and departure-board APIs via non-secret ET-Client-Name header.',
    publicApisCategory: 'Transportation',
    homepageUrl: 'https://developer.entur.org/',
    docsUrl: 'https://developer.entur.org/',
    auth: { mode: 'none', notes: ['Selected endpoints require ET-Client-Name as a non-secret client identifier, not an API key/OAuth credential.'] },
    tags: ['transportation', 'norway', 'transit', 'geocoder', 'journey-planner', 'no-auth'],
    freePlanNotes: ['Live responses expose rate-limit headers; use --persist and --offline for repeated terminal browsing.'],
  },
  operations: [placesOperation, departuresOperation],
  endpoints: [
    { id: 'entur-geocoder-autocomplete', method: 'GET', urlPattern: 'https://api.entur.io/geocoder/v1/autocomplete?text={query}', category: 'public-api:transportation', evidenceStatus: 'confirmed', observedOn: '2026-05-05', sampleSources: ['https://developer.entur.org/'], consumedBy: ['entur.places'], description: 'Entur geocoder autocomplete endpoint.', notes: ['No API key/OAuth required.', 'Requires non-secret ET-Client-Name header.'] },
    { id: 'entur-journey-planner-graphql', method: 'POST', urlPattern: 'https://api.entur.io/journey-planner/v3/graphql', category: 'public-api:transportation', evidenceStatus: 'confirmed', observedOn: '2026-05-05', sampleSources: ['https://developer.entur.org/'], consumedBy: ['entur.departures'], description: 'Entur Journey Planner GraphQL endpoint for stopPlace estimatedCalls.', notes: ['No API key/OAuth required.', 'Requires non-secret ET-Client-Name header.'] },
  ],
}

export type { EnturDeparturesResult, EnturPlacesResult }
