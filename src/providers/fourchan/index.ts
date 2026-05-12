import { z } from 'zod'
import { listFourChanBoards, listFourChanCatalog, type FourChanBoardsResult, type FourChanCatalogResult } from '../../application/usecases/fourChan.js'
import { FOURCHAN_DEFAULT_BOARD, FOURCHAN_DEFAULT_LIMIT, FOURCHAN_MAX_LIMIT, normalizeFourChanBoardsInput, normalizeFourChanCatalogInput, type FourChanBoardsInput, type FourChanCatalogInput } from '../../infrastructure/openApis/fourChanClient.js'
import type { PublicApiOperationDefinition, PublicApiProviderModule } from '../providerTypes.js'

const boardsParamsSchema = z.object({
  query: z.string().min(1).optional(),
  limit: z.coerce.number().optional(),
}) satisfies z.ZodType<FourChanBoardsInput>

const catalogParamsSchema = z.object({
  board: z.string().min(1).optional(),
  limit: z.coerce.number().optional(),
}) satisfies z.ZodType<FourChanCatalogInput>

const boardsOperation: PublicApiOperationDefinition<FourChanBoardsInput> = {
  id: '4chan.boards',
  providerId: '4chan',
  name: 'Boards',
  commandPath: ['4chan', 'boards'],
  rpcMethod: '4chan.boards',
  description: 'List public 4chan boards from the no-auth JSON API.',
  category: 'social',
  options: [
    { name: 'query', flag: '--query <text>', description: 'Filter boards by id, title, or description', exposure: 'primary', group: 'query', reason: 'Lets users discover relevant boards before catalog queries without exposing raw API internals.' },
    { name: 'limit', flag: '--limit <count>', description: `Boards to return, 1-${FOURCHAN_MAX_LIMIT}; default ${FOURCHAN_DEFAULT_LIMIT}`, exposure: 'primary', group: 'pagination', reason: 'Bounds terminal output while the endpoint returns a fixed board list.', valueType: 'integer', defaultValue: String(FOURCHAN_DEFAULT_LIMIT) },
  ],
  paramsSchema: boardsParamsSchema,
  execute: params => listFourChanBoards(params),
  normalizeParams: params => boardsParamsSchema.parse(params),
  createCacheKeyParams: params => normalizeFourChanBoardsInput(params),
  resultKind: '4chan.boards',
  defaultFormat: 'text',
}

const catalogOperation: PublicApiOperationDefinition<FourChanCatalogInput> = {
  id: '4chan.catalog',
  providerId: '4chan',
  name: 'Catalog',
  commandPath: ['4chan', 'catalog'],
  rpcMethod: '4chan.catalog',
  description: 'List public 4chan thread previews from one board catalog JSON document.',
  category: 'social',
  options: [
    { name: 'board', flag: '--board <id>', description: `Board id, default ${FOURCHAN_DEFAULT_BOARD}`, exposure: 'primary', group: 'query', reason: 'Board id is the core discovery dimension for 4chan catalogs.', defaultValue: FOURCHAN_DEFAULT_BOARD },
    { name: 'limit', flag: '--limit <count>', description: `Thread previews to return, 1-${FOURCHAN_MAX_LIMIT}; default ${FOURCHAN_DEFAULT_LIMIT}`, exposure: 'primary', group: 'pagination', reason: 'Catalog endpoints return all pages; limit bounds persisted/terminal payloads.', valueType: 'integer', defaultValue: String(FOURCHAN_DEFAULT_LIMIT) },
  ],
  paramsSchema: catalogParamsSchema,
  execute: params => listFourChanCatalog(params),
  normalizeParams: params => catalogParamsSchema.parse(params),
  createCacheKeyParams: params => normalizeFourChanCatalogInput(params),
  resultKind: '4chan.catalog',
  defaultFormat: 'text',
}

export const fourChanProvider: PublicApiProviderModule = {
  manifest: {
    id: '4chan',
    name: '4chan',
    description: 'No-auth JSON endpoints for 4chan board metadata and thread catalog previews.',
    publicApisCategory: 'Social',
    homepageUrl: 'https://www.4chan.org/',
    docsUrl: 'https://github.com/4chan/4chan-API',
    auth: { mode: 'none', notes: ['Read-only board and catalog JSON endpoints require no API keys, OAuth, cookies, browser sessions, or account preparation.'] },
    tags: ['social', 'imageboard', 'catalog', 'user-generated-content', 'no-auth'],
    freePlanNotes: ['Endpoints are fixed JSON documents; CLI caps returned rows at 150 and live e2e uses limit=3 to keep requests modest.', 'Public responses are untrusted user-generated content; renderer strips HTML and never uses browser clickstream.'],
  },
  operations: [boardsOperation, catalogOperation],
  endpoints: [
    { id: '4chan-boards-json', method: 'GET', urlPattern: 'https://a.4cdn.org/boards.json', category: 'public-api:social', evidenceStatus: 'confirmed', observedOn: '2026-05-04', sampleSources: ['https://github.com/4chan/4chan-API'], consumedBy: ['4chan.boards'], description: '4chan board metadata JSON list.', notes: ['No authentication required.', 'Untrusted user-generated platform metadata.'] },
    { id: '4chan-catalog-json', method: 'GET', urlPattern: 'https://a.4cdn.org/*/catalog.json', category: 'public-api:social', evidenceStatus: 'confirmed', observedOn: '2026-05-04', sampleSources: ['https://github.com/4chan/4chan-API'], consumedBy: ['4chan.catalog'], description: '4chan per-board catalog JSON with thread previews.', notes: ['No authentication required.', 'Thread comments are untrusted user-generated content and must be rendered as plain text only.'] },
  ],
}

export type { FourChanBoardsResult, FourChanCatalogResult }
