import { z } from 'zod'
import { lookupIpfast, type IpfastLookupInput } from '../../application/usecases/ipfast.js'
import type { PublicApiOperationDefinition, PublicApiProviderModule } from '../providerTypes.js'

const lookupParamsSchema = z.object({}) satisfies z.ZodType<IpfastLookupInput>

const lookupOperation: PublicApiOperationDefinition<IpfastLookupInput> = {
  id: 'ipfast.lookup',
  providerId: 'ipfast',
  name: 'IP Geo Lookup',
  commandPath: ['ipfast', 'lookup'],
  rpcMethod: 'ipfast.lookup',
  description: 'Return the public IP address plus observed geo, locale, and network metadata from IPFast.',
  category: 'development',
  options: [],
  paramsSchema: lookupParamsSchema,
  execute: params => lookupIpfast(params),
  normalizeParams: () => ({}),
  createCacheKeyParams: () => ({ endpoint: 'https://ipfast.dev/json' }),
  resultKind: 'ipfast.lookup',
  defaultFormat: 'text',
}

export const ipfastProvider: PublicApiProviderModule = {
  manifest: {
    id: 'ipfast',
    name: 'IPFast',
    description: 'No-auth HTTPS JSON API returning caller IP, geolocation, locale, and network metadata.',
    publicApisCategory: 'Development',
    homepageUrl: 'https://ipfast.dev',
    docsUrl: 'https://ipfast.dev',
    auth: {
      mode: 'none',
      notes: ['The consumed IPFast JSON endpoint requires no API key, OAuth, cookies, browser session, or account setup.'],
    },
    tags: ['development', 'ip-address', 'geolocation', 'network', 'locale', 'no-auth', 'json'],
    freePlanNotes: [
      'Live response headers on 2026-05-04 included x-ratelimit-limit: 120; the reset interval was not documented.',
      'The public-apis listed docs URL https://ip-fast.com/docs/ redirected to parked/non-API content during live research; implementation uses the live API host https://ipfast.dev.',
    ],
  },
  operations: [lookupOperation],
  endpoints: [
    {
      id: 'ipfast-json',
      method: 'GET',
      urlPattern: 'https://ipfast.dev/json',
      category: 'open-api',
      evidenceStatus: 'confirmed',
      description: 'IPFast full JSON endpoint returning IP, geo, locale, and ASN metadata.',
      siteIds: ['public-apis-tui'],
      observedOn: '2026-05-04',
      sampleSources: ['https://ip-fast.com/docs/', 'https://ipfast.dev/json'],
      consumedBy: ['ipfast lookup'],
      notes: [
        'No authentication required; no browser clickstream or scraping required.',
        'Original public-apis docs URL was stale/parked during 2026-05-04 probe; live endpoint was confirmed at ipfast.dev.',
        'Observed x-ratelimit-limit header was 120; reset window not documented.',
      ],
    },
  ],
}
