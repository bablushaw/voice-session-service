import {
  DiskHealthIndicator,
  MemoryHealthIndicator,
  MongooseHealthIndicator,
  HealthIndicatorResult,
} from '@nestjs/terminus';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getDefaultDiskHealthPath, HEALTH_INDICATORS } from './config/health.config';

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(
    private memory: MemoryHealthIndicator,
    private mongoDb: MongooseHealthIndicator,
    private disk: DiskHealthIndicator,
    private configService: ConfigService,
  ) {}

  /** Disk checks need a valid OS path (`C:\` on Windows, `/` on Unix). */
  private getDiskCheckPath(): string {
    const configured = this.configService.get<string>('HEALTH_DISK_PATH');
    if (configured?.trim()) {
      return configured.trim();
    }
    return getDefaultDiskHealthPath();
  }

  async dbHealthCheck(): Promise<HealthIndicatorResult> {
    try {
      return (await this.mongoDb.pingCheck(
        HEALTH_INDICATORS.connectivity.database.name,
        { timeout: HEALTH_INDICATORS.connectivity.database.timeout },
      )) as HealthIndicatorResult;
    } catch (error) {
      this.logger.error('MongoDB health check failed:', error);
      throw error;
    }
  }

  async heapHealthCheck(): Promise<HealthIndicatorResult> {
    try {
      return (await this.memory.checkHeap(
        HEALTH_INDICATORS.memory.heap.name,
        HEALTH_INDICATORS.memory.heap.threshold,
      )) as HealthIndicatorResult;
    } catch (error) {
      this.logger.error('Heap memory health check failed:', error);
      throw error;
    }
  }

  async rssHealthCheck(): Promise<HealthIndicatorResult> {
    try {
      return (await this.memory.checkRSS(
        HEALTH_INDICATORS.memory.rss.name,
        HEALTH_INDICATORS.memory.rss.threshold,
      )) as HealthIndicatorResult;
    } catch (error) {
      this.logger.error('RSS memory health check failed:', error);
      throw error;
    }
  }

  async diskAbsoluteHealthCheck(): Promise<HealthIndicatorResult> {
    try {
      return (await this.disk.checkStorage(HEALTH_INDICATORS.memory.diskAbsolute.name, {
        threshold: HEALTH_INDICATORS.memory.diskAbsolute.threshold,
        path: this.getDiskCheckPath(),
      })) as HealthIndicatorResult;
    } catch (error) {
      this.logger.error('Disk absolute health check failed:', error);
      throw error;
    }
  }

  async diskPercentageHealthCheck(): Promise<HealthIndicatorResult> {
    try {
      return (await this.disk.checkStorage(
        HEALTH_INDICATORS.memory.diskPercentage.name,
        {
          thresholdPercent: HEALTH_INDICATORS.memory.diskPercentage.threshold,
          path: this.getDiskCheckPath(),
        },
      )) as HealthIndicatorResult;
    } catch (error) {
      this.logger.error('Disk percentage health check failed:', error);
      throw error;
    }
  }

  /** Extra metadata; not a standard Terminus indicator — merge under a named key with status. */
  getServiceInfoIndicator(): HealthIndicatorResult {
    const meta = this.getServiceInfo();
    return {
      voice_session_service: {
        status: 'up',
        ...meta,
      },
    } as HealthIndicatorResult;
  }

  getServiceInfo(): Record<string, unknown> {
    return {
      service: 'voice-session-service',
      version: process.env.npm_package_version || '1.0.0',
      environment: this.configService.get<string>('NODE_ENV', 'development'),
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  }
}
