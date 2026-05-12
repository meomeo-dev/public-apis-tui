import { PhpNoiseClient } from '../../infrastructure/openApis/phpNoiseClient.js'
import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

const modes = ['brightness', 'around'] as const

export type PhpNoiseGenerateInput = {
  hex?: string | undefined
  tiles?: number | undefined
  tileSize?: number | undefined
  borderWidth?: number | undefined
  mode?: string | undefined
  multi?: string | undefined
  steps?: number | undefined
}

export type PhpNoiseApiMeta = {
  provider: 'php-noise'
  publicApisProject: 'https://github.com/public-apis/public-apis'
  endpoint: 'GET /noise.php?base64'
  docsUrl: 'https://php-noise.com/noise.php?help'
  sourceUrl: 'https://github.com/RundesBalli/php-noise'
  usesBrowserClickstream: false
  authentication: 'none'
  documentedMaximums: {
    tiles: 50
    tileSize: 20
    borderWidth: 15
    steps: 50
  }
}

export type PhpNoiseGenerateResult = {
  kind: 'phpnoise.generate'
  api: PhpNoiseApiMeta
  query: {
    hex?: string | undefined
    tiles: number
    tileSize: number
    borderWidth: number
    mode: 'brightness' | 'around'
    multi: string
    steps: number
  }
  image: {
    dataUrl: string
    mimeType: 'image/png'
    base64Bytes: number
    dimensions: {
      width: number
      height: number
    }
  }
}

export async function generatePhpNoise(input: PhpNoiseGenerateInput = {}): Promise<PhpNoiseGenerateResult> {
  const query = normalizeGenerateInput(input)
  const client = new PhpNoiseClient()
  const response = await client.generate(query)
  return {
    kind: 'phpnoise.generate',
    api: {
      provider: 'php-noise',
      publicApisProject: 'https://github.com/public-apis/public-apis',
      endpoint: 'GET /noise.php?base64',
      docsUrl: 'https://php-noise.com/noise.php?help',
      sourceUrl: 'https://github.com/RundesBalli/php-noise',
      usesBrowserClickstream: false,
      authentication: 'none',
      documentedMaximums: {
        tiles: 50,
        tileSize: 20,
        borderWidth: 15,
        steps: 50,
      },
    },
    query,
    image: {
      dataUrl: response.base64,
      mimeType: 'image/png',
      base64Bytes: countBase64Bytes(response.base64),
      dimensions: {
        width: query.tiles * query.tileSize + Math.max(0, query.tiles - 1) * query.borderWidth,
        height: query.tiles * query.tileSize + Math.max(0, query.tiles - 1) * query.borderWidth,
      },
    },
  }
}

function normalizeGenerateInput(input: PhpNoiseGenerateInput): PhpNoiseGenerateResult['query'] {
  return {
    ...normalizeHex(input.hex),
    tiles: normalizeInteger(input.tiles, 'tiles', 1, 50, 50),
    tileSize: normalizeInteger(input.tileSize, 'tile-size', 1, 20, 7),
    borderWidth: normalizeInteger(input.borderWidth, 'border-width', 0, 15, 0),
    mode: normalizeMode(input.mode),
    multi: normalizeMulti(input.multi),
    steps: normalizeInteger(input.steps, 'steps', 1, 50, 5),
  }
}

function normalizeHex(value: string | undefined): { hex?: string | undefined } {
  const normalized = value?.trim().replace(/^#/u, '').toUpperCase()
  if (normalized === undefined || normalized === '') {
    return {}
  }
  if (!/^[0-9A-F]{6}$/u.test(normalized)) {
    throw new RuntimeFailure('INVALID_ARGUMENT', 'PHP-Noise --hex must be a six-digit RGB hex value.', {
      hex: value,
    })
  }
  return { hex: normalized }
}

function normalizeInteger(
  value: number | undefined,
  label: string,
  min: number,
  max: number,
  defaultValue: number,
): number {
  const integer = value ?? defaultValue
  if (!Number.isInteger(integer) || integer < min || integer > max) {
    throw new RuntimeFailure('INVALID_ARGUMENT', `PHP-Noise --${label} must be an integer from ${min} to ${max}.`, {
      [label]: value,
    })
  }
  return integer
}

function normalizeMode(value: string | undefined): 'brightness' | 'around' {
  const normalized = value?.trim().toLowerCase()
  if (normalized === undefined || normalized === '') {
    return 'brightness'
  }
  if (modes.includes(normalized as 'brightness' | 'around')) {
    return normalized as 'brightness' | 'around'
  }
  throw new RuntimeFailure('INVALID_ARGUMENT', 'PHP-Noise --mode must be brightness or around.', {
    mode: value,
  })
}

function normalizeMulti(value: string | undefined): string {
  const normalized = value?.trim()
  if (normalized === undefined || normalized === '') {
    return '1.5'
  }
  if (!/^\d+(?:\.\d)?$/u.test(normalized) || Number(normalized) <= 0) {
    throw new RuntimeFailure('INVALID_ARGUMENT', 'PHP-Noise --multi must be a positive number with at most one decimal place.', {
      multi: value,
    })
  }
  return normalized
}

function countBase64Bytes(dataUrl: string): number {
  const encoded = dataUrl.slice('data:image/png;base64,'.length)
  return Buffer.from(encoded, 'base64').byteLength
}
