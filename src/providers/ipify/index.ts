import { z } from 'zod'
import { getIpify, type IpifyIpInput } from '../../application/usecases/ipify.js'
import { normalizeIpifyProtocol, resolveIpifyEndpoint } from '../../infrastructure/openApis/ipifyClient.js'
import type { PublicApiOperationDefinition, PublicApiProviderModule } from '../providerTypes.js'

const ipParamsSchema = z.object({
  protocol: z.string().optional().transform(value => normalizeIpifyProtocol(value)),
}) satisfies z.ZodType<IpifyIpInput>

const ipOperation: PublicApiOperationDefinition<IpifyIpInput> = {
  id: 'ipify.ip',
  providerId: 'ipify',
  name: 'IP Address',
  commandPath: ['ipify', 'ip'],
  rpcMethod: 'ipify.ip',
  description: 'Return the public IP address observed by IPify using its documented JSON endpoint.',
  category: 'development',
  options: [
    {
      name: 'protocol',
      flag: '--protocol <auto|ipv4>',
      description: 'Endpoint family to query, default auto via api64',
      exposure: 'primary',
      group: 'transport',
      reason: 'IPify documents IPv4-only, IPv6-only, and universal hostnames; auto and ipv4 cover stable CLI use without failing IPv6-only requests on IPv4 networks.',
      defaultValue: 'auto',
    },
  ],
  paramsSchema: ipParamsSchema,
  execute: params => getIpify(params),
  normalizeParams: params => ipParamsSchema.parse(params),
  createCacheKeyParams: params => {
    const protocol = normalizeIpifyProtocol(params.protocol)
    return { protocol, endpoint: resolveIpifyEndpoint(protocol) }
  },
  resultKind: 'ipify.ip',
  defaultFormat: 'text',
}

export const ipifyProvider: PublicApiProviderModule = {
  manifest: {
    id: 'ipify',
    name: 'IPify',
    description: 'No-auth HTTPS JSON API returning the caller public IP address.',
    publicApisCategory: 'Development',
    homepageUrl: 'https://www.ipify.org/',
    docsUrl: 'https://www.ipify.org/',
    auth: {
      mode: 'none',
      notes: ['The consumed IPify JSON endpoints require no API key, OAuth, cookies, browser session, or account setup.'],
    },
    tags: ['development', 'ip-address', 'diagnostics', 'json', 'no-auth'],
    freePlanNotes: [
      'Official homepage says the API can be used without limit, even at very high request rates.',
      'JSONP and plain text response formats are documented upstream but intentionally not exposed because this CLI persists and renders structured JSON.',
      'api6.ipify.org is intentionally not exposed in the first pass because it fails for clients without IPv6 connectivity; api64 covers IPv4/IPv6 auto behavior.',
    ],
  },
  operations: [ipOperation],
  endpoints: [
    {
      id: 'ipify-ipv4-json',
      method: 'GET',
      urlPattern: 'regex:^https://api\\.ipify\\.org\\/?\\?format=json$',
      category: 'open-api',
      evidenceStatus: 'confirmed',
      description: 'IPify IPv4 JSON endpoint.',
      siteIds: ['public-apis-tui'],
      observedOn: '2026-05-04',
      sampleSources: ['https://www.ipify.org/', 'https://api.ipify.org?format=json'],
      consumedBy: ['ipify ip'],
      notes: ['No authentication required; no browser clickstream or scraping required.'],
    },
    {
      id: 'ipify-universal-json',
      method: 'GET',
      urlPattern: 'regex:^https://api64\\.ipify\\.org\\/?\\?format=json$',
      category: 'open-api',
      evidenceStatus: 'confirmed',
      description: 'IPify universal IPv4/IPv6 JSON endpoint.',
      siteIds: ['public-apis-tui'],
      observedOn: '2026-05-04',
      sampleSources: ['https://www.ipify.org/', 'https://api64.ipify.org?format=json'],
      consumedBy: ['ipify ip'],
      notes: ['No authentication required; no browser clickstream or scraping required.'],
    },
  ],
}
