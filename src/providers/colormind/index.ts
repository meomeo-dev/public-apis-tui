import { z } from 'zod'
import {
  generateColormindPalette,
  listColormindModels,
  type ColormindModelsInput,
  type ColormindPaletteInput,
} from '../../application/usecases/colormind.js'
import type { PublicApiOperationDefinition, PublicApiProviderModule } from '../providerTypes.js'

const paletteParamsSchema = z.object({
  model: z.string().min(1).optional(),
  input: z.string().min(1).optional(),
}) satisfies z.ZodType<ColormindPaletteInput>

const modelsParamsSchema = z.object({
  limit: z.number().int().optional(),
}) satisfies z.ZodType<ColormindModelsInput>

const paletteOperation: PublicApiOperationDefinition<ColormindPaletteInput> = {
  id: 'colormind.palette',
  providerId: 'colormind',
  name: 'Palette',
  commandPath: ['colormind', 'palette'],
  rpcMethod: 'colormind.palette',
  description: 'Generate a five-color palette from Colormind using the documented no-auth HTTP API.',
  category: 'art-design',
  options: [
    {
      name: 'model',
      flag: '--model <name>',
      description: 'Palette model name; default is default, ui is always documented as available',
      exposure: 'primary',
      group: 'filters',
      reason: 'Core documented control for palette generation style.',
      defaultValue: 'default',
    },
    {
      name: 'input',
      flag: '--input <colors>',
      description: 'Five comma-separated entries: N, #RRGGBB, RRGGBB, or R-G-B',
      exposure: 'primary',
      group: 'content',
      reason: 'Core documented affordance for locking known colors while asking Colormind to fill blanks.',
    },
  ],
  paramsSchema: paletteParamsSchema,
  execute: params => generateColormindPalette(params),
  normalizeParams: params => paletteParamsSchema.parse(params),
  resultKind: 'colormind.palette',
  defaultFormat: 'text',
}

const modelsOperation: PublicApiOperationDefinition<ColormindModelsInput> = {
  id: 'colormind.models',
  providerId: 'colormind',
  name: 'Models',
  commandPath: ['colormind', 'models'],
  rpcMethod: 'colormind.models',
  description: 'List Colormind model names from the documented no-auth HTTP endpoint.',
  category: 'art-design',
  options: [
    {
      name: 'limit',
      flag: '--limit <count>',
      description: 'Maximum model names to show, 1-200; default 50',
      exposure: 'primary',
      group: 'pagination',
      reason: 'Keeps terminal output bounded because the list endpoint has no documented maximum.',
      valueType: 'integer',
      defaultValue: '50',
    },
  ],
  paramsSchema: modelsParamsSchema,
  execute: params => listColormindModels(params),
  normalizeParams: params => modelsParamsSchema.parse(params),
  resultKind: 'colormind.models',
  defaultFormat: 'text',
}

export const colormindProvider: PublicApiProviderModule = {
  manifest: {
    id: 'colormind',
    name: 'Colormind',
    description: 'No-auth HTTP JSON API for generating five-color palettes and listing palette models.',
    publicApisCategory: 'Art & Design',
    homepageUrl: 'http://colormind.io',
    docsUrl: 'http://colormind.io/api-access/',
    auth: {
      mode: 'none',
      notes: ['Official API access page documents HTTP JSON endpoints without API keys.'],
    },
    tags: ['art', 'design', 'colors', 'palette', 'http-only', 'no-auth'],
    freePlanNotes: [
      'Docs state the API is free for personal and non-commercial use; commercial use should contact the maintainer.',
      'Docs state default and ui models are always available; other models change daily.',
      'HTTPS is not usable for API calls; implementation uses documented HTTP endpoints and output discloses http-only transport.',
    ],
  },
  operations: [paletteOperation, modelsOperation],
  endpoints: [
    {
      id: 'colormind-palette',
      method: 'POST',
      urlPattern: 'http://colormind.io/api/',
      category: 'open-api',
      evidenceStatus: 'confirmed',
      description: 'Colormind palette generation endpoint returning five RGB colors as JSON.',
      siteIds: ['public-apis-tui'],
      sampleSources: ['http://colormind.io/api-access/'],
      consumedBy: ['colormind palette'],
      notes: ['No authentication required.', 'HTTP-only documented endpoint.', 'Request body supports model and optional five-entry input array.'],
    },
    {
      id: 'colormind-models',
      method: 'GET',
      urlPattern: 'http://colormind.io/list/',
      category: 'open-api',
      evidenceStatus: 'confirmed',
      description: 'Colormind model list endpoint returning currently available model names.',
      siteIds: ['public-apis-tui'],
      sampleSources: ['http://colormind.io/api-access/'],
      consumedBy: ['colormind models'],
      notes: ['No authentication required.', 'HTTP-only documented endpoint.', 'Docs state default and ui are always available; other models change daily.'],
    },
  ],
}
