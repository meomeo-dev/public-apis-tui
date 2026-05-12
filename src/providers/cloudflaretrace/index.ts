import { z } from 'zod'
import {
  getCloudflareTrace,
  normalizeCloudflareTraceInput,
  type CloudflareTraceInput,
} from '../../application/usecases/cloudflareTrace.js'
import type { PublicApiOperationDefinition, PublicApiProviderModule } from '../providerTypes.js'

const traceParamsSchema = z.object({
  endpoint: z.string().min(1).optional(),
  includeRaw: z.boolean().optional(),
}) satisfies z.ZodType<CloudflareTraceInput>

const traceOperation: PublicApiOperationDefinition<CloudflareTraceInput> = {
  id: 'cloudflaretrace.trace',
  providerId: 'cloudflare-trace',
  name: 'Trace',
  commandPath: ['cloudflaretrace', 'trace'],
  rpcMethod: 'cloudflaretrace.trace',
  description: 'Fetch Cloudflare /cdn-cgi/trace key-value metadata from a curated no-auth endpoint.',
  category: 'development',
  options: [
    {
      name: 'endpoint',
      flag: '--endpoint <alias-or-url>',
      description: 'Trace endpoint alias or URL, default one.one.one.one',
      exposure: 'primary',
      group: 'query',
      reason: 'The README lists multiple Cloudflare-hosted trace endpoints; selecting one is the main user choice.',
      defaultValue: 'one.one.one.one',
    },
    {
      name: 'includeRaw',
      flag: '--include-raw <true|false>',
      description: 'Include raw key=value response text in JSON output, default false',
      exposure: 'advanced',
      group: 'content',
      reason: 'Raw transport text is useful for debugging but redundant for normal structured TUI output.',
      valueType: 'boolean',
      defaultValue: 'false',
    },
  ],
  paramsSchema: traceParamsSchema,
  execute: params => getCloudflareTrace(params),
  normalizeParams: params => traceParamsSchema.parse(params),
  createCacheKeyParams: params => normalizeCloudflareTraceInput(params),
  resultKind: 'cloudflaretrace.trace',
  defaultFormat: 'text',
}

export const cloudflareTraceProvider: PublicApiProviderModule = {
  manifest: {
    id: 'cloudflare-trace',
    name: 'Cloudflare Trace',
    description: 'No-auth Cloudflare /cdn-cgi/trace endpoint metadata projected from text/plain key-value responses.',
    publicApisCategory: 'Development',
    homepageUrl: 'https://github.com/fawazahmed0/cloudflare-trace-api',
    docsUrl: 'https://github.com/fawazahmed0/cloudflare-trace-api',
    auth: {
      mode: 'none',
      notes: ['README documents public /cdn-cgi/trace endpoints and live probes require no API key.'],
    },
    tags: ['development', 'cloudflare', 'network', 'ip', 'trace', 'no-auth', 'text-plain'],
    freePlanNotes: [
      'Rate limits are not documented.',
      'Responses are text/plain key=value, not JSON; the provider parses them into structured JSON before rendering.',
      'speed.cloudflare.com/meta is excluded because live probes returned HTTP 403 on 2026-05-03.',
    ],
  },
  operations: [traceOperation],
  endpoints: [
    {
      id: 'cloudflare-trace-cdn-cgi-trace',
      method: 'GET',
      urlPattern: 'regex:^https://(?:one\\.one\\.one\\.one|1\\.0\\.0\\.1|cloudflare-dns\\.com|cloudflare-eth\\.com|workers\\.dev|pages\\.dev|cloudflare\\.tv|icanhazip\\.com|cloudflare\\.com)/cdn-cgi/trace$',
      category: 'open-api',
      evidenceStatus: 'confirmed',
      description: 'Cloudflare /cdn-cgi/trace key-value metadata endpoint.',
      siteIds: ['public-apis-tui'],
      sampleSources: ['https://github.com/fawazahmed0/cloudflare-trace-api', 'https://one.one.one.one/cdn-cgi/trace'],
      consumedBy: ['cloudflaretrace trace'],
      notes: ['No authentication required.', 'Transport is HTTPS text/plain key=value; no browser clickstream or scraping required.'],
    },
  ],
}
