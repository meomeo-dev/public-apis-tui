import assert from 'node:assert/strict'
import test from 'node:test'
import { generatePhpNoise } from '../src/application/usecases/phpNoise.js'
import { PhpNoiseClient } from '../src/infrastructure/openApis/phpNoiseClient.js'

const tinyPngDataUrl = `data:image/png;base64,${Buffer.from('png').toString('base64')}`

test('PHP-Noise client sends documented base64 JSON query', async () => {
  const seen: { url?: string | undefined } = {}
  const client = new PhpNoiseClient({
    fetchImpl: (async input => {
      seen.url = String(input)
      return jsonResponse({ base64: tinyPngDataUrl })
    }) as typeof fetch,
  })

  const response = await client.generate({ hex: '336699', tiles: 50, tileSize: 7, borderWidth: 0, mode: 'brightness', multi: '1.5', steps: 5 })

  const url = new URL(seen.url ?? '')
  assert.equal(`${url.origin}${url.pathname}`, 'https://php-noise.com/noise.php')
  assert.equal(url.searchParams.has('base64'), true)
  assert.equal(url.searchParams.get('hex'), '336699')
  assert.equal(url.searchParams.get('tiles'), '50')
  assert.equal(url.searchParams.get('tileSize'), '7')
  assert.equal(response.base64, tinyPngDataUrl)
})

test('PHP-Noise usecase projects image metadata and documented defaults', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async () => jsonResponse({ base64: tinyPngDataUrl })) as typeof fetch
  try {
    const result = await generatePhpNoise({ hex: '#336699' })

    assert.equal(result.kind, 'phpnoise.generate')
    assert.equal(result.api.authentication, 'none')
    assert.equal(result.api.usesBrowserClickstream, false)
    assert.deepEqual(result.query, {
      hex: '336699',
      tiles: 50,
      tileSize: 7,
      borderWidth: 0,
      mode: 'brightness',
      multi: '1.5',
      steps: 5,
    })
    assert.equal(result.image.mimeType, 'image/png')
    assert.equal(result.image.base64Bytes, 3)
    assert.deepEqual(result.image.dimensions, { width: 350, height: 350 })
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('PHP-Noise usecase validates documented browser/API caps', async () => {
  await assert.rejects(() => generatePhpNoise({ hex: 'bad' }), /six-digit/u)
  await assert.rejects(() => generatePhpNoise({ tiles: 51 }), /1 to 50/u)
  await assert.rejects(() => generatePhpNoise({ tileSize: 21 }), /1 to 20/u)
  await assert.rejects(() => generatePhpNoise({ borderWidth: 16 }), /0 to 15/u)
  await assert.rejects(() => generatePhpNoise({ mode: 'other' }), /brightness or around/u)
  await assert.rejects(() => generatePhpNoise({ multi: '1.55' }), /one decimal/u)
  await assert.rejects(() => generatePhpNoise({ steps: 51 }), /1 to 50/u)
})

test('PHP-Noise client surfaces non-JSON behavior', async () => {
  const client = new PhpNoiseClient({
    fetchImpl: (async () => new Response('PNG', { status: 200, headers: { 'content-type': 'image/png' } })) as typeof fetch,
  })

  await assert.rejects(
    () => client.generate(),
    /non-JSON/u,
  )
})

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}
