import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'
import { parsePositiveInteger } from '../../shared/runtime/timeout.js'
import { isValidBrowserSessionId } from '../../infrastructure/browser/browserSessionRegistry.js'
import type { BrowserRuntimeOptions } from '../../infrastructure/browser/browserRuntime.js'
import type { BrowserInteractionConfig, BrowserProfileConfig } from '../../infrastructure/site/siteAdapter.js'
import type { OutputFormat } from './output.js'

export type CommonCliOptions = {
  cdpUrl?: string | undefined
  session?: string | undefined
  chromePath?: string | undefined
  userDataDir?: string | undefined
  chromeProfileDirectory?: string | undefined
  authProfile?: string | undefined
  proxyServer?: string | undefined
  userAgent?: string | undefined
  locale?: string | undefined
  timezoneId?: string | undefined
  viewport?: string | undefined
  geolocation?: string | undefined
  extraHeaders?: string | undefined
  interactionHoverBeforeClick?: boolean | undefined
  interactionScrollIntoView?: boolean | undefined
  interactionClickDelayMs?: string | undefined
  interactionTypeDelayMs?: string | undefined
  interactionPressDelayMs?: string | undefined
  headed?: boolean | undefined
  headless?: boolean | undefined
  timeoutMs?: string | undefined
  format?: string | undefined
}

export function parseBrowserOptions(options: CommonCliOptions): BrowserRuntimeOptions {
  const cdpUrl = emptyToUndefined(options.cdpUrl)
  const sessionId = parseSessionId(options.session)
  if (cdpUrl !== undefined && sessionId !== undefined) {
    throw new RuntimeFailure('INVALID_ARGUMENT', '--session cannot be combined with --cdp-url.', {
      cdpUrl,
      sessionId,
    })
  }

  return {
    cdpUrl,
    sessionId,
    executablePath: emptyToUndefined(options.chromePath ?? process.env.CHROME_PATH),
    userDataDir: emptyToUndefined(options.userDataDir),
    chromeProfileDirectory: emptyToUndefined(options.chromeProfileDirectory),
    authProfileId: emptyToUndefined(options.authProfile),
    headless: parseHeadlessMode(options),
    timeoutMs: parsePositiveInteger(options.timeoutMs, 60_000),
    profile: parseBrowserProfileOptions(options),
  }
}

export function parseOutputFormat(value: string | undefined): OutputFormat {
  if (value === undefined || value === 'json') {
    return 'json'
  }

  if (value === 'text') {
    return 'text'
  }

  throw new RuntimeFailure('INVALID_ARGUMENT', `Unsupported output format: ${value}`, {
    supported: ['json', 'text'],
  })
}

function emptyToUndefined(value: string | undefined): string | undefined {
  if (value === undefined || value.trim() === '') {
    return undefined
  }

  return value
}

function parseSessionId(value: string | undefined): string | undefined {
  const normalized = emptyToUndefined(value)
  if (normalized === undefined) {
    return undefined
  }

  if (!isValidBrowserSessionId(normalized)) {
    throw new RuntimeFailure('INVALID_ARGUMENT', `Invalid browser session id: ${normalized}`, {
      expected: '1-64 characters: letters, numbers, dot, underscore, or dash; must start with a letter or number',
    })
  }

  return normalized
}

function parseHeadlessMode(options: CommonCliOptions): boolean {
  if (options.headed === true && options.headless === true) {
    throw new RuntimeFailure('INVALID_ARGUMENT', '--headed cannot be combined with --headless.')
  }

  return options.headed === true ? false : true
}

function parseBrowserProfileOptions(options: CommonCliOptions): BrowserProfileConfig | undefined {
  const profile: BrowserProfileConfig = {
    proxyServer: emptyToUndefined(options.proxyServer),
    userAgent: emptyToUndefined(options.userAgent),
    locale: emptyToUndefined(options.locale),
    timezoneId: emptyToUndefined(options.timezoneId),
    viewport: parseViewport(options.viewport),
    geolocation: parseGeolocation(options.geolocation),
    extraHeaders: parseHeaders(options.extraHeaders),
    interaction: parseInteraction(options),
  }

  return hasDefinedProfileValue(profile) ? profile : undefined
}

function parseViewport(value: string | undefined): BrowserProfileConfig['viewport'] {
  const normalized = emptyToUndefined(value)
  if (normalized === undefined) {
    return undefined
  }

  const match = /^(\d{2,5})x(\d{2,5})(?:@(\d+(?:\.\d+)?))?$/i.exec(normalized)
  if (match === null) {
    throw new RuntimeFailure('INVALID_ARGUMENT', `Unsupported viewport format: ${normalized}`, {
      expected: 'WIDTHxHEIGHT or WIDTHxHEIGHT@DEVICE_SCALE',
    })
  }

  return {
    width: Number(match[1]),
    height: Number(match[2]),
    ...(match[3] !== undefined ? { deviceScaleFactor: Number(match[3]) } : {}),
  }
}

function parseGeolocation(value: string | undefined): BrowserProfileConfig['geolocation'] {
  const normalized = emptyToUndefined(value)
  if (normalized === undefined) {
    return undefined
  }

  const parts = normalized.split(',').map(entry => entry.trim())
  if (parts.length < 2 || parts.length > 3) {
    throw new RuntimeFailure('INVALID_ARGUMENT', `Unsupported geolocation format: ${normalized}`, {
      expected: 'LATITUDE,LONGITUDE[,ACCURACY]',
    })
  }

  const latitude = Number(parts[0])
  const longitude = Number(parts[1])
  const accuracy = parts[2] === undefined ? undefined : Number(parts[2])
  if (![latitude, longitude, accuracy ?? 0].every(Number.isFinite)) {
    throw new RuntimeFailure('INVALID_ARGUMENT', `Invalid geolocation numbers: ${normalized}`)
  }

  return {
    latitude,
    longitude,
    ...(accuracy !== undefined ? { accuracy } : {}),
  }
}

function parseHeaders(value: string | undefined): Record<string, string> | undefined {
  const normalized = emptyToUndefined(value)
  if (normalized === undefined) {
    return undefined
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(normalized)
  } catch {
    throw new RuntimeFailure('INVALID_ARGUMENT', `Unsupported extra headers JSON: ${normalized}`)
  }

  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new RuntimeFailure('INVALID_ARGUMENT', 'Extra headers must be a JSON object.')
  }

  const entries = Object.entries(parsed)
  if (!entries.every(([, entryValue]) => typeof entryValue === 'string')) {
    throw new RuntimeFailure('INVALID_ARGUMENT', 'Extra headers values must all be strings.')
  }

  return Object.fromEntries(entries) as Record<string, string>
}

function parseInteraction(options: CommonCliOptions): BrowserInteractionConfig | undefined {
  const interaction: BrowserInteractionConfig = {
    hoverBeforeClick: options.interactionHoverBeforeClick === true ? true : undefined,
    scrollIntoView: options.interactionScrollIntoView === true ? true : undefined,
    clickDelayMs: parseNonNegativeInteger(options.interactionClickDelayMs, 'interaction-click-delay-ms'),
    typeDelayMs: parseNonNegativeInteger(options.interactionTypeDelayMs, 'interaction-type-delay-ms'),
    pressDelayMs: parseNonNegativeInteger(options.interactionPressDelayMs, 'interaction-press-delay-ms'),
  }

  return hasDefinedValue(interaction) ? interaction : undefined
}

function parseNonNegativeInteger(value: string | undefined, flag: string): number | undefined {
  const normalized = emptyToUndefined(value)
  if (normalized === undefined) {
    return undefined
  }

  const parsed = Number(normalized)
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new RuntimeFailure('INVALID_ARGUMENT', `Expected a non-negative integer for --${flag}, got: ${normalized}`)
  }

  return parsed
}

function hasDefinedProfileValue(profile: BrowserProfileConfig): boolean {
  return hasDefinedValue(profile)
}

function hasDefinedValue(value: Record<string, unknown>): boolean {
  return Object.values(value).some(entry => entry !== undefined)
}
