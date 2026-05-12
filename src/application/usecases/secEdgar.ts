import {
  SEC_EDGAR_MAX_LIMIT,
  SecEdgarClient,
  normalizeSecEdgarCompanyConceptInput,
  normalizeSecEdgarSubmissionsInput,
  type SecEdgarCompanyConceptInput,
  type SecEdgarConceptFact,
  type SecEdgarRecentFiling,
  type SecEdgarSubmissionsInput,
} from '../../infrastructure/openApis/secEdgarClient.js'

type SecEdgarApiMeta = {
  provider: 'secedgar'
  publicApisProject: string
  endpoint: string
  docsUrl: string
  usesBrowserClickstream: false
  authentication: 'none'
  transport: 'HTTPS JSON REST'
  accessPolicy: string
}

type SecEdgarPagination = {
  returned: number
  limit: number
  maxLimit: number
  total?: number | undefined
}

export type SecEdgarSubmissionsResult = {
  kind: 'secedgar.submissions'
  api: SecEdgarApiMeta
  query: ReturnType<typeof normalizeSecEdgarSubmissionsInput>
  company: {
    cik: string
    name?: string | undefined
    entityType?: string | undefined
    sic?: string | undefined
    sicDescription?: string | undefined
    tickers: string[]
    exchanges: string[]
  }
  count: number
  pagination: SecEdgarPagination
  filings: SecEdgarRecentFiling[]
}

export type SecEdgarCompanyConceptResult = {
  kind: 'secedgar.companyConcept'
  api: SecEdgarApiMeta
  query: ReturnType<typeof normalizeSecEdgarCompanyConceptInput>
  concept: {
    cik: string
    entityName?: string | undefined
    taxonomy: string
    tag: string
    label?: string | undefined
    description?: string | undefined
    unit: string
    availableUnits: string[]
  }
  count: number
  pagination: SecEdgarPagination
  facts: SecEdgarConceptFact[]
}

export async function getSecEdgarSubmissions(input: SecEdgarSubmissionsInput = {}): Promise<SecEdgarSubmissionsResult> {
  const query = normalizeSecEdgarSubmissionsInput(input)
  const client = new SecEdgarClient()
  const response = await client.getSubmissions(query)
  return {
    kind: 'secedgar.submissions',
    api: createApiMeta('GET /submissions/CIK##########.json'),
    query,
    company: {
      cik: response.cik,
      name: response.name,
      entityType: response.entityType,
      sic: response.sic,
      sicDescription: response.sicDescription,
      tickers: response.tickers,
      exchanges: response.exchanges,
    },
    count: response.filings.length,
    pagination: createPagination(response.filings.length, query.limit, response.recentTotal),
    filings: response.filings,
  }
}

export async function getSecEdgarCompanyConcept(input: SecEdgarCompanyConceptInput = {}): Promise<SecEdgarCompanyConceptResult> {
  const query = normalizeSecEdgarCompanyConceptInput(input)
  const client = new SecEdgarClient()
  const response = await client.getCompanyConcept(query)
  return {
    kind: 'secedgar.companyConcept',
    api: createApiMeta('GET /api/xbrl/companyconcept/CIK##########/{taxonomy}/{tag}.json'),
    query,
    concept: {
      cik: response.cik,
      entityName: response.entityName,
      taxonomy: response.taxonomy,
      tag: response.tag,
      label: response.label,
      description: response.description,
      unit: response.unit,
      availableUnits: response.availableUnits,
    },
    count: response.facts.length,
    pagination: createPagination(response.facts.length, query.limit, response.unitTotal),
    facts: response.facts,
  }
}

function createApiMeta(endpoint: string): SecEdgarApiMeta {
  return {
    provider: 'secedgar',
    publicApisProject: 'https://github.com/public-apis/public-apis',
    endpoint,
    docsUrl: 'https://www.sec.gov/search-filings/edgar-application-programming-interfaces',
    usesBrowserClickstream: false,
    authentication: 'none',
    transport: 'HTTPS JSON REST',
    accessPolicy: 'SEC data.sec.gov APIs require no API key, but automated clients should send a descriptive User-Agent and respect fair-access limits.',
  }
}

function createPagination(returned: number, limit: number, total: number | undefined): SecEdgarPagination {
  return {
    returned,
    limit,
    maxLimit: SEC_EDGAR_MAX_LIMIT,
    ...(total !== undefined ? { total } : {}),
  }
}
