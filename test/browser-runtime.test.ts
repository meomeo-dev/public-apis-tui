import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const source = readFileSync('src/infrastructure/browser/browserRuntime.ts', 'utf8')

test('attached browser flow opens a temporary page instead of reusing caller pages', () => {
  const connectSection = source.slice(
    source.indexOf('async function connectToExistingBrowser'),
    source.indexOf('async function launchBrowser'),
  )

  assert.match(connectSection, /browser\.newPage\(\)/)
  assert.doesNotMatch(connectSection, /acquirePage\(browser\)/)
})

test('attached browser flow applies browser profile settings to the temporary page', () => {
  assert.match(source, /connectToExistingBrowser\(options\.cdpUrl, options\.timeoutMs, options\.profile, options\.initialUrl\)/)
  assert.match(source, /await applyBrowserProfile\(page, browser, profile, initialUrl, headlessFingerprint\)/)
})

test('managed browser flow may reuse the initial blank page it owns', () => {
  const launchSection = source.slice(
    source.indexOf('async function launchBrowser'),
    source.indexOf('async function acquirePage'),
  )

  assert.match(launchSection, /acquirePage\(browser\)/)
})

test('managed browser sessions reuse or launch a persistent Chrome by slug', () => {
  assert.match(source, /connectOrLaunchManagedBrowserSession\(options\)/)
  assert.match(source, /readManagedBrowserSessionState\(sessionId\)/)
  assert.match(source, /isPidAlive\(existingState\.pid\)/)
  assert.match(source, /isCdpReachable\(existingState\.cdpUrl/)
  assert.match(source, /assertManagedBrowserSessionLaunchMode\(existingState, options\.headless\)/)
  assert.match(source, /spawnManagedChromeSession\(options/)
  assert.match(source, /writeManagedBrowserSessionState\(\{/)
})

test('managed browser sessions reject headed/headless reuse mismatches', () => {
  assert.match(source, /function assertManagedBrowserSessionLaunchMode/)
  assert.match(source, /CHROME_SESSION_FAILED/)
  assert.match(source, /Chrome session "\$\{state\.sessionId\}" is already running in \$\{state\.headless \? 'headless' : 'headed'\} mode\./)
  assert.match(source, /requestedMode: requestedHeadless \? 'headless' : 'headed'/)
})

test('managed browser sessions detach instead of closing Chrome after a command', () => {
  const sessionLaunchSection = source.slice(
    source.indexOf('async function launchManagedBrowserSession'),
    source.indexOf('async function launchBrowserWithLifecycle'),
  )

  assert.match(sessionLaunchSection, /mode: 'session'/)
  assert.doesNotMatch(sessionLaunchSection, /close: async/)
  assert.match(source, /lease\.browser\.disconnect\(\)/)
})

test('managed browser sessions are spawned outside Puppeteer exit cleanup', () => {
  assert.match(source, /spawn\(executablePath, \[/)
  assert.match(source, /--remote-debugging-port=\$\{launchConfig\.debuggingPort\}/)
  assert.match(source, /detached: true/)
  assert.match(source, /child\.unref\(\)/)
})

test('managed browser sessions handle spawn and registration failures', () => {
  assert.match(source, /waitForManagedChromeStartup\(child, cdpUrl, options\.timeoutMs\)/)
  assert.match(source, /child\.once\('error', reject\)/)
  assert.match(source, /child\.once\('exit', \(code, signal\) => \{/)
  assert.match(source, /closeManagedBrowserAfterFailedRegistration\(lease\.browser, pid\)/)
})

test('managed browser sessions clean matching stale processes before replacement', () => {
  const reuseSection = source.slice(
    source.indexOf('async function connectOrLaunchManagedBrowserSession'),
    source.indexOf('async function launchManagedBrowserSession'),
  )

  assert.match(reuseSection, /stopRecordedManagedBrowserProcess\(existingState\)/)
  assert.match(reuseSection, /removeManagedBrowserSessionState\(sessionId\)/)
})

test('managed browser flow enables stealth defaults for owned launches', () => {
  assert.match(source, /addExtra\(createPuppeteerExtraAdapter\(\)\)/)
  assert.match(source, /function createPuppeteerExtraAdapter\(\): VanillaPuppeteer/)
  assert.match(source, /StealthPlugin\(\)/)
  assert.match(source, /ignoreDefaultArgs: \['--enable-automation'\]/)
  assert.match(source, /--disable-blink-features=AutomationControlled/)
})

test('managed headless launch applies a dedicated consistency layer', () => {
  assert.match(source, /const headlessFingerprint = options\.headless \? resolveHeadlessDesktopFingerprint\(options\.profile\) : undefined/)
  assert.match(source, /\.\.\.\(headlessFingerprint !== undefined \? \{ defaultViewport: headlessFingerprint\.viewport \} : \{\}\)/)
  assert.match(source, /await applyHeadlessDesktopFingerprint\(page, browser, headlessFingerprint\)/)
  assert.match(source, /await applyBrowserProfile\(page, browser, options\.profile, options\.initialUrl, headlessFingerprint\)/)
})

test('headless consistency layer sanitizes user agent and patches screen metrics on new documents', () => {
  assert.match(source, /sanitizeHeadlessUserAgent/)
  assert.match(source, /await page\.evaluateOnNewDocument\(screenMetrics =>/)
  assert.match(source, /Object\.defineProperty\(window\.screen, name, \{/)
  assert.match(source, /Object\.defineProperty\(window\.screen, 'availLeft', \{/)
  assert.match(source, /Object\.defineProperty\(window\.screen, 'availTop', \{/)
  assert.match(source, /await browser\.setWindowBounds\(windowId, \{/)
})

test('browser runtime stores page-level interaction pacing from the resolved profile', () => {
  assert.match(source, /setPageInteractionProfile\(page, profile\?\.interaction\)/)
})

test('browser runtime can pre-authorize geolocation against the initial target origin', () => {
  assert.match(source, /initialUrl\?: string \| undefined/)
  assert.match(source, /overridePermissions\(new URL\(initialUrl\)\.origin, \['geolocation'\]\)/)
  assert.doesNotMatch(source, /currentUrl !== 'about:blank'/)
})
