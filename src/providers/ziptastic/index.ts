import { z } from 'zod'
import { lookupZiptastic, type ZiptasticLookupInput } from '../../application/usecases/ziptastic.js'
import {
  ZIPTASTIC_DEFAULT_ZIP,
  ZIPTASTIC_DOCS_URL,
  normalizeZiptasticLookupInput,
} from '../../infrastructure/openApis/ziptasticClient.js'
import type { PublicApiOperationDefinition, PublicApiProviderModule } from '../providerTypes.js'

const lookupParamsSchema = z.object({
  zip: z.string().optional(),
}) satisfies z.ZodType<ZiptasticLookupInput>

const lookupOperation: PublicApiOperationDefinition<ZiptasticLookupInput> = {
  id: 'ziptastic.lookup',
  providerId: 'ziptastic',
  name: 'Lookup ZIP',
  commandPath: ['ziptastic', 'lookup'],
  rpcMethod: 'ziptastic.lookup',
  description: 'Look up country, state, and city for a ZIP/postal code using the no-auth Ziptastic endpoint.',
  category: 'geocoding',
  options: [
    {
      name: 'zip',
      flag: '--zip <code>',
      description: `ZIP/postal code, default ${ZIPTASTIC_DEFAULT_ZIP}`,
      exposure: 'primary',
      group: 'query',
      reason: 'The documented endpoint requires the postal code as the only path segment.',
      defaultValue: ZIPTASTIC_DEFAULT_ZIP,
    },
  ],
  paramsSchema: lookupParamsSchema,
  execute: params => lookupZiptastic(params),
  normalizeParams: params => lookupParamsSchema.parse(params),
  createCacheKeyParams: params => normalizeZiptasticLookupInput(params),
  resultKind: 'ziptastic.lookup',
  defaultFormat: 'text',
}

export const ziptasticProvider: PublicApiProviderModule = {
  manifest: {
    id: 'ziptastic',
    name: 'Ziptastic',
    description: 'No-auth HTTPS ZIP/postal code to country/state/city lookup.',
    publicApisCategory: 'Geocoding',
    homepageUrl: ZIPTASTIC_DOCS_URL,
    docsUrl: ZIPTASTIC_DOCS_URL,
    auth: {
      mode: 'none',
      notes: ['The implemented endpoint returns JSON bodies without API keys, OAuth, browser sessions, or account setup.'],
    },
    tags: ['geocoding', 'postal-codes', 'zip-codes', 'addresses', 'json-body', 'no-auth'],
    freePlanNotes: [
      'Endpoint currently advertises text/html even when the body is JSON; client parses JSON bodies only and rejects real HTML.',
      'The server sets PHP cookies, but the CLI does not send or require cookies and does not use a browser clickstream.',
      'JSONP callback mode is intentionally not exposed.',
    ],
  },
  operations: [lookupOperation],
  endpoints: [
    {
      id: 'ziptastic-zip-lookup',
      method: 'GET',
      urlPattern: 'regex:^https://ziptasticapi\\.com/[^/?#]+$',
      category: 'public-apis:geocoding',
      evidenceStatus: 'confirmed',
      description: 'Ziptastic ZIP/postal code lookup endpoint returning JSON text.',
      siteIds: ['public-apis-tui'],
      observedOn: '2026-05-08',
      sampleSources: [ZIPTASTIC_DOCS_URL, 'https://ziptasticapi.com/90210'],
      consumedBy: ['public-apis apis run ziptastic.lookup'],
      notes: ['No authentication required.', 'The response content-type is text/html even for JSON bodies.', 'Not-found/error JSON bodies are mapped to empty lookup results.', 'JSONP callback mode is not exposed.'],
    },
  ],
}

export type { ZiptasticLookupInput } from '../../application/usecases/ziptastic.js'
