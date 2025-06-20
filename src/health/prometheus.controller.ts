import { Controller, Get, Res } from '@nestjs/common';
import { ApiExcludeEndpoint } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';
import { Response } from 'express';
import { register } from 'prom-client';

@Controller()
export class PrometheusController {
  @Get('metrics')
  @Public()
  @ApiExcludeEndpoint()
  async getMetrics(@Res() response: Response) {
    response.setHeader('Content-Type', register.contentType);
    response.send(await register.metrics());
  }
}
