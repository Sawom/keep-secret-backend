import { CallHandler, ExecutionContext, HttpException, Injectable, NestInterceptor } from '@nestjs/common';
import { Request, Response } from 'express';
import { Observable, tap } from 'rxjs';
import { MetricsService } from './metrics.service.js';

@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(private readonly metricsService: MetricsService) {}

  // BACKEND: measure elapsed time and HTTP status; never capture query strings or request payloads.
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();
    const startedAt = Date.now();
    let recorded = false;

    const recordOnce = (statusOverride?: number) => {
      if (recorded) return;
      recorded = true;
      const routePath = (request as Request & { route?: { path?: string } }).route?.path;
      const path = `${request.baseUrl ?? ''}${routePath ?? request.path}`.split('?')[0].slice(0, 160);
      this.metricsService.record({
        timestamp: Date.now(),
        method: (request.method || 'UNKNOWN').toUpperCase(),
        path,
        statusCode: statusOverride ?? response.statusCode ?? 500,
        durationMs: Date.now() - startedAt,
      });
    };

    return next.handle().pipe(tap({
      next: () => recordOnce(),
      error: (error: unknown) => recordOnce(error instanceof HttpException ? error.getStatus() : 500),
    }));
  }
}
