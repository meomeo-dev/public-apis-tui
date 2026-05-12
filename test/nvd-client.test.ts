import assert from 'node:assert/strict'
import test from 'node:test'
import { listNvdCves } from '../src/application/usecases/nvd.js'
import {
  NvdClient,
  normalizeNvdCvesInput,
} from '../src/infrastructure/openApis/nvdClient.js'
import { RuntimeFailure } from '../src/shared/errors/runtimeFailure.js'

test('NVD client queries CVE metadata and projects safe references', async () => {
  const client = new NvdClient({
    fetchImpl: (async input => {
      const url = new URL(String(input))
      assert.equal(url.hostname, 'services.nvd.nist.gov')
      assert.equal(url.pathname, '/rest/json/cves/2.0')
      assert.equal(url.searchParams.get('cveId'), 'CVE-2024-3094')
      assert.equal(url.searchParams.get('resultsPerPage'), '1')
      return jsonResponse(createCvesFixture())
    }) as typeof fetch,
  })

  const result = await client.listCves({ cveId: 'CVE-2024-3094', limit: 1 })
  assert.equal(result.meta.totalResults, 1)
  assert.equal(result.cves[0]?.id, 'CVE-2024-3094')
  assert.equal(result.cves[0]?.cvss?.baseSeverity, 'CRITICAL')
  assert.deepEqual(result.cves[0]?.weaknesses, ['CWE-506'])
  assert.equal(result.cves[0]?.referenceCount, 3)
  assert.equal(result.cves[0]?.safeReferences.length, 1)
})

test('NVD usecase projects TUI-ready JSON', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async () =>
    jsonResponse(createCvesFixture())) as typeof fetch

  try {
    const result = await listNvdCves({
      keyword: 'xz utils',
      severity: 'critical',
      limit: 1,
    })
    assert.equal(result.kind, 'nvd.cves')
    assert.equal(result.api.provider, 'nvd')
    assert.equal(result.api.authentication, 'none')
    assert.equal(result.api.usesBrowserClickstream, false)
    assert.equal(result.pagination.maxLimit, 50)
    assert.equal(result.cves[0]?.id, 'CVE-2024-3094')
    assert.doesNotMatch(result.cves[0]?.description ?? '', /\n/u)
    assert.match(result.api.safety, /Read-only public CVE/)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('NVD normalizer enforces curated no-key bounds', () => {
  assert.deepEqual(normalizeNvdCvesInput({}), {
    cveId: undefined,
    keyword: 'openssl',
    severity: undefined,
    limit: 10,
  })
  assert.deepEqual(
    normalizeNvdCvesInput({ cveId: ' cve-2024-3094 ', limit: 1 }),
    {
      cveId: 'CVE-2024-3094',
      keyword: undefined,
      severity: undefined,
      limit: 1,
    },
  )
  assert.throws(() => normalizeNvdCvesInput({ cveId: 'CVE-24-1' }), RuntimeFailure)
  assert.throws(() => normalizeNvdCvesInput({ keyword: 'ab' }), RuntimeFailure)
  assert.throws(
    () => normalizeNvdCvesInput({ cveId: 'CVE-2024-3094', keyword: 'xz' }),
    RuntimeFailure,
  )
  assert.throws(() => normalizeNvdCvesInput({ limit: 51 }), RuntimeFailure)
})

test('NVD client surfaces Cloudflare challenge HTML clearly', async () => {
  const client = new NvdClient({
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
    () => client.listCves({ cveId: 'CVE-2024-3094', limit: 1 }),
    /Cloudflare challenge HTML page/u,
  )
})

function jsonResponse(value: unknown): Response {
  return new Response(JSON.stringify(value), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })
}

function createCvesFixture(): Record<string, unknown> {
  return {
    resultsPerPage: 1,
    startIndex: 0,
    totalResults: 1,
    format: 'NVD_CVE',
    version: '2.0',
    timestamp: '2026-05-09T02:23:00.000',
    vulnerabilities: [
      {
        cve: {
          id: 'CVE-2024-3094',
          sourceIdentifier: 'secalert@redhat.com',
          published: '2024-03-29T17:15:21.150',
          lastModified: '2025-08-19T01:15:57.407',
          vulnStatus: 'Modified',
          descriptions: [{
            lang: 'en',
            value: [
              'Malicious code was discovered in the upstream',
              'tarballs of xz.',
            ].join('\n'),
          }],
          metrics: {
            cvssMetricV31: [
              {
                source: 'nvd@nist.gov',
                type: 'Primary',
                cvssData: {
                  version: '3.1',
                  vectorString: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:C/C:H/I:H/A:H',
                  baseScore: 10,
                  baseSeverity: 'CRITICAL',
                },
              },
            ],
          },
          weaknesses: [{ description: [{ lang: 'en', value: 'CWE-506' }] }],
          references: [
            {
              url: 'https://access.redhat.com/security/cve/CVE-2024-3094',
              source: 'Red Hat',
              tags: ['Vendor Advisory'],
            },
            {
              url: 'http://www.openwall.com/lists/oss-security/2024/03/29/4',
              source: 'oss-security',
              tags: ['Mailing List'],
            },
            { url: 'https://example.com/poc', source: 'example', tags: ['Exploit'] },
          ],
        },
      },
    ],
  }
}
