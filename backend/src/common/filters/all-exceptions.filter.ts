import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Request, Response } from 'express';

interface ErrorResponse {
  statusCode: number;
  message: string | string[];
  error: string;
  path: string;
  timestamp: string;
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter<unknown> {
  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getRequest<Request>();

    const httpException = this.toHttpException(exception);
    const statusCode = httpException.getStatus();
    const exceptionResponse = httpException.getResponse();

    response.status(statusCode).json({
      statusCode,
      message: this.getMessage(exceptionResponse, exception),
      error: this.getError(exceptionResponse, statusCode),
      path: request.url,
      timestamp: new Date().toISOString(),
    } satisfies ErrorResponse);
  }

  private toHttpException(exception: unknown): HttpException {
    if (exception instanceof HttpException) {
      return exception;
    }

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      if (exception.code === 'P2002') {
        return new HttpException(
          {
            statusCode: HttpStatus.CONFLICT,
            message: 'Unique constraint failed',
            error: 'Conflict',
          },
          HttpStatus.CONFLICT,
        );
      }

      if (exception.code === 'P2025') {
        return new HttpException(
          {
            statusCode: HttpStatus.NOT_FOUND,
            message: 'Resource not found',
            error: 'Not Found',
          },
          HttpStatus.NOT_FOUND,
        );
      }
    }

    return new HttpException(
      exception instanceof Error ? exception.message : 'Internal server error',
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }

  private getMessage(
    exceptionResponse: string | object | undefined,
    exception: unknown,
  ): string | string[] {
    if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
      const message = (exceptionResponse as { message?: string | string[] })
        .message;

      if (message) {
        return message;
      }
    }

    if (typeof exceptionResponse === 'string') {
      return exceptionResponse;
    }

    if (exception instanceof Error) {
      return exception.message;
    }

    return 'Internal server error';
  }

  private getError(
    exceptionResponse: string | object | undefined,
    statusCode: number,
  ): string {
    if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
      const error = (exceptionResponse as { error?: string }).error;

      if (error) {
        return error;
      }
    }

    return HttpStatus[statusCode] ?? 'Error';
  }
}
