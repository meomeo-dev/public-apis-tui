import {
  NEWTON_OPERATIONS,
  NewtonClient,
  type NewtonOperation,
} from '../../infrastructure/openApis/newtonClient.js'
import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export const NEWTON_DEFAULT_OPERATION: NewtonOperation = 'simplify'
export const NEWTON_DEFAULT_EXPRESSION = '2^2+2(2)'
export const NEWTON_MAX_EXPRESSION_LENGTH = 160

const NEWTON_EXPRESSION_PATTERN = /^[A-Za-z0-9+\-*/^().,|: _]+$/u

export type NewtonComputeInput = {
  operation?: string | undefined
  expression?: string | undefined
}

export type NewtonComputeQuery = {
  operation: NewtonOperation
  expression: string
}

export type NewtonComputeResult = {
  kind: 'newton.compute'
  api: {
    provider: 'newton'
    endpoint: 'GET /api/v2/{operation}/{expression}'
    docsUrl: 'https://github.com/aunyks/newton-api'
    apiUrl: 'https://newton.vercel.app/api/v2'
    authentication: 'none'
    usesBrowserClickstream: false
    transport: 'HTTPS JSON REST'
    engine: string
    supportedOperations: NewtonOperation[]
    expressionPolicy: string
    boundary: string
    limitPolicy: string
  }
  query: NewtonComputeQuery
  calculation: {
    operation: NewtonOperation
    expression: string
    result: string | number | Array<string | number>
    resultText: string
  }
}

export async function computeNewton(
  input: NewtonComputeInput = {},
): Promise<NewtonComputeResult> {
  const query = normalizeNewtonComputeInput(input)
  const response = await new NewtonClient().compute(query)
  const resultText = formatNewtonResult(response.result)
  if (isNewtonWarningResult(resultText)) {
    throw new RuntimeFailure(
      'OPEN_API_FAILED',
      'Newton returned a calculation warning instead of a usable result.',
      { operation: query.operation, expression: query.expression, result: resultText },
    )
  }
  return {
    kind: 'newton.compute',
    api: createApiMeta(),
    query,
    calculation: {
      operation: response.operation,
      expression: response.expression,
      result: response.result,
      resultText,
    },
  }
}

export function normalizeNewtonComputeInput(
  input: NewtonComputeInput = {},
): NewtonComputeQuery {
  return {
    operation: normalizeNewtonOperation(input.operation),
    expression: normalizeNewtonExpression(input.expression),
  }
}

export function normalizeNewtonOperation(
  value: string | undefined,
): NewtonOperation {
  const operation = (value ?? NEWTON_DEFAULT_OPERATION).trim().toLowerCase()
  if (NEWTON_OPERATIONS.includes(operation as NewtonOperation)) {
    return operation as NewtonOperation
  }
  throw new RuntimeFailure(
    'INVALID_ARGUMENT',
    `Newton --operation must be one of ${NEWTON_OPERATIONS.join(', ')}.`,
    { operation: value },
  )
}

export function normalizeNewtonExpression(value: string | undefined): string {
  const expression = (value ?? NEWTON_DEFAULT_EXPRESSION).trim()
  if (expression.length < 1 || expression.length > NEWTON_MAX_EXPRESSION_LENGTH) {
    throw new RuntimeFailure(
      'INVALID_ARGUMENT',
      [
        'Newton --expression must be between 1 and',
        `${NEWTON_MAX_EXPRESSION_LENGTH} characters.`,
      ].join(' '),
      { expression: value },
    )
  }
  if (!NEWTON_EXPRESSION_PATTERN.test(expression)) {
    throw new RuntimeFailure(
      'INVALID_ARGUMENT',
      [
        'Newton --expression supports letters, digits, spaces, arithmetic',
        'operators, parentheses, decimal points, commas, colon, and pipe only.',
      ].join(' '),
      { expression: value },
    )
  }
  return expression
}

function createApiMeta(): NewtonComputeResult['api'] {
  return {
    provider: 'newton',
    endpoint: 'GET /api/v2/{operation}/{expression}',
    docsUrl: 'https://github.com/aunyks/newton-api',
    apiUrl: 'https://newton.vercel.app/api/v2',
    authentication: 'none',
    usesBrowserClickstream: false,
    transport: 'HTTPS JSON REST',
    engine: '@metadelta/core through the documented Newton API',
    supportedOperations: [...NEWTON_OPERATIONS],
    expressionPolicy: [
      'Expressions are path parameters parsed by Newton; slashes are encoded',
      'as the documented (over) token and the CLI rejects non-math characters.',
    ].join(' '),
    boundary: [
      'Fixed documented math operations only; no arbitrary operation proxy,',
      'browser scraping, HTML parsing, code execution API, image/binary',
      'rendering, base64 payloads, upload, delete, account setup, or API keys.',
    ].join(' '),
    limitPolicy: [
      `CLI default expression ${NEWTON_DEFAULT_EXPRESSION}, maximum`,
      `${NEWTON_MAX_EXPRESSION_LENGTH} characters, with operation whitelist.`,
    ].join(' '),
  }
}

function formatNewtonResult(
  result: NewtonComputeResult['calculation']['result'],
): string {
  return Array.isArray(result) ? result.map(String).join(', ') : String(result)
}

function isNewtonWarningResult(result: string): boolean {
  return /\b(?:Stop:|error|syntax error|Unable to perform calculation)\b/iu.test(result)
}

export {
  NEWTON_OPERATIONS,
  type NewtonOperation,
} from '../../infrastructure/openApis/newtonClient.js'
