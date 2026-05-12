import { z } from 'zod'
import {
  getSteemThread,
  listSteemDiscussions,
  type SteemDiscussionsInput,
  type SteemThreadInput,
} from '../../application/usecases/steem.js'
import type { PublicApiOperationDefinition, PublicApiProviderModule } from '../providerTypes.js'

const discussionsParamsSchema = z.object({
  sort: z.string().min(1).optional(),
  tag: z.string().min(1).optional(),
  limit: z.number().int().optional(),
  truncateBody: z.number().int().optional(),
}) satisfies z.ZodType<SteemDiscussionsInput>

const threadParamsSchema = z.object({
  author: z.string().min(1).optional(),
  permlink: z.string().min(1).optional(),
  cursor: z.number().int().optional(),
  pageSize: z.number().int().optional(),
  direction: z.string().min(1).optional(),
  truncateBody: z.number().int().optional(),
}) satisfies z.ZodType<SteemThreadInput>

const discussionsOperation: PublicApiOperationDefinition<SteemDiscussionsInput> = {
  id: 'steem.discussions',
  providerId: 'steem',
  name: 'Discussions',
  commandPath: ['steem', 'discussions'],
  rpcMethod: 'steem.discussions',
  description: 'List Steem discussions from the no-auth condenser_api JSON-RPC endpoint.',
  category: 'blockchain',
  options: [
    {
      name: 'tag',
      flag: '--tag <name>',
      description: 'Discussion tag/category; default steem',
      exposure: 'primary',
      group: 'query',
      reason: 'Primary discovery filter for Steem discussion APIs.',
      defaultValue: 'steem',
    },
    {
      name: 'sort',
      flag: '--sort <trending|created|hot>',
      description: 'Discussion sort endpoint; default trending',
      exposure: 'primary',
      group: 'filters',
      reason: 'Maps to the three most terminal-useful documented condenser discussion methods.',
      defaultValue: 'trending',
    },
    {
      name: 'limit',
      flag: '--limit <count>',
      description: 'Maximum discussions to return, 1-100; default 100',
      exposure: 'primary',
      group: 'pagination',
      reason: 'Uses the documented/common condenser discussion limit maximum while bounding API usage.',
      valueType: 'integer',
      defaultValue: '100',
    },
    {
      name: 'truncateBody',
      flag: '--truncate-body <chars>',
      description: 'Body preview truncation length sent to Steem RPC, 0-500; default 200',
      exposure: 'advanced',
      group: 'presentation',
      reason: 'Controls payload size and readable preview without exposing full raw post bodies by default.',
      valueType: 'integer',
      defaultValue: '200',
    },
  ],
  paramsSchema: discussionsParamsSchema,
  execute: params => listSteemDiscussions(params),
  normalizeParams: params => discussionsParamsSchema.parse(params),
  resultKind: 'steem.discussions',
  defaultFormat: 'text',
}

const threadOperation: PublicApiOperationDefinition<SteemThreadInput> = {
  id: 'steem.thread',
  providerId: 'steem',
  name: 'Thread',
  commandPath: ['steem', 'thread'],
  rpcMethod: 'steem.thread',
  description: 'Read a full Steem post and reply thread with scroll-style TUI pagination.',
  category: 'blockchain',
  options: [
    {
      name: 'author',
      flag: '--author <account>',
      description: 'Root post author account, required',
      exposure: 'primary',
      group: 'query',
      reason: 'Required identifier for condenser_api.get_content and reply traversal.',
    },
    {
      name: 'permlink',
      flag: '--permlink <slug>',
      description: 'Root post permlink, required',
      exposure: 'primary',
      group: 'query',
      reason: 'Required identifier for condenser_api.get_content and reply traversal.',
    },
    {
      name: 'cursor',
      flag: '--cursor <index>',
      description: 'Zero-based flattened thread index for scroll window; default 0',
      exposure: 'primary',
      group: 'pagination',
      reason: 'Supports TUI up/down reading without refetching an unrelated discussion list.',
      valueType: 'integer',
      defaultValue: '0',
    },
    {
      name: 'direction',
      flag: '--direction <down|up>',
      description: 'Scroll direction from cursor; default down',
      exposure: 'primary',
      group: 'pagination',
      reason: 'Makes top/bottom movement explicit and mirrors the Hacker News thread reader UX.',
      defaultValue: 'down',
    },
    {
      name: 'pageSize',
      flag: '--page-size <count>',
      description: 'Visible thread entries, 1-100; default 25',
      exposure: 'primary',
      group: 'pagination',
      reason: 'Bounds terminal output while preserving full JSON thread data for --format json.',
      valueType: 'integer',
      defaultValue: '25',
    },
    {
      name: 'truncateBody',
      flag: '--truncate-body <chars>',
      description: 'Per-entry body preview length, 0-2000; default 500',
      exposure: 'advanced',
      group: 'presentation',
      reason: 'Controls terminal readability for long posts and replies while JSON preserves all fetched entries.',
      valueType: 'integer',
      defaultValue: '500',
    },
  ],
  paramsSchema: threadParamsSchema,
  execute: params => getSteemThread(params),
  normalizeParams: params => threadParamsSchema.parse(params),
  resultKind: 'steem.thread',
  defaultFormat: 'text',
}

export const steemProvider: PublicApiProviderModule = {
  manifest: {
    id: 'steem',
    name: 'Steem',
    description: 'No-auth JSON-RPC API for Steem social blockchain discussions.',
    publicApisCategory: 'Blockchain',
    homepageUrl: 'https://steem.com/',
    docsUrl: 'https://developers.steem.io/apidefinitions/condenser-api',
    auth: {
      mode: 'none',
      notes: ['Read-only condenser_api discussion methods are callable without API keys.'],
    },
    tags: ['blockchain', 'social', 'json-rpc', 'discussions', 'thread-reader', 'no-auth'],
    freePlanNotes: [
      'Implementation only uses read-only condenser_api discussion and content methods.',
      'CLI defaults limit to 100 and body truncation to 200 characters for lists; thread pages default to 25 entries.',
    ],
  },
  operations: [discussionsOperation, threadOperation],
  endpoints: [
    {
      id: 'steem-condenser-api',
      method: 'POST',
      urlPattern: 'https://api.steemit.com/',
      category: 'open-api',
      evidenceStatus: 'confirmed',
      description: 'Steem JSON-RPC condenser_api endpoint for read-only discussion and content methods.',
      siteIds: ['public-apis-tui'],
      sampleSources: ['https://developers.steem.io/apidefinitions/condenser-api'],
      consumedBy: ['steem discussions', 'steem thread'],
      notes: ['No authentication required for read-only discussion calls.', 'Uses condenser_api.get_discussions_by_trending/created/hot, get_content, and get_content_replies.'],
    },
  ],
}

export type { SteemDiscussionsInput, SteemThreadInput } from '../../application/usecases/steem.js'
