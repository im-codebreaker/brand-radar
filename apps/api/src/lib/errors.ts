/**
 * Domain Error Classes
 *
 * Custom error classes for business logic errors.
 * Extend DomainError to create new error types with specific HTTP status codes.
 */

export class DomainError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
  ) {
    super(message)
    this.name = this.constructor.name
    Error.captureStackTrace(this, this.constructor)
  }
}

/**
 * 404 Not Found - Resource doesn't exist
 */
export class NotFoundError extends DomainError {
  constructor(message: string = 'Resource not found') {
    super(message, 404)
  }
}

/**
 * 409 Conflict - Resource already exists or constraint violation
 */
export class ConflictError extends DomainError {
  constructor(message: string = 'Resource conflict') {
    super(message, 409)
  }
}

/**
 * 400 Bad Request - Invalid business logic
 */
export class ValidationError extends DomainError {
  constructor(message: string = 'Validation failed') {
    super(message, 400)
  }
}

/**
 * 403 Forbidden - Not authorized to perform action
 */
export class ForbiddenError extends DomainError {
  constructor(message: string = 'Forbidden') {
    super(message, 403)
  }
}

/**
 * 401 Unauthorized - Authentication required
 */
export class UnauthorizedError extends DomainError {
  constructor(message: string = 'Unauthorized') {
    super(message, 401)
  }
}
