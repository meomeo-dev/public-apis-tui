import {
  QUICKCHART_DEFAULT_FORMAT,
  QUICKCHART_DEFAULT_HEIGHT,
  QUICKCHART_DEFAULT_WIDTH,
  QUICKCHART_MAX_HEIGHT,
  QUICKCHART_MAX_WIDTH,
  QuickChartClient,
  mediaTypeForFormat,
  normalizeQuickChartRenderInput,
  type QuickChartRenderInput,
} from '../../infrastructure/openApis/quickChartClient.js'

export type QuickChartRenderResult = {
  kind: 'quickchart.render'
  api: {
    provider: 'quickchart'
    endpoint: 'GET /chart'
    authentication: 'none'
    usesBrowserClickstream: false
    docs: 'https://quickchart.io/documentation/'
    homepage: 'https://quickchart.io/'
    transport: 'HTTPS binary image API'
    rateLimit: 'no API key documented for basic chart rendering; terms may apply for high-volume use'
    publicApisProject: 'https://github.com/public-apis/public-apis'
    documentedMaximums: {
      width: 2000
      height: 2000
    }
    defaults: {
      width: 500
      height: 300
      format: 'png'
    }
  }
  query: {
    chartType: string
    labels: string[]
    data: number[]
    title: string
    width: number
    height: number
    format: string
    backgroundColor?: string | undefined
    devicePixelRatio?: number | undefined
  }
  chart: {
    url: string
    contentType: string
    mediaType: string
    bytes: number
    dataBase64: string
    dataUrl: string
    dimensions: {
      width: number
      height: number
    }
  }
}

export type { QuickChartRenderInput }

export async function renderQuickChart(input: QuickChartRenderInput = {}): Promise<QuickChartRenderResult> {
  const query = normalizeQuickChartRenderInput(input)
  const client = new QuickChartClient()
  const response = await client.render(query)
  const mediaType = mediaTypeForFormat(query.format)
  return {
    kind: 'quickchart.render',
    api: {
      provider: 'quickchart',
      endpoint: 'GET /chart',
      authentication: 'none',
      usesBrowserClickstream: false,
      docs: 'https://quickchart.io/documentation/',
      homepage: 'https://quickchart.io/',
      transport: 'HTTPS binary image API',
      rateLimit: 'no API key documented for basic chart rendering; terms may apply for high-volume use',
      publicApisProject: 'https://github.com/public-apis/public-apis',
      documentedMaximums: {
        width: QUICKCHART_MAX_WIDTH,
        height: QUICKCHART_MAX_HEIGHT,
      },
      defaults: {
        width: QUICKCHART_DEFAULT_WIDTH,
        height: QUICKCHART_DEFAULT_HEIGHT,
        format: QUICKCHART_DEFAULT_FORMAT,
      },
    },
    query,
    chart: {
      url: response.requestUrl,
      contentType: response.contentType,
      mediaType,
      bytes: response.bytes,
      dataBase64: response.base64,
      dataUrl: `data:${mediaType};base64,${response.base64}`,
      dimensions: {
        width: query.width,
        height: query.height,
      },
    },
  }
}
