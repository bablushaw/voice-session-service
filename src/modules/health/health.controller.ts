import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  HealthCheck,
  HealthCheckService,
  HealthCheckResult,
} from '@nestjs/terminus';
import { HEALTH_BASE_URL } from './config/health.config';
import { HealthService } from './health.service';

@ApiTags('health')
@Controller(HEALTH_BASE_URL)
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private healthService: HealthService,
  ) {}

  @Get()
  @HealthCheck()
  @ApiOperation({
    summary: 'Full health check',
    description:
      'MongoDB ping, memory, disk indicators, plus basic service metadata. Used for monitoring.',
  })
  async check(): Promise<HealthCheckResult> {
    try {
      const result = await this.health.check([
        async () => this.healthService.dbHealthCheck(),
        async () => this.healthService.heapHealthCheck(),
        async () => this.healthService.rssHealthCheck(),
        async () => this.healthService.diskAbsoluteHealthCheck(),
        async () => this.healthService.diskPercentageHealthCheck(),
        async () => this.healthService.getServiceInfoIndicator(),
      ]);

      return {
        ...result,
        details: {
          ...(result.details ?? {}),
        },
      };
    } catch (error: unknown) {
      const err = error as Error;
      const errorInfo = {
        status: 'down' as const,
        message: err.message,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
      };

      return {
        status: 'error',
        error: {
          health_check: errorInfo,
        },
        details: {
          health_check: errorInfo,
        },
      };
    }
  }
}
