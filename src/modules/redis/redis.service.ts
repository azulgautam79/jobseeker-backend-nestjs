// src/modules/redis/redis.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from '@upstash/redis';

@Injectable()
export class RedisService {
  private readonly logger = new Logger(RedisService.name);

  private readonly redis: Redis;

  private readonly prefix = 'jobseeker';

  constructor(private readonly configService: ConfigService) {
    this.redis = new Redis({
      url: this.configService.getOrThrow<string>('UPSTASH_REDIS_REST_URL'),
      token: this.configService.getOrThrow<string>('UPSTASH_REDIS_REST_TOKEN'),
    });
  }

  //? Build Key
  private buildKey(key: string): string {
    return `${this.prefix}:${key}`;
  }

  async ping(): Promise<string> {
    return this.redis.ping();
  }

  //! Get
  async get<T>(key: string): Promise<T | null> {
    return this.redis.get<T>(this.buildKey(key));
  }

  //! Set
  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    const cacheKey = this.buildKey(key);

    if (ttl !== undefined) {
      await this.redis.set(cacheKey, value, {
        ex: ttl,
      });

      this.logger.debug(`[CACHE SET] ${cacheKey} (${ttl}s)`);

      return;
    }

    await this.redis.set(cacheKey, value);

    this.logger.debug(`[CACHE SET] ${cacheKey}`);
  }

  //! Delete
  async del(key: string): Promise<void> {
    await this.redis.del(this.buildKey(key));
  }

  //! Delete Many
  async deleteMany(keys: string[]): Promise<void> {
    await Promise.all(keys.map((key) => this.del(key)));
  }

  //! Exists
  async exists(key: string): Promise<boolean> {
    const result = await this.redis.exists(this.buildKey(key));
    return result === 1;
  }

  //! TTL = Time to Live
  async ttl(key: string): Promise<number> {
    return this.redis.ttl(this.buildKey(key));
  }

  //! Add Get or Set (Cache-Aside Pattern)
  async remember<T>(
    key: string,
    callback: () => Promise<T>,
    ttl = 300,
  ): Promise<T> {
    try {
      const cached = await this.get<T>(key);

      if (cached !== null) {
        this.logger.debug(`[CACHE HIT] ${key}`);
        return cached;
      }
    } catch (error) {
      this.logger.warn(`[CACHE ERROR] Failed reading ${key}`);
    }

    const data = await callback();

    try {
      await this.set(key, data, ttl);
    } catch (error) {
      this.logger.warn(`[CACHE ERROR] Failed writing ${key}`);
    }

    return data;
  }
}
