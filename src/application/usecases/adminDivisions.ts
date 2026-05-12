import {
  ADMIN_DIVISIONS_MAX_LIMIT,
  AdminDivisionsClient,
  type AdminDivisionsCountryInput,
  normalizeAdminDivisionsCountryInput,
} from '../../infrastructure/openApis/adminDivisionsClient.js'

export type AdminDivisionsCountryResult = {
  kind: 'admindivisions.country'
  api: {
    providerId: 'admindivisions'
    providerName: 'administrative-divisions-db'
    endpoint: 'GET /api/{country}.json'
    documentation: 'https://github.com/kamikazechaser/administrative-divisions-db'
    authentication: 'none'
    usesBrowserClickstream: false
    transport: 'https-json-static'
    rateLimit: 'No provider API rate limit documented; GitHub raw/cache limits may apply.'
    dataSource: 'GitHub-hosted administrative-divisions-db JSON files'
    limitCap: typeof ADMIN_DIVISIONS_MAX_LIMIT
  }
  query: ReturnType<typeof normalizeAdminDivisionsCountryInput>
  storage: {
    mode: 'online'
    persisted: false
  }
  country: {
    code: string
  }
  pagination: {
    returned: number
    total: number
    limit: number
    maxLimit: number
  }
  divisions: string[]
}

export async function listAdminDivisionsCountry(input: AdminDivisionsCountryInput = {}): Promise<AdminDivisionsCountryResult> {
  const query = normalizeAdminDivisionsCountryInput(input)
  const response = await new AdminDivisionsClient().listCountry(query)
  const divisions = response.divisions.slice(0, query.limit)
  return {
    kind: 'admindivisions.country',
    api: {
      providerId: 'admindivisions',
      providerName: 'administrative-divisions-db',
      endpoint: 'GET /api/{country}.json',
      documentation: 'https://github.com/kamikazechaser/administrative-divisions-db',
      authentication: 'none',
      usesBrowserClickstream: false,
      transport: 'https-json-static',
      rateLimit: 'No provider API rate limit documented; GitHub raw/cache limits may apply.',
      dataSource: 'GitHub-hosted administrative-divisions-db JSON files',
      limitCap: ADMIN_DIVISIONS_MAX_LIMIT,
    },
    query,
    storage: { mode: 'online', persisted: false },
    country: { code: query.country },
    pagination: {
      returned: divisions.length,
      total: response.divisions.length,
      limit: query.limit,
      maxLimit: ADMIN_DIVISIONS_MAX_LIMIT,
    },
    divisions,
  }
}

export type { AdminDivisionsCountryInput }
