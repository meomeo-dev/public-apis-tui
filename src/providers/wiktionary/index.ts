import { z } from 'zod'
import {
  extractWiktionary,
  searchWiktionary,
  type WiktionaryExtractInput,
  type WiktionarySearchInput,
} from '../../application/usecases/wiktionary.js'
import {
  normalizeWiktionaryExtractInput,
  normalizeWiktionarySearchInput,
} from '../../infrastructure/openApis/wiktionaryClient.js'
import type { PublicApiOperationDefinition, PublicApiProviderModule } from '../providerTypes.js'

const searchParamsSchema = z.object({
  query: z.string().optional(),
  limit: z.number().int().optional(),
  offset: z.number().int().optional(),
}) satisfies z.ZodType<WiktionarySearchInput>

const extractParamsSchema = z.object({
  title: z.string().optional(),
  chars: z.number().int().optional(),
  redirects: z.boolean().optional(),
}) satisfies z.ZodType<WiktionaryExtractInput>

const searchOperation: PublicApiOperationDefinition<WiktionarySearchInput> = {
  id: 'wiktionary.search',
  providerId: 'wiktionary',
  name: 'Search Entries',
  commandPath: ['wiktionary', 'search'],
  rpcMethod: 'wiktionary.search',
  description: 'Search Wiktionary entries through the no-auth MediaWiki Action API.',
  category: 'dictionaries',
  options: [
    {
      name: 'query',
      flag: '--query <text>',
      description: 'Search text, default hello',
      exposure: 'primary',
      group: 'query',
      reason: 'MediaWiki search is the primary discovery workflow for Wiktionary entries.',
      defaultValue: 'hello',
    },
    {
      name: 'limit',
      flag: '--limit <count>',
      description: 'Search results to show, default/max 50',
      exposure: 'primary',
      group: 'pagination',
      reason: 'The Action API search limit is bounded for anonymous clients; 50 maximizes one request while keeping output readable.',
      valueType: 'integer',
      defaultValue: '50',
    },
    {
      name: 'offset',
      flag: '--offset <count>',
      description: 'Search result offset, default 0',
      exposure: 'advanced',
      group: 'pagination',
      reason: 'Offset is the documented continuation value and supports offline replay of paged searches.',
      valueType: 'integer',
      defaultValue: '0',
    },
  ],
  paramsSchema: searchParamsSchema,
  execute: params => searchWiktionary(params),
  normalizeParams: params => searchParamsSchema.parse(params),
  createCacheKeyParams: params => normalizeWiktionarySearchInput(params),
  resultKind: 'wiktionary.search',
  defaultFormat: 'text',
}

const extractOperation: PublicApiOperationDefinition<WiktionaryExtractInput> = {
  id: 'wiktionary.extract',
  providerId: 'wiktionary',
  name: 'Entry Extract',
  commandPath: ['wiktionary', 'extract'],
  rpcMethod: 'wiktionary.extract',
  description: 'Fetch a plaintext extract for one Wiktionary page title.',
  category: 'dictionaries',
  options: [
    {
      name: 'title',
      flag: '--title <title>',
      description: 'Wiktionary page title, default hello',
      exposure: 'primary',
      group: 'query',
      reason: 'The extracts query is title-addressed and this is the primary lookup input.',
      defaultValue: 'hello',
    },
    {
      name: 'chars',
      flag: '--chars <count>',
      description: 'Extract characters to request, default 4000, CLI cap 12000',
      exposure: 'primary',
      group: 'pagination',
      reason: 'Extracts can be long; a bounded character cap keeps TUI/cache output readable.',
      valueType: 'integer',
      defaultValue: '4000',
    },
    {
      name: 'redirects',
      flag: '--redirects <true|false>',
      description: 'Follow redirects, default true',
      exposure: 'advanced',
      group: 'filters',
      reason: 'Redirect handling is documented and useful, but not needed for the common lookup path.',
      valueType: 'boolean',
      defaultValue: 'true',
    },
  ],
  paramsSchema: extractParamsSchema,
  execute: params => extractWiktionary(params),
  normalizeParams: params => extractParamsSchema.parse(params),
  createCacheKeyParams: params => normalizeWiktionaryExtractInput(params),
  resultKind: 'wiktionary.extract',
  defaultFormat: 'text',
}

export const wiktionaryProvider: PublicApiProviderModule = {
  manifest: {
    id: 'wiktionary',
    name: 'Wiktionary',
    description: 'No-auth HTTPS JSON MediaWiki Action API for searching Wiktionary and reading plaintext page extracts.',
    publicApisCategory: 'Dictionaries',
    homepageUrl: 'https://en.wiktionary.org/wiki/Wiktionary:Main_Page',
    docsUrl: 'https://www.mediawiki.org/wiki/API:Main_page',
    auth: {
      mode: 'none',
      notes: ['The public MediaWiki Action API supports read-only query/search/extract calls without API keys.'],
    },
    tags: ['dictionary', 'wiktionary', 'mediawiki', 'search', 'extracts', 'no-auth', 'json'],
    freePlanNotes: [
      'Wikimedia API etiquette applies: identify the client and avoid high request rates.',
      'Anonymous search limits are bounded; CLI defaults and caps search --limit at 50.',
      'Plaintext extracts require the TextExtracts module; CLI caps --chars at 12000 for readable terminal/cache output.',
    ],
  },
  operations: [searchOperation, extractOperation],
  endpoints: [
    {
      id: 'wiktionary-action-api-search',
      method: 'GET',
      urlPattern: 'https://en.wiktionary.org/w/api.php*',
      category: 'open-api',
      evidenceStatus: 'confirmed',
      description: 'Wiktionary MediaWiki Action API search query.',
      siteIds: ['public-apis-tui'],
      observedOn: '2026-05-04',
      sampleSources: [
        'https://www.mediawiki.org/wiki/API:Main_page',
        'https://en.wiktionary.org/w/api.php?action=query&format=json&list=search&srsearch=hello&srlimit=3',
      ],
      consumedBy: ['wiktionary search'],
      notes: ['No authentication required for read-only search.', 'No browser clickstream or scraping required.'],
    },
    {
      id: 'wiktionary-action-api-extracts',
      method: 'GET',
      urlPattern: 'https://en.wiktionary.org/w/api.php*',
      category: 'open-api',
      evidenceStatus: 'confirmed',
      description: 'Wiktionary MediaWiki Action API plaintext extracts query.',
      siteIds: ['public-apis-tui'],
      observedOn: '2026-05-04',
      sampleSources: [
        'https://www.mediawiki.org/wiki/Extension:TextExtracts#API',
        'https://en.wiktionary.org/w/api.php?action=query&format=json&prop=extracts&explaintext=1&titles=hello',
      ],
      consumedBy: ['wiktionary extract'],
      notes: ['No authentication required for read-only extracts.', 'No browser clickstream or scraping required.'],
    },
  ],
}
