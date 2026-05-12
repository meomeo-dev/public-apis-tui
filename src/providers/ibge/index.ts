import { z } from 'zod'
import {
  IBGE_DEFAULT_LIMIT,
  IBGE_DEFAULT_STATE,
  IBGE_MAX_LIMIT,
  listIbgeMunicipalities,
  listIbgeStates,
  type IbgeMunicipalitiesInput,
  type IbgeStatesInput,
} from '../../application/usecases/ibge.js'
import { normalizeIbgeMunicipalitiesInput, normalizeIbgeStatesInput } from '../../infrastructure/openApis/ibgeClient.js'
import type { PublicApiOperationDefinition, PublicApiProviderModule } from '../providerTypes.js'

const statesParamsSchema = z.object({
  limit: z.coerce.number().optional(),
}) satisfies z.ZodType<IbgeStatesInput>

const municipalitiesParamsSchema = z.object({
  state: z.string().optional(),
  limit: z.coerce.number().optional(),
}) satisfies z.ZodType<IbgeMunicipalitiesInput>

const statesOperation: PublicApiOperationDefinition<IbgeStatesInput> = {
  id: 'ibge.states',
  providerId: 'ibge',
  name: 'Brazilian states',
  commandPath: ['ibge', 'states'],
  rpcMethod: 'ibge.states',
  description: 'List Brazilian states from the IBGE Localidades API.',
  category: 'geocoding',
  options: [
    {
      name: 'limit',
      flag: '--limit <count>',
      description: `States to show, default ${String(IBGE_DEFAULT_LIMIT)}, max ${String(IBGE_MAX_LIMIT)}`,
      exposure: 'primary',
      group: 'pagination',
      reason: 'The endpoint returns all states; the CLI bounds terminal output and cache payloads.',
      valueType: 'integer',
      defaultValue: String(IBGE_DEFAULT_LIMIT),
    },
  ],
  paramsSchema: statesParamsSchema,
  execute: params => listIbgeStates(params),
  normalizeParams: params => statesParamsSchema.parse(params),
  createCacheKeyParams: params => normalizeIbgeStatesInput(params),
  resultKind: 'ibge.states',
  defaultFormat: 'text',
}

const municipalitiesOperation: PublicApiOperationDefinition<IbgeMunicipalitiesInput> = {
  id: 'ibge.municipalities',
  providerId: 'ibge',
  name: 'Brazilian municipalities',
  commandPath: ['ibge', 'municipalities'],
  rpcMethod: 'ibge.municipalities',
  description: 'List municipalities for a Brazilian state from the IBGE Localidades API.',
  category: 'geocoding',
  options: [
    {
      name: 'state',
      flag: '--state <uf>',
      description: `Two-letter Brazilian state abbreviation, default ${IBGE_DEFAULT_STATE}`,
      exposure: 'primary',
      group: 'query',
      reason: 'The municipalities endpoint is scoped by Brazilian state abbreviation.',
      defaultValue: IBGE_DEFAULT_STATE,
    },
    {
      name: 'limit',
      flag: '--limit <count>',
      description: `Municipalities to show, default ${String(IBGE_DEFAULT_LIMIT)}, max ${String(IBGE_MAX_LIMIT)}`,
      exposure: 'primary',
      group: 'pagination',
      reason: 'Some states have many municipalities; the CLI keeps terminal output and cache payloads bounded.',
      valueType: 'integer',
      defaultValue: String(IBGE_DEFAULT_LIMIT),
    },
  ],
  paramsSchema: municipalitiesParamsSchema,
  execute: params => listIbgeMunicipalities(params),
  normalizeParams: params => municipalitiesParamsSchema.parse(params),
  createCacheKeyParams: params => normalizeIbgeMunicipalitiesInput(params),
  resultKind: 'ibge.municipalities',
  defaultFormat: 'text',
}

export const ibgeProvider: PublicApiProviderModule = {
  manifest: {
    id: 'ibge',
    name: 'IBGE',
    description: 'Brazilian Institute of Geography and Statistics Localidades API for states and municipalities.',
    publicApisCategory: 'Geocoding',
    homepageUrl: 'https://servicodados.ibge.gov.br/api/docs/',
    docsUrl: 'https://servicodados.ibge.gov.br/api/docs/localidades',
    auth: {
      mode: 'none',
      notes: ['Implemented Localidades endpoints return JSON without API keys, OAuth, browser sessions, account setup, or Chrome clickstream.'],
    },
    tags: ['geocoding', 'brazil', 'government', 'states', 'municipalities', 'json', 'no-auth'],
    freePlanNotes: [
      'Localidades endpoints expose CORS headers and cacheable JSON responses.',
      'CLI exposes curated read-only states and state-scoped municipalities operations; other IBGE services remain out of scope for this pass.',
      'Invalid state abbreviations can return an empty JSON array; the CLI validates state format locally and shows empty states clearly.',
    ],
  },
  operations: [statesOperation, municipalitiesOperation],
  endpoints: [
    {
      id: 'ibge-states',
      method: 'GET',
      urlPattern: 'https://servicodados.ibge.gov.br/api/v1/localidades/estados?orderBy=nome',
      category: 'public-apis:geocoding',
      evidenceStatus: 'confirmed',
      description: 'IBGE Localidades endpoint returning Brazilian state metadata with region information.',
      siteIds: ['public-apis-tui'],
      observedOn: '2026-05-08',
      sampleSources: ['https://servicodados.ibge.gov.br/api/docs/localidades', 'https://servicodados.ibge.gov.br/api/v1/localidades/estados?orderBy=nome'],
      consumedBy: ['public-apis apis run ibge.states'],
      notes: ['No authentication required.', 'Returns JSON array sorted by name when orderBy=nome is supplied.'],
    },
    {
      id: 'ibge-municipalities',
      method: 'GET',
      urlPattern: 'https://servicodados.ibge.gov.br/api/v1/localidades/estados/{state}/municipios?orderBy=nome',
      category: 'public-apis:geocoding',
      evidenceStatus: 'confirmed',
      description: 'IBGE Localidades endpoint returning municipalities for one Brazilian state.',
      siteIds: ['public-apis-tui'],
      observedOn: '2026-05-08',
      sampleSources: ['https://servicodados.ibge.gov.br/api/docs/localidades', 'https://servicodados.ibge.gov.br/api/v1/localidades/estados/SP/municipios?orderBy=nome'],
      consumedBy: ['public-apis apis run ibge.municipalities'],
      notes: ['No authentication required.', 'CLI uses state abbreviation and bounds displayed results.'],
    },
  ],
}

export type { IbgeMunicipalitiesInput, IbgeStatesInput } from '../../application/usecases/ibge.js'
