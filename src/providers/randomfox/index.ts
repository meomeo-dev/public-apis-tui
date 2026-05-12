import { z } from 'zod'
import { getRandomFoxFloof } from '../../application/usecases/randomFox.js'
import type { PublicApiProviderModule } from '../providerTypes.js'

const emptyParamsSchema = z.object({})

export const randomFoxProvider: PublicApiProviderModule = {
  manifest: {
    id: 'randomfox',
    name: 'RandomFox',
    description: 'No-auth HTTPS JSON API for random fox image URLs.',
    publicApisCategory: 'Animals',
    homepageUrl: 'https://randomfox.ca/',
    docsUrl: 'https://randomfox.ca/',
    auth: {
      mode: 'none',
      notes: ['Public APIs README lists Auth as No; homepage documents /floof as an available API with no key.'],
    },
    tags: ['animals', 'foxes', 'images', 'no-auth'],
    freePlanNotes: ['No documented rate limit or page-size maximum; /floof returns one random fox object per request.'],
  },
  operations: [
    {
      id: 'randomfox.floof',
      providerId: 'randomfox',
      name: 'Random fox floof',
      commandPath: ['randomfox', 'floof'],
      rpcMethod: 'randomfox.floof',
      description: 'Fetch one random fox image URL and page link from /floof/.',
      category: 'animals',
      options: [],
      paramsSchema: emptyParamsSchema,
      execute: () => getRandomFoxFloof(),
      normalizeParams: () => ({}),
      resultKind: 'randomfox.floof',
      defaultFormat: 'text',
    },
  ],
  endpoints: [
    {
      id: 'randomfox-floof',
      method: 'GET',
      urlPattern: 'https://randomfox.ca/floof/*',
      category: 'open-api',
      evidenceStatus: 'confirmed',
      description: 'RandomFox endpoint returning one random fox image URL and page link as JSON.',
      siteIds: ['public-apis-tui'],
      sampleSources: ['https://randomfox.ca/'],
      consumedBy: ['randomfox floof'],
      notes: ['No authentication required.', 'The slashless /floof path redirects to /floof/.'],
    },
  ],
}
