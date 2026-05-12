import { z } from 'zod'
import { lookupViaCep, searchViaCep, type ViaCepLookupInput, type ViaCepSearchInput } from '../../application/usecases/viaCep.js'
import {
  VIA_CEP_DEFAULT_CEP,
  VIA_CEP_DEFAULT_CITY,
  VIA_CEP_DEFAULT_LIMIT,
  VIA_CEP_DEFAULT_STATE,
  VIA_CEP_DEFAULT_STREET,
  VIA_CEP_DOCS_URL,
  VIA_CEP_MAX_LIMIT,
  normalizeViaCepLookupInput,
  normalizeViaCepSearchInput,
} from '../../infrastructure/openApis/viaCepClient.js'
import type { PublicApiOperationDefinition, PublicApiProviderModule } from '../providerTypes.js'

const lookupParamsSchema = z.object({
  cep: z.string().optional(),
}) satisfies z.ZodType<ViaCepLookupInput>

const searchParamsSchema = z.object({
  state: z.string().optional(),
  city: z.string().optional(),
  street: z.string().optional(),
  limit: z.coerce.number().int().optional(),
}) satisfies z.ZodType<ViaCepSearchInput>

const lookupOperation: PublicApiOperationDefinition<ViaCepLookupInput> = {
  id: 'viacep.lookup',
  providerId: 'viacep',
  name: 'Lookup CEP',
  commandPath: ['viacep', 'lookup'],
  rpcMethod: 'viacep.lookup',
  description: 'Look up a Brazilian CEP via the no-auth HTTPS JSON ViaCep endpoint.',
  category: 'geocoding',
  options: [
    {
      name: 'cep',
      flag: '--cep <cep>',
      description: `Brazilian CEP, default ${VIA_CEP_DEFAULT_CEP}`,
      exposure: 'primary',
      group: 'query',
      reason: 'The documented lookup endpoint requires an 8-digit CEP path segment.',
      defaultValue: VIA_CEP_DEFAULT_CEP,
    },
  ],
  paramsSchema: lookupParamsSchema,
  execute: params => lookupViaCep(params),
  normalizeParams: params => lookupParamsSchema.parse(params),
  createCacheKeyParams: params => normalizeViaCepLookupInput(params),
  resultKind: 'viacep.lookup',
  defaultFormat: 'text',
}

const searchOperation: PublicApiOperationDefinition<ViaCepSearchInput> = {
  id: 'viacep.search',
  providerId: 'viacep',
  name: 'Search addresses',
  commandPath: ['viacep', 'search'],
  rpcMethod: 'viacep.search',
  description: 'Search Brazilian CEP address records by UF, city, and street using the no-auth HTTPS JSON endpoint.',
  category: 'geocoding',
  options: [
    {
      name: 'state',
      flag: '--state <uf>',
      description: `Brazilian UF code, default ${VIA_CEP_DEFAULT_STATE}`,
      exposure: 'primary',
      group: 'filters',
      reason: 'The documented address search endpoint requires a UF path segment.',
      defaultValue: VIA_CEP_DEFAULT_STATE,
    },
    {
      name: 'city',
      flag: '--city <name>',
      description: `City/localidade, default ${VIA_CEP_DEFAULT_CITY}`,
      exposure: 'primary',
      group: 'query',
      reason: 'The documented address search endpoint requires a city path segment with at least 3 characters.',
      defaultValue: VIA_CEP_DEFAULT_CITY,
    },
    {
      name: 'street',
      flag: '--street <name>',
      description: `Street/logradouro fragment, default ${VIA_CEP_DEFAULT_STREET}`,
      exposure: 'primary',
      group: 'query',
      reason: 'The documented address search endpoint requires a street path segment with at least 3 characters.',
      defaultValue: VIA_CEP_DEFAULT_STREET,
    },
    {
      name: 'limit',
      flag: '--limit <count>',
      description: `Addresses to show, default ${String(VIA_CEP_DEFAULT_LIMIT)}, max ${String(VIA_CEP_MAX_LIMIT)}`,
      exposure: 'primary',
      group: 'pagination',
      reason: 'Address searches can return many records; CLI caps terminal output and cache payloads.',
      valueType: 'integer',
      defaultValue: String(VIA_CEP_DEFAULT_LIMIT),
    },
  ],
  paramsSchema: searchParamsSchema,
  execute: params => searchViaCep(params),
  normalizeParams: params => searchParamsSchema.parse(params),
  createCacheKeyParams: params => normalizeViaCepSearchInput(params),
  resultKind: 'viacep.search',
  defaultFormat: 'text',
}

export const viaCepProvider: PublicApiProviderModule = {
  manifest: {
    id: 'viacep',
    name: 'ViaCep',
    description: 'No-auth HTTPS JSON Brazilian CEP lookup and address search.',
    publicApisCategory: 'Geocoding',
    homepageUrl: VIA_CEP_DOCS_URL,
    docsUrl: VIA_CEP_DOCS_URL,
    auth: {
      mode: 'none',
      notes: ['Implemented JSON endpoints return data without API keys, OAuth, cookies, browser sessions, or account setup.'],
    },
    tags: ['geocoding', 'postal-codes', 'brazil', 'cep', 'addresses', 'json', 'no-auth'],
    freePlanNotes: [
      'CLI exposes only bounded read-only JSON lookup/search endpoints.',
      'XML, Piped, Querty, and JSONP response formats are intentionally out of scope for this pass.',
      'Reference/geocoding data only; validate delivery-critical or legal decisions against Correios or other official sources.',
    ],
  },
  operations: [lookupOperation, searchOperation],
  endpoints: [
    {
      id: 'viacep-cep-lookup',
      method: 'GET',
      urlPattern: 'regex:^https://viacep\\.com\\.br/ws/[0-9]{8}/json/?$',
      category: 'public-apis:geocoding',
      evidenceStatus: 'confirmed',
      description: 'ViaCep single Brazilian CEP lookup endpoint.',
      siteIds: ['public-apis-tui'],
      observedOn: '2026-05-08',
      sampleSources: [VIA_CEP_DOCS_URL, 'https://viacep.com.br/ws/01001000/json/'],
      consumedBy: ['public-apis apis run viacep.lookup'],
      notes: ['No authentication required.', 'Not-found CEP responses return JSON with erro=true and are mapped to empty results.', 'Invalid CEP formats can return HTML 400, so CLI validates CEP locally before network calls.'],
    },
    {
      id: 'viacep-address-search',
      method: 'GET',
      urlPattern: 'regex:^https://viacep\\.com\\.br/ws/[A-Z]{2}/[^/]+/[^/]+/json/?$',
      category: 'public-apis:geocoding',
      evidenceStatus: 'confirmed',
      description: 'ViaCep UF/city/street address search endpoint.',
      siteIds: ['public-apis-tui'],
      observedOn: '2026-05-08',
      sampleSources: [VIA_CEP_DOCS_URL, 'https://viacep.com.br/ws/SP/Sao%20Paulo/Paulista/json/'],
      consumedBy: ['public-apis apis run viacep.search'],
      notes: ['No authentication required.', 'Empty searches return JSON arrays.', 'CLI validates UF and city/street lengths to avoid upstream HTML 400 responses.'],
    },
  ],
}

export type { ViaCepLookupInput, ViaCepSearchInput } from '../../application/usecases/viaCep.js'
