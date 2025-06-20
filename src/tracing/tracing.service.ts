import {
  Injectable,
  Logger,
  OnApplicationShutdown,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { JaegerExporter } from '@opentelemetry/exporter-jaeger';
import { NodeSDK } from '@opentelemetry/sdk-node';

import { diag, DiagConsoleLogger, DiagLogLevel } from '@opentelemetry/api';

@Injectable()
export class TracingService implements OnModuleInit, OnApplicationShutdown {
  private readonly logger = new Logger(TracingService.name);
  private sdk: NodeSDK;

  constructor(private configService: ConfigService) {
    // Enable OpenTelemetry debug logging
    diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.INFO);

    // Configure Jaeger exporter
    const jaegerHost = this.configService.get<string>(
      'JAEGER_HOST',
      'localhost',
    );

    // Ensure port is properly parsed as a number
    let jaegerPort: number = 6831; // Default port
    const configPort = this.configService.get<string | number>('JAEGER_PORT');

    if (configPort) {
      // Handle potential string value from environment
      if (typeof configPort === 'string') {
        // Remove any protocol or host information if present
        const portStr = configPort.includes(':')
          ? configPort.split(':').pop()
          : configPort;
        jaegerPort = parseInt(portStr, 10);
      } else {
        jaegerPort = configPort;
      }
    }

    this.logger.log(
      `Configuring Jaeger exporter with host: ${jaegerHost} and port: ${jaegerPort}`,
    );

    const exporter = new JaegerExporter({
      host: jaegerHost,
      port: jaegerPort,
    });

    // Create SDK with auto-instrumentation
    this.sdk = new NodeSDK({
      traceExporter: exporter,
      instrumentations: [getNodeAutoInstrumentations()],
      serviceName: 'email-client-nestjs',
    });
  }

  async onModuleInit() {
    try {
      await this.sdk.start();
      this.logger.log('Jaeger tracing initialized');
      this.logger.log('Jaeger UI available at http://localhost:16686');
    } catch (error) {
      this.logger.error('Error initializing Jaeger tracing', error);
    }
  }

  async onApplicationShutdown() {
    try {
      await this.sdk.shutdown();
      this.logger.log('Jaeger tracing shut down');
    } catch (error) {
      this.logger.error('Error shutting down Jaeger tracing', error);
    }
  }
}
