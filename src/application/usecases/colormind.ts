import { ColormindClient, type ColormindColorInput } from '../../infrastructure/openApis/colormindClient.js'
import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export type ColormindPaletteInput = {
  model?: string | undefined
  input?: string | undefined
}

export type ColormindModelsInput = {
  limit?: number | undefined
}

export type ColormindApiMeta = {
  provider: 'colormind'
  publicApisProject: 'https://github.com/public-apis/public-apis'
  endpoint: 'POST /api/' | 'GET /list/'
  docsUrl: 'http://colormind.io/api-access/'
  usesBrowserClickstream: false
  authentication: 'none'
  transport: 'http-only'
  usageTerms: 'Free for personal and non-commercial use; commercial use should contact the maintainer.'
  documentedMaximumResult: 'Palette endpoint always returns five RGB colors; model list has no documented maximum.'
}

export type ColormindColorResult = {
  rgb: [number, number, number]
  hex: string
}

export type ColormindPaletteResult = {
  kind: 'colormind.palette'
  api: ColormindApiMeta
  query: {
    model: string
    input: ColormindColorInput[]
  }
  count: number
  colors: ColormindColorResult[]
}

export type ColormindModelsResult = {
  kind: 'colormind.models'
  api: ColormindApiMeta
  query: {
    limit: number
  }
  count: number
  models: string[]
}

export async function generateColormindPalette(input: ColormindPaletteInput = {}): Promise<ColormindPaletteResult> {
  const query = normalizePaletteInput(input)
  const client = new ColormindClient()
  const response = await client.generatePalette(query)
  return {
    kind: 'colormind.palette',
    api: createApiMeta('POST /api/'),
    query,
    count: response.result.length,
    colors: response.result.map(toColorResult),
  }
}

export async function listColormindModels(input: ColormindModelsInput = {}): Promise<ColormindModelsResult> {
  const query = { limit: normalizeLimit(input.limit) }
  const client = new ColormindClient()
  const response = await client.listModels()
  return {
    kind: 'colormind.models',
    api: createApiMeta('GET /list/'),
    query,
    count: Math.min(response.result.length, query.limit),
    models: response.result.slice(0, query.limit),
  }
}

function normalizePaletteInput(input: ColormindPaletteInput): ColormindPaletteResult['query'] {
  return {
    model: normalizeModel(input.model),
    input: normalizeColorInput(input.input),
  }
}

function normalizeModel(value: string | undefined): string {
  const normalized = value?.trim()
  if (normalized === undefined || normalized === '') {
    return 'default'
  }
  if (!/^[A-Za-z0-9_-]+$/u.test(normalized)) {
    throw new RuntimeFailure('INVALID_ARGUMENT', 'Colormind --model must contain only letters, numbers, underscores, or hyphens.', {
      model: value,
    })
  }
  return normalized
}

function normalizeColorInput(value: string | undefined): ColormindColorInput[] {
  const normalized = value?.trim()
  if (normalized === undefined || normalized === '') {
    return []
  }
  const entries = normalized.split(',').map(entry => entry.trim()).filter(entry => entry !== '')
  if (entries.length !== 5) {
    throw new RuntimeFailure('INVALID_ARGUMENT', 'Colormind --input must contain exactly five entries, using N for unknown colors.', {
      input: value,
      example: '--input "#2c2b2c,#5a5352,N,N,N"',
    })
  }
  return entries.map(parseColorInputEntry)
}

function parseColorInputEntry(value: string): ColormindColorInput {
  if (value.toUpperCase() === 'N') {
    return 'N'
  }
  const hex = value.startsWith('#') ? value.slice(1) : value
  if (/^[0-9A-Fa-f]{6}$/u.test(hex)) {
    return [
      Number.parseInt(hex.slice(0, 2), 16),
      Number.parseInt(hex.slice(2, 4), 16),
      Number.parseInt(hex.slice(4, 6), 16),
    ]
  }
  const channels = value.split(/[-:/]/u).map(channel => Number(channel.trim()))
  if (channels.length === 3 && channels.every(channel => Number.isInteger(channel) && channel >= 0 && channel <= 255)) {
    return [channels[0] ?? 0, channels[1] ?? 0, channels[2] ?? 0]
  }
  throw new RuntimeFailure('INVALID_ARGUMENT', 'Colormind --input entries must be N, #RRGGBB, RRGGBB, or R-G-B.', {
    entry: value,
  })
}

function normalizeLimit(value: number | undefined): number {
  const limit = value ?? 50
  if (!Number.isInteger(limit) || limit < 1 || limit > 200) {
    throw new RuntimeFailure('INVALID_ARGUMENT', 'Colormind --limit must be an integer from 1 to 200.', {
      limit: value,
      note: 'No documented model-list maximum was found; CLI caps terminal output at 200.',
    })
  }
  return limit
}

function toColorResult(rgb: [number, number, number]): ColormindColorResult {
  return {
    rgb,
    hex: `#${rgb.map(channel => channel.toString(16).padStart(2, '0')).join('')}`.toUpperCase(),
  }
}

function createApiMeta(endpoint: ColormindApiMeta['endpoint']): ColormindApiMeta {
  return {
    provider: 'colormind',
    publicApisProject: 'https://github.com/public-apis/public-apis',
    endpoint,
    docsUrl: 'http://colormind.io/api-access/',
    usesBrowserClickstream: false,
    authentication: 'none',
    transport: 'http-only',
    usageTerms: 'Free for personal and non-commercial use; commercial use should contact the maintainer.',
    documentedMaximumResult: 'Palette endpoint always returns five RGB colors; model list has no documented maximum.',
  }
}
