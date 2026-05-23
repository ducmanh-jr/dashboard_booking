import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Response } from 'express';

interface PrismaErrorResponse {
  statusCode: number;
  message: string;
  data: null;
}

@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaClientExceptionFilter implements ExceptionFilter<Prisma.PrismaClientKnownRequestError> {
  catch(
    exception: Prisma.PrismaClientKnownRequestError,
    host: ArgumentsHost,
  ): void {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const { statusCode, message } = this.mapException(exception);

    response.status(statusCode).json({
      statusCode,
      message,
      data: null,
    } satisfies PrismaErrorResponse);
  }

  private mapException(
    exception: Prisma.PrismaClientKnownRequestError,
  ): Omit<PrismaErrorResponse, 'data'> {
    switch (exception.code) {
      case 'P2002':
        return {
          statusCode: HttpStatus.CONFLICT,
          message: 'Unique constraint failed',
        };
      case 'P2025':
        return {
          statusCode: HttpStatus.NOT_FOUND,
          message: 'Resource not found',
        };
      case 'P2003':
        return {
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'Foreign key constraint failed',
        };
      default:
        return {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Prisma client error',
        };
    }
  }
}
