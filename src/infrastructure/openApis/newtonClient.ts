import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export const NEWTON_DEFAULT_BASE_URL = 'https://newton.vercel.app'

export const NEWTON_OPERATIONS = [
  'simplify',
  'factor',
  'derive',
  'integrate',
  'zeroes',
  'tangent',
  'area',
  'cos',
  'sin',
  'tan',
  'arccos',
  'arcsin',
  'arctan',
  'abs',
  'log',
] as const

export type NewtonOperation = typeof NEWTON_OPERATIONS[number]

export type NewtonComputeParams = {
  operation: NewtonOperation
  expression: string
}

export type NewtonComputeResponse = {
  operation: NewtonOperation
  expression: string
  result: string | number | Array<string | number>
}

type NewtonPayload = {
  operation?: unknown
  expression?: unknown
  result?: unknown
  error?: unknown
}

export class NewtonClient {
  constructor(
    private readonly baseUrl = NEWTON_DEFAULT_BASE_URL,
    private readonly fetchImpl: typeof fetch = globalThis.fetch,
  ) {}

  async compute(params: NewtonComputeParams): Promise<NewtonComputeResponse> {
    const url = this.createComputeUrl(params)
    const parsed = await this.fetchJson(url)
    return parseNewtonPayload(parsed, params)
  }

  private createComputeUrl(params: NewtonComputeParams): URL {
    const path = [
      'api',
      'v2',
      encodeURIComponent(params.operation),
      encodeNewtonExpression(params.expression),
    ].join('/')
    return new URL(`/${path}`, normalizeBaseUrl(this.baseUrl))
  }

  private async fetchJson(url: URL): Promise<unknown> {
    let response: Response
    try {
      response = await this.fetchImpl(url, {
        method: 'GET',
        headers: {
          accept: 'application/json',
          'user-agent': 'public-apis-tui no-auth CLI',
        },
      })
    } catch (error) {
      throw new RuntimeFailure(
        'OPEN_API_FAILED',
        `Newton request failed: ${String(error)}`,
        { provider: 'newton', url: url.toString() },
      )
    }

    const body = await response.text()

    if (isCloudflareChallenge(response, body)) {
      throw new RuntimeFailure(
        'OPEN_API_FAILED',
        [
          'Newton is currently returning a Cloudflare challenge HTML page',
          'instead of the documented JSON API response; retry later or use',
          'cached/offline data.',
        ].join(' '),
        createResponseDetails(response, url),
      )
    }

    let parsed: unknown
    try {
      parsed = JSON.parse(body) as unknown
    } catch {
      throw new RuntimeFailure(
        'OPEN_API_FAILED',
        'Newton response was not JSON.',
        {
          ...createResponseDetails(response, url),
          preview: body.slice(0, 120),
        },
      )
    }

    if (!response.ok) {
      const error = readNewtonError(parsed)
      throw new RuntimeFailure(
        'OPEN_API_FAILED',
        error ?? `Newton request failed with HTTP ${response.status}.`,
        {
          ...createResponseDetails(response, url),
          response: parsed,
        },
      )
    }

    return parsed
  }
}

function createResponseDetails(
  response: Response,
  url: URL,
): Record<string, unknown> {
  return {
    provider: 'newton',
    status: response.status,
    statusText: response.statusText,
    contentType: response.headers.get('content-type') ?? undefined,
    url: url.toString(),
  }
}

function isCloudflareChallenge(response: Response, body: string): boolean {
  const server = response.headers.get('server')?.toLowerCase() ?? ''
  const mitigated = response.headers.get('cf-mitigated')?.toLowerCase() ?? ''
  const contentType = response.headers.get('content-type')?.toLowerCase() ?? ''
  return (
    (response.status === 403 || response.status === 429) &&
    contentType.includes('text/html') &&
    (
      mitigated === 'challenge' ||
      server.includes('cloudflare') ||
      /<title>\s*just a moment/i.test(body)
    )
  )
}

function parseNewtonPayload(
  value: unknown,
  params: NewtonComputeParams,
): NewtonComputeResponse {
  if (!isRecord(value)) {
    throw new RuntimeFailure(
      'OPEN_API_FAILED',
      'Newton response did not match the documented JSON object shape.',
    )
  }
  const payload = value as NewtonPayload
  if (payload.operation !== params.operation) {
    throw new RuntimeFailure(
      'OPEN_API_FAILED',
      'Newton response operation did not match the requested operation.',
      { expected: params.operation, actual: payload.operation },
    )
  }
  if (typeof payload.expression !== 'string') {
    throw new RuntimeFailure(
      'OPEN_API_FAILED',
      'Newton response did not include an expression string.',
    )
  }
  const result = parseNewtonResult(payload.result)
  if (result === undefined) {
    throw new RuntimeFailure(
      'OPEN_API_FAILED',
      'Newton response did not include a supported result value.',
    )
  }
  return {
    operation: params.operation,
    expression: payload.expression,
    result,
  }
}

function parseNewtonResult(
  value: unknown,
): NewtonComputeResponse['result'] | undefined {
  if (typeof value === 'string' || typeof value === 'number') return value
  if (!Array.isArray(value)) return undefined
  if (value.every(entry => typeof entry === 'string' || typeof entry === 'number')) {
    return value
  }
  return undefined
}

function readNewtonError(value: unknown): string | undefined {
  if (!isRecord(value)) return undefined
  return typeof value.error === 'string' ? value.error : undefined
}

function encodeNewtonExpression(expression: string): string {
  return encodeURIComponent(expression).replaceAll('%2F', '(over)')
}

function normalizeBaseUrl(value: string): string {
  return value.replace(/\/+$/u, '')
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}
