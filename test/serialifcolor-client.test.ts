import assert from 'node:assert/strict'
import test from 'node:test'
import { lookupSerialifColor } from '../src/application/usecases/serialifColor.js'
import {
  SerialifColorClient,
  createSerialifColorUrl,
  normalizeSerialifColorInput,
  projectSerialifColorModel,
} from '../src/infrastructure/openApis/serialifColorClient.js'

test('Serialif Color client calls color path JSON endpoint', async () => {
  const requests: string[] = []
  const client = new SerialifColorClient({
    baseUrl: 'https://color.test',
    fetchImpl: (async input => {
      requests.push(String(input))
      return jsonResponse(createSerialifColorFixture())
    }) as typeof fetch,
  })

  const response = await client.lookup({ color: '#7fffd4' })

  assert.deepEqual(requests, ['https://color.test/7fffd4'])
  assert.equal(response.status, 'success')
  assert.equal(response.base?.hex?.value, '#7fffd4')
})

test('Serialif Color usecase projects color metadata for TUI', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async input => {
    assert.equal(String(input), 'https://color.serialif.com/aquamarine')
    return jsonResponse(createSerialifColorFixture())
  }) as typeof fetch
  try {
    const result = await lookupSerialifColor({ color: 'Aquamarine' })

    assert.equal(result.kind, 'serialifcolor.lookup')
    assert.equal(result.api.authentication, 'none')
    assert.equal(result.api.usesBrowserClickstream, false)
    assert.deepEqual(result.query, { color: 'aquamarine' })
    assert.equal(result.colors.base.hex, '#7fffd4')
    assert.equal(result.colors.complementary?.hex, '#80002b')
    assert.equal(result.colors.contrastedText?.keyword, 'black')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('Serialif Color normalizer supports keywords and hex bounds', () => {
  assert.deepEqual(normalizeSerialifColorInput({ color: '#ABC' }), { color: 'abc' })
  assert.deepEqual(normalizeSerialifColorInput({ color: '55667788' }), { color: '55667788' })
  assert.equal(createSerialifColorUrl('https://color.test/', { color: 'abc' }).href, 'https://color.test/abc')
  assert.throws(() => normalizeSerialifColorInput({ color: 'bad color' }), /CSS keyword or hex/u)
  assert.throws(() => normalizeSerialifColorInput({ color: '12' }), /CSS keyword or hex/u)
})

test('Serialif Color client surfaces provider JSON errors', async () => {
  const client = new SerialifColorClient({
    fetchImpl: (async () => jsonResponse({
      status: 'error',
      error: { type: 'wrong color format', value: 'yellou', message: 'not a valid KEYWORD color' },
    })) as typeof fetch,
  })

  await assert.rejects(() => client.lookup({ color: 'yellou' }), /not a valid KEYWORD color/u)
})

test('Serialif Color projector extracts rgba/hsla variants', () => {
  const projected = projectSerialifColorModel({
    hex: { value: '#55667788' },
    rgba: { value: 'rgba(85, 102, 119, 0.53)' },
    hsla: { value: 'hsla(210, 17%, 40%, 0.53)' },
  })
  assert.equal(projected?.hex, '#55667788')
  assert.equal(projected?.rgb, 'rgba(85, 102, 119, 0.53)')
  assert.equal(projected?.hsl, 'hsla(210, 17%, 40%, 0.53)')
})

function createSerialifColorFixture(): Record<string, unknown> {
  return {
    status: 'success',
    base: color('aquamarine', '#7fffd4', 'rgb(127, 255, 212)', 'hsl(160, 100%, 75%)'),
    base_without_alpha: color('aquamarine', '#7fffd4', 'rgb(127, 255, 212)', 'hsl(160, 100%, 75%)'),
    base_without_alpha_contrasted_text: color('black', '#000000', 'rgb(0, 0, 0)', 'hsl(0, 0%, 0%)'),
    complementary: color('', '#80002b', 'rgb(128, 0, 43)', 'hsl(340, 100%, 25%)'),
    complementary_without_alpha_contrasted_text: color('white', '#ffffff', 'rgb(255, 255, 255)', 'hsl(0, 0%, 100%)'),
    grayscale: color('', '#bfbfbf', 'rgb(191, 191, 191)', 'hsl(160, 0%, 75%)'),
    grayscale_without_alpha_contrasted_text: color('black', '#000000', 'rgb(0, 0, 0)', 'hsl(0, 0%, 0%)'),
  }
}

function color(keyword: string, hex: string, rgb: string, hsl: string): Record<string, unknown> {
  return {
    keyword,
    hex: { value: hex },
    rgb: { value: rgb },
    hsl: { value: hsl },
  }
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}
