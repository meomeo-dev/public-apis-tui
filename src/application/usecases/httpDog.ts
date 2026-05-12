import { HttpDogClient, type HttpDogStatus } from '../../infrastructure/openApis/httpDogClient.js'
import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export type HttpDogStatusInput = {
  statusCode?: number | undefined
}

export type HttpDogApiMeta = {
  provider: 'http-dog'
  publicApisProject: 'https://github.com/public-apis/public-apis'
  endpoint: 'GET /:statusCode.json'
  docsUrl: 'https://http.dog/'
  usesBrowserClickstream: false
  authentication: 'none'
}

export type HttpDogStatusResult = {
  kind: 'httpdog.status'
  api: HttpDogApiMeta
  query: { statusCode: number }
  status: {
    code: number
    title: string
    url: string
    images: HttpDogStatus['image']
  }
}

export async function getHttpDogStatus(input: HttpDogStatusInput = {}): Promise<HttpDogStatusResult> {
  const statusCode = normalizeStatusCode(input.statusCode)
  const client = new HttpDogClient()
  const status = await client.getStatus(statusCode)
  return {
    kind: 'httpdog.status',
    api: {
      provider: 'http-dog',
      publicApisProject: 'https://github.com/public-apis/public-apis',
      endpoint: 'GET /:statusCode.json',
      docsUrl: 'https://http.dog/',
      usesBrowserClickstream: false,
      authentication: 'none',
    },
    query: { statusCode },
    status: {
      code: status.status_code,
      title: status.title,
      url: status.url,
      images: status.image,
    },
  }
}

function normalizeStatusCode(value: number | undefined): number {
  const statusCode = value ?? 404
  if (!Number.isInteger(statusCode) || statusCode < 100 || statusCode > 999) {
    throw new RuntimeFailure('INVALID_ARGUMENT', 'HTTP Dog --status-code must be an integer from 100 to 999.', {
      statusCode: value,
    })
  }
  return statusCode
}
