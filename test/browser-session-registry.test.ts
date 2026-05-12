import assert from 'node:assert/strict'
import { mkdtemp, rm, stat } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { spawn } from 'node:child_process'
import test from 'node:test'
import {
  listManagedBrowserSessions,
  MANAGED_BROWSER_SESSION_STATE_VERSION,
  readManagedBrowserSessionState,
  stopRecordedManagedBrowserProcess,
  stopManagedBrowserSession,
  writeManagedBrowserSessionState,
} from '../src/infrastructure/browser/browserSessionRegistry.js'
import { SITE_CDP_HOME_DIR_ENV } from '../src/shared/runtime/appPaths.js'
import { OWNER_ONLY_DIRECTORY_MODE } from '../src/shared/runtime/profileSecurity.js'

test('managed browser session state round-trips under app home', async () => {
  await withTempAppHome(async appHome => {
    await writeManagedBrowserSessionState({
      version: MANAGED_BROWSER_SESSION_STATE_VERSION,
      sessionId: 'qa-main',
      pid: 9_999_999,
      cdpUrl: 'http://127.0.0.1:49999',
      userDataDir: join(appHome, 'browser-sessions', 'qa-main', 'chrome-profile'),
      chromeProfileDirectory: 'Default',
      headless: true,
      startedAt: '2026-05-01T00:00:00.000Z',
      updatedAt: '2026-05-01T00:00:00.000Z',
    })

    const state = await readManagedBrowserSessionState('qa-main')
    assert.equal(state?.sessionId, 'qa-main')
    assert.equal(state?.headless, true)

    const list = await listManagedBrowserSessions()
    assert.equal(list.length, 1)
    assert.equal(list[0]?.sessionId, 'qa-main')
    assert.equal(list[0]?.status, 'stale')
    assert.equal(list[0]?.cdpReachable, false)
  })
})

test('managed browser session registry hardens session state directories', async t => {
  if (process.platform === 'win32') {
    t.skip('POSIX mode hardening is not available on Windows')
    return
  }

  await withTempAppHome(async appHome => {
    await writeManagedBrowserSessionState({
      version: MANAGED_BROWSER_SESSION_STATE_VERSION,
      sessionId: 'qa-main',
      pid: 9_999_999,
      cdpUrl: 'http://127.0.0.1:49999',
      userDataDir: join(appHome, 'browser-sessions', 'qa-main', 'chrome-profile'),
      headless: true,
      startedAt: '2026-05-01T00:00:00.000Z',
      updatedAt: '2026-05-01T00:00:00.000Z',
    })

    const sessionDir = join(appHome, 'browser-sessions', 'qa-main')
    const info = await stat(sessionDir)
    assert.equal(info.mode & 0o777, OWNER_ONLY_DIRECTORY_MODE)
  })
})

test('stopManagedBrowserSession removes stale session state without killing arbitrary Chrome', async () => {
  await withTempAppHome(async appHome => {
    await writeManagedBrowserSessionState({
      version: MANAGED_BROWSER_SESSION_STATE_VERSION,
      sessionId: 'qa-main',
      pid: 9_999_999,
      cdpUrl: 'http://127.0.0.1:49999',
      userDataDir: join(appHome, 'browser-sessions', 'qa-main', 'chrome-profile'),
      headless: false,
      startedAt: '2026-05-01T00:00:00.000Z',
      updatedAt: '2026-05-01T00:00:00.000Z',
    })

    const result = await stopManagedBrowserSession('qa-main', {
      connect: () => {
        throw new Error('not reachable')
      },
    })

    assert.equal(result.status, 'stale-removed')
    assert.equal(await readManagedBrowserSessionState('qa-main'), undefined)
  })
})

test('stopManagedBrowserSession removes stale state when pid belongs to an unrelated process', async t => {
  if (process.platform === 'win32') {
    t.skip('process command verification uses ps on POSIX platforms')
    return
  }

  await withTempAppHome(async appHome => {
    const child = spawn(process.execPath, ['-e', 'setTimeout(() => {}, 30_000)'], {
      stdio: 'ignore',
    })
    t.after(() => {
      if (child.pid !== undefined) {
        try {
          process.kill(child.pid, 'SIGKILL')
        } catch {
          // Best-effort cleanup if the test already stopped the process.
        }
      }
    })

    const pid = child.pid
    if (pid === undefined) {
      throw new Error('Expected spawned process to expose a pid.')
    }
    await writeManagedBrowserSessionState({
      version: MANAGED_BROWSER_SESSION_STATE_VERSION,
      sessionId: 'qa-main',
      pid,
      cdpUrl: 'http://127.0.0.1:49999',
      userDataDir: join(appHome, 'browser-sessions', 'qa-main', 'chrome-profile'),
      headless: false,
      startedAt: '2026-05-01T00:00:00.000Z',
      updatedAt: '2026-05-01T00:00:00.000Z',
    })

    const result = await stopManagedBrowserSession('qa-main', {
      connect: () => {
        throw new Error('not reachable')
      },
    })

    assert.equal(result.status, 'stale-removed')
    assert.equal(isProcessAlive(pid), true)
  })
})

test('stopManagedBrowserSession does not close CDP before verifying recorded process ownership', async () => {
  await withTempAppHome(async appHome => {
    await writeManagedBrowserSessionState({
      version: MANAGED_BROWSER_SESSION_STATE_VERSION,
      sessionId: 'qa-main',
      pid: 9_999_999,
      cdpUrl: 'http://127.0.0.1:49999',
      userDataDir: join(appHome, 'browser-sessions', 'qa-main', 'chrome-profile'),
      headless: false,
      startedAt: '2026-05-01T00:00:00.000Z',
      updatedAt: '2026-05-01T00:00:00.000Z',
    })
    let connectCalls = 0

    const result = await stopManagedBrowserSession('qa-main', {
      connect: () => {
        connectCalls += 1
        throw new Error('must not connect')
      },
    })

    assert.equal(result.status, 'stale-removed')
    assert.equal(connectCalls, 0)
  })
})

test('stopRecordedManagedBrowserProcess refuses unrelated live processes', async t => {
  if (process.platform === 'win32') {
    t.skip('process command verification uses ps on POSIX platforms')
    return
  }

  const child = spawn(process.execPath, ['-e', 'setTimeout(() => {}, 30_000)'], {
    stdio: 'ignore',
  })
  t.after(() => {
    if (child.pid !== undefined) {
      try {
        process.kill(child.pid, 'SIGKILL')
      } catch {
        // Best-effort cleanup if the test already stopped the process.
      }
    }
  })

  const pid = child.pid
  if (pid === undefined) {
    throw new Error('Expected spawned process to expose a pid.')
  }

  const result = await stopRecordedManagedBrowserProcess({
    version: MANAGED_BROWSER_SESSION_STATE_VERSION,
    sessionId: 'qa-main',
    pid,
    cdpUrl: 'http://127.0.0.1:49999',
    userDataDir: '/tmp/not-this-process',
    headless: false,
    startedAt: '2026-05-01T00:00:00.000Z',
    updatedAt: '2026-05-01T00:00:00.000Z',
  })

  assert.equal(result.stopped, false)
  assert.equal(result.stale, true)
  assert.equal(isProcessAlive(pid), true)
})

test('managed browser session registry rejects unsafe session ids', async () => {
  await withTempAppHome(async () => {
    await assert.rejects(
      () => readManagedBrowserSessionState('../qa-main'),
      /Invalid browser session id/,
    )
  })
})

async function withTempAppHome<T>(handler: (appHome: string) => Promise<T>): Promise<T> {
  const previous = process.env[SITE_CDP_HOME_DIR_ENV]
  const appHome = await mkdtemp(join(tmpdir(), 'cdp-cli-session-test-'))
  process.env[SITE_CDP_HOME_DIR_ENV] = appHome
  try {
    return await handler(appHome)
  } finally {
    if (previous === undefined) {
      delete process.env[SITE_CDP_HOME_DIR_ENV]
    } else {
      process.env[SITE_CDP_HOME_DIR_ENV] = previous
    }
    await rm(appHome, { recursive: true, force: true })
  }
}

function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}
