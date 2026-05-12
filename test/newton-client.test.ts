import assert from 'node:assert/strict'
import test from 'node:test'
import {
  computeNewton,
  normalizeNewtonComputeInput,
  normalizeNewtonExpression,
  normalizeNewtonOperation,
} from '../src/application/usecases/newton.js'
import { NewtonClient } from '../src/infrastructure/openApis/newtonClient.js'

test('Newton client calls documented v2 compute endpoint', async () => {
  let requestedUrl: URL | undefined
  const client = new NewtonClient(
    'https://newton.vercel.app',
    (async input => {
      requestedUrl = new URL(String(input))
      return jsonResponse({
        operation: 'simplify',
        expression: '2/4',
        result: '1/2',
      })
    }) as typeof fetch,
  )

  const response = await client.compute({
    operation: 'simplify',
    expression: '2/4',
  })

  assert.equal(requestedUrl?.origin, 'https://newton.vercel.app')
  assert.equal(requestedUrl?.pathname, '/api/v2/simplify/2(over)4')
  assert.equal(response.operation, 'simplify')
  assert.equal(response.expression, '2/4')
  assert.equal(response.result, '1/2')
})

test('Newton client accepts array results from zeroes operation', async () => {
  const client = new NewtonClient(
    'https://newton.vercel.app',
    (async () => jsonResponse({
      operation: 'zeroes',
      expression: 'x^2+2x',
      result: [-2, 0],
    })) as typeof fetch,
  )

  const response = await client.compute({
    operation: 'zeroes',
    expression: 'x^2+2x',
  })

  assert.deepEqual(response.result, [-2, 0])
})

test('Newton usecase projects no-auth bounded calculation metadata', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async () => jsonResponse({
    operation: 'derive',
    expression: 'x^2',
    result: '2 x',
  })) as typeof fetch

  try {
    const result = await computeNewton({
      operation: 'derive',
      expression: 'x^2',
    })

    assert.equal(result.kind, 'newton.compute')
    assert.equal(result.api.provider, 'newton')
    assert.equal(result.api.authentication, 'none')
    assert.equal(result.api.usesBrowserClickstream, false)
    assert.equal(result.query.operation, 'derive')
    assert.equal(result.calculation.resultText, '2 x')
    assert.match(result.api.boundary, /Fixed documented math operations/u)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('Newton normalizers enforce operation and expression guardrails', () => {
  assert.deepEqual(normalizeNewtonComputeInput({}), {
    operation: 'simplify',
    expression: '2^2+2(2)',
  })
  assert.equal(normalizeNewtonOperation('DERIVE'), 'derive')
  assert.equal(normalizeNewtonExpression('x^2 + 2x'), 'x^2 + 2x')
  assert.throws(
    () => normalizeNewtonOperation('evaluate'),
    /operation must be one of simplify/u,
  )
  assert.throws(
    () => normalizeNewtonExpression(''),
    /expression must be between 1 and 160 characters/u,
  )
  assert.throws(
    () => normalizeNewtonExpression('x; process.exit()'),
    /supports letters, digits, spaces/u,
  )
})

test('Newton client rejects upstream errors and malformed result shapes', async () => {
  const failingClient = new NewtonClient(
    'https://newton.vercel.app',
    (async () => jsonResponse({ error: 'Unknown operation' }, 400)) as typeof fetch,
  )
  await assert.rejects(
    () => failingClient.compute({ operation: 'simplify', expression: '2+2' }),
    /Unknown operation/u,
  )

  const malformedClient = new NewtonClient(
    'https://newton.vercel.app',
    (async () => jsonResponse({
      operation: 'simplify',
      expression: '2+2',
      result: { value: 4 },
    })) as typeof fetch,
  )
  await assert.rejects(
    () => malformedClient.compute({ operation: 'simplify', expression: '2+2' }),
    /supported result value/u,
  )
})

test('Newton client rejects Cloudflare challenge HTML clearly', async () => {
  const client = new NewtonClient(
    'https://newton.vercel.app',
    (async () => {
      return new Response('<!DOCTYPE html><title>Just a moment...</title>', {
        status: 429,
        statusText: 'Too Many Requests',
        headers: {
          'cf-mitigated': 'challenge',
          'content-type': 'text/html; charset=UTF-8',
          server: 'cloudflare',
        },
      })
    }) as typeof fetch,
  )

  await assert.rejects(
    () => client.compute({ operation: 'simplify', expression: '2+2' }),
    /Cloudflare challenge HTML/u,
  )
})

test('Newton usecase rejects warning-as-data calculation results', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async () => jsonResponse({
    operation: 'simplify',
    expression: 'x+',
    result: 'x+ ? \nStop: syntax error',
  })) as typeof fetch

  try {
    await assert.rejects(
      () => computeNewton({ operation: 'simplify', expression: 'x+' }),
      /calculation warning/u,
    )
  } finally {
    globalThis.fetch = originalFetch
  }
})

function jsonResponse(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}
