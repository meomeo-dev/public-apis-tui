import { z } from 'zod'
import { getHttpDogStatus, type HttpDogStatusInput } from '../../application/usecases/httpDog.js'
import type { PublicApiProviderModule } from '../providerTypes.js'

const httpDogStatusParamsSchema = z.object({
  statusCode: z.number().int().optional(),
}) satisfies z.ZodType<HttpDogStatusInput>

export const httpDogProvider: PublicApiProviderModule = {
  manifest: {
    id: 'httpdog',
    name: 'HTTP Dog',
    description: 'No-auth HTTPS JSON metadata API for dog images representing HTTP response status codes.',
    publicApisCategory: 'Animals',
    homepageUrl: 'https://http.dog/',
    docsUrl: 'https://http.dog/',
    auth: {
      mode: 'none',
      notes: ['Public APIs README lists Auth as No; documented .json status endpoints require no API key.'],
    },
    tags: ['animals', 'dogs', 'http', 'status-codes', 'images', 'no-auth'],
    freePlanNotes: ['No documented rate limit or maximum page size; each lookup returns one status-code metadata object.'],
  },
  operations: [
    {
      id: 'httpdog.status',
      providerId: 'httpdog',
      name: 'HTTP status dog',
      commandPath: ['httpdog', 'status'],
      rpcMethod: 'httpdog.status',
      description: 'Fetch HTTP Dog JSON metadata and image URLs for one HTTP status code.',
      category: 'animals',
      options: [
        {
          name: 'statusCode',
          flag: '--status-code <code>',
          description: 'Three-digit HTTP response status code, default 404',
          exposure: 'primary',
          group: 'query',
          reason: 'Primary lookup key documented by HTTP Dog and the main user intent.',
          valueType: 'integer',
          defaultValue: '404',
        },
      ],
      paramsSchema: httpDogStatusParamsSchema,
      execute: params => getHttpDogStatus(params),
      normalizeParams: params => httpDogStatusParamsSchema.parse(params),
      resultKind: 'httpdog.status',
      defaultFormat: 'text',
    },
  ],
  endpoints: [
    {
      id: 'httpdog-status-json',
      method: 'GET',
      urlPattern: 'https://http.dog/*.json',
      category: 'open-api',
      evidenceStatus: 'confirmed',
      description: 'HTTP Dog JSON endpoint returning status-code metadata and image URLs.',
      siteIds: ['public-apis-tui'],
      sampleSources: ['https://http.dog/'],
      consumedBy: ['httpdog status'],
      notes: ['No authentication required.', 'Documented pattern: https://http.dog/[code].json'],
    },
  ],
}
