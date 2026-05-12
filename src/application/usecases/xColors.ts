import {
  XColorsClient,
  type XColorsConvertOperation,
  type XColorsColorObject,
} from '../../infrastructure/openApis/xColorsClient.js'
import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

const reservedHues = ['red', 'pink', 'purple', 'navy', 'blue', 'aqua', 'green', 'lime', 'yellow', 'orange', 'all'] as const
const convertOperations = ['hex2rgb', 'hex2hsl', 'rgb2hex', 'rgb2hsl', 'hsl2hex', 'hsl2rgb'] as const

export type XColorsRandomInput = {
  hue?: string | undefined
  number?: number | undefined
  type?: string | undefined
}

export type XColorsConvertInput = {
  operation?: string | undefined
  value?: string | undefined
}

export type XColorsApiMeta = {
  provider: 'xcolors'
  publicApisProject: 'https://github.com/public-apis/public-apis'
  endpoint: 'GET /api/random' | 'GET /api/random/{hue}' | 'GET /api/{conversion}'
  docsUrl: 'https://x-colors.yurace.pro/'
  sourceUrl: 'https://github.com/cheatsnake/xColors-api'
  usesBrowserClickstream: false
  authentication: 'none'
  documentedMaximumResult: 'No finite maximum documented for number; CLI caps random colors at 50 and defaults to 10.'
}

export type XColorsResultColor = {
  hex?: string | undefined
  rgb?: string | undefined
  hsl?: string | undefined
}

export type XColorsRandomResult = {
  kind: 'xcolors.random'
  api: XColorsApiMeta
  query: {
    hue: string
    number: number
    type?: 'dark' | 'light' | undefined
  }
  count: number
  colors: XColorsResultColor[]
}

export type XColorsConvertResult = {
  kind: 'xcolors.convert'
  api: XColorsApiMeta
  query: {
    operation: XColorsConvertOperation
    value: string
  }
  color: XColorsResultColor
}

export async function generateXColorsRandom(input: XColorsRandomInput = {}): Promise<XColorsRandomResult> {
  const query = normalizeRandomInput(input)
  const client = new XColorsClient()
  const hueParam = query.hue === 'all' ? undefined : query.hue
  const colors = await client.random({
    hue: hueParam,
    number: query.number,
    type: query.type,
  })

  return {
    kind: 'xcolors.random',
    api: createApiMeta(hueParam === undefined ? 'GET /api/random' : 'GET /api/random/{hue}'),
    query,
    count: colors.length,
    colors: colors.map(toColorResult),
  }
}

export async function convertXColors(input: XColorsConvertInput = {}): Promise<XColorsConvertResult> {
  const query = normalizeConvertInput(input)
  const client = new XColorsClient()
  const color = await client.convert(query)

  return {
    kind: 'xcolors.convert',
    api: createApiMeta('GET /api/{conversion}'),
    query,
    color: toColorResult(color),
  }
}

function normalizeRandomInput(input: XColorsRandomInput): XColorsRandomResult['query'] {
  return {
    hue: normalizeHue(input.hue),
    number: normalizeNumber(input.number),
    ...normalizeType(input.type),
  }
}

function normalizeConvertInput(input: XColorsConvertInput): XColorsConvertResult['query'] {
  return {
    operation: normalizeOperation(input.operation),
    value: normalizeValue(input.value),
  }
}

function normalizeHue(value: string | undefined): string {
  const normalized = value?.trim().toLowerCase()
  if (normalized === undefined || normalized === '') {
    return 'all'
  }
  if (reservedHues.includes(normalized as (typeof reservedHues)[number])) {
    return normalized
  }
  if (/^\d{1,3}$/u.test(normalized)) {
    const hue = Number(normalized)
    if (hue >= 0 && hue <= 359) {
      return String(hue)
    }
  }
  throw new RuntimeFailure('INVALID_ARGUMENT', 'xColors --hue must be all, a reserved color name, or a hue number from 0 to 359.', {
    hue: value,
    reserved: reservedHues,
  })
}

function normalizeNumber(value: number | undefined): number {
  const number = value ?? 10
  if (!Number.isInteger(number) || number < 1 || number > 50) {
    throw new RuntimeFailure('INVALID_ARGUMENT', 'xColors --number must be an integer from 1 to 50.', {
      number: value,
      documentedMaximum: 'No finite maximum documented; CLI cap is 50.',
    })
  }
  return number
}

function normalizeType(value: string | undefined): { type?: 'dark' | 'light' | undefined } {
  const normalized = value?.trim().toLowerCase()
  if (normalized === undefined || normalized === '') {
    return {}
  }
  if (normalized === 'dark' || normalized === 'light') {
    return { type: normalized }
  }
  throw new RuntimeFailure('INVALID_ARGUMENT', 'xColors --type must be dark or light.', {
    type: value,
  })
}

function normalizeOperation(value: string | undefined): XColorsConvertOperation {
  const normalized = value?.trim().toLowerCase()
  if (normalized === undefined || normalized === '') {
    return 'hex2rgb'
  }
  if (convertOperations.includes(normalized as XColorsConvertOperation)) {
    return normalized as XColorsConvertOperation
  }
  throw new RuntimeFailure('INVALID_ARGUMENT', 'xColors --operation must be one of the documented conversion endpoints.', {
    operation: value,
    supported: convertOperations,
  })
}

function normalizeValue(value: string | undefined): string {
  const normalized = value?.trim()
  if (normalized === undefined || normalized === '') {
    return 'FFFFFF'
  }
  if (normalized.length > 80) {
    throw new RuntimeFailure('INVALID_ARGUMENT', 'xColors --value is too long for a color conversion input.', {
      value,
    })
  }
  return normalized
}

function toColorResult(color: XColorsColorObject): XColorsResultColor {
  return {
    ...(color.hex !== undefined ? { hex: color.hex } : {}),
    ...(color.rgb !== undefined ? { rgb: color.rgb } : {}),
    ...(color.hsl !== undefined ? { hsl: color.hsl } : {}),
  }
}

function createApiMeta(endpoint: XColorsApiMeta['endpoint']): XColorsApiMeta {
  return {
    provider: 'xcolors',
    publicApisProject: 'https://github.com/public-apis/public-apis',
    endpoint,
    docsUrl: 'https://x-colors.yurace.pro/',
    sourceUrl: 'https://github.com/cheatsnake/xColors-api',
    usesBrowserClickstream: false,
    authentication: 'none',
    documentedMaximumResult: 'No finite maximum documented for number; CLI caps random colors at 50 and defaults to 10.',
  }
}
