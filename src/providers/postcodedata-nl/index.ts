import { z } from 'zod'
import { lookupPostcodeDataNl, type PostcodeDataNlLookupInput } from '../../application/usecases/postcodeDataNl.js'
import {
  POSTCODE_DATA_NL_DEFAULT_POSTCODE,
  POSTCODE_DATA_NL_DEFAULT_REF,
  POSTCODE_DATA_NL_DEFAULT_STREET_NUMBER,
  POSTCODE_DATA_NL_DOCS_URL,
  normalizePostcodeDataNlLookupInput,
} from '../../infrastructure/openApis/postcodeDataNlClient.js'
import type { PublicApiOperationDefinition, PublicApiProviderModule } from '../providerTypes.js'

const lookupParamsSchema = z.object({
  postcode: z.string().optional(),
  streetNumber: z.coerce.number().int().optional(),
  ref: z.string().optional(),
}) satisfies z.ZodType<PostcodeDataNlLookupInput>

const lookupOperation: PublicApiOperationDefinition<PostcodeDataNlLookupInput> = {
  id: 'postcodedata-nl.lookup',
  providerId: 'postcodedata-nl',
  name: 'Lookup Dutch postcode',
  commandPath: ['postcodedata-nl', 'lookup'],
  rpcMethod: 'postcodedata-nl.lookup',
  description: 'Look up Dutch street/city/geolocation data by postcode and house number via the no-auth HTTP JSON endpoint.',
  category: 'geocoding',
  options: [
    {
      name: 'postcode',
      flag: '--postcode <code>',
      description: `Dutch postcode in 1234AB format, default ${POSTCODE_DATA_NL_DEFAULT_POSTCODE}`,
      exposure: 'primary',
      group: 'query',
      reason: 'The documented endpoint requires a postcode query parameter.',
      defaultValue: POSTCODE_DATA_NL_DEFAULT_POSTCODE,
    },
    {
      name: 'streetNumber',
      flag: '--street-number <number>',
      description: `House number, default ${String(POSTCODE_DATA_NL_DEFAULT_STREET_NUMBER)}`,
      exposure: 'primary',
      group: 'query',
      reason: 'The documented endpoint requires a streetnumber query parameter.',
      valueType: 'integer',
      defaultValue: String(POSTCODE_DATA_NL_DEFAULT_STREET_NUMBER),
    },
    {
      name: 'ref',
      flag: '--ref <domain>',
      description: `Domain-style ref value required by upstream, default ${POSTCODE_DATA_NL_DEFAULT_REF}`,
      exposure: 'advanced',
      group: 'transport',
      reason: 'The legacy endpoint rejects requests without ref=domain.nl; CLI sends a non-secret identifier by default.',
      defaultValue: POSTCODE_DATA_NL_DEFAULT_REF,
    },
  ],
  paramsSchema: lookupParamsSchema,
  execute: params => lookupPostcodeDataNl(params),
  normalizeParams: params => lookupParamsSchema.parse(params),
  createCacheKeyParams: params => normalizePostcodeDataNlLookupInput(params),
  resultKind: 'postcodedata-nl.lookup',
  defaultFormat: 'text',
}

export const postcodeDataNlProvider: PublicApiProviderModule = {
  manifest: {
    id: 'postcodedata-nl',
    name: 'PostcodeData.nl',
    description: 'No-auth HTTP JSON Dutch postcode and house-number lookup.',
    publicApisCategory: 'Geocoding',
    homepageUrl: 'http://api.postcodedata.nl/v1/postcode/',
    docsUrl: POSTCODE_DATA_NL_DOCS_URL,
    auth: {
      mode: 'none',
      notes: ['The implemented endpoint returns JSON without API keys, OAuth, cookies, browser sessions, or account setup, but requires a non-secret ref query value.'],
    },
    tags: ['geocoding', 'postal-codes', 'netherlands', 'addresses', 'json', 'http-only', 'no-auth'],
    freePlanNotes: [
      'HTTP-only transport; HTTPS to api.postcodedata.nl fails TLS from this runtime.',
      'Queries include postcode and house number in cleartext, so the CLI defaults to a sample address and discloses the privacy boundary.',
      'The legacy ref parameter is required upstream; CLI uses a non-secret domain-style identifier and does not expose credentials.',
    ],
  },
  operations: [lookupOperation],
  endpoints: [
    {
      id: 'postcodedata-nl-postcode-lookup',
      method: 'GET',
      urlPattern: 'http://api.postcodedata.nl/v1/postcode/*',
      category: 'public-apis:geocoding',
      evidenceStatus: 'confirmed',
      description: 'PostcodeData.nl HTTP JSON lookup by Dutch postcode and house number.',
      siteIds: ['public-apis-tui'],
      observedOn: '2026-05-08',
      sampleSources: [POSTCODE_DATA_NL_DOCS_URL, 'http://api.postcodedata.nl/v1/postcode/?postcode=1211EP&streetnumber=60&ref=public-apis-tui.local&type=json'],
      consumedBy: ['public-apis apis run postcodedata-nl.lookup'],
      notes: ['No authentication required.', 'HTTP-only endpoint; HTTPS failed TLS from this runtime.', 'Requires a non-secret ref query parameter and returns JSON status ok/error.'],
    },
  ],
}

export type { PostcodeDataNlLookupInput } from '../../application/usecases/postcodeDataNl.js'
