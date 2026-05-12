import assert from 'node:assert/strict'
import test from 'node:test'
import { getUkCarbonGeneration, getUkCarbonIntensity } from '../src/application/usecases/ukCarbonIntensity.js'
import { UkCarbonIntensityClient, normalizeUkCarbonCurrentInput, normalizeUkCarbonGenerationInput } from '../src/infrastructure/openApis/ukCarbonIntensityClient.js'

test('UK Carbon Intensity client reads current intensity and generation mix', async () => {
  const requests: string[] = []
  const client = new UkCarbonIntensityClient({
    baseUrl: 'https://carbon.test',
    fetchImpl: (async input => {
      const url = new URL(String(input))
      requests.push(url.href)
      if (url.pathname === '/intensity') {
        return jsonResponse(createIntensityBody())
      }
      assert.equal(url.pathname, '/generation')
      return jsonResponse(createGenerationBody())
    }) as typeof fetch,
  })

  const intensity = await client.getCurrentIntensity()
  const generation = await client.getCurrentGenerationMix()

  assert.deepEqual(requests, ['https://carbon.test/intensity', 'https://carbon.test/generation'])
  assert.equal(intensity.forecast, 212)
  assert.equal(intensity.actual, 204)
  assert.equal(intensity.index, 'high')
  assert.equal(generation.mix.find(entry => entry.fuel === 'gas')?.percentage, 46.1)
})

test('UK Carbon Intensity usecases project TUI-ready JSON', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async input => {
    const url = new URL(String(input))
    return url.pathname === '/intensity' ? jsonResponse(createIntensityBody()) : jsonResponse(createGenerationBody())
  }) as typeof fetch
  try {
    const intensity = await getUkCarbonIntensity()
    assert.equal(intensity.kind, 'ukcarbonintensity.intensity')
    assert.equal(intensity.api.authentication, 'none')
    assert.equal(intensity.api.usesBrowserClickstream, false)
    assert.equal(intensity.reading.actual, 204)

    const generation = await getUkCarbonGeneration()
    assert.equal(generation.kind, 'ukcarbonintensity.generation')
    assert.equal(generation.api.authentication, 'none')
    assert.equal(generation.generationMix[0]?.fuel, 'biomass')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('UK Carbon Intensity normalizers keep fixed current-window cache keys', () => {
  assert.deepEqual(normalizeUkCarbonCurrentInput(), {})
  assert.deepEqual(normalizeUkCarbonGenerationInput(), {})
})

function createIntensityBody(): Record<string, unknown> {
  return {
    data: [
      {
        from: '2026-05-03T19:00Z',
        to: '2026-05-03T19:30Z',
        intensity: {
          forecast: 212,
          actual: 204,
          index: 'high',
        },
      },
    ],
  }
}

function createGenerationBody(): Record<string, unknown> {
  return {
    data: {
      from: '2026-05-03T19:00Z',
      to: '2026-05-03T19:30Z',
      generationmix: [
        { fuel: 'biomass', perc: 9 },
        { fuel: 'coal', perc: 0 },
        { fuel: 'imports', perc: 17.6 },
        { fuel: 'gas', perc: 46.1 },
        { fuel: 'nuclear', perc: 17.8 },
        { fuel: 'solar', perc: 1.3 },
        { fuel: 'wind', perc: 8.3 },
      ],
    },
  }
}

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })
}
