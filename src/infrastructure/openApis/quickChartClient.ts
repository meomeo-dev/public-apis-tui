import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export const QUICKCHART_DEFAULT_BASE_URL = 'https://quickchart.io'
export const QUICKCHART_DEFAULT_CHART_TYPE = 'bar'
export const QUICKCHART_DEFAULT_LABELS = 'A,B,C'
export const QUICKCHART_DEFAULT_DATA = '3,7,4'
export const QUICKCHART_DEFAULT_TITLE = 'Public APIs'
export const QUICKCHART_DEFAULT_WIDTH = 500
export const QUICKCHART_DEFAULT_HEIGHT = 300
export const QUICKCHART_MAX_WIDTH = 2000
export const QUICKCHART_MAX_HEIGHT = 2000
export const QUICKCHART_DEFAULT_FORMAT = 'png'

const supportedChartTypes = ['bar', 'line', 'pie', 'doughnut'] as const
const supportedFormats = ['png', 'svg', 'webp', 'pdf'] as const

export type QuickChartType = typeof supportedChartTypes[number]
export type QuickChartFormat = typeof supportedFormats[number]

export type QuickChartRenderInput = {
  chartType?: string | undefined
  labels?: string | undefined
  data?: string | undefined
  title?: string | undefined
  width?: number | undefined
  height?: number | undefined
  format?: string | undefined
  backgroundColor?: string | undefined
  devicePixelRatio?: number | undefined
}

export type NormalizedQuickChartRenderInput = {
  chartType: QuickChartType
  labels: string[]
  data: number[]
  title: string
  width: number
  height: number
  format: QuickChartFormat
  backgroundColor?: string | undefined
  devicePixelRatio?: number | undefined
}

export type QuickChartRenderResponse = {
  requestUrl: string
  contentType: string
  bytes: number
  base64: string
}

export type QuickChartClientOptions = {
  baseUrl?: string | undefined
  fetchImpl?: typeof fetch | undefined
}

export class QuickChartClient {
  private readonly baseUrl: string
  private readonly fetchImpl: typeof fetch

  constructor(options: QuickChartClientOptions = {}) {
    this.baseUrl = normalizeBaseUrl(options.baseUrl ?? QUICKCHART_DEFAULT_BASE_URL)
    this.fetchImpl = options.fetchImpl ?? fetch
  }

  async render(input: QuickChartRenderInput | NormalizedQuickChartRenderInput = {}): Promise<QuickChartRenderResponse> {
    const query = isNormalizedQuickChartRenderInput(input) ? input : normalizeQuickChartRenderInput(input)
    const url = createQuickChartUrl(this.baseUrl, query)

    let response: Response
    try {
      response = await this.fetchImpl(url, {
        method: 'GET',
        headers: {
          accept: acceptHeaderForFormat(query.format),
          'user-agent': 'public-apis-tui no-auth CLI (https://github.com/meomeo-dev/public-apis-tui)',
        },
      })
    } catch (error) {
      throw new RuntimeFailure('OPEN_API_FAILED', `QuickChart request failed: ${String(error)}`, {
        provider: 'quickchart',
        endpoint: url.href,
      })
    }

    const body = Buffer.from(await response.arrayBuffer())
    if (!response.ok) {
      throw new RuntimeFailure('OPEN_API_FAILED', `QuickChart request failed with HTTP ${response.status}.`, {
        provider: 'quickchart',
        status: response.status,
        endpoint: url.href,
        responsePreview: body.toString('utf8', 0, Math.min(body.length, 300)),
      })
    }

    const contentType = response.headers.get('content-type') ?? mediaTypeForFormat(query.format)
    if (!isExpectedContent(contentType, body, query.format)) {
      throw new RuntimeFailure('OPEN_API_FAILED', 'QuickChart returned an unexpected content type or payload.', {
        provider: 'quickchart',
        endpoint: url.href,
        contentType,
        bytes: body.length,
      })
    }

    return {
      requestUrl: url.href,
      contentType,
      bytes: body.length,
      base64: body.toString('base64'),
    }
  }
}

export function normalizeQuickChartRenderInput(input: QuickChartRenderInput = {}): NormalizedQuickChartRenderInput {
  return {
    chartType: normalizeChartType(input.chartType),
    labels: normalizeLabels(input.labels),
    data: normalizeData(input.data),
    title: normalizeTitle(input.title),
    width: normalizeInteger(input.width, QUICKCHART_DEFAULT_WIDTH, QUICKCHART_MAX_WIDTH, 'width', 1),
    height: normalizeInteger(input.height, QUICKCHART_DEFAULT_HEIGHT, QUICKCHART_MAX_HEIGHT, 'height', 1),
    format: normalizeFormat(input.format),
    ...(input.backgroundColor !== undefined ? { backgroundColor: normalizeBackgroundColor(input.backgroundColor) } : {}),
    ...(input.devicePixelRatio !== undefined ? { devicePixelRatio: normalizeDevicePixelRatio(input.devicePixelRatio) } : {}),
  }
}

export function createQuickChartUrl(baseUrl: string, input: NormalizedQuickChartRenderInput): URL {
  const url = new URL(`${normalizeBaseUrl(baseUrl)}/chart`)
  url.searchParams.set('c', JSON.stringify(createChartConfig(input)))
  url.searchParams.set('width', String(input.width))
  url.searchParams.set('height', String(input.height))
  url.searchParams.set('format', input.format)
  if (input.backgroundColor !== undefined) {
    url.searchParams.set('backgroundColor', input.backgroundColor)
  }
  if (input.devicePixelRatio !== undefined) {
    url.searchParams.set('devicePixelRatio', String(input.devicePixelRatio))
  }
  return url
}

export function mediaTypeForFormat(format: QuickChartFormat): string {
  switch (format) {
    case 'svg':
      return 'image/svg+xml'
    case 'webp':
      return 'image/webp'
    case 'pdf':
      return 'application/pdf'
    case 'png':
      return 'image/png'
  }
}

function createChartConfig(input: NormalizedQuickChartRenderInput): Record<string, unknown> {
  return {
    type: input.chartType,
    data: {
      labels: input.labels,
      datasets: [
        {
          label: input.title,
          data: input.data,
        },
      ],
    },
    options: {
      plugins: {
        title: {
          display: true,
          text: input.title,
        },
        legend: {
          display: input.chartType !== 'pie' && input.chartType !== 'doughnut',
        },
      },
    },
  }
}

function normalizeChartType(value: string | undefined): QuickChartType {
  const chartType = (value ?? QUICKCHART_DEFAULT_CHART_TYPE).trim().toLowerCase()
  if (supportedChartTypes.includes(chartType as QuickChartType)) {
    return chartType as QuickChartType
  }
  throw new RuntimeFailure('INVALID_ARGUMENT', `QuickChart --type must be one of: ${supportedChartTypes.join(', ')}.`, { chartType: value })
}

function normalizeLabels(value: string | undefined): string[] {
  const labels = (value ?? QUICKCHART_DEFAULT_LABELS)
    .split(',')
    .map(label => label.trim())
    .filter(label => label !== '')
  if (labels.length < 1 || labels.length > 50) {
    throw new RuntimeFailure('INVALID_ARGUMENT', 'QuickChart --labels must include 1-50 comma-separated labels.', { labels: value })
  }
  return labels
}

function normalizeData(value: string | undefined): number[] {
  const data = (value ?? QUICKCHART_DEFAULT_DATA)
    .split(',')
    .map(entry => Number(entry.trim()))
  if (data.length < 1 || data.length > 50 || data.some(entry => !Number.isFinite(entry))) {
    throw new RuntimeFailure('INVALID_ARGUMENT', 'QuickChart --data must include 1-50 comma-separated finite numbers.', { data: value })
  }
  return data
}

function normalizeTitle(value: string | undefined): string {
  const title = (value ?? QUICKCHART_DEFAULT_TITLE).trim()
  if (title.length < 1 || title.length > 120) {
    throw new RuntimeFailure('INVALID_ARGUMENT', 'QuickChart --title must be between 1 and 120 characters.', { title: value })
  }
  return title
}

function normalizeFormat(value: string | undefined): QuickChartFormat {
  const format = (value ?? QUICKCHART_DEFAULT_FORMAT).trim().toLowerCase()
  if (supportedFormats.includes(format as QuickChartFormat)) {
    return format as QuickChartFormat
  }
  throw new RuntimeFailure('INVALID_ARGUMENT', `QuickChart --format-image must be one of: ${supportedFormats.join(', ')}.`, { format: value })
}

function normalizeBackgroundColor(value: string): string {
  const color = value.trim()
  if (/^(?:transparent|#[0-9a-fA-F]{6}|[a-zA-Z]+)$/u.test(color)) {
    return color
  }
  throw new RuntimeFailure('INVALID_ARGUMENT', 'QuickChart --background-color must be transparent, a CSS color name, or #RRGGBB.', { color: value })
}

function normalizeDevicePixelRatio(value: number): number {
  if (!Number.isFinite(value) || value < 1 || value > 4) {
    throw new RuntimeFailure('INVALID_ARGUMENT', 'QuickChart --device-pixel-ratio must be between 1 and 4.', { value })
  }
  return value
}

function normalizeInteger(value: number | undefined, defaultValue: number, maxValue: number, optionName: string, minValue: number): number {
  if (value === undefined) {
    return defaultValue
  }
  if (!Number.isInteger(value) || value < minValue || value > maxValue) {
    throw new RuntimeFailure('INVALID_ARGUMENT', `QuickChart --${optionName} must be an integer between ${minValue} and ${maxValue}.`, { value })
  }
  return value
}

function acceptHeaderForFormat(format: QuickChartFormat): string {
  return `${mediaTypeForFormat(format)}, */*`
}

function isExpectedContent(contentType: string, body: Buffer, format: QuickChartFormat): boolean {
  if (format === 'png') {
    return contentType.includes('image/png') && body.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  }
  if (format === 'svg') {
    return contentType.includes('image/svg') || body.toString('utf8', 0, Math.min(body.length, 100)).includes('<svg')
  }
  if (format === 'webp') {
    return contentType.includes('image/webp') || body.toString('ascii', 0, 4) === 'RIFF'
  }
  return contentType.includes('application/pdf') || body.toString('ascii', 0, 4) === '%PDF'
}

function normalizeBaseUrl(value: string): string {
  return value.replace(/\/+$/u, '')
}

function isNormalizedQuickChartRenderInput(value: QuickChartRenderInput | NormalizedQuickChartRenderInput): value is NormalizedQuickChartRenderInput {
  return Array.isArray(value.labels) && Array.isArray(value.data)
}
