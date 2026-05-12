import assert from 'node:assert/strict'
import test from 'node:test'
import { resolveHeadlessDesktopFingerprint, sanitizeHeadlessUserAgent } from '../src/infrastructure/browser/headlessFingerprint.js'

test('sanitizeHeadlessUserAgent removes HeadlessChrome token', () => {
  assert.equal(
    sanitizeHeadlessUserAgent(
      'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/147.0.0.0 Safari/537.36',
    ),
    'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36',
  )
})

test('resolveHeadlessDesktopFingerprint returns a stable desktop baseline when no viewport is configured', () => {
  const fingerprint = resolveHeadlessDesktopFingerprint(undefined)

  assert.ok(fingerprint)
  assert.equal(fingerprint.viewport.width > 0, true)
  assert.equal(fingerprint.viewport.height > 0, true)
  assert.equal(fingerprint.screen.width >= fingerprint.viewport.width, true)
  assert.equal(fingerprint.screen.height >= fingerprint.windowBounds.height, true)
  assert.equal(fingerprint.screen.availWidth, fingerprint.screen.width)
  assert.equal(fingerprint.screen.availHeight <= fingerprint.screen.height, true)
  assert.equal(fingerprint.windowBounds.width, fingerprint.viewport.width)
  assert.equal(fingerprint.windowBounds.height > fingerprint.viewport.height, true)
})

test('resolveHeadlessDesktopFingerprint respects an explicit desktop viewport', () => {
  const fingerprint = resolveHeadlessDesktopFingerprint({
    viewport: {
      width: 1440,
      height: 900,
      deviceScaleFactor: 1,
    },
  })

  assert.ok(fingerprint)
  assert.equal(fingerprint.viewport.width, 1440)
  assert.equal(fingerprint.viewport.height, 900)
  assert.equal(fingerprint.viewport.deviceScaleFactor, 1)
  assert.equal(fingerprint.windowBounds.width, 1440)
  assert.equal(fingerprint.windowBounds.height > 900, true)
  assert.equal(fingerprint.screen.width >= 1440, true)
  assert.equal(fingerprint.screen.availHeight >= 900, true)
})

test('resolveHeadlessDesktopFingerprint skips mobile viewport emulation', () => {
  const fingerprint = resolveHeadlessDesktopFingerprint({
    viewport: {
      width: 390,
      height: 844,
      isMobile: true,
      hasTouch: true,
      deviceScaleFactor: 3,
    },
  })

  assert.equal(fingerprint, undefined)
})
