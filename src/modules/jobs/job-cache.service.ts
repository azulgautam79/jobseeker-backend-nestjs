import { Injectable } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';
import { CacheKeys } from '../../common/cache/cache.keys';

@Injectable()
export class JobCacheService {
  constructor(private readonly redisService: RedisService) {}

  /**
   * Invalidate all caches affected by a job mutation.
   */
  async invalidateAfterMutation(
    jobId: string,
    employerId: string,
  ): Promise<void> {
    await this.redisService.deleteMany([
      CacheKeys.jobs(),
      CacheKeys.job(jobId),
      CacheKeys.employerJobs(employerId),
    ]);
  }

  /**
   * Invalidate the cached job list only.
   */
  async invalidateJobList(): Promise<void> {
    await this.redisService.del(CacheKeys.jobs());
  }

  /**
   * Invalidate one cached job.
   */
  async invalidateJobDetails(jobId: string): Promise<void> {
    await this.redisService.del(CacheKeys.job(jobId));
  }

  /**
   * Invalidate an employer dashboard cache.
   */
  async invalidateEmployerJobs(employerId: string): Promise<void> {
    await this.redisService.del(CacheKeys.employerJobs(employerId));
  }

  /**
   * Invalidate recommendations for a user.
   */
  async invalidateRecommendations(userId: string): Promise<void> {
    await this.redisService.del(CacheKeys.recommendations(userId));
  }
}
