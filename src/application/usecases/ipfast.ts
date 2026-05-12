import { IpfastClient, type IpfastLookupResponse, type IpfastRateLimit } from '../../infrastructure/openApis/ipfastClient.js'

export type IpfastLookupInput = Record<string, never>

export type IpfastLookupResult = {
  kind: 'ipfast.lookup'
  api: {
    provider: 'ipfast'
    endpoint: 'GET /json'
    authentication: 'none'
    usesBrowserClickstream: false
    docs: 'https://ipfast.dev'
    homepage: 'https://ipfast.dev'
    publicApisListedDocs: 'https://ip-fast.com/docs/'
    publicApisListedDocsStatus: 'stale: redirects to parked/non-API content during 2026-05-04 live probe'
    transport: 'HTTPS JSON'
    rateLimit: 'observed x-ratelimit-limit header: 120; reset window not documented'
  }
  query: Record<string, never>
  ip: {
    address: string
  }
  geo: {
    country?: string | undefined
    countryName?: string | undefined
    flag?: string | undefined
    city?: string | undefined
    region?: string | undefined
    regionCode?: string | undefined
    postalCode?: string | undefined
    timezone?: string | undefined
    latitude?: string | undefined
    longitude?: string | undefined
    continent?: string | undefined
    continentCode?: string | undefined
  }
  network: {
    asn?: number | undefined
    asOrganization?: string | undefined
    colo?: string | undefined
  }
  locale: {
    isEU?: boolean | undefined
    currency?: string | undefined
    currencyName?: string | undefined
    currencySymbol?: string | undefined
    callingCode?: string | undefined
    languages?: string | undefined
    countryTld?: string | undefined
    countryCapital?: string | undefined
  }
  rateLimit: IpfastRateLimit
  response: {
    endpoint: string
    contentType?: string | undefined
  }
}

export async function lookupIpfast(_input: IpfastLookupInput = {}): Promise<IpfastLookupResult> {
  const client = new IpfastClient()
  const response = await client.lookup()
  return projectIpfastLookup(response.body, {
    endpoint: response.endpoint,
    contentType: response.contentType,
    rateLimit: response.rateLimit,
  })
}

export function projectIpfastLookup(
  body: IpfastLookupResponse,
  response: { endpoint: string; contentType?: string | undefined; rateLimit: IpfastRateLimit },
): IpfastLookupResult {
  return {
    kind: 'ipfast.lookup',
    api: {
      provider: 'ipfast',
      endpoint: 'GET /json',
      authentication: 'none',
      usesBrowserClickstream: false,
      docs: 'https://ipfast.dev',
      homepage: 'https://ipfast.dev',
      publicApisListedDocs: 'https://ip-fast.com/docs/',
      publicApisListedDocsStatus: 'stale: redirects to parked/non-API content during 2026-05-04 live probe',
      transport: 'HTTPS JSON',
      rateLimit: 'observed x-ratelimit-limit header: 120; reset window not documented',
    },
    query: {},
    ip: {
      address: body.ip,
    },
    geo: copyDefined({
      country: body.country,
      countryName: body.countryName,
      flag: body.flag,
      city: body.city,
      region: body.region,
      regionCode: body.regionCode,
      postalCode: body.postalCode,
      timezone: body.timezone,
      latitude: body.latitude,
      longitude: body.longitude,
      continent: body.continent,
      continentCode: body.continentCode,
    }),
    network: copyDefined({
      asn: body.asn,
      asOrganization: body.asOrganization,
      colo: body.colo,
    }),
    locale: copyDefined({
      isEU: body.isEU,
      currency: body.currency,
      currencyName: body.currencyName,
      currencySymbol: body.currencySymbol,
      callingCode: body.callingCode,
      languages: body.languages,
      countryTld: body.countryTld,
      countryCapital: body.countryCapital,
    }),
    rateLimit: response.rateLimit,
    response: {
      endpoint: response.endpoint,
      ...(response.contentType !== undefined ? { contentType: response.contentType } : {}),
    },
  }
}

function copyDefined<T extends Record<string, unknown>>(value: T): Partial<T> {
  return Object.fromEntries(Object.entries(value).filter(([, entryValue]) => entryValue !== undefined)) as Partial<T>
}
