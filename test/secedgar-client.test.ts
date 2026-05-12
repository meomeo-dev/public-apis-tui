import assert from 'node:assert/strict'
import test from 'node:test'
import { getSecEdgarCompanyConcept, getSecEdgarSubmissions } from '../src/application/usecases/secEdgar.js'
import {
  SEC_EDGAR_USER_AGENT,
  SecEdgarClient,
  normalizeSecEdgarCompanyConceptInput,
  normalizeSecEdgarSubmissionsInput,
} from '../src/infrastructure/openApis/secEdgarClient.js'
import { RuntimeFailure } from '../src/shared/errors/runtimeFailure.js'

test('SEC EDGAR client fetches submissions and company concept JSON with user agent', async () => {
  const client = new SecEdgarClient({
    fetchImpl: (async (input, init) => {
      const url = new URL(String(input))
      assert.equal((init?.headers as Record<string, string>)['user-agent'], SEC_EDGAR_USER_AGENT)
      if (url.pathname.includes('/submissions/')) {
        assert.equal(url.pathname, '/submissions/CIK0000320193.json')
        return jsonResponse(createSubmissionsFixture())
      }
      assert.equal(url.pathname, '/api/xbrl/companyconcept/CIK0000320193/us-gaap/AccountsPayableCurrent.json')
      return jsonResponse(createConceptFixture())
    }) as typeof fetch,
  })

  const submissions = await client.getSubmissions({ cik: '0000320193', limit: 2 })
  assert.equal(submissions.name, 'Apple Inc.')
  assert.equal(submissions.filings.length, 2)
  assert.equal(submissions.recentTotal, 3)

  const concept = await client.getCompanyConcept({ cik: '0000320193', taxonomy: 'us-gaap', tag: 'AccountsPayableCurrent', unit: 'USD', limit: 2 })
  assert.equal(concept.entityName, 'Apple Inc.')
  assert.equal(concept.facts.length, 2)
  assert.equal(concept.facts[0]?.end, '2026-03-28')
  assert.equal(concept.unitTotal, 3)
})

test('SEC EDGAR usecases project TUI-ready JSON boundaries', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async input => {
    const url = new URL(String(input))
    return jsonResponse(url.pathname.includes('/submissions/') ? createSubmissionsFixture() : createConceptFixture())
  }) as typeof fetch

  try {
    const submissions = await getSecEdgarSubmissions({ limit: 2 })
    assert.equal(submissions.kind, 'secedgar.submissions')
    assert.equal(submissions.api.authentication, 'none')
    assert.equal(submissions.api.usesBrowserClickstream, false)
    assert.equal(submissions.pagination.maxLimit, 1000)

    const concept = await getSecEdgarCompanyConcept({ limit: 2 })
    assert.equal(concept.kind, 'secedgar.companyConcept')
    assert.equal(concept.api.authentication, 'none')
    assert.equal(concept.facts[0]?.form, '10-Q')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('SEC EDGAR normalizers enforce CIK, tokens, and documented limit cap', () => {
  assert.deepEqual(normalizeSecEdgarSubmissionsInput({ cik: 320193, limit: 2 }), { cik: '0000320193', limit: 2 })
  assert.deepEqual(normalizeSecEdgarCompanyConceptInput({}), {
    cik: '0000320193',
    taxonomy: 'us-gaap',
    tag: 'AccountsPayableCurrent',
    unit: 'USD',
    limit: 100,
  })
  assert.throws(() => normalizeSecEdgarSubmissionsInput({ cik: 'not-a-cik' }), RuntimeFailure)
  assert.throws(() => normalizeSecEdgarCompanyConceptInput({ tag: 'Bad/Tag' }), RuntimeFailure)
  assert.throws(() => normalizeSecEdgarSubmissionsInput({ limit: 1001 }), RuntimeFailure)
})

test('SEC EDGAR client explains non-JSON 404 and missing units', async () => {
  const missingConceptClient = new SecEdgarClient({
    fetchImpl: (async () =>
      new Response('<Error><Code>NoSuchKey</Code></Error>', {
        status: 404,
        headers: { 'content-type': 'application/xml' },
      })) as typeof fetch,
  })
  await assert.rejects(
    () => missingConceptClient.getCompanyConcept({ cik: '0000320193', taxonomy: 'us-gaap', tag: 'NoSuchConceptXYZ', unit: 'USD', limit: 2 }),
    /No SEC EDGAR company concept found for CIK 0000320193 us-gaap\/NoSuchConceptXYZ/u,
  )

  const missingUnitClient = new SecEdgarClient({
    fetchImpl: (async () => jsonResponse(createConceptFixture())) as typeof fetch,
  })
  await assert.rejects(
    () => missingUnitClient.getCompanyConcept({ cik: '0000320193', taxonomy: 'us-gaap', tag: 'AccountsPayableCurrent', unit: 'BAD', limit: 2 }),
    /available units: USD/u,
  )
})

function jsonResponse(value: unknown): Response {
  return new Response(JSON.stringify(value), { status: 200, headers: { 'content-type': 'application/json' } })
}

function createSubmissionsFixture(): Record<string, unknown> {
  return {
    cik: '0000320193',
    entityType: 'operating',
    sic: '3571',
    sicDescription: 'Electronic Computers',
    name: 'Apple Inc.',
    tickers: ['AAPL'],
    exchanges: ['Nasdaq'],
    filings: {
      recent: {
        accessionNumber: ['0000320193-26-000013', '0000320193-26-000007', '0000320193-26-000005'],
        filingDate: ['2026-05-01', '2026-02-06', '2026-01-16'],
        reportDate: ['2026-03-28', '2025-12-27', '2025-12-31'],
        form: ['10-Q', '10-Q', '8-K'],
        primaryDocument: ['aapl-20260328.htm', 'aapl-20251227.htm', 'aapl-20260116.htm'],
        primaryDocDescription: ['10-Q', '10-Q', '8-K'],
        size: [987654, 876543, 123456],
        isXBRL: [1, 1, 0],
        isInlineXBRL: [1, 1, 0],
      },
    },
  }
}

function createConceptFixture(): Record<string, unknown> {
  return {
    cik: '0000320193',
    taxonomy: 'us-gaap',
    tag: 'AccountsPayableCurrent',
    label: 'Accounts Payable, Current',
    description: 'Carrying value as of the balance sheet date of obligations incurred.',
    entityName: 'Apple Inc.',
    units: {
      USD: [
        { end: '2025-09-27', val: 69824000000, accn: '0000320193-25-000079', fy: 2025, fp: 'FY', form: '10-K', filed: '2025-10-31' },
        { end: '2025-12-27', val: 62985000000, accn: '0000320193-26-000007', fy: 2026, fp: 'Q1', form: '10-Q', filed: '2026-02-06' },
        { end: '2026-03-28', val: 57349000000, accn: '0000320193-26-000013', fy: 2026, fp: 'Q2', form: '10-Q', filed: '2026-05-01' },
      ],
    },
  }
}
