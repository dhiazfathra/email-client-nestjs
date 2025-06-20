import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { MetricsService } from './metrics.service';

@Injectable()
export class MetricsMiddleware implements NestMiddleware {
  constructor(private readonly metricsService: MetricsService) {}

  use(req: Request, res: Response, next: NextFunction) {
    const start = Date.now();
    const { method, path } = req;

    // Increment in-progress counter
    this.metricsService.incrementHttpRequestsInProgress(method, path);

    // Add response listener to record metrics when the request completes
    res.on('finish', () => {
      const duration = (Date.now() - start) / 1000; // Convert to seconds
      const statusCode = res.statusCode;

      // Record metrics
      this.metricsService.observeHttpRequestDuration(
        method,
        path,
        statusCode,
        duration,
      );
      this.metricsService.incrementHttpRequestCounter(method, path, statusCode);
      this.metricsService.decrementHttpRequestsInProgress(method, path);
    });

    next();
  }
}
