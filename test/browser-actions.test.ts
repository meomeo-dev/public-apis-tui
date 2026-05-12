import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const source = readFileSync('src/infrastructure/ui/elementActions.ts', 'utf8')

test('element actions read interaction pacing from the page profile', () => {
  assert.match(source, /getPageInteractionProfile/)
  assert.match(source, /function resolveInteraction/)
})

test('element actions can scroll and hover before pointer actions', () => {
  assert.match(source, /scrollIntoView\(\{ block: 'center', inline: 'center' \}\)/)
  assert.match(source, /page\.hover\(selector\)/)
})

test('element actions support click, type, and key press delays', () => {
  assert.match(source, /page\.click\(\s*target\.selector,\s*toClickOptions\(/)
  assert.match(source, /page\.keyboard\.type\(text, toTypeOptions\(interaction\.typeDelayMs\)\)/)
  assert.match(source, /page\.keyboard\.press\(key, toTypeOptions\(interaction\.pressDelayMs\)\)/)
})
