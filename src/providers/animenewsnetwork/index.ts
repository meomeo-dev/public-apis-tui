import { z } from 'zod'
import {
  listAnimeNewsNetworkTitles,
  type AnimeNewsNetworkTitlesInput,
} from '../../application/usecases/animeNewsNetwork.js'
import type { PublicApiProviderModule } from '../providerTypes.js'

const titlesParamsSchema = z.object({
  skip: z.number().int().optional(),
  limit: z.number().int().optional(),
  namePrefix: z.string().min(1).optional(),
}) satisfies z.ZodType<AnimeNewsNetworkTitlesInput>

export const animeNewsNetworkProvider: PublicApiProviderModule = {
  manifest: {
    id: 'animenewsnetwork',
    name: 'AnimeNewsNetwork',
    description: 'No-auth Anime News Network Encyclopedia XML reports for anime title metadata.',
    publicApisCategory: 'Anime',
    homepageUrl: 'https://www.animenewsnetwork.com/encyclopedia/api.php',
    docsUrl: 'https://www.animenewsnetwork.com/encyclopedia/api.php',
    auth: {
      mode: 'none',
      notes: ['Official Encyclopedia API docs describe free XML feeds without API keys.'],
    },
    tags: ['anime', 'encyclopedia', 'xml', 'no-auth'],
    freePlanNotes: [
      'Official docs state a 1 request/second/IP rate limit.',
      'Provider terms require Anime News Network source/link attribution on pages displaying data.',
      'Docs support nlist=all, but CLI defaults to the documented 50-row example and caps interactive output at 200 rows.',
    ],
  },
  operations: [
    {
      id: 'animenewsnetwork.titles',
      providerId: 'animenewsnetwork',
      name: 'Anime title report',
      commandPath: ['animenewsnetwork', 'titles'],
      rpcMethod: 'animenewsnetwork.titles',
      description: 'List recently added Anime News Network anime encyclopedia titles from report 155.',
      category: 'anime',
      options: [
        {
          name: 'limit',
          flag: '--limit <count>',
          description: 'Number of anime title rows to request, capped to 200 for terminal output',
          exposure: 'primary',
          group: 'pagination',
          reason: 'Controls XML report size while respecting the provider rate limit and terminal readability.',
          valueType: 'integer',
          defaultValue: '50',
        },
        {
          name: 'skip',
          flag: '--skip <count>',
          description: 'Number of report rows to skip',
          exposure: 'advanced',
          group: 'pagination',
          reason: 'Supports documented nskip pagination without cluttering the common first-page workflow.',
          valueType: 'integer',
          defaultValue: '0',
        },
        {
          name: 'namePrefix',
          flag: '--name-prefix <text>',
          description: 'Optional documented name prefix filter, e.g. Z',
          exposure: 'primary',
          group: 'filters',
          reason: 'The docs explicitly show name=Z for titles starting with a prefix, which is useful for terminal exploration.',
        },
      ],
      paramsSchema: titlesParamsSchema,
      execute: params => listAnimeNewsNetworkTitles(params),
      normalizeParams: params => titlesParamsSchema.parse(params),
      resultKind: 'animenewsnetwork.titles',
      defaultFormat: 'text',
    },
  ],
  endpoints: [
    {
      id: 'animenewsnetwork-reports-xml',
      method: 'GET',
      urlPattern: 'https://www.animenewsnetwork.com/encyclopedia/reports.xml*',
      category: 'open-api',
      evidenceStatus: 'confirmed',
      description: 'Anime News Network Encyclopedia report XML endpoint used for anime title rows.',
      siteIds: ['public-apis-tui'],
      sampleSources: ['https://www.animenewsnetwork.com/encyclopedia/api.php'],
      consumedBy: ['animenewsnetwork titles'],
      notes: [
        'No authentication required.',
        'Docs state 1 request/second/IP rate limit.',
        'api.xml title-detail endpoint is documented but returned Cloudflare 502/504 during 2026-05-03 research; this provider only consumes reports.xml.',
      ],
    },
  ],
}
