import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('tracing')
@Controller('tracing')
export class TracingController {
  @Get()
  @ApiOperation({ summary: 'Get tracing information' })
  getTracingInfo() {
    return {
      service: 'Jaeger',
      description: 'Distributed tracing system',
      uiUrl: 'http://localhost:16686',
      status: 'active',
      endpoints: {
        jaegerUI: 'http://localhost:16686',
        jaegerCollector: 'http://localhost:14268',
        jaegerAgent: 'http://localhost:6831 (UDP)',
        zipkin: 'http://localhost:9411',
      },
    };
  }
}
