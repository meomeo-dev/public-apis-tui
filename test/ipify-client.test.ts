import assert from 'node:assert/strict'
import test from 'node:test'
import { getIpify } from '../src/application/usecases/ipify.js'
import { IpifyClient, normalizeIpifyProtocol, resolveIpifyEndpoint } from '../src/infrastructure/openApis/ipifyClient.js'
import { defaultPublicApiRegistry, getPublicApiOperation } from '../src/providers/providerRegistry.js'

test('IPify client calls documented JSON endpoints', async () => {
  const requests: string[] = []
  const client = new IpifyClient((async input => {
    const url = new URL(String(input))
    requests.push(url.href)
    return jsonResponse({ ip: url.hostname === 'api.ipify.org' ? '203.0.113.10' : '2001:db8::1' })
  }) as typeof fetch)

  const auto = await client.getIp('auto')
  const ipv4 = await client.getIp('ipv4')

  assert.deepEqual(requests, [
    'https://api64.ipify.org/?format=json',
    'https://api.ipify.org/?format=json',
  ])
  assert.equal(auto.ip, '2001:db8::1')
  assert.equal(ipv4.ip, '203.0.113.10')
})

test('IPify usecase projects no-auth metadata and normalized protocol', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async input => {
    assert.equal(String(input), 'https://api64.ipify.org/?format=json')
    return jsonResponse({ ip: '203.0.113.10' })
  }) as typeof fetch
  try {
    const result = await getIpify({})
    assert.equal(result.kind, 'ipify.ip')
    assert.equal(result.api.authentication, 'none')
    assert.equal(result.api.usesBrowserClickstream, false)
    assert.equal(result.query.protocol, 'auto')
    assert.equal(result.ip.address, '203.0.113.10')
    assert.equal(result.ip.version, 4)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('IPify client retries transient fetch failures', async () => {
  let attempts = 0
  const client = new IpifyClient((async () => {
    attempts += 1
    if (attempts === 1) {
      throw new TypeError('temporary network failure')
    }
    return jsonResponse({ ip: '203.0.113.10' })
  }) as typeof fetch)

  const result = await client.getIp('auto')

  assert.equal(attempts, 2)
  assert.equal(result.ip, '203.0.113.10')
})

test('IPify auto falls back to IPv4 endpoint after universal endpoint failures', async () => {
  const requests: string[] = []
  const client = new IpifyClient((async input => {
    const url = new URL(String(input))
    requests.push(url.href)
    if (url.hostname === 'api64.ipify.org') {
      throw new TypeError('temporary universal endpoint failure')
    }
    return jsonResponse({ ip: '203.0.113.10' })
  }) as typeof fetch)

  const result = await client.getIp('auto')

  assert.deepEqual(requests, [
    'https://api64.ipify.org/?format=json',
    'https://api64.ipify.org/?format=json',
    'https://api.ipify.org/?format=json',
  ])
  assert.equal(result.endpoint, 'https://api.ipify.org?format=json')
  assert.equal(result.ip, '203.0.113.10')
})

test('IPify protocol helpers enforce curated transport options', () => {
  assert.equal(normalizeIpifyProtocol(undefined), 'auto')
  assert.equal(normalizeIpifyProtocol('ipv4'), 'ipv4')
  assert.equal(resolveIpifyEndpoint('auto'), 'https://api64.ipify.org?format=json')
  assert.equal(resolveIpifyEndpoint('ipv4'), 'https://api.ipify.org?format=json')
  assert.throws(() => normalizeIpifyProtocol('ipv6'), /auto or ipv4/u)
})

test('IPify provider normalizer returns curated invalid argument errors', () => {
  const operation = getPublicApiOperation(defaultPublicApiRegistry, 'ipify.ip')
  assert.throws(() => operation.normalizeParams?.({ protocol: 'ipv6' }), /IPify --protocol must be auto or ipv4/u)
})

test('IPify client rejects invalid response shapes', async () => {
  const client = new IpifyClient((async () => jsonResponse({})) as typeof fetch)

  await assert.rejects(() => client.getIp('auto'), /IPify response did not include an IP address/u)
})

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}
