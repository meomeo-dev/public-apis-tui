import assert from 'node:assert/strict'
import test from 'node:test'
import { listArbeitnowJobs } from '../src/application/usecases/arbeitnow.js'
import { ArbeitnowClient, normalizeArbeitnowJobsInput } from '../src/infrastructure/openApis/arbeitnowClient.js'

test('Arbeitnow client reads job board envelope', async () => {
  const client = new ArbeitnowClient({
    baseUrl: 'https://example.test',
    fetchImpl: (async input => {
      const url = new URL(String(input))
      assert.equal(url.pathname, '/api/job-board-api')
      assert.equal(url.searchParams.get('page'), '2')
      assert.equal(url.searchParams.get('visa_sponsorship'), 'true')
      return new Response(JSON.stringify(createArbeitnowFixture()), {
        status: 200,
        headers: {
          'content-type': 'application/json',
          'x-ratelimit-limit': '5',
          'x-ratelimit-remaining': '4',
        },
      })
    }) as typeof fetch,
  })

  const response = await client.listJobs({ page: 2, visaSponsorship: true })
  assert.equal(response.jobs.length, 2)
  assert.equal(response.jobs[0]?.slug, 'data-engineer-berlin-123')
  assert.equal(response.jobs[0]?.companyName, 'Example GmbH')
  assert.equal(response.jobs[0]?.descriptionText, 'Build data products')
  assert.equal(response.jobs[0]?.createdAtIso, '2026-05-04T09:00:00.000Z')
  assert.equal(response.pagination.currentPage, 2)
  assert.equal(response.pagination.perPage, 100)
  assert.equal(response.rateLimit.limit, '5')
})

test('Arbeitnow usecase projects TUI-ready JSON', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async () => new Response(JSON.stringify(createArbeitnowFixture()), {
    status: 200,
    headers: { 'content-type': 'application/json', 'x-ratelimit-limit': '5', 'x-ratelimit-remaining': '3' },
  })) as typeof fetch
  try {
    const result = await listArbeitnowJobs({ visaSponsorship: true })
    assert.equal(result.kind, 'arbeitnow.jobs')
    assert.equal(result.api.provider, 'arbeitnow')
    assert.equal(result.api.authentication, 'none')
    assert.equal(result.api.usesBrowserClickstream, false)
    assert.equal(result.query.page, 1)
    assert.equal(result.query.visaSponsorship, true)
    assert.equal(result.pagination.returned, 2)
    assert.equal(result.pagination.pageSize, 100)
    assert.equal(result.jobs[1]?.remote, true)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('Arbeitnow normalizer enforces safe page bounds', () => {
  assert.deepEqual(normalizeArbeitnowJobsInput(), { page: 1 })
  assert.deepEqual(normalizeArbeitnowJobsInput({ page: 3, visaSponsorship: false }), { page: 3, visaSponsorship: false })
  assert.throws(() => normalizeArbeitnowJobsInput({ page: 0 }), /--page must be an integer/)
})

function createArbeitnowFixture(): Record<string, unknown> {
  return {
    data: [
      {
        slug: 'data-engineer-berlin-123',
        company_name: 'Example GmbH',
        title: 'Data Engineer',
        description: '<p>Build <strong>data</strong> products</p>',
        remote: false,
        url: 'https://www.arbeitnow.com/view/data-engineer-berlin-123',
        tags: ['Data', 'Engineering'],
        job_types: ['Full-time'],
        location: 'Berlin, Germany',
        created_at: 1777885200,
        visa_sponsorship: true,
      },
      {
        slug: 'remote-product-manager-456',
        company_name: 'Remote Co',
        title: 'Product Manager',
        description: '<p>Lead roadmap</p>',
        remote: true,
        url: 'https://www.arbeitnow.com/view/remote-product-manager-456',
        tags: ['Product'],
        job_types: ['Permanent'],
        location: 'Remote',
        created_at: 1777885300,
      },
    ],
    links: { first: 'https://www.arbeitnow.com/api/job-board-api?page=1', prev: null, next: 'https://www.arbeitnow.com/api/job-board-api?page=3', last: null },
    meta: {
      current_page: 2,
      from: 101,
      to: 102,
      per_page: 100,
      terms: 'This is a free public API for jobs, please do not abuse.',
      info: 'Jobs are updated every hour and order by the `created_at` timestamp. Use `?page=` to paginate.',
    },
  }
}
