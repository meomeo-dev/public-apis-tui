import { z } from 'zod'
import { listVoidlyIncidents } from '../../application/usecases/voidly.js'
import {
  VOIDLY_DEFAULT_LIMIT,
  VOIDLY_DEFAULT_OFFSET,
  normalizeVoidlyIncidentsInput,
  type VoidlyIncidentsInput,
} from '../../infrastructure/openApis/voidlyClient.js'
import type { PublicApiOperationDefinition, PublicApiProviderModule } from '../providerTypes.js'

const incidentsParamsSchema = z.object({
  country: z.string().optional(),
  limit: z.coerce.number().int().optional(),
  offset: z.coerce.number().int().optional(),
}) satisfies z.ZodType<VoidlyIncidentsInput>

const incidentsOperation: PublicApiOperationDefinition<VoidlyIncidentsInput> = {
  id: 'voidly.incidents',
  providerId: 'voidly',
  name: 'Censorship Incidents',
  commandPath: ['voidly', 'incidents'],
  rpcMethod: 'voidly.incidents',
  description: 'List Voidly public censorship incident metadata from the no-auth /data/incidents endpoint.',
  category: 'open-data',
  options: [
    {
      name: 'country',
      flag: '--country <iso2>',
      description: 'Optional two-letter country filter, e.g. IR',
      exposure: 'primary',
      group: 'filters',
      reason: 'Incident data spans many countries; an ISO2 filter keeps output focused without exposing arbitrary query syntax.',
    },
    {
      name: 'limit',
      flag: '--limit <count>',
      description: `Incidents to request, default ${VOIDLY_DEFAULT_LIMIT}, cap 100`,
      exposure: 'primary',
      group: 'pagination',
      reason: 'Incident listings can be large; a 100-row cap keeps terminal output and offline caches bounded.',
      valueType: 'integer',
      defaultValue: String(VOIDLY_DEFAULT_LIMIT),
    },
    {
      name: 'offset',
      flag: '--offset <count>',
      description: `Result offset, default ${VOIDLY_DEFAULT_OFFSET}`,
      exposure: 'advanced',
      group: 'pagination',
      reason: 'Voidly supports paginated incident listings; a bounded offset enables deterministic page traversal.',
      valueType: 'integer',
      defaultValue: String(VOIDLY_DEFAULT_OFFSET),
    },
  ],
  paramsSchema: incidentsParamsSchema,
  execute: params => listVoidlyIncidents(params),
  normalizeParams: params => incidentsParamsSchema.parse(params),
  createCacheKeyParams: params => normalizeVoidlyIncidentsInput(params),
  resultKind: 'voidly.incidents',
  defaultFormat: 'text',
}

export const voidlyProvider: PublicApiProviderModule = {
  manifest: {
    id: 'voidly',
    name: 'Voidly',
    description: 'No-auth public censorship incident metadata from the Voidly API.',
    publicApisCategory: 'Open Data',
    homepageUrl: 'https://voidly.ai/api-docs',
    docsUrl: 'https://api.voidly.ai/openapi.json',
    auth: {
      mode: 'none',
      notes: ['The exposed /data/incidents endpoint is a public read-only JSON endpoint; paid x402, agent, MCP, proxy, and POST endpoints are intentionally not exposed.'],
    },
    tags: ['open-data', 'censorship', 'incidents', 'internet-measurements', 'no-auth', 'json'],
    freePlanNotes: [
      'This provider exposes only bounded incident metadata from /data/incidents.',
      'Paid x402 endpoints, Voidly Pay, MCP, agent registration/messaging, verification POSTs, accessibility checks for arbitrary URLs, and proxy features are excluded for safety and scope.',
    ],
  },
  operations: [incidentsOperation],
  endpoints: [
    {
      id: 'voidly-openapi',
      method: 'GET',
      urlPattern: 'https://api.voidly.ai/openapi.json',
      category: 'public-apis:open-data',
      evidenceStatus: 'confirmed',
      description: 'Voidly OpenAPI document describing free public and paid x402 endpoints.',
      observedOn: '2026-05-09',
      sampleSources: ['https://voidly.ai/api-docs', 'https://api.voidly.ai/openapi.json'],
      consumedBy: [],
      notes: ['No API key observed for the OpenAPI document; provider implementation exposes only the public read-only incidents endpoint.'],
    },
    {
      id: 'voidly-incidents',
      method: 'GET',
      urlPattern: 'https://api.voidly.ai/data/incidents',
      category: 'public-apis:open-data',
      evidenceStatus: 'confirmed',
      description: 'Public censorship incident metadata list.',
      observedOn: '2026-05-09',
      sampleSources: ['https://api.voidly.ai/data/incidents?country=IR&limit=3'],
      consumedBy: ['public-apis apis run voidly.incidents'],
      notes: ['No API key observed; response returns application/json, CORS wildcard, incident metadata, and X-RateLimit headers.'],
    },
  ],
}
