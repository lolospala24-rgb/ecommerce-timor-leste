import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // Handle known HTTP exceptions
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      
      let message: string;
      let errors: string[] | undefined;

      // Extract message and validation errors
      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object') {
        message = (exceptionResponse as any).message || exception.message;
        // Handle validation errors (array of messages)
        if (Array.isArray((exceptionResponse as any).message)) {
          errors = (exceptionResponse as any).message;
          message = 'Validation failed';
        }
      } else {
        message = exception.message;
      }

      // Log warning for client errors, error for server errors
      if (status >= 500) {
        this.logger.error(
          `${request.method} ${request.url} - ${status}: ${message}`,
          exception.stack,
        );
      } else {
        this.logger.warn(
          `${request.method} ${request.url} - ${status}: ${message}`,
        );
      }

      response.status(status).json({
        success: false,
        statusCode: status,
        timestamp: new Date().toISOString(),
        path: request.url,
        method: request.method,
        message,
        ...(errors && { errors }),
      });
    } 
    // Handle unknown/unexpected errors
    else {
      this.logger.error(
        `Unhandled exception: ${request.method} ${request.url}`,
        exception instanceof Error ? exception.stack : String(exception),
      );

      response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        timestamp: new Date().toISOString(),
        path: request.url,
        method: request.method,
        message: 'Internal server error',
        ...(process.env.NODE_ENV === 'development' && {
          error: exception instanceof Error ? exception.message : String(exception),
        }),
      });
    }
  }
}