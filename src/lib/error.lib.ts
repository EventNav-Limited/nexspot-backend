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

// ─── Base App Exception ───────────────────────────────────────────────────────

export class AppException extends HttpException {
  constructor(
    message: string,
    httpStatus: HttpStatus = HttpStatus.BAD_REQUEST,
    public readonly details?: { field: string; message: string }[],
  ) {
    super({ message, details }, httpStatus);
  }
}

// ─── Concrete Domain Exceptions ───────────────────────────────────────────────

export class NotFoundException extends AppException {
  constructor(
    resource: string,
    details?: { field: string; message: string }[],
  ) {
    super(`${resource} not found`, HttpStatus.NOT_FOUND, details);
  }
}

export class UnauthorizedException extends AppException {
  constructor(
    message = 'Unauthorized',
    details?: { field: string; message: string }[],
  ) {
    super(message, HttpStatus.UNAUTHORIZED, details);
  }
}

export class ForbiddenException extends AppException {
  constructor(
    message = 'Forbidden',
    details?: { field: string; message: string }[],
  ) {
    super(message, HttpStatus.FORBIDDEN, details);
  }
}

export class ConflictException extends AppException {
  constructor(message: string, details?: { field: string; message: string }[]) {
    super(message, HttpStatus.CONFLICT, details);
  }
}

export class ValidationException extends AppException {
  constructor(details: { field: string; message: string }[]) {
    super('Validation failed', HttpStatus.UNPROCESSABLE_ENTITY, details);
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

    // 1. Our own AppException
    if (exception instanceof AppException) {
      const status = exception.getStatus();
      const body = exception.getResponse() as {
        message: string;
        details?: { field: string; message: string }[];
      };

      response
        .status(status)
        .json(errorResponse(status, body.message, body.details));
      return;
    }

    // 2. NestJS built-in HttpException (class-validator via ValidationPipe)
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();

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
          .json(errorResponse(status, 'Validation failed', details));
        return;
      }

      const message =
        typeof body === 'string'
          ? body
          : ((body as { message?: string }).message ?? 'An error occurred');

      response.status(status).json(errorResponse(status, message));
      return;
    }

    // 3. Unhandled / unexpected errors
    this.logger.error(
      `Unhandled exception on [${request.method}] ${request.url}`,
      exception instanceof Error ? exception.stack : String(exception),
    );

    response
      .status(HttpStatus.INTERNAL_SERVER_ERROR)
      .json(
        errorResponse(
          HttpStatus.INTERNAL_SERVER_ERROR,
          'An unexpected error occurred',
        ),
      );
  }
}
