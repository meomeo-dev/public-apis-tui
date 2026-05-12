import type { BrowserProfileConfig } from '../site/siteAdapter.js'

type HeadlessScreenMetrics = {
  width: number
  height: number
  availWidth: number
  availHeight: number
  availLeft: number
  availTop: number
  colorDepth: number
  pixelDepth: number
}

export type HeadlessDesktopFingerprint = {
  viewport: {
    width: number
    height: number
    deviceScaleFactor?: number | undefined
  }
  screen: HeadlessScreenMetrics
  windowBounds: {
    width: number
    height: number
  }
}

type HeadlessDesktopDefaults = {
  viewport: HeadlessDesktopFingerprint['viewport']
  minScreenWidth: number
  minScreenHeight: number
  workAreaBottomInset: number
  windowHeightDecoration: number
}

export function sanitizeHeadlessUserAgent(userAgent: string): string {
  return userAgent.replace(/HeadlessChrome\//g, 'Chrome/')
}

export function resolveHeadlessDesktopFingerprint(
  profile: BrowserProfileConfig | undefined,
): HeadlessDesktopFingerprint | undefined {
  if (profile?.viewport?.isMobile === true) {
    return undefined
  }

  const defaults = resolveHeadlessDesktopDefaults()
  const viewport = profile?.viewport ?? defaults.viewport
  const screenWidth = Math.max(defaults.minScreenWidth, viewport.width)
  const screenHeight = Math.max(defaults.minScreenHeight, viewport.height + defaults.windowHeightDecoration)

  return {
    viewport: {
      width: viewport.width,
      height: viewport.height,
      ...(viewport.deviceScaleFactor !== undefined
        ? { deviceScaleFactor: viewport.deviceScaleFactor }
        : defaults.viewport.deviceScaleFactor !== undefined
          ? { deviceScaleFactor: defaults.viewport.deviceScaleFactor }
          : {}),
    },
    screen: {
      width: screenWidth,
      height: screenHeight,
      availWidth: screenWidth,
      availHeight: Math.max(viewport.height, screenHeight - defaults.workAreaBottomInset),
      availLeft: 0,
      availTop: 0,
      colorDepth: 24,
      pixelDepth: 24,
    },
    windowBounds: {
      width: viewport.width,
      height: viewport.height + defaults.windowHeightDecoration,
    },
  }
}

function resolveHeadlessDesktopDefaults(): HeadlessDesktopDefaults {
  if (process.platform === 'darwin') {
    return {
      viewport: {
        width: 1200,
        height: 768,
        deviceScaleFactor: 2,
      },
      minScreenWidth: 1680,
      minScreenHeight: 1050,
      workAreaBottomInset: 99,
      windowHeightDecoration: 139,
    }
  }

  return {
    viewport: {
      width: 1280,
      height: 720,
      deviceScaleFactor: 1,
    },
    minScreenWidth: 1920,
    minScreenHeight: 1080,
    workAreaBottomInset: 40,
    windowHeightDecoration: 88,
  }
}
