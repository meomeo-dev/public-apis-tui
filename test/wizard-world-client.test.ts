import assert from 'node:assert/strict'
import test from 'node:test'
import {
  listWizardWorldCatalog,
  normalizeWizardWorldCatalogInput,
} from '../src/application/usecases/wizardWorld.js'
import {
  normalizeWizardWorldDifficulty,
  normalizeWizardWorldResource,
  normalizeWizardWorldSpellType,
  WizardWorldClient,
} from '../src/infrastructure/openApis/wizardWorldClient.js'

test('Wizard World client calls documented spells endpoint with filters', async () => {
  let requestedUrl: URL | undefined
  const client = new WizardWorldClient('https://wizard-world-api.herokuapp.com', (
    async input => {
      requestedUrl = new URL(String(input))
      return jsonResponse([
        {
          id: '90e5b314-fa78-4b02-9bbc-ca37736b7f9f',
          name: 'Patronus Charm',
          incantation: 'Expecto Patronum',
          effect: 'Conjures a spirit guardian',
          canBeVerbal: true,
          type: 'Charm',
          light: 'Silver',
          creator: null,
        },
      ])
    }
  ) as typeof fetch)

  const response = await client.listResource('spells', {
    name: 'Patronus',
    spellType: 'Charm',
  })

  assert.equal(
    requestedUrl?.href,
    'https://wizard-world-api.herokuapp.com/Spells?Name=Patronus&Type=Charm',
  )
  assert.deepEqual(response, [
    {
      id: '90e5b314-fa78-4b02-9bbc-ca37736b7f9f',
      resource: 'spells',
      name: 'Patronus Charm',
      incantation: 'Expecto Patronum',
      effect: 'Conjures a spirit guardian',
      canBeVerbal: true,
      type: 'Charm',
      light: 'Silver',
    },
  ])
})

test('Wizard World usecase projects no-auth metadata and local search', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async () => jsonResponse([
    {
      id: 'f552960d-dfe6-43f5-8239-63c35d6101ab',
      name: 'Felix Felicis',
      effect: 'Makes the drinker lucky',
      difficulty: 'Advanced',
      ingredients: [{ id: 'ingredient-1', name: 'Ashwinder egg' }],
      inventors: [{ id: 'inventor-1', firstName: 'Zygmunt', lastName: 'Budge' }],
    },
    {
      id: 'aecb6b11-d1b8-4b3d-9be1-c572932426c9',
      name: 'Love potion',
      effect: 'Infatuation',
      difficulty: 'Advanced',
    },
  ])) as typeof fetch

  try {
    const result = await listWizardWorldCatalog({
      resource: 'elixirs',
      difficulty: 'advanced',
      search: 'ashwinder',
      limit: 5,
    })

    assert.equal(result.kind, 'wizardworld.catalog')
    assert.equal(result.api.provider, 'wizardworld')
    assert.equal(result.api.authentication, 'none')
    assert.equal(result.api.usesBrowserClickstream, false)
    assert.equal(result.query.resource, 'elixirs')
    assert.equal(result.query.difficulty, 'Advanced')
    assert.equal(result.pagination.total, 2)
    assert.equal(result.pagination.matched, 1)
    assert.equal(result.items[0]?.name, 'Felix Felicis')
    assert.equal(result.items[0]?.ingredients?.[0]?.name, 'Ashwinder egg')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('Wizard World normalizers enforce resources, enums, and bounds', () => {
  assert.equal(normalizeWizardWorldResource('magical-creature'), 'creatures')
  assert.equal(normalizeWizardWorldDifficulty('advanced'), 'Advanced')
  assert.equal(normalizeWizardWorldSpellType('healingspell'), 'HealingSpell')
  assert.deepEqual(normalizeWizardWorldCatalogInput({}), {
    resource: 'spells',
    limit: 10,
    offset: 0,
  })
  assert.deepEqual(normalizeWizardWorldCatalogInput({
    resource: 'spells',
    name: 'Patronus',
    spellType: 'Charm',
    limit: 3,
    offset: 1,
  }), {
    resource: 'spells',
    name: 'Patronus',
    spellType: 'Charm',
    limit: 3,
    offset: 1,
  })
  assert.throws(() => normalizeWizardWorldResource('feedback'), /must be one of/)
  assert.throws(() => normalizeWizardWorldSpellType('Invalid'), /spell-type/)
  assert.throws(
    () => normalizeWizardWorldCatalogInput({ limit: 51 }),
    /between 1 and 50/,
  )
  assert.throws(() => normalizeWizardWorldCatalogInput({
    resource: 'houses',
    name: 'Gryffindor',
  }), /does not support name/)
})

test('Wizard World client surfaces challenge HTML clearly', async () => {
  const client = new WizardWorldClient(
    'https://wizard-world-api.example',
    (async () => new Response(
      '<!DOCTYPE html><title>Just a moment...</title>',
      {
        status: 403,
        headers: {
          'content-type': 'text/html; charset=UTF-8',
          server: 'cloudflare',
          'cf-mitigated': 'challenge',
        },
      },
    )) as typeof fetch,
  )

  await assert.rejects(
    () => client.listResource('spells', { name: 'Patronus' }),
    /challenge HTML page/u,
  )
})

function jsonResponse(value: unknown): Response {
  return new Response(JSON.stringify(value), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })
}
