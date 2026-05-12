import assert from 'node:assert/strict'
import test from 'node:test'
import { listMsrcVulnerabilities } from '../src/application/usecases/msrc.js'
import {
  MsrcClient,
  normalizeMsrcVulnerabilitiesInput,
} from '../src/infrastructure/openApis/msrcClient.js'
import { RuntimeFailure } from '../src/shared/errors/runtimeFailure.js'

test('MSRC client queries public vulnerability OData metadata', async () => {
  const client = new MsrcClient({
    fetchImpl: (async input => {
      const url = new URL(String(input))
      assert.equal(url.hostname, 'api.msrc.microsoft.com')
      assert.equal(url.pathname, '/sug/v2.0/en-US/vulnerability')
      assert.equal(url.searchParams.get('$top'), '3')
      assert.equal(url.searchParams.get('$orderby'), 'releaseDate desc')
      assert.equal(
        url.searchParams.get('$filter'),
        "releaseNumber eq '2026-May' and severityId eq 100000001",
      )
      return jsonResponse(createVulnerabilityFixture())
    }) as typeof fetch,
  })

  const result = await client.listVulnerabilities({
    releaseNumber: '2026-May',
    severity: 'important',
    limit: 3,
  })
  assert.equal(result.meta.totalMatched, 1)
  assert.equal(result.vulnerabilities[0]?.cveNumber, 'CVE-2026-32214')
  assert.equal(result.vulnerabilities[0]?.severity, 'Important')
  assert.equal(result.vulnerabilities[0]?.impact, 'Information Disclosure')
  assert.equal(result.vulnerabilities[0]?.revisionCount, 1)
  assert.equal(result.vulnerabilities[0]?.articleCount, 1)
})

test('MSRC usecase projects TUI-ready JSON', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async () =>
    jsonResponse(createVulnerabilityFixture())) as typeof fetch

  try {
    const result = await listMsrcVulnerabilities({ cve: 'cve-2026-32214', limit: 1 })
    assert.equal(result.kind, 'msrc.vulnerabilities')
    assert.equal(result.api.provider, 'msrc')
    assert.equal(result.api.authentication, 'none')
    assert.equal(result.api.usesBrowserClickstream, false)
    assert.equal(result.pagination.maxLimit, 50)
    assert.equal(result.vulnerabilities[0]?.cveNumber, 'CVE-2026-32214')
    assert.match(result.api.safety, /Read-only public vulnerability/)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('MSRC normalizer enforces curated bounds and filters', () => {
  assert.deepEqual(normalizeMsrcVulnerabilitiesInput({}), {
    cve: undefined,
    releaseNumber: undefined,
    severity: undefined,
    limit: 20,
  })
  assert.deepEqual(
    normalizeMsrcVulnerabilitiesInput({
      cve: ' cve-2026-12345 ',
      severity: 'critical',
      limit: 5,
    }),
    {
      cve: 'CVE-2026-12345',
      releaseNumber: undefined,
      severity: 'critical',
      limit: 5,
    },
  )
  assert.throws(
    () => normalizeMsrcVulnerabilitiesInput({ cve: 'CVE-26-1' }),
    RuntimeFailure,
  )
  assert.throws(
    () => normalizeMsrcVulnerabilitiesInput({ releaseNumber: 'May-2026' }),
    RuntimeFailure,
  )
  assert.throws(
    () => normalizeMsrcVulnerabilitiesInput({
      cve: 'CVE-2026-12345',
      releaseNumber: '2026-May',
    }),
    RuntimeFailure,
  )
  assert.throws(
    () => normalizeMsrcVulnerabilitiesInput({ limit: 51 }),
    RuntimeFailure,
  )
})

test('MSRC client surfaces Cloudflare challenge HTML clearly', async () => {
  const client = new MsrcClient({
    fetchImpl: (async () =>
      new Response('<!DOCTYPE html><title>Just a moment...</title>', {
        status: 403,
        headers: {
          'content-type': 'text/html; charset=UTF-8',
          server: 'cloudflare',
          'cf-mitigated': 'challenge',
        },
      })) as typeof fetch,
  })

  await assert.rejects(
    () => client.listVulnerabilities({ releaseNumber: '2026-May', limit: 1 }),
    /Cloudflare challenge HTML page/u,
  )
})

function jsonResponse(value: unknown): Response {
  return new Response(JSON.stringify(value), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })
}

function createVulnerabilityFixture(): Record<string, unknown> {
  return {
    '@odata.context': [
      'https://api.msrc.microsoft.com/sug/v2.0/sugodata/v2.0',
      '/en-US/$metadata#vulnerability',
    ].join(''),
    '@odata.count': 1,
    value: [
      {
        id: '00000000-0000-0000-0000-0000sample',
        releaseDate: '2026-05-07T07:00:11-07:00',
        cveNumber: 'CVE-2026-32214',
        cveTitle: 'Universal Plug and Play Information Disclosure Vulnerability',
        releaseNumber: '2026-May',
        vulnType: 'Security Vulnerability',
        latestRevisionDate: '2026-05-08T07:00:11-07:00',
        unformattedDescription: 'A Microsoft product vulnerability summary.',
        mitreUrl: 'https://www.cve.org/CVERecord?id=CVE-2026-32214',
        severityId: 100000001,
        impactId: 100000003,
        issuingCna: 'Microsoft',
        tag: 'Windows',
        customerActionRequired: true,
        articles: [{ articleType: 'FAQ', description: 'FAQ' }],
        revisions: [{ version: 1 }],
      },
    ],
  }
}
