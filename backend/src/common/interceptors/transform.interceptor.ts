import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Request, Response } from 'express';
import { Observable, map } from 'rxjs';

interface ApiResponse<TData> {
  statusCode: number;
  message: string;
  data: TData;
}

function serializeValue(value: unknown, seen = new WeakSet<object>()): unknown {
  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value === 'bigint') {
    return value.toString();
  }

  if (value instanceof Prisma.Decimal) {
    return value.toNumber();
  }

  if (value instanceof Date) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => serializeValue(item, seen));
  }

  if (typeof value === 'object') {
    if (seen.has(value)) {
      return value;
    }

    seen.add(value);

    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, item]) => [
        key,
        serializeValue(item, seen),
      ]),
    );
  }

  return value;
}

function isApiResponse(data: unknown): data is ApiResponse<unknown> {
  if (!data || typeof data !== 'object') {
    return false;
  }

  const candidate = data as Partial<ApiResponse<unknown>>;

  return (
    typeof candidate.statusCode === 'number' &&
    typeof candidate.message === 'string' &&
    'data' in candidate
  );
}

@Injectable()
export class TransformInterceptor<TData> implements NestInterceptor<
  TData,
  ApiResponse<unknown>
> {
  intercept(
    context: ExecutionContext,
    next: CallHandler<TData>,
  ): Observable<ApiResponse<unknown>> {
    const http = context.switchToHttp();
    const response = http.getResponse<Response>();
    const request = http.getRequest<Request>();

    return next.handle().pipe(
      map((data: TData) => {
        if (request.path.startsWith('/api/')) {
          return serializeValue(data) as ApiResponse<unknown>;
        }

        if (isApiResponse(data)) {
          return {
            ...data,
            data: serializeValue(data.data),
          };
        }

        return {
          statusCode: response.statusCode,
          message: this.getDefaultMessage(request.method),
          data: serializeValue(data),
        };
      }),
    );
  }

  private getDefaultMessage(method: string): string {
    switch (method) {
      case 'POST':
        return 'Created successfully';
      case 'PUT':
      case 'PATCH':
        return 'Updated successfully';
      case 'DELETE':
        return 'Deleted successfully';
      default:
        return 'Success';
    }
  }
}
