import { IPINFO_DEFAULT_IP, IpInfoClient, normalizeIpInfoLookupInput, type IpInfoLookup, type IpInfoLookupInput } from '../../infrastructure/openApis/ipInfoClient.js'

type IpInfoApiMeta = {
  providerId: 'ipinfo'
  providerName: 'IPinfo'
  endpoint: 'GET /{ip}/json'
  documentation: 'https://ipinfo.io/developers'
  authentication: 'none'
  usesBrowserClickstream: false
  transport: 'HTTPS JSON REST'
  privacy: 'IP geolocation can reveal approximate location and network identity; lookup requires an explicit IP and never defaults to current-client IP.'
  freePlanNotes: 'Unauthenticated responses include a missingauth readme URL and a limited public data shape; token workflows are intentionally out of scope for this no-auth provider.'
}

const api = {
  providerId: 'ipinfo',
  providerName: 'IPinfo',
  endpoint: 'GET /{ip}/json',
  documentation: 'https://ipinfo.io/developers',
  authentication: 'none',
  usesBrowserClickstream: false,
  transport: 'HTTPS JSON REST',
  privacy: 'IP geolocation can reveal approximate location and network identity; lookup requires an explicit IP and never defaults to current-client IP.',
  freePlanNotes: 'Unauthenticated responses include a missingauth readme URL and a limited public data shape; token workflows are intentionally out of scope for this no-auth provider.',
} satisfies IpInfoApiMeta

export type IpInfoLookupResult = {
  kind: 'ipinfo.lookup'
  api: IpInfoApiMeta
  query: ReturnType<typeof normalizeIpInfoLookupInput>
  lookup: IpInfoLookup
}

export async function lookupIpInfo(input: IpInfoLookupInput = {}): Promise<IpInfoLookupResult> {
  const query = normalizeIpInfoLookupInput(input)
  const lookup = await new IpInfoClient().lookup(query)
  return {
    kind: 'ipinfo.lookup',
    api,
    query,
    lookup,
  }
}

export { IPINFO_DEFAULT_IP }
export type { IpInfoLookupInput }
