import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Response<T> {
  success: boolean;
  message?: string;
  data: T;
  meta?: any;
  timestamp: string;
}

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, Response<T>> {
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<Response<T>> {
    return next.handle().pipe(
      map((data) => {
        // Se a resposta já estiver no formato padronizado, retorna como está
        if (this.isDataFormatoPadrao(data)) {
          return data;
        }

        // Se for null ou undefined, dados vira null (padronizar)
        if (data === null || data === undefined) {
          data = null;
        }

        // Padroniza a resposta
        return {
          success: true,
          data,
          timestamp: new Date().toISOString(),
        };
      }),
    );
  }

  private isDataFormatoPadrao(data: any): data is Response<T> {
    return (
      data &&
      typeof data === 'object' &&
      'success' in data &&
      'timestamp' in data
    );
  }
}
