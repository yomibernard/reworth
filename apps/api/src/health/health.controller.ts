import { Controller, Get, Header } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { HealthService } from './health.service';

@Controller()
@SkipThrottle()
export class HealthController {
  constructor(private readonly health: HealthService) {}

  @Get('healthz')
  healthz() {
    return this.health.liveness();
  }

  @Get('readyz')
  async readyz() {
    return this.health.readiness();
  }

  @Get('metrics')
  @Header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
  metrics(): string {
    return this.health.metrics();
  }
}
