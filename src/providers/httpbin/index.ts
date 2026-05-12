import { z } from 'zod'
import { getHttpbin, getHttpbinUuid, type HttpbinGetInput } from '../../application/usecases/httpbin.js'
import { normalizeHttpbinGetQuery } from '../../infrastructure/openApis/httpbinClient.js'
import type { PublicApiOperationDefinition, PublicApiProviderModule } from '../providerTypes.js'

const getParamsSchema = z.object({
  query: z.string().optional(),
}) satisfies z.ZodType<HttpbinGetInput>

const getOperation: PublicApiOperationDefinition<HttpbinGetInput> = {
  id: 'httpbin.get',
  providerId: 'httpbin',
  name: 'GET Echo',
  commandPath: ['httpbin', 'get'],
  rpcMethod: 'httpbin.get',
  description: 'Echo query parameters and request metadata through the documented Httpbin /get endpoint.',
  category: 'development',
  options: [
    {
      name: 'query',
      flag: '--query <pairs>',
      description: 'Optional key=value&key2=value2 query pairs, max 10',
      exposure: 'primary',
      group: 'query',
      reason: 'Httpbin is useful for quickly validating query serialization; one bounded free-form query string keeps CLI UX compact.',
    },
  ],
  paramsSchema: getParamsSchema,
  execute: params => getHttpbin(params),
  normalizeParams: params => getParamsSchema.parse(params),
  createCacheKeyParams: params => normalizeHttpbinGetQuery(params),
  resultKind: 'httpbin.get',
  defaultFormat: 'text',
}

const uuidOperation: PublicApiOperationDefinition = {
  id: 'httpbin.uuid',
  providerId: 'httpbin',
  name: 'UUID',
  commandPath: ['httpbin', 'uuid'],
  rpcMethod: 'httpbin.uuid',
  description: 'Generate a random UUID through the documented Httpbin /uuid endpoint.',
  category: 'development',
  options: [],
  paramsSchema: z.object({}),
  execute: () => getHttpbinUuid(),
  normalizeParams: () => ({}),
  createCacheKeyParams: () => ({}),
  resultKind: 'httpbin.uuid',
  defaultFormat: 'text',
}

export const httpbinProvider: PublicApiProviderModule = {
  manifest: {
    id: 'httpbin',
    name: 'Httpbin',
    description: 'No-auth HTTPS JSON request/response utility API for testing HTTP clients and CLI serialization.',
    publicApisCategory: 'Development',
    homepageUrl: 'https://httpbin.org/',
    docsUrl: 'https://httpbin.org/',
    auth: {
      mode: 'none',
      notes: ['Documented Httpbin endpoints used here require no API key, OAuth, cookies, browser sessions, or account setup.'],
    },
    tags: ['development', 'http', 'testing', 'echo', 'uuid', 'no-auth', 'json'],
    freePlanNotes: [
      'Public rate limits are not documented by Httpbin.',
      'This provider exposes low-risk GET and UUID operations only; mutating or delay/stream endpoints are intentionally not exposed in the first pass.',
    ],
  },
  operations: [getOperation, uuidOperation],
  endpoints: [
    {
      id: 'httpbin-get',
      method: 'GET',
      urlPattern: 'https://httpbin.org/get*',
      category: 'open-api',
      evidenceStatus: 'confirmed',
      description: 'Httpbin GET echo endpoint returning args, headers, origin, and URL.',
      siteIds: ['public-apis-tui'],
      sampleSources: ['https://httpbin.org/', 'https://httpbin.org/get?hello=world'],
      consumedBy: ['httpbin get'],
      notes: ['No authentication required; no browser clickstream or scraping required.'],
    },
    {
      id: 'httpbin-uuid',
      method: 'GET',
      urlPattern: 'https://httpbin.org/uuid',
      category: 'open-api',
      evidenceStatus: 'confirmed',
      description: 'Httpbin UUID endpoint returning a generated UUID JSON value.',
      siteIds: ['public-apis-tui'],
      sampleSources: ['https://httpbin.org/', 'https://httpbin.org/uuid'],
      consumedBy: ['httpbin uuid'],
      notes: ['No authentication required; no browser clickstream or scraping required.'],
    },
  ],
}
