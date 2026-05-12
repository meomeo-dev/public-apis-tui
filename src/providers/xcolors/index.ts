import { z } from 'zod'
import {
  convertXColors,
  generateXColorsRandom,
  type XColorsConvertInput,
  type XColorsRandomInput,
} from '../../application/usecases/xColors.js'
import type { PublicApiOperationDefinition, PublicApiProviderModule } from '../providerTypes.js'

const randomParamsSchema = z.object({
  hue: z.string().min(1).optional(),
  number: z.number().int().optional(),
  type: z.string().min(1).optional(),
}) satisfies z.ZodType<XColorsRandomInput>

const convertParamsSchema = z.object({
  operation: z.string().min(1).optional(),
  value: z.string().min(1).optional(),
}) satisfies z.ZodType<XColorsConvertInput>

const randomOperation: PublicApiOperationDefinition<XColorsRandomInput> = {
  id: 'xcolors.random',
  providerId: 'xcolors',
  name: 'Random Colors',
  commandPath: ['xcolors', 'random'],
  rpcMethod: 'xcolors.random',
  description: 'Generate random HEX/RGB/HSL colors from the documented no-auth xColors API.',
  category: 'art-design',
  options: [
    {
      name: 'hue',
      flag: '--hue <name-or-degree>',
      description: 'Hue name, all, or 0-359 degree; default all',
      exposure: 'primary',
      group: 'filters',
      reason: 'Primary documented control for targeted random color generation.',
      defaultValue: 'all',
    },
    {
      name: 'number',
      flag: '--number <count>',
      description: 'Number of random colors, 1-50; default 10',
      exposure: 'primary',
      group: 'pagination',
      reason: 'Bounds terminal output because the API documents number but no finite maximum.',
      valueType: 'integer',
      defaultValue: '10',
    },
    {
      name: 'type',
      flag: '--type <dark|light>',
      description: 'Optional shade type when hue/all is provided',
      exposure: 'advanced',
      group: 'filters',
      reason: 'Useful documented contrast control, but secondary to hue and count.',
    },
  ],
  paramsSchema: randomParamsSchema,
  execute: params => generateXColorsRandom(params),
  normalizeParams: params => randomParamsSchema.parse(params),
  resultKind: 'xcolors.random',
  defaultFormat: 'text',
}

const convertOperation: PublicApiOperationDefinition<XColorsConvertInput> = {
  id: 'xcolors.convert',
  providerId: 'xcolors',
  name: 'Convert Color',
  commandPath: ['xcolors', 'convert'],
  rpcMethod: 'xcolors.convert',
  description: 'Convert between documented HEX, RGB, and HSL color models using xColors.',
  category: 'art-design',
  options: [
    {
      name: 'operation',
      flag: '--operation <name>',
      description: 'Conversion: hex2rgb, hex2hsl, rgb2hex, rgb2hsl, hsl2hex, or hsl2rgb; default hex2rgb',
      exposure: 'primary',
      group: 'query',
      reason: 'Selects the documented conversion endpoint while keeping command count scalable.',
      defaultValue: 'hex2rgb',
    },
    {
      name: 'value',
      flag: '--value <color>',
      description: 'Input color value, such as FFFFFF, 120-200-30, or 300-90-50; default FFFFFF',
      exposure: 'primary',
      group: 'content',
      reason: 'Core payload for the selected conversion endpoint.',
      defaultValue: 'FFFFFF',
    },
  ],
  paramsSchema: convertParamsSchema,
  execute: params => convertXColors(params),
  normalizeParams: params => convertParamsSchema.parse(params),
  resultKind: 'xcolors.convert',
  defaultFormat: 'text',
}

export const xColorsProvider: PublicApiProviderModule = {
  manifest: {
    id: 'xcolors',
    name: 'xColors',
    description: 'No-auth HTTPS JSON API for random colors and HEX/RGB/HSL conversion.',
    publicApisCategory: 'Art & Design',
    homepageUrl: 'https://x-colors.yurace.pro/',
    docsUrl: 'https://x-colors.yurace.pro/',
    auth: {
      mode: 'none',
      notes: ['Official docs expose random color and conversion endpoints without API keys.'],
    },
    tags: ['art', 'design', 'colors', 'conversion', 'palette', 'no-auth'],
    freePlanNotes: [
      'Docs describe a completely free service returning JSON.',
      'No rate limit or finite number maximum is documented; CLI caps random color output at 50 and defaults to 10.',
      'The public-apis Heroku URL is stale; the current official docs and API are served from x-colors.yurace.pro.',
    ],
  },
  operations: [randomOperation, convertOperation],
  endpoints: [
    {
      id: 'xcolors-random',
      method: 'GET',
      urlPattern: 'https://x-colors.yurace.pro/api/random*',
      category: 'open-api',
      evidenceStatus: 'confirmed',
      description: 'xColors random color endpoint returning HEX/RGB/HSL JSON objects.',
      siteIds: ['public-apis-tui'],
      sampleSources: ['https://x-colors.yurace.pro/'],
      consumedBy: ['xcolors random'],
      notes: ['No authentication required.', 'Supports optional hue/color/all path, number query parameter, and dark/light type filter.'],
    },
    {
      id: 'xcolors-convert',
      method: 'GET',
      urlPattern: 'https://x-colors.yurace.pro/api/*2*?value=*',
      category: 'open-api',
      evidenceStatus: 'confirmed',
      description: 'xColors color conversion endpoints for HEX, RGB, and HSL models.',
      siteIds: ['public-apis-tui'],
      sampleSources: ['https://x-colors.yurace.pro/'],
      consumedBy: ['xcolors convert'],
      notes: ['No authentication required.', 'Documented conversions include hex2rgb, hex2hsl, rgb2hex, rgb2hsl, hsl2hex, and hsl2rgb.'],
    },
  ],
}

export type { XColorsConvertInput, XColorsRandomInput } from '../../application/usecases/xColors.js'
