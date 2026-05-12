import assert from 'node:assert/strict'
import test from 'node:test'
import { listUsaSpendingAgencies, readUsaSpendingOverTime, searchUsaSpendingAwards } from '../src/application/usecases/usaSpending.js'
import {
  normalizeUsaSpendingAgenciesInput,
  normalizeUsaSpendingAwardsInput,
  normalizeUsaSpendingOverTimeInput,
  UsaSpendingClient,
} from '../src/infrastructure/openApis/usaSpendingClient.js'
import { RuntimeFailure } from '../src/shared/errors/runtimeFailure.js'

test('USAspending client reads awards, over-time, and agencies endpoints', async () => {
  const client = new UsaSpendingClient({
    fetchImpl: (async (input, init) => {
      const url = new URL(String(input))
      if (url.pathname.endsWith('/spending_by_award/')) {
        const body = JSON.parse(String(init?.body)) as Record<string, unknown>
        assert.equal(body.limit, 100)
        assert.equal(body.page, 1)
        assert.equal(body.sort, 'Award Amount')
        assert.deepEqual(readPath(body, 'filters.time_period.0'), { start_date: '2024-10-01', end_date: '2025-09-30' })
        return jsonResponse(createAwardsFixture())
      }
      if (url.pathname.endsWith('/spending_over_time/')) {
        const body = JSON.parse(String(init?.body)) as Record<string, unknown>
        assert.equal(body.group, 'fiscal_year')
        return jsonResponse(createOverTimeFixture())
      }
      assert.equal(url.pathname.endsWith('/toptier_agencies/'), true)
      assert.equal(url.searchParams.get('sort'), 'budget_authority_amount')
      assert.equal(url.searchParams.get('order'), 'desc')
      return jsonResponse(createAgenciesFixture())
    }) as typeof fetch,
  })

  const awards = await client.searchAwards(normalizeUsaSpendingAwardsInput({}))
  assert.equal(awards.results[0]?.awardId, 'HT940216C0001')
  assert.equal(awards.results[0]?.awardAmount, 51269205263.03)

  const overTime = await client.readSpendingOverTime(normalizeUsaSpendingOverTimeInput({}))
  assert.equal(overTime.results[0]?.label, '2025')
  assert.equal(overTime.results[0]?.aggregatedAmount, 1837329531356.32)

  const agencies = await client.listToptierAgencies(normalizeUsaSpendingAgenciesInput({ limit: 1 }))
  assert.equal(agencies.length, 1)
  assert.equal(agencies[0]?.agencyName, 'Department of the Treasury')
})

test('USAspending usecases project TUI-ready JSON', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async input => {
    const url = new URL(String(input))
    if (url.pathname.endsWith('/spending_by_award/')) {
      return jsonResponse(createAwardsFixture())
    }
    if (url.pathname.endsWith('/spending_over_time/')) {
      return jsonResponse(createOverTimeFixture())
    }
    return jsonResponse(createAgenciesFixture())
  }) as typeof fetch

  try {
    const awards = await searchUsaSpendingAwards({})
    assert.equal(awards.kind, 'usaspending.awards')
    assert.equal(awards.api.authentication, 'none')
    assert.equal(awards.api.usesBrowserClickstream, false)
    assert.equal(awards.page.maxLimit, 100)
    assert.equal(awards.awards[0]?.recipientName, 'HUMANA GOVERNMENT BUSINESS INC')

    const overTime = await readUsaSpendingOverTime({})
    assert.equal(overTime.kind, 'usaspending.overTime')
    assert.equal(overTime.api.authentication, 'none')
    assert.equal(overTime.totals.aggregatedAmount, 4642428518882.68)

    const agencies = await listUsaSpendingAgencies({})
    assert.equal(agencies.kind, 'usaspending.agencies')
    assert.equal(agencies.api.usesBrowserClickstream, false)
    assert.equal(agencies.pagination.maxLimit, 200)
    assert.equal(agencies.agencies[0]?.abbreviation, 'TREAS')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('USAspending normalizers enforce curated bounds', () => {
  assert.deepEqual(normalizeUsaSpendingAwardsInput({}).awardTypeCodes, ['A', 'B', 'C', 'D'])
  assert.equal(normalizeUsaSpendingAwardsInput({ recipient: ' Humana ', awardingAgency: ' Department of Defense ' }).recipient, 'Humana')
  assert.equal(normalizeUsaSpendingOverTimeInput({ group: 'month' }).group, 'month')
  assert.equal(normalizeUsaSpendingAgenciesInput({ limit: 2 }).limit, 2)
  assert.throws(() => normalizeUsaSpendingAwardsInput({ limit: 101 }), RuntimeFailure)
  assert.throws(() => normalizeUsaSpendingAwardsInput({ startDate: '2025-01-01', endDate: '2024-01-01' }), RuntimeFailure)
  assert.throws(() => normalizeUsaSpendingOverTimeInput({ group: 'week' }), RuntimeFailure)
  assert.throws(() => normalizeUsaSpendingAgenciesInput({ sort: 'unknown' }), RuntimeFailure)
})

function jsonResponse(value: unknown): Response {
  return new Response(JSON.stringify(value), { status: 200, headers: { 'content-type': 'application/json' } })
}

function createAwardsFixture(): Record<string, unknown> {
  return {
    spending_level: 'awards',
    limit: 100,
    results: [
      {
        internal_id: 307885715,
        'Award ID': 'HT940216C0001',
        'Recipient Name': 'HUMANA GOVERNMENT BUSINESS INC',
        'Award Amount': 51269205263.03,
        'Awarding Agency': 'Department of Defense',
        'Start Date': '2016-08-01',
        'End Date': '2025-12-31',
        Description: 'IGF::OT::IGF',
        agency_slug: 'department-of-defense',
        generated_internal_id: 'CONT_AWD_HT940216C0001_9700_-NONE-_-NONE-',
      },
    ],
    page_metadata: { page: 1, total: 1, limit: 100, hasNext: false, hasPrevious: false },
    messages: [],
  }
}

function createOverTimeFixture(): Record<string, unknown> {
  return {
    group: 'fiscal_year',
    spending_level: 'awards',
    results: [
      { time_period: { fiscal_year: '2025' }, aggregated_amount: 1837329531356.32, total_outlays: 252223947671.66, Contract_Obligations: 1837329531356.32, Grant_Obligations: 0, Loan_Obligations: 0, Direct_Obligations: 0, Other_Obligations: 0 },
      { time_period: { fiscal_year: '2026' }, aggregated_amount: 2805098987526.36, total_outlays: 519596422888.21, Contract_Obligations: 2805098987526.36, Grant_Obligations: 0, Loan_Obligations: 0, Direct_Obligations: 0, Other_Obligations: 0 },
    ],
    messages: ['time period note'],
  }
}

function createAgenciesFixture(): Record<string, unknown> {
  return {
    results: [
      { agency_id: 456, toptier_code: '020', abbreviation: 'TREAS', agency_name: 'Department of the Treasury', active_fy: '2026', active_fq: '2', outlay_amount: 1036662242415.49, obligated_amount: 1037806753785.61, budget_authority_amount: 5571642140279.95, current_total_budget_authority_amount: 16146657299383.3, percentage_of_total_budget_authority: 0.3450647423162162, agency_slug: 'department-of-the-treasury' },
      { agency_id: 806, toptier_code: '075', abbreviation: 'HHS', agency_name: 'Department of Health and Human Services', active_fy: '2026', active_fq: '2', outlay_amount: 1408535855466.49, obligated_amount: 1472109840992.39, budget_authority_amount: 3325509510196.07, current_total_budget_authority_amount: 16146657299383.3, percentage_of_total_budget_authority: 0.20595653010627055, agency_slug: 'department-of-health-and-human-services' },
    ],
  }
}

function readPath(value: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce<unknown>((cursor, part) => {
    if (cursor === null || typeof cursor !== 'object') {
      return undefined
    }
    return (cursor as Record<string, unknown>)[part]
  }, value)
}
