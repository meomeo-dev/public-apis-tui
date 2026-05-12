import assert from 'node:assert/strict'
import test from 'node:test'
import { convertXColors, generateXColorsRandom } from '../src/application/usecases/xColors.js'
import { XColorsClient } from '../src/infrastructure/openApis/xColorsClient.js'

test('xColors client calls documented random endpoint with curated params', async () => {
  const seen: { url?: string | undefined; method?: string | undefined } = {}
  const client = new XColorsClient({
    fetchImpl: (async (input, init) => {
      seen.url = String(input)
      seen.method = init?.method
      return jsonResponse([{ hex: '#D0E6FB', rgb: 'rgb(208, 230, 251)', hsl: 'hsl(210, 84%, 90%)' }])
    }) as typeof fetch,
  })

  const response = await client.random({ hue: 'blue', number: 3, type: 'light' })

  assert.equal(seen.url, 'https://x-colors.yurace.pro/api/random/blue?number=3&type=light')
  assert.equal(seen.method, 'GET')
  assert.deepEqual(response[0], {
    hex: '#D0E6FB',
    rgb: 'rgb(208, 230, 251)',
    hsl: 'hsl(210, 84%, 90%)',
  })
})

test('xColors usecase projects random colors with no-auth metadata', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async () => jsonResponse([
    { hex: '#D0E6FB', rgb: 'rgb(208, 230, 251)', hsl: 'hsl(210, 84%, 90%)' },
    { hex: '#759FE8', rgb: 'rgb(117, 159, 232)', hsl: 'hsl(218, 71%, 68%)' },
  ])) as typeof fetch
  try {
    const result = await generateXColorsRandom({ hue: 'blue', number: 2, type: 'light' })

    assert.equal(result.kind, 'xcolors.random')
    assert.equal(result.api.provider, 'xcolors')
    assert.equal(result.api.authentication, 'none')
    assert.equal(result.api.usesBrowserClickstream, false)
    assert.deepEqual(result.query, { hue: 'blue', number: 2, type: 'light' })
    assert.equal(result.count, 2)
    assert.equal(result.colors[0]?.hex, '#D0E6FB')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('xColors usecase projects conversion colors', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async input => {
    assert.equal(String(input), 'https://x-colors.yurace.pro/api/rgb2hex?value=120-200-30')
    return jsonResponse({ rgb: 'rgb(120, 200, 30)', hex: '#78C81E' })
  }) as typeof fetch
  try {
    const result = await convertXColors({ operation: 'rgb2hex', value: '120-200-30' })

    assert.equal(result.kind, 'xcolors.convert')
    assert.equal(result.query.operation, 'rgb2hex')
    assert.equal(result.color.hex, '#78C81E')
    assert.equal(result.color.rgb, 'rgb(120, 200, 30)')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('xColors usecase validates curated inputs', async () => {
  await assert.rejects(() => generateXColorsRandom({ hue: 'bad hue' }), /reserved color name/u)
  await assert.rejects(() => generateXColorsRandom({ hue: '360' }), /0 to 359/u)
  await assert.rejects(() => generateXColorsRandom({ number: 51 }), /1 to 50/u)
  await assert.rejects(() => generateXColorsRandom({ type: 'medium' }), /dark or light/u)
  await assert.rejects(() => convertXColors({ operation: 'bad2hex' }), /documented conversion/u)
})

test('xColors client surfaces provider errors', async () => {
  const client = new XColorsClient({
    fetchImpl: (async () => jsonResponse({ error: 'bad color' }, 400)) as typeof fetch,
  })

  await assert.rejects(
    () => client.convert({ operation: 'hex2rgb', value: 'GGGGGG' }),
    /bad color/u,
  )
})

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}
