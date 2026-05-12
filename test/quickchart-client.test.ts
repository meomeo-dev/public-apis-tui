import assert from 'node:assert/strict'
import test from 'node:test'
import { renderQuickChart } from '../src/application/usecases/quickChart.js'
import {
  QuickChartClient,
  createQuickChartUrl,
  normalizeQuickChartRenderInput,
} from '../src/infrastructure/openApis/quickChartClient.js'

const pngBytes = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x01])

test('QuickChart client calls documented chart endpoint with chart config', async () => {
  const requests: string[] = []
  const client = new QuickChartClient({
    baseUrl: 'https://quickchart.test',
    fetchImpl: (async input => {
      const url = new URL(String(input))
      requests.push(url.href)
      assert.equal(url.pathname, '/chart')
      assert.equal(url.searchParams.get('width'), '500')
      assert.equal(url.searchParams.get('height'), '300')
      assert.equal(url.searchParams.get('format'), 'png')
      const config = JSON.parse(String(url.searchParams.get('c'))) as Record<string, unknown>
      assert.equal(config.type, 'bar')
      return new Response(pngBytes, { status: 200, headers: { 'content-type': 'image/png' } })
    }) as typeof fetch,
  })

  const result = await client.render({ labels: 'A,B', data: '1,2' })

  assert.equal(requests.length, 1)
  assert.equal(result.contentType, 'image/png')
  assert.equal(result.bytes, pngBytes.length)
  assert.equal(Buffer.from(result.base64, 'base64').equals(pngBytes), true)
})

test('QuickChart usecase projects TUI-ready artifact metadata', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async () => new Response(pngBytes, {
    status: 200,
    headers: { 'content-type': 'image/png' },
  })) as typeof fetch
  try {
    const result = await renderQuickChart({ chartType: 'line', labels: 'A,B', data: '1,2', title: 'Demo' })
    assert.equal(result.kind, 'quickchart.render')
    assert.equal(result.api.authentication, 'none')
    assert.equal(result.api.usesBrowserClickstream, false)
    assert.equal(result.query.chartType, 'line')
    assert.equal(result.query.labels.length, 2)
    assert.equal(result.chart.mediaType, 'image/png')
    assert.equal(result.chart.dataUrl.startsWith('data:image/png;base64,'), true)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('QuickChart normalizer enforces curated simple chart bounds', () => {
  const normalized = normalizeQuickChartRenderInput({
    chartType: 'pie',
    labels: 'A, B',
    data: '1, 2',
    title: 'Demo',
    width: 2000,
    height: 2000,
    format: 'svg',
    backgroundColor: '#ffffff',
    devicePixelRatio: 2,
  })
  assert.deepEqual(normalized.labels, ['A', 'B'])
  assert.deepEqual(normalized.data, [1, 2])
  assert.equal(normalized.format, 'svg')

  const url = createQuickChartUrl('https://quickchart.test/', normalized)
  assert.equal(url.pathname, '/chart')
  assert.equal(url.searchParams.get('format'), 'svg')
  assert.throws(() => normalizeQuickChartRenderInput({ chartType: 'scatter' }), /--type/u)
  assert.throws(() => normalizeQuickChartRenderInput({ data: '1,nope' }), /--data/u)
  assert.throws(() => normalizeQuickChartRenderInput({ width: 2001 }), /--width/u)
  assert.throws(() => normalizeQuickChartRenderInput({ height: 2001 }), /--height/u)
  assert.throws(() => normalizeQuickChartRenderInput({ format: 'jpg' }), /--format-image/u)
})
