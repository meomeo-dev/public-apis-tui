import assert from 'node:assert/strict'
import test from 'node:test'
import { generateColormindPalette, listColormindModels } from '../src/application/usecases/colormind.js'
import { ColormindClient } from '../src/infrastructure/openApis/colormindClient.js'

test('Colormind client posts documented palette JSON body', async () => {
  const seen: { url?: string | undefined; method?: string | undefined; body?: string | undefined } = {}
  const client = new ColormindClient({
    fetchImpl: (async (input, init) => {
      seen.url = String(input)
      seen.method = init?.method
      seen.body = String(init?.body)
      return jsonResponse({ result: [[49, 47, 49], [91, 83, 81], [133, 155, 143], [226, 209, 167], [235, 198, 126]] })
    }) as typeof fetch,
  })

  const response = await client.generatePalette({
    model: 'default',
    input: [[44, 43, 44], [90, 83, 82], 'N', 'N', 'N'],
  })

  assert.equal(seen.url, 'http://colormind.io/api/')
  assert.equal(seen.method, 'POST')
  assert.deepEqual(JSON.parse(seen.body ?? '{}'), {
    model: 'default',
    input: [[44, 43, 44], [90, 83, 82], 'N', 'N', 'N'],
  })
  assert.deepEqual(response.result[0], [49, 47, 49])
})

test('Colormind usecase projects palette colors and HTTP-only metadata', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async () => jsonResponse({ result: [[49, 47, 49], [91, 83, 81], [133, 155, 143], [226, 209, 167], [235, 198, 126]] })) as typeof fetch
  try {
    const result = await generateColormindPalette({ model: 'ui', input: '#2c2b2c,#5a5352,N,N,N' })

    assert.equal(result.kind, 'colormind.palette')
    assert.equal(result.api.provider, 'colormind')
    assert.equal(result.api.authentication, 'none')
    assert.equal(result.api.transport, 'http-only')
    assert.equal(result.api.usesBrowserClickstream, false)
    assert.deepEqual(result.query, {
      model: 'ui',
      input: [[44, 43, 44], [90, 83, 82], 'N', 'N', 'N'],
    })
    assert.equal(result.colors[0]?.hex, '#312F31')
    assert.deepEqual(result.colors[4]?.rgb, [235, 198, 126])
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('Colormind models usecase projects current model names', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async () => jsonResponse({ result: ['default', 'ui', 'makoto_shinkai'] })) as typeof fetch
  try {
    const result = await listColormindModels({ limit: 2 })

    assert.equal(result.kind, 'colormind.models')
    assert.equal(result.api.provider, 'colormind')
    assert.equal(result.count, 2)
    assert.deepEqual(result.models, ['default', 'ui'])
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('Colormind usecase validates curated inputs', async () => {
  await assert.rejects(() => generateColormindPalette({ model: 'bad model' }), /letters, numbers/u)
  await assert.rejects(() => generateColormindPalette({ input: '#000000,N' }), /exactly five/u)
  await assert.rejects(() => generateColormindPalette({ input: '#000000,#111111,#222222,#333333,#GGGGGG' }), /entries must be/u)
  await assert.rejects(() => listColormindModels({ limit: 201 }), /1 to 200/u)
})

test('Colormind client surfaces provider errors', async () => {
  const client = new ColormindClient({
    fetchImpl: (async () => jsonResponse({ error: 'bad model' }, 400)) as typeof fetch,
  })

  await assert.rejects(
    () => client.generatePalette({ model: 'bad' }),
    /bad model/u,
  )
})

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}
