import {
  CLOUDFLARE_TRACE_DEFAULT_ENDPOINT,
  CLOUDFLARE_TRACE_ENDPOINTS,
  CloudflareTraceClient,
  normalizeCloudflareTraceEndpoint,
  resolveCloudflareTraceUrl,
} from '../../infrastructure/openApis/cloudflareTraceClient.js'

export type CloudflareTraceInput = {
  endpoint?: string | undefined
  includeRaw?: boolean | undefined
}

export type CloudflareTraceResult = {
  kind: 'cloudflaretrace.trace'
  api: {
    provider: 'cloudflare-trace'
    endpoint: 'GET /cdn-cgi/trace'
    authentication: 'none'
    usesBrowserClickstream: false
    docs: 'https://github.com/fawazahmed0/cloudflare-trace-api'
    rateLimit: 'not documented'
    transport: 'HTTPS text/plain key-value'
    defaultEndpoint: string
    endpoints: string[]
    excludedEndpoints: {
      url: 'https://speed.cloudflare.com/meta'
      reason: 'Live probes returned HTTP 403 on 2026-05-03.'
    }[]
  }
  query: {
    endpoint: string
    url: string
    includeRaw: boolean
  }
  trace: {
    cloudflareWorker?: string | undefined
    host?: string | undefined
    ip?: string | undefined
    timestamp?: number | undefined
    visitScheme?: string | undefined
    userAgent?: string | undefined
    colo?: string | undefined
    sliver?: string | undefined
    http?: string | undefined
    country?: string | undefined
    tls?: string | undefined
    sni?: string | undefined
    warp?: string | undefined
    gateway?: string | undefined
    rbi?: string | undefined
    keyExchange?: string | undefined
  }
  fields: Record<string, string>
  raw?: string | undefined
}

export async function getCloudflareTrace(input: CloudflareTraceInput = {}): Promise<CloudflareTraceResult> {
  const query = normalizeCloudflareTraceInput(input)
  const client = new CloudflareTraceClient()
  const response = await client.getTrace({ endpoint: query.endpoint })
  return {
    kind: 'cloudflaretrace.trace',
    api: {
      provider: 'cloudflare-trace',
      endpoint: 'GET /cdn-cgi/trace',
      authentication: 'none',
      usesBrowserClickstream: false,
      docs: 'https://github.com/fawazahmed0/cloudflare-trace-api',
      rateLimit: 'not documented',
      transport: 'HTTPS text/plain key-value',
      defaultEndpoint: CLOUDFLARE_TRACE_DEFAULT_ENDPOINT,
      endpoints: Object.keys(CLOUDFLARE_TRACE_ENDPOINTS),
      excludedEndpoints: [
        {
          url: 'https://speed.cloudflare.com/meta',
          reason: 'Live probes returned HTTP 403 on 2026-05-03.',
        },
      ],
    },
    query: {
      endpoint: response.endpoint,
      url: response.url,
      includeRaw: query.includeRaw,
    },
    trace: projectTrace(response.fields),
    fields: response.fields,
    ...(query.includeRaw ? { raw: response.raw } : {}),
  }
}

export function normalizeCloudflareTraceInput(input: CloudflareTraceInput): CloudflareTraceResult['query'] {
  const endpoint = normalizeCloudflareTraceEndpoint(input.endpoint)
  return {
    endpoint,
    url: resolveCloudflareTraceUrl(endpoint),
    includeRaw: input.includeRaw === true,
  }
}

function projectTrace(fields: Record<string, string>): CloudflareTraceResult['trace'] {
  return {
    ...(fields.fl !== undefined ? { cloudflareWorker: fields.fl } : {}),
    ...(fields.h !== undefined ? { host: fields.h } : {}),
    ...(fields.ip !== undefined ? { ip: fields.ip } : {}),
    ...(fields.ts !== undefined ? { timestamp: Number(fields.ts) } : {}),
    ...(fields.visit_scheme !== undefined ? { visitScheme: fields.visit_scheme } : {}),
    ...(fields.uag !== undefined ? { userAgent: fields.uag } : {}),
    ...(fields.colo !== undefined ? { colo: fields.colo } : {}),
    ...(fields.sliver !== undefined ? { sliver: fields.sliver } : {}),
    ...(fields.http !== undefined ? { http: fields.http } : {}),
    ...(fields.loc !== undefined ? { country: fields.loc } : {}),
    ...(fields.tls !== undefined ? { tls: fields.tls } : {}),
    ...(fields.sni !== undefined ? { sni: fields.sni } : {}),
    ...(fields.warp !== undefined ? { warp: fields.warp } : {}),
    ...(fields.gateway !== undefined ? { gateway: fields.gateway } : {}),
    ...(fields.rbi !== undefined ? { rbi: fields.rbi } : {}),
    ...(fields.kex !== undefined ? { keyExchange: fields.kex } : {}),
  }
}
