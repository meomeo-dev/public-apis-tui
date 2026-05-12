import {
  ArbeitnowClient,
  ARBEITNOW_PAGE_SIZE,
  normalizeArbeitnowJobsInput,
  type ArbeitnowJob,
  type ArbeitnowJobsInput,
  type ArbeitnowPagination,
  type ArbeitnowRateLimit,
} from '../../infrastructure/openApis/arbeitnowClient.js'

export type ArbeitnowJobsResult = {
  kind: 'arbeitnow.jobs'
  api: {
    provider: 'arbeitnow'
    publicApisProject: string
    endpoint: string
    docsUrl: string
    usesBrowserClickstream: false
    authentication: 'none'
    transport: 'HTTPS JSON REST'
    updateCadence: string
    defaultPageSize: number
    rateLimitPolicy: string
    parameterPolicy: string
  }
  query: ReturnType<typeof normalizeArbeitnowJobsInput>
  pagination: ArbeitnowPagination & {
    returned: number
    pageSize: number
  }
  rateLimit: ArbeitnowRateLimit
  jobs: ArbeitnowJob[]
}

export async function listArbeitnowJobs(input: ArbeitnowJobsInput = {}): Promise<ArbeitnowJobsResult> {
  const query = normalizeArbeitnowJobsInput(input)
  const client = new ArbeitnowClient()
  const response = await client.listJobs(query)
  return {
    kind: 'arbeitnow.jobs',
    api: {
      provider: 'arbeitnow',
      publicApisProject: 'https://github.com/public-apis/public-apis',
      endpoint: 'GET /api/job-board-api',
      docsUrl: 'https://documenter.getpostman.com/view/18545278/UVJbJdKh',
      usesBrowserClickstream: false,
      authentication: 'none',
      transport: 'HTTPS JSON REST',
      updateCadence: 'Jobs are updated every hour according to response metadata.',
      defaultPageSize: ARBEITNOW_PAGE_SIZE,
      rateLimitPolicy: 'Live response exposes x-ratelimit-limit and x-ratelimit-remaining; use --persist then --offline to conserve requests.',
      parameterPolicy: 'Arbeitnow currently returns 100 rows per page and honors page plus visa_sponsorship; ignored/undocumented filter parameters are intentionally not exposed.',
    },
    query,
    pagination: {
      ...response.pagination,
      returned: response.jobs.length,
      pageSize: ARBEITNOW_PAGE_SIZE,
    },
    rateLimit: response.rateLimit,
    jobs: response.jobs,
  }
}
