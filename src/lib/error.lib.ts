// src/lib/error.lib.ts

import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { errorResponse } from './response.lib.js';

// ─── Error Code Map ───────────────────────────────────────────────────────────

export const ERROR_CODES = {
  // 400
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  // 401
  UNAUTHORIZED: 'UNAUTHORIZED',
  // 403
  FORBIDDEN: 'FORBIDDEN',
  FORBIDDEN_ROLE: 'FORBIDDEN_ROLE',
  // 404
  NOT_FOUND: 'NOT_FOUND',
  // 409
  CONFLICT: 'CONFLICT',
  // 422
  UNPROCESSABLE: 'UNPROCESSABLE',
  // 429
  RATE_LIMITED: 'RATE_LIMITED',
  // 500
  SERVER_ERROR: 'SERVER_ERROR',
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

// ─── Base App Exception ───────────────────────────────────────────────────────

export class AppException extends HttpException {
  constructor(
    public readonly errorCode: ErrorCode,
    message: string,
    httpStatus: HttpStatus = HttpStatus.BAD_REQUEST,
    public readonly details?: { field: string; message: string }[],
  ) {
    super({ errorCode, message, details }, httpStatus);
  }
}

// ─── Concrete Exceptions ──────────────────────────────────────────────────────

export class ValidationException extends AppException {
  constructor(details: { field: string; message: string }[]) {
    super(
      ERROR_CODES.VALIDATION_ERROR,
      'Validation failed',
      HttpStatus.BAD_REQUEST,
      details,
    );
  }
}

export class UnauthorizedException extends AppException {
  constructor(message = 'Unauthorized') {
    super(ERROR_CODES.UNAUTHORIZED, message, HttpStatus.UNAUTHORIZED);
  }
}

export class ForbiddenException extends AppException {
  constructor(message = 'Forbidden') {
    super(ERROR_CODES.FORBIDDEN, message, HttpStatus.FORBIDDEN);
  }
}

export class ForbiddenRoleException extends AppException {
  constructor(message = 'Action requires a specific account role') {
    super(ERROR_CODES.FORBIDDEN_ROLE, message, HttpStatus.FORBIDDEN);
  }
}

export class NotFoundException extends AppException {
  constructor(resource: string) {
    super(ERROR_CODES.NOT_FOUND, `${resource} not found`, HttpStatus.NOT_FOUND);
  }
}

export class ConflictException extends AppException {
  constructor(message: string) {
    super(ERROR_CODES.CONFLICT, message, HttpStatus.CONFLICT);
  }
}

export class UnprocessableException extends AppException {
  constructor(message: string, details?: { field: string; message: string }[]) {
    super(
      ERROR_CODES.UNPROCESSABLE,
      message,
      HttpStatus.UNPROCESSABLE_ENTITY,
      details,
    );
  }
}

export class RateLimitedException extends AppException {
  constructor(message = 'Too many requests') {
    super(ERROR_CODES.RATE_LIMITED, message, HttpStatus.TOO_MANY_REQUESTS);
  }
}

export class InternalException extends AppException {
  constructor(message = 'An unexpected error occurred') {
    super(ERROR_CODES.SERVER_ERROR, message, HttpStatus.INTERNAL_SERVER_ERROR);
  }
}

// ─── Global Exception Filter ──────────────────────────────────────────────────

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // 1. Our own AppException — already has errorCode + message shaped correctly
    if (exception instanceof AppException) {
      const status = exception.getStatus();
      const body = exception.getResponse() as {
        errorCode: ErrorCode;
        message: string;
        details?: { field: string; message: string }[];
      };

      response
        .status(status)
        .json(
          errorResponse(status, body.errorCode, body.message, body.details),
        );
      return;
    }

    // 2. NestJS built-in HttpException (e.g. ValidationPipe without custom factory)
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();

      // class-validator errors come as { message: string[] }
      if (
        exception instanceof BadRequestException &&
        typeof body === 'object'
      ) {
        const raw = body as { message: string | string[] };
        const messages = Array.isArray(raw.message)
          ? raw.message
          : [raw.message];
        const details = messages.map((msg) => {
          const [field, ...rest] = msg.split(' ');
          return { field, message: rest.join(' ') };
        });

        response
          .status(status)
          .json(
            errorResponse(
              status,
              ERROR_CODES.VALIDATION_ERROR,
              'Validation failed',
              details,
            ),
          );
        return;
      }

      const errorCode = httpStatusToErrorCode(status);
      const message =
        typeof body === 'string'
          ? body
          : ((body as { message?: string }).message ?? 'An error occurred');

      response.status(status).json(errorResponse(status, errorCode, message));
      return;
    }

    // 3. Completely unhandled — log it and return 500
    this.logger.error(
      `Unhandled exception on [${request.method}] ${request.url}`,
      exception instanceof Error ? exception.stack : String(exception),
    );

    response
      .status(HttpStatus.INTERNAL_SERVER_ERROR)
      .json(
        errorResponse(
          HttpStatus.INTERNAL_SERVER_ERROR,
          ERROR_CODES.SERVER_ERROR,
          'An unexpected error occurred',
        ),
      );
  }
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function httpStatusToErrorCode(status: number): ErrorCode {
  const map: Partial<Record<number, ErrorCode>> = {
    [HttpStatus.BAD_REQUEST]: ERROR_CODES.VALIDATION_ERROR,
    [HttpStatus.UNAUTHORIZED]: ERROR_CODES.UNAUTHORIZED,
    [HttpStatus.FORBIDDEN]: ERROR_CODES.FORBIDDEN,
    [HttpStatus.NOT_FOUND]: ERROR_CODES.NOT_FOUND,
    [HttpStatus.CONFLICT]: ERROR_CODES.CONFLICT,
    [HttpStatus.UNPROCESSABLE_ENTITY]: ERROR_CODES.UNPROCESSABLE,
    [HttpStatus.TOO_MANY_REQUESTS]: ERROR_CODES.RATE_LIMITED,
    [HttpStatus.INTERNAL_SERVER_ERROR]: ERROR_CODES.SERVER_ERROR,
  };
  return map[status] ?? ERROR_CODES.SERVER_ERROR;
}
