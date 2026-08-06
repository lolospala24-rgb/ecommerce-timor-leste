import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Request, Response } from 'express';

@Catch(
  Prisma.PrismaClientKnownRequestError,
  Prisma.PrismaClientUnknownRequestError,
  Prisma.PrismaClientRustPanicError,
  Prisma.PrismaClientInitializationError,
  Prisma.PrismaClientValidationError,
)
export class PrismaExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(PrismaExceptionFilter.name);

  catch(
    exception:
      | Prisma.PrismaClientKnownRequestError
      | Prisma.PrismaClientUnknownRequestError
      | Prisma.PrismaClientRustPanicError
      | Prisma.PrismaClientInitializationError
      | Prisma.PrismaClientValidationError,
    host: ArgumentsHost,
  ) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.BAD_REQUEST;
    let message = 'Database error occurred';
    let errorCode = 'DATABASE_ERROR';

    // Handle Prisma Known Request Errors
    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      errorCode = exception.code;
      
      switch (exception.code) {
        case 'P2000':
          message = 'Value too long for column';
          status = HttpStatus.BAD_REQUEST;
          break;
        case 'P2001':
          message = 'Record does not exist';
          status = HttpStatus.NOT_FOUND;
          break;
        case 'P2002':
          const fields = (exception.meta?.target as string[]) || [];
          message = `Duplicate field value: ${fields.join(', ')} already exists`;
          status = HttpStatus.CONFLICT;
          break;
        case 'P2003':
          message = 'Foreign key constraint failed - referenced record not found';
          status = HttpStatus.BAD_REQUEST;
          break;
        case 'P2004':
          message = 'Constraint failed on the database';
          status = HttpStatus.BAD_REQUEST;
          break;
        case 'P2005':
          message = 'Invalid value for field';
          status = HttpStatus.BAD_REQUEST;
          break;
        case 'P2006':
          message = 'Invalid value for field type';
          status = HttpStatus.BAD_REQUEST;
          break;
        case 'P2007':
          message = 'Data validation error';
          status = HttpStatus.BAD_REQUEST;
          break;
        case 'P2008':
          message = 'Query parsing failed';
          status = HttpStatus.INTERNAL_SERVER_ERROR;
          break;
        case 'P2009':
          message = 'Query validation failed';
          status = HttpStatus.BAD_REQUEST;
          break;
        case 'P2010':
          message = 'Raw query failed';
          status = HttpStatus.INTERNAL_SERVER_ERROR;
          break;
        case 'P2011':
          message = 'Null constraint violation';
          status = HttpStatus.BAD_REQUEST;
          break;
        case 'P2012':
          message = 'Missing required field';
          status = HttpStatus.BAD_REQUEST;
          break;
        case 'P2013':
          message = 'Missing required argument';
          status = HttpStatus.BAD_REQUEST;
          break;
        case 'P2014':
          message = 'Invalid ID or relation';
          status = HttpStatus.BAD_REQUEST;
          break;
        case 'P2015':
          message = 'Related record not found';
          status = HttpStatus.NOT_FOUND;
          break;
        case 'P2016':
          message = 'Query error - invalid data';
          status = HttpStatus.BAD_REQUEST;
          break;
        case 'P2017':
          message = 'Relation not connected';
          status = HttpStatus.BAD_REQUEST;
          break;
        case 'P2018':
          message = 'Required connected record not found';
          status = HttpStatus.NOT_FOUND;
          break;
        case 'P2019':
          message = 'Input error - value conversion failed';
          status = HttpStatus.BAD_REQUEST;
          break;
        case 'P2020':
          message = 'Value out of range';
          status = HttpStatus.BAD_REQUEST;
          break;
        case 'P2021':
          message = 'Table does not exist';
          status = HttpStatus.INTERNAL_SERVER_ERROR;
          break;
        case 'P2022':
          message = 'Column does not exist';
          status = HttpStatus.INTERNAL_SERVER_ERROR;
          break;
        case 'P2023':
          message = 'Inconsistent column data';
          status = HttpStatus.BAD_REQUEST;
          break;
        case 'P2024':
          message = 'Database connection timeout';
          status = HttpStatus.SERVICE_UNAVAILABLE;
          break;
        case 'P2025':
          message = 'Record not found';
          status = HttpStatus.NOT_FOUND;
          break;
        case 'P2026':
          message = 'Database connection error';
          status = HttpStatus.SERVICE_UNAVAILABLE;
          break;
        case 'P2027':
          message = 'Database connection limit exceeded';
          status = HttpStatus.SERVICE_UNAVAILABLE;
          break;
        case 'P2028':
          message = 'Database transaction error';
          status = HttpStatus.INTERNAL_SERVER_ERROR;
          break;
        default:
          message = exception.message;
          status = HttpStatus.INTERNAL_SERVER_ERROR;
      }

      this.logger.error(
        `Prisma Error ${exception.code}: ${message}`,
        exception.stack,
      );
    }
    // Handle Prisma Validation Errors
    else if (exception instanceof Prisma.PrismaClientValidationError) {
      message = 'Invalid data provided to database';
      status = HttpStatus.BAD_REQUEST;
      this.logger.error(`Prisma Validation Error: ${exception.message}`);
    }
    // Handle Prisma Initialization Errors
    else if (exception instanceof Prisma.PrismaClientInitializationError) {
      message = 'Failed to initialize database connection';
      status = HttpStatus.SERVICE_UNAVAILABLE;
      this.logger.error(`Prisma Initialization Error: ${exception.message}`);
    }
    // Handle Rust Panic Errors
    else if (exception instanceof Prisma.PrismaClientRustPanicError) {
      message = 'Database internal error';
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      this.logger.error(`Prisma Rust Panic: ${exception.message}`);
    }
    // Handle Unknown Prisma Errors
    else {
      message = 'Unknown database error occurred';
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      this.logger.error(`Unknown Prisma Error: ${exception.message}`);
    }

    response.status(status).json({
      success: false,
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message,
      code: errorCode,
    });
  }
}