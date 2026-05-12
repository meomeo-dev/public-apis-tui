import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export const CLOUDFLARE_TRACE_DEFAULT_ENDPOINT = 'one.one.one.one'

export const CLOUDFLARE_TRACE_ENDPOINTS = {
  'one.one.one.one': 'https://one.one.one.one/cdn-cgi/trace',
  '1.0.0.1': 'https://1.0.0.1/cdn-cgi/trace',
  'cloudflare-dns.com': 'https://cloudflare-dns.com/cdn-cgi/trace',
  'cloudflare-eth.com': 'https://cloudflare-eth.com/cdn-cgi/trace',
  'workers.dev': 'https://workers.dev/cdn-cgi/trace',
  'pages.dev': 'https://pages.dev/cdn-cgi/trace',
  'cloudflare.tv': 'https://cloudflare.tv/cdn-cgi/trace',
  'icanhazip.com': 'https://icanhazip.com/cdn-cgi/trace',
  'cloudflare.com': 'https://cloudflare.com/cdn-cgi/trace',
} as const

export type CloudflareTraceEndpoint = keyof typeof CLOUDFLARE_TRACE_ENDPOINTS

export type CloudflareTraceQuery = {
  endpoint?: string | undefined
}

export type CloudflareTraceResponse = {
  endpoint: string
  url: string
  fields: Record<string, string>
  raw: string
}

export type CloudflareTraceClientOptions = {
  fetchImpl?: typeof fetch | undefined
}

export class CloudflareTraceClient {
  private readonly fetchImpl: typeof fetch

  constructor(options: CloudflareTraceClientOptions = {}) {
    this.fetchImpl = options.fetchImpl ?? fetch
  }

  async getTrace(query: CloudflareTraceQuery = {}): Promise<CloudflareTraceResponse> {
    const endpoint = normalizeCloudflareTraceEndpoint(query.endpoint)
    const url = resolveCloudflareTraceUrl(endpoint)
    const response = await this.fetchImpl(url, {
      method: 'GET',
      headers: {
        accept: 'text/plain',
        'user-agent': 'public-apis-tui no-auth CLI',
      },
    })
    const raw = await response.text()
    if (!response.ok) {
      throw new RuntimeFailure('OPEN_API_FAILED', 'Cloudflare Trace request failed.', {
        status: response.status,
        statusText: response.statusText,
        response: raw.slice(0, 500),
      })
    }

    return {
      endpoint,
      url,
      fields: parseCloudflareTrace(raw),
      raw,
    }
  }
}

export function normalizeCloudflareTraceEndpoint(value: string | undefined): string {
  if (value === undefined || value.trim() === '') {
    return CLOUDFLARE_TRACE_DEFAULT_ENDPOINT
  }
  const trimmed = value.trim()
  if (trimmed.startsWith('https://')) {
    const url = new URL(trimmed)
    if (url.pathname !== '/cdn-cgi/trace') {
      throw new RuntimeFailure('INVALID_ARGUMENT', 'Cloudflare Trace custom endpoint URL must use /cdn-cgi/trace path.', {
        endpoint: value,
      })
    }
    return trimmed
  }
  if (!(trimmed in CLOUDFLARE_TRACE_ENDPOINTS)) {
    throw new RuntimeFailure('INVALID_ARGUMENT', `Cloudflare Trace endpoint must be one of ${Object.keys(CLOUDFLARE_TRACE_ENDPOINTS).join(', ')} or an https://host/cdn-cgi/trace URL.`, {
      endpoint: value,
    })
  }

  return trimmed
}

export function resolveCloudflareTraceUrl(endpoint: string): string {
  if (endpoint.startsWith('https://')) {
    return endpoint
  }
  return CLOUDFLARE_TRACE_ENDPOINTS[endpoint as CloudflareTraceEndpoint]
}

export function parseCloudflareTrace(raw: string): Record<string, string> {
  const fields: Record<string, string> = {}
  for (const line of raw.split(/\r?\n/u)) {
    if (line.trim() === '') {
      continue
    }
    const separatorIndex = line.indexOf('=')
    if (separatorIndex <= 0) {
      continue
    }
    fields[line.slice(0, separatorIndex)] = line.slice(separatorIndex + 1)
  }
  if (Object.keys(fields).length === 0) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'Cloudflare Trace response did not include key=value fields.')
  }

  return fields
}
