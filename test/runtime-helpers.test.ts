import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import test from 'node:test'
import {
  isPathInside,
  resolveAppHomeDir,
  resolveDefaultBrowserUserDataDir,
  resolveLegacyManagedAuthProfilePaths,
  resolveLegacyPublicApiProviderStoragePaths,
  resolveManagedAuthProfilePaths,
  resolveManagedBrowserSessionPaths,
  resolvePublicApiProviderStoragePaths,
} from '../src/shared/runtime/appPaths.js'
import { resolveChromeExecutablePath } from '../src/shared/runtime/chromeExecutable.js'
import { findNearestPackageRoot } from '../src/shared/runtime/projectRoot.js'

test('findNearestPackageRoot resolves a package root from a nested directory', () => {
  const root = findNearestPackageRoot(
    new URL('../src/interfaces/cli', import.meta.url).pathname,
  )
  const packageJson = JSON.parse(
    readFileSync(resolve(root, 'package.json'), 'utf8'),
  ) as { name?: string }

  assert.equal(packageJson.name, readCurrentPackageName())
})

test('resolveChromeExecutablePath prefers explicit path over CHROME_PATH', () => {
  const previous = process.env.CHROME_PATH
  try {
    process.env.CHROME_PATH = '/env/chrome'
    assert.equal(resolveChromeExecutablePath('/explicit/chrome'), '/explicit/chrome')
  } finally {
    restoreEnvValue('CHROME_PATH', previous)
  }
})

test('resolveChromeExecutablePath falls back to CHROME_PATH', () => {
  const previous = process.env.CHROME_PATH
  try {
    process.env.CHROME_PATH = '/env/chrome'
    assert.equal(resolveChromeExecutablePath(undefined), '/env/chrome')
  } finally {
    restoreEnvValue('CHROME_PATH', previous)
  }
})

test('resolveAppHomeDir defaults to a package-scoped user home directory', () => {
  const env = {
    HOME: '/Users/tester',
  } as NodeJS.ProcessEnv

  assert.equal(
    resolveAppHomeDir(env, 'cdp-cli-template'),
    '/Users/tester/.cdp-cli/cdp-cli-template',
  )
  assert.equal(
    resolveDefaultBrowserUserDataDir(env, 'cdp-cli-template'),
    '/Users/tester/.cdp-cli/cdp-cli-template/browser-profile',
  )
})

test('managed auth paths isolate auth profiles under app auth root', () => {
  const env = {
    HOME: '/Users/tester',
  } as NodeJS.ProcessEnv

  const paths = resolveManagedAuthProfilePaths('v2ex-main', env, 'cdp-cli-template')
  assert.equal(
    paths.authDir,
    '/Users/tester/.cdp-cli/cdp-cli-template/auth/v2ex-main',
  )
  assert.equal(
    paths.chromeUserDataDir,
    '/Users/tester/.cdp-cli/cdp-cli-template/auth/v2ex-main/chrome-profile',
  )
  assert.equal(paths.chromeProfileDirectory, 'Default')
  assert.equal(
    paths.stateFile,
    '/Users/tester/.cdp-cli/cdp-cli-template/auth/v2ex-main/auth-state.json',
  )
})

test('managed auth paths support legacy CLI name read fallback', () => {
  const env = {
    HOME: '/Users/tester',
  } as NodeJS.ProcessEnv

  const legacy = resolveLegacyManagedAuthProfilePaths('v2ex-main', env)
  assert.equal(
    legacy?.stateFile,
    '/Users/tester/.cdp-cli/public-apis-tui/auth/v2ex-main/auth-state.json',
  )
})

test('resolveManagedBrowserSessionPaths isolates browser sessions by slug', () => {
  const env = {
    HOME: '/Users/tester',
  } as NodeJS.ProcessEnv

  const paths = resolveManagedBrowserSessionPaths('qa-main', env, 'cdp-cli-template')
  assert.equal(
    paths.sessionRootDir,
    '/Users/tester/.cdp-cli/cdp-cli-template/browser-sessions',
  )
  assert.equal(
    paths.sessionDir,
    '/Users/tester/.cdp-cli/cdp-cli-template/browser-sessions/qa-main',
  )
  assert.equal(
    paths.chromeUserDataDir,
    '/Users/tester/.cdp-cli/cdp-cli-template/browser-sessions/qa-main/chrome-profile',
  )
  assert.equal(paths.chromeProfileDirectory, 'Default')
  assert.equal(
    paths.stateFile,
    (
      '/Users/tester/.cdp-cli/cdp-cli-template/browser-sessions/' +
      'qa-main/browser-state.json'
    ),
  )
})

test('resolveManagedBrowserSessionPaths sanitizes unsafe path characters', () => {
  const env = {
    HOME: '/Users/tester',
  } as NodeJS.ProcessEnv

  const paths = resolveManagedBrowserSessionPaths('../qa main', env, 'cdp-cli-template')
  assert.equal(
    paths.sessionDir,
    '/Users/tester/.cdp-cli/cdp-cli-template/browser-sessions/qa-main',
  )
})

test('public API storage supports current CLI name and legacy read fallback', () => {
  const env = {
    HOME: '/Users/tester',
  } as NodeJS.ProcessEnv

  const current = resolvePublicApiProviderStoragePaths(
    'newsapi',
    env,
    'public-apis-cli',
  )
  assert.equal(current.appHomeDir, '/Users/tester/.cdp-cli/public-apis-cli')
  assert.equal(
    current.configFile,
    '/Users/tester/.cdp-cli/public-apis-cli/public-apis/newsapi/config.json',
  )

  const legacy = resolveLegacyPublicApiProviderStoragePaths('newsapi', env)
  assert.equal(
    legacy?.configFile,
    '/Users/tester/.cdp-cli/public-apis-tui/public-apis/newsapi/config.json',
  )
})

test('isPathInside works for POSIX and Windows-style paths', () => {
  assert.equal(
    isPathInside(
      '/Users/tester/.cdp-cli/cdp-cli-template/auth',
      '/Users/tester/.cdp-cli/cdp-cli-template/auth/v2ex-main',
    ),
    true,
  )
  assert.equal(
    isPathInside(
      '/Users/tester/.cdp-cli/cdp-cli-template/auth',
      '/Users/tester/.cdp-cli/cdp-cli-template/browser-profile',
    ),
    false,
  )
  assert.equal(
    isPathInside(
      'C:\\Users\\tester\\.cdp-cli-template\\auth',
      'C:\\Users\\tester\\.cdp-cli-template\\auth\\v2ex-main',
    ),
    true,
  )
  assert.equal(
    isPathInside(
      'C:\\Users\\tester\\.cdp-cli-template\\auth',
      'C:\\Users\\tester\\.cdp-cli-template\\browser-profile',
    ),
    false,
  )
})

function readCurrentPackageName(): string | undefined {
  const packageJson = JSON.parse(
    readFileSync('package.json', 'utf8'),
  ) as { name?: string }
  return packageJson.name
}

function restoreEnvValue(name: string, value: string | undefined): void {
  if (value === undefined) {
    delete process.env[name]
  } else {
    process.env[name] = value
  }
}
