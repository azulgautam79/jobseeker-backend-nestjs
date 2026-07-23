import { Injectable } from '@nestjs/common';
import { RedisService } from '../../modules/redis/redis.service';
import { HealthIndicatorService } from '@nestjs/terminus';

@Injectable()
export class RedisHealthIndicator {
  constructor(
    private readonly redisService: RedisService,
    private readonly healthIndicatorService: HealthIndicatorService,
  ) {}

  async isHealthy(key: string) {
    const indicator = this.healthIndicatorService.check(key);

    try {
      await this.redisService.ping();

      return indicator.up();
    } catch (error) {
      return indicator.down({
        message: 'Redis unavailable',
      });
    }
  }
}
