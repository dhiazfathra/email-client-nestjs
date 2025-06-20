import { Injectable, OnModuleInit } from '@nestjs/common';
import {
  collectDefaultMetrics,
  Counter,
  Gauge,
  Histogram,
  Registry,
} from 'prom-client';

@Injectable()
export class MetricsService implements OnModuleInit {
  private readonly registry: Registry;
  private readonly httpRequestsCounter: Counter;
  private readonly httpRequestDuration: Histogram;
  private readonly httpRequestsInProgress: Gauge;

  constructor() {
    this.registry = new Registry();

    // Add default Node.js metrics
    collectDefaultMetrics({ register: this.registry });

    // HTTP request counter
    this.httpRequestsCounter = new Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status_code'],
      registers: [this.registry],
    });

    // HTTP request duration
    this.httpRequestDuration = new Histogram({
      name: 'http_request_duration_seconds',
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
      registers: [this.registry],
    });

    // HTTP requests in progress
    this.httpRequestsInProgress = new Gauge({
      name: 'http_requests_in_progress',
      help: 'Number of HTTP requests currently in progress',
      labelNames: ['method', 'route'],
      registers: [this.registry],
    });
  }

  onModuleInit() {
    // Register the metrics with the global registry
    register.setDefaultLabels({
      app: 'email-client-nestjs',
    });
  }

  incrementHttpRequestCounter(
    method: string,
    route: string,
    statusCode: number,
  ) {
    this.httpRequestsCounter.inc({ method, route, status_code: statusCode });
  }

  observeHttpRequestDuration(
    method: string,
    route: string,
    statusCode: number,
    duration: number,
  ) {
    this.httpRequestDuration.observe(
      { method, route, status_code: statusCode },
      duration,
    );
  }

  incrementHttpRequestsInProgress(method: string, route: string) {
    this.httpRequestsInProgress.inc({ method, route });
  }

  decrementHttpRequestsInProgress(method: string, route: string) {
    this.httpRequestsInProgress.dec({ method, route });
  }
}

// Export the global registry
export const register = new Registry();
