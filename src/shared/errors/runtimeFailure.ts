export type RuntimeFailureCode =
  | 'INVALID_ARGUMENT'
  | 'BROWSER_CONNECT_FAILED'
  | 'CHROME_SESSION_FAILED'
  | 'SITE_SETTLE_TIMEOUT'
  | 'SITE_ACTION_FAILED'
  | 'OPEN_API_FAILED'
  | 'AUTH_PROFILE_FAILED'
  | 'AUTH_PROFILE_NOT_READY'
  | 'RPC_INVALID_REQUEST'
  | 'RPC_METHOD_NOT_FOUND'

export class RuntimeFailure extends Error {
  readonly code: RuntimeFailureCode
  readonly details: Record<string, unknown>

  constructor(code: RuntimeFailureCode, message: string, details: Record<string, unknown> = {}) {
    super(message)
    this.name = 'RuntimeFailure'
    this.code = code
    this.details = details
  }
}

export function serializeError(error: unknown): Record<string, unknown> {
  if (error instanceof RuntimeFailure) {
    return {
      name: error.name,
      code: error.code,
      message: error.message,
      details: error.details,
    }
  }

  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
    }
  }

  return {
    name: 'UnknownError',
    message: String(error),
  }
}
