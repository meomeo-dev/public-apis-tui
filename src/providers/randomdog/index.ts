import { z } from 'zod'
import { getRandomDogWoof, listRandomDogFiles, type RandomDogFilesInput } from '../../application/usecases/randomDog.js'
import type { PublicApiProviderModule } from '../providerTypes.js'

const emptyParamsSchema = z.object({})

const randomDogFilesParamsSchema = z.object({
  limit: z.number().int().optional(),
  mediaType: z.string().min(1).optional(),
}) satisfies z.ZodType<RandomDogFilesInput>

export const randomDogProvider: PublicApiProviderModule = {
  manifest: {
    id: 'randomdog',
    name: 'RandomDog',
    description: 'No-auth HTTPS JSON API for random dog media and the known dog media filename list.',
    publicApisCategory: 'Animals',
    homepageUrl: 'https://random.dog/',
    docsUrl: 'https://random.dog/',
    auth: {
      mode: 'none',
      notes: ['Public APIs README lists Auth as No; homepage links documented GET endpoints without an API key.'],
    },
    tags: ['animals', 'dogs', 'images', 'video', 'no-auth'],
    freePlanNotes: ['No documented rate limit or page-size maximum; /doggos returns the full filename list, and CLI defaults --limit to 20 with a cap of 200.'],
  },
  operations: [
    {
      id: 'randomdog.woof',
      providerId: 'randomdog',
      name: 'Random dog media',
      commandPath: ['randomdog', 'woof'],
      rpcMethod: 'randomdog.woof',
      description: 'Fetch one random dog media URL and file size from /woof.json.',
      category: 'animals',
      options: [],
      paramsSchema: emptyParamsSchema,
      execute: () => getRandomDogWoof(),
      normalizeParams: () => ({}),
      resultKind: 'randomdog.woof',
      defaultFormat: 'text',
    },
    {
      id: 'randomdog.files',
      providerId: 'randomdog',
      name: 'Known dog media files',
      commandPath: ['randomdog', 'files'],
      rpcMethod: 'randomdog.files',
      description: 'List known RandomDog media filenames with optional media-type filtering.',
      category: 'animals',
      options: [
        {
          name: 'limit',
          flag: '--limit <count>',
          description: 'Number of filenames to show, default 20, CLI cap 200',
          exposure: 'primary',
          group: 'pagination',
          reason: 'The documented /doggos endpoint returns a large array; limit keeps terminal output usable.',
          valueType: 'integer',
          defaultValue: '20',
        },
        {
          name: 'mediaType',
          flag: '--media-type <type>',
          description: 'Filter files by inferred media type: image or video',
          exposure: 'primary',
          group: 'filters',
          reason: 'RandomDog includes images and videos; filtering helps users choose terminal-friendly URLs.',
        },
      ],
      paramsSchema: randomDogFilesParamsSchema,
      execute: params => listRandomDogFiles(params),
      normalizeParams: params => randomDogFilesParamsSchema.parse(params),
      resultKind: 'randomdog.files',
      defaultFormat: 'text',
    },
  ],
  endpoints: [
    {
      id: 'randomdog-woof-json',
      method: 'GET',
      urlPattern: 'https://random.dog/woof.json',
      category: 'open-api',
      evidenceStatus: 'confirmed',
      description: 'RandomDog endpoint returning one random dog media URL and file size as JSON.',
      siteIds: ['public-apis-tui'],
      sampleSources: ['https://random.dog/'],
      consumedBy: ['randomdog woof'],
      notes: ['No authentication required.'],
    },
    {
      id: 'randomdog-doggos',
      method: 'GET',
      urlPattern: 'https://random.dog/doggos',
      category: 'open-api',
      evidenceStatus: 'confirmed',
      description: 'RandomDog endpoint returning the known dog media filename list as JSON.',
      siteIds: ['public-apis-tui'],
      sampleSources: ['https://random.dog/'],
      consumedBy: ['randomdog files'],
      notes: ['No authentication required.'],
    },
  ],
}
