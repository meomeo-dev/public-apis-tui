import assert from 'node:assert/strict'
import test from 'node:test'
import { getIcanhazip } from '../src/application/usecases/icanhazip.js'
import { IcanhazipClient, normalizeIcanhazipProtocol, resolveEndpoint } from '../src/infrastructure/openApis/icanhazipClient.js'
import { defaultPublicApiRegistry, getPublicApiOperation } from '../src/providers/providerRegistry.js'

test('Icanhazip client calls public text endpoints', async () => {
  const requests: string[] = []
  const client = new IcanhazipClient({
    fetchImpl: (async input => {
      requests.push(String(input))
      return new Response('203.0.113.10\n', {
        status: 200,
        headers: { 'content-type': 'text/plain' },
      })
    }) as typeof fetch,
  })

  const response = await client.getIp('ipv4')

  assert.deepEqual(requests, ['https://ipv4.icanhazip.com/'])
  assert.equal(response.ip, '203.0.113.10')
  assert.equal(response.contentType, 'text/plain')
})

test('Icanhazip usecase projects no-auth text/plain metadata', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async () => new Response('203.0.113.10\n', {
    status: 200,
    headers: { 'content-type': 'text/plain' },
  })) as typeof fetch
  try {
    const result = await getIcanhazip({ protocol: 'auto' })
    assert.equal(result.kind, 'icanhazip.ip')
    assert.equal(result.api.authentication, 'none')
    assert.equal(result.api.usesBrowserClickstream, false)
    assert.equal(result.api.transport, 'HTTPS text/plain')
    assert.equal(result.query.protocol, 'auto')
    assert.equal(result.ip.address, '203.0.113.10')
    assert.equal(result.ip.version, 4)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('Icanhazip normalizer exposes only live endpoint choices', () => {
  assert.equal(normalizeIcanhazipProtocol(undefined), 'auto')
  assert.equal(normalizeIcanhazipProtocol('ipv4'), 'ipv4')
  assert.equal(resolveEndpoint('auto'), 'https://icanhazip.com')
  assert.equal(resolveEndpoint('ipv4'), 'https://ipv4.icanhazip.com')
  assert.throws(() => normalizeIcanhazipProtocol('ipv6'), /auto or ipv4/u)
})

test('Icanhazip provider normalizer returns curated invalid argument errors', () => {
  const operation = getPublicApiOperation(defaultPublicApiRegistry, 'icanhazip.ip')
  assert.throws(() => operation.normalizeParams?.({ protocol: 'ipv6' }), /Icanhazip --protocol must be auto or ipv4/u)
})
