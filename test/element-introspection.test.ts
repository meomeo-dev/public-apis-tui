import assert from 'node:assert/strict'
import test from 'node:test'
import { snapshotElements } from '../src/infrastructure/ui/elementIntrospection.js'

test('snapshotElements identifies visible semantic buttons and textboxes', async () => {
  const page = createEvaluatePage(`
    <button aria-label="Send message"><svg><title>Send</title></svg></button>
    <textarea placeholder="Message"></textarea>
    <button aria-label="Hidden" style="display:none"></button>
  `)

  const snapshot = await snapshotElements(page, { visibleOnly: true })

  assert.equal(snapshot.candidates.some(candidate => candidate.label?.includes('Send message')), true)
  assert.equal(snapshot.candidates.some(candidate => candidate.kind === 'textbox' && candidate.label === 'Message'), true)
  assert.equal(snapshot.candidates.some(candidate => candidate.label === 'Hidden'), false)
})

test('snapshotElements can filter candidates by kind and label', async () => {
  const page = createEvaluatePage(`
    <button aria-label="Search"></button>
    <button aria-label="Send"></button>
  `)

  const snapshot = await snapshotElements(page, { kinds: ['button'], labels: ['send'] })

  assert.equal(snapshot.candidates.length, 1)
  assert.equal(snapshot.candidates[0]?.label, 'Send')
})

function createEvaluatePage(body: string): never {
  return {
    evaluate: async (fn: (query: unknown) => unknown, query: unknown) => {
      const { JSDOM } = await import('jsdom')
      const dom = new JSDOM(`<!doctype html><body>${body}</body>`)
      const previousWindow = globalThis.window
      const previousDocument = globalThis.document
      const previousHTMLElement = globalThis.HTMLElement
      const previousHTMLInputElement = globalThis.HTMLInputElement
      const previousHTMLTextAreaElement = globalThis.HTMLTextAreaElement
      const previousHTMLButtonElement = globalThis.HTMLButtonElement
      const previousCSS = globalThis.CSS
      const previousGetBoundingClientRect = dom.window.HTMLElement.prototype.getBoundingClientRect
      try {
        dom.window.HTMLElement.prototype.getBoundingClientRect = function getBoundingClientRect() {
          return {
            x: 0,
            y: 0,
            width: 100,
            height: 24,
            top: 0,
            right: 100,
            bottom: 24,
            left: 0,
            toJSON: () => ({}),
          }
        }
        Object.assign(globalThis, {
          window: dom.window,
          document: dom.window.document,
          HTMLElement: dom.window.HTMLElement,
          HTMLInputElement: dom.window.HTMLInputElement,
          HTMLTextAreaElement: dom.window.HTMLTextAreaElement,
          HTMLButtonElement: dom.window.HTMLButtonElement,
          CSS: dom.window.CSS,
        })
        return fn(query)
      } finally {
        dom.window.HTMLElement.prototype.getBoundingClientRect = previousGetBoundingClientRect
        Object.assign(globalThis, {
          window: previousWindow,
          document: previousDocument,
          HTMLElement: previousHTMLElement,
          HTMLInputElement: previousHTMLInputElement,
          HTMLTextAreaElement: previousHTMLTextAreaElement,
          HTMLButtonElement: previousHTMLButtonElement,
          CSS: previousCSS,
        })
      }
    },
  } as never
}
