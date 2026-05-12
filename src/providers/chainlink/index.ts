import { z } from 'zod'
import { listChainlinkFeeds, type ChainlinkFeedsInput } from '../../application/usecases/chainlink.js'
import type { PublicApiOperationDefinition, PublicApiProviderModule } from '../providerTypes.js'

const feedsParamsSchema = z.object({
  network: z.string().min(1).optional(),
  query: z.string().min(1).optional(),
  category: z.string().min(1).optional(),
  assetClass: z.string().min(1).optional(),
  limit: z.number().int().optional(),
}) satisfies z.ZodType<ChainlinkFeedsInput>

const feedsOperation: PublicApiOperationDefinition<ChainlinkFeedsInput> = {
  id: 'chainlink.feeds',
  providerId: 'chainlink',
  name: 'Data Feeds',
  commandPath: ['chainlink', 'feeds'],
  rpcMethod: 'chainlink.feeds',
  description: 'List Chainlink Data Feeds reference-data-directory rows from no-auth HTTPS JSON files.',
  category: 'blockchain',
  options: [
    {
      name: 'network',
      flag: '--network <alias>',
      description: 'Feed file alias: ethereum-mainnet, arbitrum-mainnet, or avalanche-mainnet; default ethereum-mainnet',
      exposure: 'primary',
      group: 'filters',
      reason: 'Selects the documented feed address dataset while keeping network expansion explicit.',
      defaultValue: 'ethereum-mainnet',
    },
    {
      name: 'query',
      flag: '--query <text>',
      description: 'Filter by feed name, asset name, or path',
      exposure: 'primary',
      group: 'query',
      reason: 'Primary terminal discovery control for large feed catalogs.',
    },
    {
      name: 'limit',
      flag: '--limit <count>',
      description: 'Maximum feeds to show, 1-100; default 100',
      exposure: 'primary',
      group: 'pagination',
      reason: 'Bounds terminal output because feed files contain hundreds of rows and no finite API maximum is documented.',
      valueType: 'integer',
      defaultValue: '100',
    },
    {
      name: 'category',
      flag: '--category <text>',
      description: 'Filter by feedCategory text',
      exposure: 'advanced',
      group: 'filters',
      reason: 'Useful documented metadata filter for power users without overwhelming first-run UX.',
    },
    {
      name: 'assetClass',
      flag: '--asset-class <text>',
      description: 'Filter by docs.assetClass text when available',
      exposure: 'advanced',
      group: 'filters',
      reason: 'Optional metadata filter exposed because some Chainlink feed rows include docs asset-class information.',
    },
  ],
  paramsSchema: feedsParamsSchema,
  execute: params => listChainlinkFeeds(params),
  normalizeParams: params => feedsParamsSchema.parse(params),
  resultKind: 'chainlink.feeds',
  defaultFormat: 'text',
}

export const chainlinkProvider: PublicApiProviderModule = {
  manifest: {
    id: 'chainlink',
    name: 'Chainlink',
    description: 'No-auth HTTPS JSON catalog for Chainlink Data Feeds reference data.',
    publicApisCategory: 'Blockchain',
    homepageUrl: 'https://dev.chain.link/',
    docsUrl: 'https://docs.chain.link/data-feeds/price-feeds/addresses',
    auth: {
      mode: 'none',
      notes: [
        'Reference-data-directory feed JSON files are publicly readable without API keys.',
        'Separate Chainlink Data Streams API endpoints require HMAC headers and are intentionally not used.',
      ],
    },
    tags: ['blockchain', 'oracles', 'data-feeds', 'reference-data', 'no-auth'],
    freePlanNotes: [
      'The public-apis developer-resources URL redirects to Chainlink DevHub.',
      'Docs/data pages reference public reference-data-directory JSON files for feed address metadata.',
      'No finite result maximum or rate limit was found for these static JSON files; CLI caps output at 100.',
    ],
  },
  operations: [feedsOperation],
  endpoints: [
    {
      id: 'chainlink-reference-data-directory-feeds',
      method: 'GET',
      urlPattern: 'https://reference-data-directory.vercel.app/feeds-*.json',
      category: 'open-api',
      evidenceStatus: 'confirmed',
      description: 'Chainlink reference-data-directory JSON files containing Data Feeds metadata.',
      siteIds: ['public-apis-tui'],
      sampleSources: ['https://docs.chain.link/data-feeds/price-feeds/addresses', 'https://data.chain.link/'],
      consumedBy: ['chainlink feeds'],
      notes: [
        'No authentication required for feed metadata JSON files.',
        'Data Streams report APIs require HMAC headers and are excluded from this no-auth provider.',
      ],
    },
  ],
}

export type { ChainlinkFeedsInput } from '../../application/usecases/chainlink.js'
