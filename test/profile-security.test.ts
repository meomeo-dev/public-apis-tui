import assert from 'node:assert/strict'
import { mkdtemp, rm, stat } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import test from 'node:test'
import { ensureOwnerOnlyDirectory, OWNER_ONLY_DIRECTORY_MODE } from '../src/shared/runtime/profileSecurity.js'

test('ensureOwnerOnlyDirectory creates profile directories with owner-only permissions', async t => {
  if (process.platform === 'win32') {
    t.skip('POSIX mode hardening is not available on Windows')
    return
  }

  const root = await mkdtemp(join(tmpdir(), 'cdp-cli-template-profile-security-'))
  t.after(async () => {
    await rm(root, { recursive: true, force: true })
  })

  const profileDir = join(root, 'profile')
  const result = await ensureOwnerOnlyDirectory(profileDir)
  const info = await stat(profileDir)

  assert.equal(result.supported, true)
  assert.equal(info.mode & 0o777, OWNER_ONLY_DIRECTORY_MODE)
})
