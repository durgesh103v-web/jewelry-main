export class AppError extends Error {
  constructor(
    message: string,
    public readonly code: string = 'INTERNAL_ERROR',
    public readonly statusCode: number = 500
  ) {
    super(message)
    this.name = this.constructor.name
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 'VALIDATION_ERROR', 400)
  }
}

export class NotFoundError extends AppError {
  constructor(message: string) {
    super(message, 'NOT_FOUND', 404)
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 'CONFLICT', 409)
  }
}

export class DatabaseError extends AppError {
  constructor(message = 'A database error occurred.') {
    super(message, 'DATABASE_ERROR', 500)
  }
}
