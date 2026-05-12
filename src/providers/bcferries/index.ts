import { z } from 'zod'
import { listBcFerriesRoutes, type BcFerriesRoutesResult } from '../../application/usecases/bcFerries.js'
import { BC_FERRIES_DEFAULT_LIMIT, BC_FERRIES_DEFAULT_TYPE, BC_FERRIES_MAX_LIMIT, normalizeBcFerriesRoutesInput, type BcFerriesRoutesInput } from '../../infrastructure/openApis/bcFerriesClient.js'
import type { PublicApiOperationDefinition, PublicApiProviderModule } from '../providerTypes.js'

const routesParamsSchema = z.object({
  type: z.string().min(1).optional(),
  routeCode: z.string().min(1).optional(),
  limit: z.coerce.number().optional(),
}) satisfies z.ZodType<BcFerriesRoutesInput>

const routesOperation: PublicApiOperationDefinition<BcFerriesRoutesInput> = {
  id: 'bcferries.routes',
  providerId: 'bcferries',
  name: 'Routes',
  commandPath: ['bcferries', 'routes'],
  rpcMethod: 'bcferries.routes',
  description: 'List BC Ferries capacity or non-capacity route sailing snapshots.',
  category: 'transportation',
  options: [
    { name: 'type', flag: '--type <capacity|noncapacity>', description: `Route dataset type, default ${BC_FERRIES_DEFAULT_TYPE}`, exposure: 'primary', group: 'query', reason: 'Selects the two documented route datasets without exposing raw paths.', defaultValue: BC_FERRIES_DEFAULT_TYPE },
    { name: 'routeCode', flag: '--route-code <code>', description: 'Optional route code filter such as HSBNAN', exposure: 'primary', group: 'filters', reason: 'Route code is the most useful terminal filter for specific ferry corridor monitoring.' },
    { name: 'limit', flag: '--limit <count>', description: `Routes to return, 1-${BC_FERRIES_MAX_LIMIT}; default ${BC_FERRIES_DEFAULT_LIMIT}`, exposure: 'primary', group: 'pagination', reason: 'Bounds terminal output while keeping enough routes for network scanning.', valueType: 'integer', defaultValue: String(BC_FERRIES_DEFAULT_LIMIT) },
  ],
  paramsSchema: routesParamsSchema,
  execute: params => listBcFerriesRoutes(params),
  normalizeParams: params => routesParamsSchema.parse(params),
  createCacheKeyParams: params => normalizeBcFerriesRoutesInput(params),
  resultKind: 'bcferries.routes',
  defaultFormat: 'text',
}

export const bcFerriesProvider: PublicApiProviderModule = {
  manifest: {
    id: 'bcferries',
    name: 'BC Ferries',
    description: 'No-auth JSON API for BC Ferries route sailing and capacity snapshots.',
    publicApisCategory: 'Transportation',
    homepageUrl: 'https://www.bcferriesapi.ca',
    docsUrl: 'https://www.bcferriesapi.ca',
    auth: { mode: 'none', notes: ['Capacity and noncapacity v2 endpoints require no API keys, OAuth, cookies, browser sessions, or account preparation.'] },
    tags: ['transportation', 'ferries', 'capacity', 'sailings', 'no-auth'],
    freePlanNotes: ['No public quota was found in docs; live e2e uses small route filters/limits.'],
  },
  operations: [routesOperation],
  endpoints: [
    { id: 'bcferries-v2-capacity', method: 'GET', urlPattern: 'https://bcferriesapi.ca/v2/capacity/', category: 'public-api:transportation', evidenceStatus: 'confirmed', observedOn: '2026-05-08', sampleSources: ['https://www.bcferriesapi.ca'], consumedBy: ['bcferries.routes'], description: 'BC Ferries capacity routes JSON endpoint.', notes: ['No authentication required.', 'Includes fill/carFill/oversizeFill when available.', 'Trailing slash avoids upstream HTML 301 redirect body.'] },
    { id: 'bcferries-v2-noncapacity', method: 'GET', urlPattern: 'https://bcferriesapi.ca/v2/noncapacity/', category: 'public-api:transportation', evidenceStatus: 'confirmed', observedOn: '2026-05-08', sampleSources: ['https://www.bcferriesapi.ca'], consumedBy: ['bcferries.routes'], description: 'BC Ferries non-capacity routes JSON endpoint.', notes: ['No authentication required.', 'Trailing slash avoids upstream HTML 301 redirect body.'] },
  ],
}

export type { BcFerriesRoutesResult }
