import assert from 'node:assert/strict'
import test from 'node:test'
import { parseBrowserOptions, parseOutputFormat } from '../src/interfaces/cli/options.js'
import { RuntimeFailure } from '../src/shared/errors/runtimeFailure.js'

test('parseBrowserOptions normalizes common CLI options', () => {
  const options = parseBrowserOptions({
    cdpUrl: 'http://127.0.0.1:9222',
    chromePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    userDataDir: '/tmp/site-cdp',
    proxyServer: 'http://127.0.0.1:8080',
    userAgent: 'AgentBrowser/1.0',
    locale: 'en-US,en',
    timezoneId: 'America/Los_Angeles',
    viewport: '1440x900@2',
    geolocation: '37.7749,-122.4194,15',
    extraHeaders: '{"X-Test":"1"}',
    interactionHoverBeforeClick: true,
    interactionScrollIntoView: true,
    interactionClickDelayMs: '80',
    interactionTypeDelayMs: '35',
    interactionPressDelayMs: '20',
    headless: true,
    timeoutMs: '12345',
  })

  assert.equal(options.cdpUrl, 'http://127.0.0.1:9222')
  assert.equal(options.executablePath, '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome')
  assert.equal(options.userDataDir, '/tmp/site-cdp')
  assert.equal(options.headless, true)
  assert.equal(options.timeoutMs, 12345)
  assert.equal(options.profile?.proxyServer, 'http://127.0.0.1:8080')
  assert.equal(options.profile?.userAgent, 'AgentBrowser/1.0')
  assert.equal(options.profile?.locale, 'en-US,en')
  assert.equal(options.profile?.timezoneId, 'America/Los_Angeles')
  assert.equal(options.profile?.viewport?.width, 1440)
  assert.equal(options.profile?.viewport?.height, 900)
  assert.equal(options.profile?.viewport?.deviceScaleFactor, 2)
  assert.equal(options.profile?.geolocation?.latitude, 37.7749)
  assert.equal(options.profile?.extraHeaders?.['X-Test'], '1')
  assert.equal(options.profile?.interaction?.hoverBeforeClick, true)
  assert.equal(options.profile?.interaction?.scrollIntoView, true)
  assert.equal(options.profile?.interaction?.clickDelayMs, 80)
  assert.equal(options.profile?.interaction?.typeDelayMs, 35)
  assert.equal(options.profile?.interaction?.pressDelayMs, 20)
})

test('parseBrowserOptions accepts named managed browser sessions', () => {
  const options = parseBrowserOptions({
    session: 'qa-main.1',
    timeoutMs: '1000',
  })

  assert.equal(options.sessionId, 'qa-main.1')
})

test('parseBrowserOptions defaults command browser runs to headless', () => {
  const options = parseBrowserOptions({
    timeoutMs: '1000',
  })

  assert.equal(options.headless, true)
})

test('parseBrowserOptions supports explicit headed mode', () => {
  const options = parseBrowserOptions({
    headed: true,
    timeoutMs: '1000',
  })

  assert.equal(options.headless, false)
})

test('parseBrowserOptions rejects invalid or conflicting managed sessions', () => {
  assert.throws(
    () => parseBrowserOptions({ session: '../chrome', timeoutMs: '1000' }),
    /Invalid browser session id/,
  )
  assert.throws(
    () => parseBrowserOptions({ cdpUrl: 'http://127.0.0.1:9222', session: 'qa-main', timeoutMs: '1000' }),
    /cannot be combined/,
  )
  assert.throws(
    () => parseBrowserOptions({ headed: true, headless: true, timeoutMs: '1000' }),
    /cannot be combined/,
  )
})

test('parseBrowserOptions rejects malformed profile values', () => {
  assert.throws(() => parseBrowserOptions({ viewport: 'bad', timeoutMs: '1000' }), /viewport format/)
  assert.throws(() => parseBrowserOptions({ geolocation: '1,2,three', timeoutMs: '1000' }), /Invalid geolocation/)
  assert.throws(() => parseBrowserOptions({ extraHeaders: '[]', timeoutMs: '1000' }), /JSON object/)
  assert.throws(
    () => parseBrowserOptions({ interactionClickDelayMs: '-1', timeoutMs: '1000' }),
    /non-negative integer/,
  )
})

test('parseOutputFormat accepts json and text only', () => {
  assert.equal(parseOutputFormat(undefined), 'json')
  assert.equal(parseOutputFormat('json'), 'json')
  assert.equal(parseOutputFormat('text'), 'text')

  assert.throws(
    () => parseOutputFormat('yaml'),
    error => error instanceof RuntimeFailure && error.code === 'INVALID_ARGUMENT',
  )
})
