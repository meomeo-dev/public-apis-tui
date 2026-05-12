import assert from 'node:assert/strict'
import test from 'node:test'
import { EventEmitter } from 'node:events'
import { startNetworkObservation } from '../src/infrastructure/network/networkObserver.js'
import type { EndpointCatalog } from '../src/infrastructure/network/endpointCatalog.js'

test('network observer records redacted request and response metadata', () => {
  const page = new FakePage()
  const catalog: EndpointCatalog = {
    records: [
      {
        id: 'json-api',
        method: 'GET',
        urlPattern: 'https://example.com/api/*',
        category: 'api',
        evidenceStatus: 'confirmed',
        description: 'Example API endpoint.',
      },
    ],
  }
  const session = startNetworkObservation(page.asPage(), { catalog })
  const request = new FakeRequest('GET', 'https://example.com/api/items?debug=true#details', 'xhr')
  const response = new FakeResponse(request, 200, 'OK')

  page.emit('request', request)
  page.emit('response', response)
  session.stop()

  assert.equal(session.observations.length, 1)
  assert.equal(session.observations[0]?.method, 'GET')
  assert.equal(session.observations[0]?.url, 'https://example.com/api/items')
  assert.equal(session.observations[0]?.matchedEndpointId, 'json-api')
  assert.equal(session.observations[0]?.status, 200)
  assert.equal(session.summary().observedCount, 1)
  assert.equal(session.summary().matchedCount, 1)
  assert.deepEqual(session.summary().endpointIds, ['json-api'])
})

test('network observer filters static assets by default', () => {
  const page = new FakePage()
  const session = startNetworkObservation(page.asPage())

  page.emit('request', new FakeRequest('GET', 'https://example.com/logo.png', 'image'))
  session.stop()

  assert.equal(session.observations.length, 0)
})

class FakePage extends EventEmitter {
  asPage(): never {
    return this as never
  }
}

class FakeRequest {
  constructor(
    private readonly requestMethod: string,
    private readonly requestUrl: string,
    private readonly requestResourceType: string,
    private readonly failureText?: string,
  ) {}

  method(): string {
    return this.requestMethod
  }

  url(): string {
    return this.requestUrl
  }

  resourceType(): string {
    return this.requestResourceType
  }

  failure(): { errorText: string } | null {
    return this.failureText === undefined ? null : { errorText: this.failureText }
  }
}

class FakeResponse {
  constructor(
    private readonly responseRequest: FakeRequest,
    private readonly responseStatus: number,
    private readonly responseStatusText: string,
  ) {}

  request(): FakeRequest {
    return this.responseRequest
  }

  status(): number {
    return this.responseStatus
  }

  statusText(): string {
    return this.responseStatusText
  }
}
