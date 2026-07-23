import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import * as path from 'path';

import { LoggerService } from '../logger/logger.service';
import { AppException } from '../exceptions/app.exceptions';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: LoggerService) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();

    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    if (
      exception instanceof HttpException &&
      request.originalUrl === '/api/health'
    ) {
      response.status(exception.getStatus()).json(exception.getResponse());

      return;
    }

    const isDevelopment = process.env.NODE_ENV !== 'production';

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Something went wrong on our side.';
    let status: 'fail' | 'error' = 'error';
    let isOperational = false;

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();

      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (
        typeof exceptionResponse === 'object' &&
        exceptionResponse !== null
      ) {
        message = (exceptionResponse as any).message ?? exception.message;
      } else {
        message = exception.message;
      }

      status =
        exception instanceof AppException
          ? exception.errorStatus
          : statusCode >= 500
            ? 'error'
            : 'fail';

      isOperational = true;
    }

    const logContext = {
      method: request.method,
      url: request.originalUrl,
      statusCode,
      operational: isOperational,
      ip: request.ip,
    };

    if (statusCode >= 500) {
      this.logger.error(message, exception, logContext);
    } else {
      this.logger.warn(message, logContext);
    }

    if (isDevelopment) {
      response.status(statusCode).json({
        success: false,
        status,
        message,
        stack: exception instanceof Error ? exception.stack : undefined,
      });

      return;
    }

    if (isOperational) {
      response.status(statusCode).json({
        success: false,
        status,
        message,
      });

      return;
    }

    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      status: 'error',
      message: 'Something went wrong on our side.',
    });
  }
}
