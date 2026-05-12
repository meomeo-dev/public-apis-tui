import assert from 'node:assert/strict'
import test from 'node:test'
import { calculateNetworkCalcSubnet, convertNetworkCalcBinary } from '../src/application/usecases/networkCalc.js'
import {
  NetworkCalcClient,
  createNetworkCalcBinaryUrl,
  createNetworkCalcSubnetUrl,
  normalizeNetworkCalcBinaryInput,
  normalizeNetworkCalcSubnetInput,
} from '../src/infrastructure/openApis/networkCalcClient.js'

test('NetworkCalc subnet client calls documented JSON endpoint', async () => {
  const requests: string[] = []
  const client = new NetworkCalcClient({
    baseUrl: 'https://networkcalc.test',
    fetchImpl: async input => {
      requests.push(String(input))
      return new Response(JSON.stringify({
        status: 'OK',
        meta: {
          permalink: 'https://networkcalc.com/subnet-calculator/10.5.1.0/27?binary=1',
          next_address: 'https://networkcalc.com/api/ip/10.5.1.1/27?binary=1',
        },
        address: {
          cidr_notation: '10.5.1.0/27',
          subnet_mask: '255.255.255.224',
          wildcard_mask: '0.0.0.31',
          network_address: '10.5.1.0',
          broadcast_address: '10.5.1.31',
          assignable_hosts: 30,
          first_assignable_host: '10.5.1.1',
          last_assignable_host: '10.5.1.30',
        },
      }), { status: 200, headers: { 'content-type': 'application/json; charset=utf-8' } })
    },
  })

  const result = await client.subnet({ ip: '10.5.1.0', cidr: 27, binary: true })
  assert.deepEqual(requests, ['https://networkcalc.test/api/ip/10.5.1.0/27?binary=true'])
  assert.equal(result.status, 'OK')
  assert.equal(result.address?.assignable_hosts, 30)
})

test('NetworkCalc binary client calls documented converter endpoint', async () => {
  const requests: string[] = []
  const client = new NetworkCalcClient({
    baseUrl: 'https://networkcalc.test',
    fetchImpl: async input => {
      requests.push(String(input))
      return new Response(JSON.stringify({
        status: 'OK',
        original: '1e7d6d',
        converted: '111100111110101101101',
        from: '16',
        to: '2',
      }), { status: 200, headers: { 'content-type': 'application/json' } })
    },
  })

  const result = await client.binary({ value: '1E7D6D', from: 16, to: 2 })
  assert.deepEqual(requests, ['https://networkcalc.test/api/binary/1e7d6d?from=16&to=2'])
  assert.equal(result.converted, '111100111110101101101')
})

test('NetworkCalc usecases project TUI-ready JSON boundaries', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async input => {
    const url = new URL(String(input))
    if (url.pathname.startsWith('/api/binary/')) {
      return jsonResponse({
        status: 'OK',
        original: '1e7d6d',
        converted: '111100111110101101101',
        from: '16',
        to: '2',
      })
    }
    return jsonResponse({
      status: 'OK',
      meta: {
        permalink: 'https://networkcalc.com/subnet-calculator/10.5.1.0/27?binary=1',
      },
      address: {
        cidr_notation: '10.5.1.0/27',
        network_address: '10.5.1.0',
        broadcast_address: '10.5.1.31',
      },
    })
  }) as typeof fetch
  try {
    const subnet = await calculateNetworkCalcSubnet({ ip: '10.5.1.0', cidr: 27, binary: true })
    assert.equal(subnet.kind, 'networkcalc.subnet')
    assert.equal(subnet.api.authentication, 'none')
    assert.equal(subnet.api.usesBrowserClickstream, false)
    assert.equal(subnet.query.ip, '10.5.1.0')
    assert.equal(subnet.address.network_address, '10.5.1.0')

    const binary = await convertNetworkCalcBinary({ value: '1e7d6d', from: 16, to: 2 })
    assert.equal(binary.kind, 'networkcalc.binary')
    assert.equal(binary.api.authentication, 'none')
    assert.equal(binary.api.usesBrowserClickstream, false)
    assert.equal(binary.conversion.converted, '111100111110101101101')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('NetworkCalc normalizers enforce curated safe bounds', () => {
  const subnet = normalizeNetworkCalcSubnetInput({ ip: '192.168.1.1', cidr: 24, binary: false })
  assert.deepEqual(subnet, { ip: '192.168.1.1', cidr: 24, binary: false })
  assert.equal(createNetworkCalcSubnetUrl('https://networkcalc.test/', subnet).href, 'https://networkcalc.test/api/ip/192.168.1.1/24?binary=false')

  const binary = normalizeNetworkCalcBinaryInput({ value: 'FF', from: 16, to: 10 })
  assert.deepEqual(binary, { value: 'ff', from: 16, to: 10 })
  assert.equal(createNetworkCalcBinaryUrl('https://networkcalc.test/', binary).href, 'https://networkcalc.test/api/binary/ff?from=16&to=10')

  assert.throws(() => normalizeNetworkCalcSubnetInput({ ip: '999.1.1.1' }), /octets/u)
  assert.throws(() => normalizeNetworkCalcSubnetInput({ cidr: 33 }), /--cidr/u)
  assert.throws(() => normalizeNetworkCalcBinaryInput({ from: 3 }), /--from/u)
  assert.throws(() => normalizeNetworkCalcBinaryInput({ value: '102', from: 2 }), /base 2/u)
})

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}
