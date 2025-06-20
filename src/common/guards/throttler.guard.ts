import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ThrottlerException } from '@nestjs/throttler';
import { Request } from 'express';

@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly limits: Map<string, { count: number; lastReset: number }> =
    new Map();
  private readonly ttl = 60000; // Time window in milliseconds (1 minute)
  private readonly limit = 10; // Maximum requests per time window

  constructor(private reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const ip = request.ip || '0.0.0.0';
    const key = `${ip}-${request.path}`;

    const now = Date.now();
    const record = this.limits.get(key) || { count: 0, lastReset: now };

    // Reset the counter if the time window has passed
    if (now - record.lastReset > this.ttl) {
      record.count = 0;
      record.lastReset = now;
    }

    // Increment request count
    record.count++;
    this.limits.set(key, record);

    // Check if the request exceeds the limit
    if (record.count > this.limit) {
      throw new ThrottlerException('Too many requests');
    }

    return true;
  }
}
