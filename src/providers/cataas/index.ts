import { z } from 'zod'
import {
  getCataasRandomCat,
  listCataasCats,
  listCataasTags,
  type CataasCatsInput,
  type CataasRandomInput,
} from '../../application/usecases/cataas.js'
import type { PublicApiProviderModule } from '../providerTypes.js'

const cataasRandomParamsSchema = z.object({
  tag: z.string().min(1).optional(),
}) satisfies z.ZodType<CataasRandomInput>

const cataasCatsParamsSchema = z.object({
  tags: z.string().min(1).optional(),
  skip: z.number().int().optional(),
  limit: z.number().int().optional(),
}) satisfies z.ZodType<CataasCatsInput>

const emptyParamsSchema = z.object({})

export const cataasProvider: PublicApiProviderModule = {
  manifest: {
    id: 'cataas',
    name: 'Cataas',
    description: 'Cat as a service: no-auth HTTPS API for random cat images, tags, and cat metadata.',
    publicApisCategory: 'Animals',
    homepageUrl: 'https://cataas.com/',
    docsUrl: 'https://cataas.com/doc.html',
    auth: {
      mode: 'none',
      notes: ['Public APIs README lists Auth as No; documented GET endpoints require no API key.'],
    },
    tags: ['animals', 'cats', 'images', 'no-auth'],
    freePlanNotes: ['No documented rate limit or maximum page size found in the public Swagger UI.'],
  },
  operations: [
    {
      id: 'cataas.cat',
      providerId: 'cataas',
      name: 'Random cat image metadata',
      commandPath: ['cataas', 'cat'],
      rpcMethod: 'cataas.cat',
      description: 'Fetch one random Cataas cat image metadata object through ?json=true.',
      category: 'animals',
      options: [
        {
          name: 'tag',
          flag: '--tag <tag>',
          description: 'Optional Cataas tag used as /cat/:tag',
          exposure: 'primary',
          group: 'filters',
          reason: 'Primary user-facing way to request a themed random cat.',
        },
      ],
      paramsSchema: cataasRandomParamsSchema,
      execute: params => getCataasRandomCat(params),
      normalizeParams: params => cataasRandomParamsSchema.parse(params),
      resultKind: 'cataas.cat',
      defaultFormat: 'text',
    },
    {
      id: 'cataas.tags',
      providerId: 'cataas',
      name: 'Cat tags',
      commandPath: ['cataas', 'tags'],
      rpcMethod: 'cataas.tags',
      description: 'List Cataas tags from the documented tags endpoint.',
      category: 'animals',
      options: [],
      paramsSchema: emptyParamsSchema,
      execute: () => listCataasTags(),
      normalizeParams: () => ({}),
      resultKind: 'cataas.tags',
      defaultFormat: 'text',
    },
    {
      id: 'cataas.cats',
      providerId: 'cataas',
      name: 'Cat metadata list',
      commandPath: ['cataas', 'cats'],
      rpcMethod: 'cataas.cats',
      description: 'List Cataas cat metadata with optional tags, skip, and limit filters.',
      category: 'animals',
      options: [
        {
          name: 'tags',
          flag: '--tags <tags>',
          description: 'Comma-separated tags filter accepted by Cataas',
          exposure: 'primary',
          group: 'filters',
          reason: 'Primary way to narrow a potentially large metadata list.',
        },
        {
          name: 'skip',
          flag: '--skip <count>',
          description: 'Number of records to skip',
          exposure: 'advanced',
          group: 'pagination',
          reason: 'Useful for pagination replay, but less important than the default first page.',
          valueType: 'integer',
        },
        {
          name: 'limit',
          flag: '--limit <count>',
          description: 'Number of cat metadata records to request',
          exposure: 'primary',
          group: 'pagination',
          reason: 'Controls response size and terminal output length.',
          valueType: 'integer',
        },
      ],
      paramsSchema: cataasCatsParamsSchema,
      execute: params => listCataasCats(params),
      normalizeParams: params => cataasCatsParamsSchema.parse(params),
      resultKind: 'cataas.cats',
      defaultFormat: 'text',
    },
  ],
  endpoints: [
    {
      id: 'cataas-random-cat',
      method: 'GET',
      urlPattern: 'https://cataas.com/cat*',
      category: 'open-api',
      evidenceStatus: 'confirmed',
      description: 'Cataas random cat endpoint with JSON metadata enabled by ?json=true.',
      siteIds: ['public-apis-tui'],
      sampleSources: ['https://cataas.com/doc.html'],
      consumedBy: ['cataas cat'],
      notes: ['No authentication required.'],
    },
    {
      id: 'cataas-tags',
      method: 'GET',
      urlPattern: 'https://cataas.com/api/tags*',
      category: 'open-api',
      evidenceStatus: 'confirmed',
      description: 'Cataas tags endpoint returning a JSON string array.',
      siteIds: ['public-apis-tui'],
      sampleSources: ['https://cataas.com/doc.html'],
      consumedBy: ['cataas tags'],
      notes: ['No authentication required.'],
    },
    {
      id: 'cataas-cats',
      method: 'GET',
      urlPattern: 'https://cataas.com/api/cats*',
      category: 'open-api',
      evidenceStatus: 'confirmed',
      description: 'Cataas cat metadata list endpoint with optional tags, skip, and limit filters.',
      siteIds: ['public-apis-tui'],
      sampleSources: ['https://cataas.com/doc.html'],
      consumedBy: ['cataas cats'],
      notes: ['No authentication required.'],
    },
  ],
}
