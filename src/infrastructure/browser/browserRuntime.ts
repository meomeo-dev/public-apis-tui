import { spawn } from 'node:child_process'
import type { ChildProcess } from 'node:child_process'
import vanillaPuppeteer, { type Browser, type CookieData, type Page, type Viewport } from 'puppeteer-core'
import { addExtra, type VanillaPuppeteer } from 'puppeteer-extra'
import StealthPlugin from 'puppeteer-extra-plugin-stealth'
import type { BrowserProfileConfig } from '../site/siteAdapter.js'
import {
  resolveHeadlessDesktopFingerprint,
  sanitizeHeadlessUserAgent,
  type HeadlessDesktopFingerprint,
} from './headlessFingerprint.js'
import { setPageInteractionProfile } from '../ui/interactionProfile.js'
import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'
import {
  DEFAULT_CHROME_PROFILE_DIRECTORY,
  resolveDefaultBrowserUserDataDir,
  resolveManagedBrowserSessionPaths,
} from '../../shared/runtime/appPaths.js'
import { resolveChromeExecutablePath } from '../../shared/runtime/chromeExecutable.js'
import { ensureOwnerOnlyDirectory } from '../../shared/runtime/profileSecurity.js'
import {
  allocateLocalPort,
  assertValidBrowserSessionId,
  isCdpReachable,
  isPidAlive,
  MANAGED_BROWSER_SESSION_STATE_VERSION,
  readManagedBrowserSessionState,
  removeManagedBrowserSessionState,
  stopRecordedManagedBrowserProcess,
  writeManagedBrowserSessionState,
  type ManagedBrowserSessionState,
} from './browserSessionRegistry.js'

const puppeteer = addExtra(createPuppeteerExtraAdapter())
puppeteer.use(StealthPlugin())

export type BrowserRuntimeOptions = {
  cdpUrl?: string | undefined
  sessionId?: string | undefined
  executablePath?: string | undefined
  userDataDir?: string | undefined
  chromeProfileDirectory?: string | undefined
  authProfileId?: string | undefined
  initialUrl?: string | undefined
  headless: boolean
  timeoutMs: number
  profile?: BrowserProfileConfig | undefined
}

export type BrowserLease = {
  browser: Browser
  page: Page
  close: () => Promise<void>
  mode: 'attached' | 'launched' | 'session'
}

export type BrowserSessionSnapshot = {
  cookies: CookieData[]
  origins: Array<{
    origin: string
    localStorage: Record<string, string>
  }>
}

export async function withBrowserPage<T>(
  options: BrowserRuntimeOptions,
  handler: (lease: BrowserLease) => Promise<T>,
): Promise<T> {
  const lease = await openBrowserPage(options)
  try {
    return await handler(lease)
  } finally {
    await lease.close()
  }
}

async function openBrowserPage(options: BrowserRuntimeOptions): Promise<BrowserLease> {
  if (options.cdpUrl !== undefined && options.cdpUrl.trim() !== '') {
    return connectToExistingBrowser(options.cdpUrl, options.timeoutMs, options.profile, options.initialUrl)
  }

  if (options.sessionId !== undefined) {
    return connectOrLaunchManagedBrowserSession(options)
  }

  return launchBrowser(options)
}

async function connectToExistingBrowser(
  cdpUrl: string,
  timeoutMs: number,
  profile: BrowserProfileConfig | undefined,
  initialUrl: string | undefined,
  headlessFingerprint?: HeadlessDesktopFingerprint | undefined,
): Promise<BrowserLease> {
  let browser: Browser
  try {
    browser = await puppeteer.connect({ browserURL: cdpUrl, protocolTimeout: timeoutMs })
  } catch (error) {
    throw new RuntimeFailure('BROWSER_CONNECT_FAILED', `Failed to connect to browser at ${cdpUrl}`, {
      cdpUrl,
      cause: error instanceof Error ? error.message : String(error),
    })
  }

  const page = await browser.newPage()
  await applyHeadlessDesktopFingerprint(page, browser, headlessFingerprint)
  await applyBrowserProfile(page, browser, profile, initialUrl, headlessFingerprint)
  return {
    browser,
    page,
    mode: 'attached',
    close: async () => {
      await closePageQuietly(page)
      browser.disconnect()
    },
  }
}

async function launchBrowser(options: BrowserRuntimeOptions): Promise<BrowserLease> {
  const userDataDir = options.userDataDir ?? defaultUserDataDir()
  return launchBrowserWithLifecycle(options, {
    userDataDir,
    chromeProfileDirectory: options.chromeProfileDirectory,
  })
}

async function connectOrLaunchManagedBrowserSession(options: BrowserRuntimeOptions): Promise<BrowserLease> {
  const sessionId = options.sessionId
  if (sessionId === undefined) {
    throw new RuntimeFailure('INVALID_ARGUMENT', 'Browser session id is required.')
  }
  assertValidBrowserSessionId(sessionId)

  const existingState = await readManagedBrowserSessionState(sessionId)
  if (
    existingState !== undefined &&
    isPidAlive(existingState.pid) &&
    await isCdpReachable(existingState.cdpUrl, Math.min(options.timeoutMs, 3_000))
  ) {
    assertManagedBrowserSessionLaunchMode(existingState, options.headless)
    const headlessFingerprint = existingState.headless ? resolveHeadlessDesktopFingerprint(options.profile) : undefined
    const lease = await connectToExistingBrowser(
      existingState.cdpUrl,
      options.timeoutMs,
      options.profile,
      options.initialUrl,
      headlessFingerprint,
    )
    await writeManagedBrowserSessionState({
      ...existingState,
      updatedAt: new Date().toISOString(),
    })
    return {
      ...lease,
      mode: 'session',
    }
  }

  if (existingState !== undefined) {
    if (isPidAlive(existingState.pid)) {
      await stopRecordedManagedBrowserProcess(existingState)
    }
    await removeManagedBrowserSessionState(sessionId)
  }

  return launchManagedBrowserSession(options)
}

function assertManagedBrowserSessionLaunchMode(
  state: ManagedBrowserSessionState,
  requestedHeadless: boolean,
): void {
  if (state.headless === requestedHeadless) {
    return
  }

  throw new RuntimeFailure(
    'CHROME_SESSION_FAILED',
    `Chrome session "${state.sessionId}" is already running in ${state.headless ? 'headless' : 'headed'} mode.`,
    {
      sessionId: state.sessionId,
      runningMode: state.headless ? 'headless' : 'headed',
      requestedMode: requestedHeadless ? 'headless' : 'headed',
      pid: state.pid,
      cdpUrl: state.cdpUrl,
    },
  )
}

async function launchManagedBrowserSession(options: BrowserRuntimeOptions): Promise<BrowserLease> {
  const sessionId = options.sessionId
  if (sessionId === undefined) {
    throw new RuntimeFailure('INVALID_ARGUMENT', 'Browser session id is required.')
  }
  const sessionPaths = resolveManagedBrowserSessionPaths(sessionId)
  const debuggingPort = await allocateLocalPort()
  const userDataDir = options.userDataDir ?? sessionPaths.chromeUserDataDir
  const chromeProfileDirectory =
    options.chromeProfileDirectory ?? sessionPaths.chromeProfileDirectory ?? DEFAULT_CHROME_PROFILE_DIRECTORY
  const { pid, cdpUrl } = await spawnManagedChromeSession(options, {
    userDataDir,
    chromeProfileDirectory,
    debuggingPort,
  })
  const headlessFingerprint = options.headless ? resolveHeadlessDesktopFingerprint(options.profile) : undefined
  const lease = await connectToExistingBrowser(
    cdpUrl,
    options.timeoutMs,
    options.profile,
    options.initialUrl,
    headlessFingerprint,
  )
  if (pid === undefined) {
    await lease.browser.disconnect()
    throw new RuntimeFailure('BROWSER_CONNECT_FAILED', 'Managed browser session did not expose a process id.', {
      sessionId,
    })
  }

  const now = new Date().toISOString()
  const state: ManagedBrowserSessionState = {
    version: MANAGED_BROWSER_SESSION_STATE_VERSION,
    sessionId,
    pid,
    cdpUrl,
    userDataDir,
    chromeProfileDirectory,
    headless: options.headless,
    startedAt: now,
    updatedAt: now,
  }
  try {
    await writeManagedBrowserSessionState(state)
  } catch (error) {
    await closeManagedBrowserAfterFailedRegistration(lease.browser, pid)
    throw new RuntimeFailure('BROWSER_CONNECT_FAILED', 'Failed to register managed browser session state.', {
      sessionId,
      pid,
      cdpUrl,
      cause: error instanceof Error ? error.message : String(error),
    })
  }

  return {
    ...lease,
    mode: 'session',
  }
}

async function spawnManagedChromeSession(
  options: BrowserRuntimeOptions,
  launchConfig: {
    userDataDir: string
    chromeProfileDirectory: string
    debuggingPort: number
  },
): Promise<{ pid: number | undefined; cdpUrl: string }> {
  const executablePath = resolveChromeExecutablePath(options.executablePath)
  if (executablePath === undefined) {
    throw new RuntimeFailure('BROWSER_CONNECT_FAILED', 'Failed to launch browser', {
      executablePath: '<not-found: set --chrome-path or CHROME_PATH>',
      userDataDir: launchConfig.userDataDir,
    })
  }

  await ensureOwnerOnlyDirectory(launchConfig.userDataDir)
  const headlessFingerprint = options.headless ? resolveHeadlessDesktopFingerprint(options.profile) : undefined
  const cdpUrl = `http://127.0.0.1:${launchConfig.debuggingPort}`
  const child = spawn(executablePath, [
    `--remote-debugging-port=${launchConfig.debuggingPort}`,
    `--user-data-dir=${launchConfig.userDataDir}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-blink-features=AutomationControlled',
    ...(options.headless ? ['--headless=new'] : []),
    ...(headlessFingerprint !== undefined
      ? [`--window-size=${headlessFingerprint.windowBounds.width},${headlessFingerprint.windowBounds.height}`]
      : []),
    `--profile-directory=${launchConfig.chromeProfileDirectory}`,
    ...(options.profile?.proxyServer !== undefined ? [`--proxy-server=${options.profile.proxyServer}`] : []),
    'about:blank',
  ], {
    detached: true,
    stdio: 'ignore',
  })
  child.unref()

  try {
    await waitForManagedChromeStartup(child, cdpUrl, options.timeoutMs)
  } catch (error) {
    if (child.pid !== undefined && isPidAlive(child.pid)) {
      process.kill(child.pid, 'SIGTERM')
    }
    throw new RuntimeFailure('BROWSER_CONNECT_FAILED', 'Failed to launch managed browser session', {
      executablePath,
      userDataDir: launchConfig.userDataDir,
      cdpUrl,
      cause: error instanceof Error ? error.message : String(error),
    })
  }

  return {
    pid: child.pid,
    cdpUrl,
  }
}

async function closeManagedBrowserAfterFailedRegistration(browser: Browser, pid: number): Promise<void> {
  try {
    await browser.close()
  } catch {
    if (isPidAlive(pid)) {
      process.kill(pid, 'SIGTERM')
    }
  }
}

async function launchBrowserWithLifecycle(
  options: BrowserRuntimeOptions,
  lifecycle: {
    userDataDir: string
    chromeProfileDirectory?: string | undefined
  },
): Promise<BrowserLease> {
  const executablePath = resolveChromeExecutablePath(options.executablePath)
  const headlessFingerprint = options.headless ? resolveHeadlessDesktopFingerprint(options.profile) : undefined
  await ensureOwnerOnlyDirectory(lifecycle.userDataDir)

  let browser: Browser
  try {
    browser = await puppeteer.launch({
      userDataDir: lifecycle.userDataDir,
      headless: options.headless,
      ...(headlessFingerprint !== undefined ? { defaultViewport: headlessFingerprint.viewport } : {}),
      protocolTimeout: options.timeoutMs,
      ignoreDefaultArgs: ['--enable-automation'],
      args: [
        '--no-first-run',
        '--no-default-browser-check',
        '--disable-blink-features=AutomationControlled',
        ...(lifecycle.chromeProfileDirectory !== undefined ? [`--profile-directory=${lifecycle.chromeProfileDirectory}`] : []),
        ...(options.profile?.proxyServer !== undefined ? [`--proxy-server=${options.profile.proxyServer}`] : []),
      ],
      ...(executablePath !== undefined ? { executablePath } : {}),
    })
  } catch (error) {
    throw new RuntimeFailure('BROWSER_CONNECT_FAILED', 'Failed to launch browser', {
      executablePath: executablePath ?? '<not-found: set --chrome-path or CHROME_PATH>',
      userDataDir: lifecycle.userDataDir,
      cause: error instanceof Error ? error.message : String(error),
    })
  }

  const page = await acquirePage(browser)
  await applyHeadlessDesktopFingerprint(page, browser, headlessFingerprint)
  await applyBrowserProfile(page, browser, options.profile, options.initialUrl, headlessFingerprint)
  return {
    browser,
    page,
    mode: 'launched',
    close: async () => {
      await browser.close()
    },
  }
}

async function waitForCdpEndpoint(cdpUrl: string, timeoutMs: number): Promise<void> {
  const startedAt = Date.now()
  while (Date.now() - startedAt < timeoutMs) {
    if (await isCdpReachable(cdpUrl, 500)) {
      return
    }
    await sleep(100)
  }

  throw new Error(`Timed out waiting for CDP endpoint ${cdpUrl}`)
}

async function waitForManagedChromeStartup(child: ChildProcess, cdpUrl: string, timeoutMs: number): Promise<void> {
  await Promise.race([
    waitForCdpEndpoint(cdpUrl, timeoutMs),
    new Promise<never>((_, reject) => {
      child.once('error', reject)
      child.once('exit', (code, signal) => {
        reject(new Error(`Chrome process exited before CDP became reachable: code=${code ?? 'null'} signal=${signal ?? 'null'}`))
      })
    }),
  ])
}

async function sleep(ms: number): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, ms))
}

async function acquirePage(browser: Browser): Promise<Page> {
  const pages = await browser.pages()
  const page = pages[0] ?? (await browser.newPage())
  page.setDefaultTimeout(30_000)
  page.setDefaultNavigationTimeout(60_000)
  return page
}

async function closePageQuietly(page: Page): Promise<void> {
  try {
    if (!page.isClosed()) {
      await page.close()
    }
  } catch {
    // Attached browsers are owned by the caller; page cleanup is best effort only.
  }
}

function defaultUserDataDir(): string {
  return resolveDefaultBrowserUserDataDir()
}

export async function exportBrowserSession(page: Page): Promise<BrowserSessionSnapshot> {
  const cookies = await page.cookies()
  const origins = await page.evaluate(() => {
    const origin = window.location.origin
    const entries = Object.fromEntries(
      Array.from({ length: window.localStorage.length }, (_, index) => {
        const key = window.localStorage.key(index)
        return key === null ? null : [key, window.localStorage.getItem(key) ?? '']
      }).filter((entry): entry is [string, string] => entry !== null),
    )
    return [{ origin, localStorage: entries }]
  })

  return { cookies, origins }
}

export async function importBrowserSession(page: Page, snapshot: BrowserSessionSnapshot): Promise<void> {
  if (snapshot.cookies.length > 0) {
    await page.setCookie(...snapshot.cookies)
  }

  if (snapshot.origins.length === 0) {
    return
  }

  const initialUrl = page.url()
  for (const originState of snapshot.origins) {
    const targetUrl = originToNavigableUrl(originState.origin)
    await page.goto(targetUrl, { waitUntil: 'domcontentloaded' })
    await page.evaluate(entries => {
      window.localStorage.clear()
      for (const [key, value] of Object.entries(entries)) {
        window.localStorage.setItem(key, value)
      }
    }, originState.localStorage)
  }

  if (initialUrl !== 'about:blank') {
    await page.goto(initialUrl, { waitUntil: 'domcontentloaded' })
  }
}

function createPuppeteerExtraAdapter(): VanillaPuppeteer {
  return {
    connect: (options: Parameters<typeof vanillaPuppeteer.connect>[0]) => vanillaPuppeteer.connect(options),
    defaultArgs: (options: Parameters<typeof vanillaPuppeteer.defaultArgs>[0]) => vanillaPuppeteer.defaultArgs(options),
    executablePath: () => vanillaPuppeteer.executablePath(),
    launch: (options: Parameters<typeof vanillaPuppeteer.launch>[0]) => vanillaPuppeteer.launch(options),
    createBrowserFetcher: () => {
      throw new Error('createBrowserFetcher is not supported by this puppeteer-core runtime adapter.')
    },
  }
}

async function applyBrowserProfile(
  page: Page,
  browser: Browser,
  profile: BrowserProfileConfig | undefined,
  initialUrl: string | undefined,
  headlessFingerprint?: HeadlessDesktopFingerprint | undefined,
): Promise<void> {
  setPageInteractionProfile(page, profile?.interaction)

  if (headlessFingerprint !== undefined) {
    await applyHeadlessNavigatorFingerprint(page, profile?.userAgent)
  }

  if (profile === undefined) {
    return
  }

  if (profile.extraHeaders !== undefined) {
    await page.setExtraHTTPHeaders(profile.extraHeaders)
  }

  if (profile.userAgent !== undefined) {
    await page.setUserAgent({
      userAgent: headlessFingerprint !== undefined ? sanitizeHeadlessUserAgent(profile.userAgent) : profile.userAgent,
    })
  }

  if (profile.viewport !== undefined) {
    await page.setViewport(toViewport(profile.viewport))
  }

  if (profile.timezoneId !== undefined) {
    await page.emulateTimezone(profile.timezoneId)
  }

  if (profile.locale !== undefined) {
    await page.evaluateOnNewDocument(locale => {
      const languages = locale.split(',').map(value => value.trim()).filter(Boolean)
      Object.defineProperty(navigator, 'language', {
        configurable: true,
        get: () => languages[0] ?? locale,
      })
      Object.defineProperty(navigator, 'languages', {
        configurable: true,
        get: () => (languages.length > 0 ? languages : [locale]),
      })
    }, profile.locale)
  }

  if (profile.geolocation !== undefined) {
    if (initialUrl !== undefined) {
      await browser.defaultBrowserContext().overridePermissions(new URL(initialUrl).origin, ['geolocation'])
    }
    await page.setGeolocation({
      latitude: profile.geolocation.latitude,
      longitude: profile.geolocation.longitude,
      ...(profile.geolocation.accuracy !== undefined ? { accuracy: profile.geolocation.accuracy } : {}),
    })
  }
}

async function applyHeadlessDesktopFingerprint(
  page: Page,
  browser: Browser,
  headlessFingerprint: HeadlessDesktopFingerprint | undefined,
): Promise<void> {
  if (headlessFingerprint === undefined) {
    return
  }

  const windowId = await page.windowId()
  await browser.setWindowBounds(windowId, {
    width: headlessFingerprint.windowBounds.width,
    height: headlessFingerprint.windowBounds.height,
  })
  await page.evaluateOnNewDocument(screenMetrics => {
    const define = <K extends keyof Screen>(name: K, value: Screen[K]) => {
      Object.defineProperty(window.screen, name, {
        configurable: true,
        get: () => value,
      })
    }

    define('width', screenMetrics.width)
    define('height', screenMetrics.height)
    define('availWidth', screenMetrics.availWidth)
    define('availHeight', screenMetrics.availHeight)
    define('colorDepth', screenMetrics.colorDepth)
    define('pixelDepth', screenMetrics.pixelDepth)
    Object.defineProperty(window.screen, 'availLeft', {
      configurable: true,
      get: () => screenMetrics.availLeft,
    })
    Object.defineProperty(window.screen, 'availTop', {
      configurable: true,
      get: () => screenMetrics.availTop,
    })
  }, headlessFingerprint.screen)
}

async function applyHeadlessNavigatorFingerprint(page: Page, userAgent?: string | undefined): Promise<void> {
  const resolvedUserAgent = sanitizeHeadlessUserAgent(userAgent ?? (await page.browser().userAgent()))
  await page.setUserAgent({ userAgent: resolvedUserAgent })
}

function toViewport(viewport: NonNullable<BrowserProfileConfig['viewport']>): Viewport {
  return {
    width: viewport.width,
    height: viewport.height,
    ...(viewport.deviceScaleFactor !== undefined ? { deviceScaleFactor: viewport.deviceScaleFactor } : {}),
    ...(viewport.isMobile !== undefined ? { isMobile: viewport.isMobile } : {}),
    ...(viewport.hasTouch !== undefined ? { hasTouch: viewport.hasTouch } : {}),
    ...(viewport.isLandscape !== undefined ? { isLandscape: viewport.isLandscape } : {}),
  }
}

function originToNavigableUrl(origin: string): string {
  const url = new URL(origin)
  url.pathname = '/'
  url.search = ''
  url.hash = ''
  return url.toString()
}
