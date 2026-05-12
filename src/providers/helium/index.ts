import { z } from 'zod'
import { listHeliumHotspots, type HeliumHotspotsInput } from '../../application/usecases/helium.js'
import type { PublicApiOperationDefinition, PublicApiProviderModule } from '../providerTypes.js'

const hotspotsParamsSchema = z.object({
  subnetwork: z.string().min(1).optional(),
  active: z.boolean().optional(),
  cursor: z.string().min(1).optional(),
  limit: z.number().int().optional(),
}) satisfies z.ZodType<HeliumHotspotsInput>

const hotspotsOperation: PublicApiOperationDefinition<HeliumHotspotsInput> = {
  id: 'helium.hotspots',
  providerId: 'helium',
  name: 'Hotspots',
  commandPath: ['helium', 'hotspots'],
  rpcMethod: 'helium.hotspots',
  description: 'List Helium IoT or Mobile hotspot entity metadata from the no-auth Entity API.',
  category: 'blockchain',
  options: [
    {
      name: 'subnetwork',
      flag: '--subnetwork <iot|mobile>',
      description: 'Helium subnetwork to list; default iot',
      exposure: 'primary',
      group: 'filters',
      reason: 'Primary dataset selector for the Entity API hotspot catalog.',
      defaultValue: 'iot',
    },
    {
      name: 'limit',
      flag: '--limit <count>',
      description: 'Maximum hotspots to show, 1-100; default 100',
      exposure: 'primary',
      group: 'pagination',
      reason: 'Bounds terminal output and cache size because API pages contain 10000 rows.',
      valueType: 'integer',
      defaultValue: '100',
    },
    {
      name: 'active',
      flag: '--active <true|false>',
      description: 'Filter current page by active status',
      exposure: 'primary',
      group: 'filters',
      reason: 'Common user-facing filter present in hotspot rows.',
      valueType: 'boolean',
    },
    {
      name: 'cursor',
      flag: '--cursor <token>',
      description: 'Opaque cursor returned by a previous hotspot page',
      exposure: 'advanced',
      group: 'pagination',
      reason: 'Enables pagination without exposing raw transport internals to first-run users.',
    },
  ],
  paramsSchema: hotspotsParamsSchema,
  execute: params => listHeliumHotspots(params),
  normalizeParams: params => hotspotsParamsSchema.parse(params),
  resultKind: 'helium.hotspots',
  defaultFormat: 'text',
}

export const heliumProvider: PublicApiProviderModule = {
  manifest: {
    id: 'helium',
    name: 'Helium',
    description: 'No-auth HTTPS JSON Entity API for Helium hotspot metadata.',
    publicApisCategory: 'Blockchain',
    homepageUrl: 'https://www.helium.com/',
    docsUrl: 'https://docs.helium.com/',
    auth: {
      mode: 'none',
      notes: [
        'Entity API hotspot endpoints are publicly readable without API keys.',
        'The legacy public-apis blockchain API docs URL is stale; implementation uses current Entity API endpoints.',
      ],
    },
    tags: ['blockchain', 'wireless', 'hotspots', 'iot', 'mobile', 'no-auth'],
    freePlanNotes: [
      'Live pagination metadata reports pageSize 10000.',
      'CLI caps and defaults displayed hotspot output at 100 to avoid huge terminal/cache payloads.',
    ],
  },
  operations: [hotspotsOperation],
  endpoints: [
    {
      id: 'helium-hotspots-pagination-metadata',
      method: 'GET',
      urlPattern: 'https://entities.nft.helium.io/v2/hotspots/pagination-metadata*',
      category: 'open-api',
      evidenceStatus: 'confirmed',
      description: 'Helium Entity API hotspot pagination metadata endpoint.',
      siteIds: ['public-apis-tui'],
      sampleSources: ['https://entities.nft.helium.io/v2/hotspots/pagination-metadata?subnetwork=iot'],
      consumedBy: ['helium hotspots'],
      notes: ['No authentication required.', 'Returns pageSize, totalItems, and totalPages.'],
    },
    {
      id: 'helium-hotspots',
      method: 'GET',
      urlPattern: 'https://entities.nft.helium.io/v2/hotspots*',
      category: 'open-api',
      evidenceStatus: 'confirmed',
      description: 'Helium Entity API hotspot page endpoint for IoT and Mobile subnetworks.',
      siteIds: ['public-apis-tui'],
      sampleSources: ['https://entities.nft.helium.io/v2/hotspots?subnetwork=iot'],
      consumedBy: ['helium hotspots'],
      notes: ['No authentication required.', 'Returns items plus an opaque cursor for pagination.'],
    },
  ],
}

export type { HeliumHotspotsInput } from '../../application/usecases/helium.js'
