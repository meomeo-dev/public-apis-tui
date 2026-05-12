import { z } from 'zod'
import { getMeowFacts, type MeowFactsInput } from '../../application/usecases/meowFacts.js'
import type { PublicApiProviderModule } from '../providerTypes.js'

const meowFactsParamsSchema = z.object({
  count: z.number().int().optional(),
  id: z.number().int().optional(),
  lang: z.string().min(1).optional(),
}) satisfies z.ZodType<MeowFactsInput>

export const meowFactsProvider: PublicApiProviderModule = {
  manifest: {
    id: 'meowfacts',
    name: 'MeowFacts',
    description: 'No-auth HTTPS JSON API for random cat facts with optional count, id, and language parameters.',
    publicApisCategory: 'Animals',
    homepageUrl: 'https://github.com/wh-iterabb-it/meowfacts',
    docsUrl: 'https://github.com/wh-iterabb-it/meowfacts',
    auth: {
      mode: 'none',
      notes: ['Public APIs README lists Auth as No; documented Heroku endpoint requires no API key.'],
    },
    tags: ['animals', 'cats', 'facts', 'i18n', 'no-auth'],
    freePlanNotes: ['No documented maximum count or rate limit found in the README; CLI defaults to 1 and caps --count at 50.'],
  },
  operations: [
    {
      id: 'meowfacts.facts',
      providerId: 'meowfacts',
      name: 'Cat facts',
      commandPath: ['meowfacts', 'facts'],
      rpcMethod: 'meowfacts.facts',
      description: 'Fetch random cat facts from MeowFacts, optionally by count, id, or language.',
      category: 'animals',
      options: [
        {
          name: 'count',
          flag: '--count <count>',
          description: 'Number of cat facts to request, default 1, CLI cap 50',
          exposure: 'primary',
          group: 'pagination',
          reason: 'Documented way to request more than one fact while controlling terminal output length.',
          valueType: 'integer',
          defaultValue: '1',
        },
        {
          name: 'lang',
          flag: '--lang <code>',
          description: 'Documented language code, e.g. eng-us, esp-mx, ukr-ua',
          exposure: 'primary',
          group: 'content',
          reason: 'MeowFacts documents language localization as a core user-facing capability.',
        },
        {
          name: 'id',
          flag: '--id <id>',
          description: 'Specific fact id/order when known',
          exposure: 'advanced',
          group: 'query',
          reason: 'Useful for deterministic lookup but requires users to already know a MeowFacts id/order.',
          valueType: 'integer',
        },
      ],
      paramsSchema: meowFactsParamsSchema,
      execute: params => getMeowFacts(params),
      normalizeParams: params => meowFactsParamsSchema.parse(params),
      resultKind: 'meowfacts.facts',
      defaultFormat: 'text',
    },
  ],
  endpoints: [
    {
      id: 'meowfacts-facts',
      method: 'GET',
      urlPattern: 'https://meowfacts.herokuapp.com/*',
      category: 'open-api',
      evidenceStatus: 'confirmed',
      description: 'MeowFacts endpoint returning a JSON data array of random cat facts.',
      siteIds: ['public-apis-tui'],
      sampleSources: ['https://github.com/wh-iterabb-it/meowfacts'],
      consumedBy: ['meowfacts facts'],
      notes: ['No authentication required.', 'Documented query parameters include count, id, and lang.'],
    },
  ],
}
