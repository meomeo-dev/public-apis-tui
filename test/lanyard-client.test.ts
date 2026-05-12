import assert from 'node:assert/strict'
import test from 'node:test'
import { getLanyardPresence } from '../src/application/usecases/lanyard.js'
import { LanyardClient, normalizeLanyardPresenceInput } from '../src/infrastructure/openApis/lanyardClient.js'

test('Lanyard client reads no-auth REST presence snapshots', async () => {
  let requestedUrl = ''
  const client = new LanyardClient({
    fetchImpl: async input => {
      requestedUrl = String(input)
      return jsonResponse(createFixture())
    },
  })
  const presence = await client.presence({ userId: '94490510688792576' })
  assert.equal(requestedUrl, 'https://api.lanyard.rest/v1/users/94490510688792576')
  assert.equal(presence.discordUser.username, 'phin')
  assert.equal(presence.discordStatus, 'dnd')
  assert.equal(presence.activeOn.desktop, true)
  assert.equal(presence.kv?.location, 'Tokyo')
})

test('Lanyard usecase projects no-auth REST metadata', async () => {
  const previousFetch = globalThis.fetch
  globalThis.fetch = (async () => jsonResponse(createFixture())) as typeof fetch
  try {
    const result = await getLanyardPresence({ userId: '94490510688792576' })
    assert.equal(result.kind, 'lanyard.presence')
    assert.equal(result.api.authentication, 'none')
    assert.equal(result.api.usesBrowserClickstream, false)
    assert.equal(result.query.userId, '94490510688792576')
  } finally {
    globalThis.fetch = previousFetch
  }
})

test('Lanyard normalizer validates Discord snowflakes', () => {
  assert.deepEqual(normalizeLanyardPresenceInput({ userId: ' 94490510688792576 ' }), { userId: '94490510688792576' })
  assert.throws(() => normalizeLanyardPresenceInput({ userId: 'phin' }), /--user-id/)
})

function createFixture() {
  return {
    success: true,
    data: {
      kv: { location: 'Tokyo' },
      discord_user: { id: '94490510688792576', username: 'phin', display_name: 'Phineas', global_name: 'Phineas', bot: false },
      activities: [{ id: 'activity-1', name: 'Visual Studio Code', type: 0, state: 'Editing TypeScript', details: 'public-apis-tui', created_at: 1777898400 }],
      discord_status: 'dnd',
      active_on_discord_web: false,
      active_on_discord_desktop: true,
      active_on_discord_mobile: false,
      active_on_discord_embedded: false,
      active_on_discord_vr: false,
      listening_to_spotify: false,
      spotify: null,
    },
  }
}

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } })
}
