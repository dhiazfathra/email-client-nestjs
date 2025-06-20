import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { SpanStatusCode, trace } from '@opentelemetry/api';
import { NextFunction, Request, Response } from 'express';

@Injectable()
export class TracingMiddleware implements NestMiddleware {
  private readonly logger = new Logger(TracingMiddleware.name);
  private tracer = trace.getTracer('nestjs-http');

  use(req: Request, res: Response, next: NextFunction) {
    const { method, originalUrl, ip, headers } = req;

    const span = this.tracer.startSpan(`HTTP ${method} ${originalUrl}`);

    // Add attributes to the span
    span.setAttributes({
      'http.method': method,
      'http.url': originalUrl,
      'http.client_ip': ip,
      'http.user_agent': headers['user-agent'] || '',
      'http.request_id': headers['x-request-id'] || '',
    });

    // Store the span in the context
    const originalResEnd = res.end;

    // Override the res.end method to capture response data
    res.end = function (...args: unknown[]) {
      span.setAttributes({
        'http.status_code': res.statusCode,
      });

      if (res.statusCode >= 400) {
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: `HTTP Error ${res.statusCode}`,
        });
      }

      span.end();
      return originalResEnd.apply(res, args);
    };

    next();
  }
}
