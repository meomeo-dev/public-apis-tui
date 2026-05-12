import { z } from 'zod'
import {
  getAnimeChanRandomQuote,
  type AnimeChanRandomInput,
} from '../../application/usecases/animeChan.js'
import type { PublicApiProviderModule } from '../providerTypes.js'

const randomQuoteParamsSchema = z.object({
  anime: z.string().min(1).optional(),
  character: z.string().min(1).optional(),
}) satisfies z.ZodType<AnimeChanRandomInput>

export const animeChanProvider: PublicApiProviderModule = {
  manifest: {
    id: 'animechan',
    name: 'AnimeChan',
    description: 'No-auth Animechan quote API for random anime quotes.',
    publicApisCategory: 'Anime',
    homepageUrl: 'https://animechan.io/',
    docsUrl: 'https://animechan.io/docs',
    auth: {
      mode: 'none',
      notes: [
        'Public APIs README lists Auth as No.',
        'Animechan docs allow free no-key access with a low hourly rate limit; x-api-key is only for supporter higher limits.',
      ],
    },
    tags: ['anime', 'quotes', 'no-auth'],
    freePlanNotes: ['Official docs state all endpoints are free with a default rate limit of 5 requests per hour.'],
  },
  operations: [
    {
      id: 'animechan.random',
      providerId: 'animechan',
      name: 'Random anime quote',
      commandPath: ['animechan', 'random'],
      rpcMethod: 'animechan.random',
      description: 'Fetch one random AnimeChan quote, optionally filtered by anime or character.',
      category: 'anime',
      options: [
        {
          name: 'anime',
          flag: '--anime <name>',
          description: 'Optional anime name filter for /quotes/random',
          exposure: 'primary',
          group: 'filters',
          reason: 'A common terminal task is asking for a quote from one known anime while still receiving a compact result.',
        },
        {
          name: 'character',
          flag: '--character <name>',
          description: 'Optional character name filter for /quotes/random',
          exposure: 'primary',
          group: 'filters',
          reason: 'Character lookup is documented and useful enough to expose, but remains mutually exclusive with --anime.',
        },
      ],
      paramsSchema: randomQuoteParamsSchema,
      execute: params => getAnimeChanRandomQuote(params),
      normalizeParams: params => randomQuoteParamsSchema.parse(params),
      resultKind: 'animechan.random',
      defaultFormat: 'text',
    },
  ],
  endpoints: [
    {
      id: 'animechan-random-quote',
      method: 'GET',
      urlPattern: 'https://api.animechan.io/v1/quotes/random*',
      category: 'open-api',
      evidenceStatus: 'confirmed',
      description: 'AnimeChan endpoint returning one random quote JSON envelope, optionally filtered by anime or character.',
      siteIds: ['public-apis-tui'],
      sampleSources: [
        'https://animechan.io/docs',
        'https://animechan.io/docs/quote/random',
        'https://animechan.io/docs/quote/random-via-anime',
        'https://animechan.io/docs/quote/random-via-character',
      ],
      consumedBy: ['animechan random'],
      notes: ['No key required for free tier.', 'Free tier is documented as 5 requests per hour.'],
    },
  ],
}
