import { z } from 'zod'
import { getIcanhazip, type IcanhazipIpInput } from '../../application/usecases/icanhazip.js'
import { normalizeIcanhazipProtocol, resolveEndpoint } from '../../infrastructure/openApis/icanhazipClient.js'
import type { PublicApiOperationDefinition, PublicApiProviderModule } from '../providerTypes.js'

const ipParamsSchema = z.object({
  protocol: z.string().optional().transform(value => normalizeIcanhazipProtocol(value)),
}) satisfies z.ZodType<IcanhazipIpInput>

const ipOperation: PublicApiOperationDefinition<IcanhazipIpInput> = {
  id: 'icanhazip.ip',
  providerId: 'icanhazip',
  name: 'IP Address',
  commandPath: ['icanhazip', 'ip'],
  rpcMethod: 'icanhazip.ip',
  description: 'Return the public IP address observed by the Icanhazip service.',
  category: 'development',
  options: [
    {
      name: 'protocol',
      flag: '--protocol <auto|ipv4>',
      description: 'Endpoint family to query, default auto',
      exposure: 'primary',
      group: 'transport',
      reason: 'Icanhazip exposes separate hostnames for default and IPv4; IPv6 is not exposed because the live endpoint did not resolve.',
      defaultValue: 'auto',
    },
  ],
  paramsSchema: ipParamsSchema,
  execute: params => getIcanhazip(params),
  normalizeParams: params => ipParamsSchema.parse(params),
  createCacheKeyParams: params => {
    const protocol = normalizeIcanhazipProtocol(params.protocol)
    return { protocol, endpoint: resolveEndpoint(protocol) }
  },
  resultKind: 'icanhazip.ip',
  defaultFormat: 'text',
}

export const icanhazipProvider: PublicApiProviderModule = {
  manifest: {
    id: 'icanhazip',
    name: 'Icanhazip',
    description: 'No-auth HTTPS text/plain API returning the caller public IP address.',
    publicApisCategory: 'Development',
    homepageUrl: 'https://icanhazip.com',
    docsUrl: 'https://major.io/icanhazip-com-faq/',
    auth: {
      mode: 'none',
      notes: ['Cloudflare-operated Icanhazip endpoints require no API key or browser session.'],
    },
    tags: ['development', 'ip-address', 'diagnostics', 'text', 'cloudflare', 'no-auth'],
    freePlanNotes: [
      'Public rate limits are not documented.',
      'Default and IPv4 endpoints were live on 2026-05-03; ipv6.icanhazip.com did not resolve and is intentionally not exposed.',
    ],
  },
  operations: [ipOperation],
  endpoints: [
    {
      id: 'icanhazip-default',
      method: 'GET',
      urlPattern: 'https://icanhazip.com/',
      category: 'open-api',
      evidenceStatus: 'confirmed',
      description: 'Icanhazip default public IP text endpoint.',
      siteIds: ['public-apis-tui'],
      sampleSources: ['https://major.io/icanhazip-com-faq/', 'https://icanhazip.com'],
      consumedBy: ['icanhazip ip'],
      notes: ['No authentication required; response is text/plain, not JSON; no browser clickstream or scraping required.'],
    },
    {
      id: 'icanhazip-ipv4',
      method: 'GET',
      urlPattern: 'https://ipv4.icanhazip.com/',
      category: 'open-api',
      evidenceStatus: 'confirmed',
      description: 'Icanhazip IPv4-only public IP text endpoint.',
      siteIds: ['public-apis-tui'],
      sampleSources: ['https://major.io/icanhazip-com-faq/', 'https://ipv4.icanhazip.com'],
      consumedBy: ['icanhazip ip'],
      notes: ['No authentication required; response is text/plain, not JSON; no browser clickstream or scraping required.'],
    },
  ],
}
