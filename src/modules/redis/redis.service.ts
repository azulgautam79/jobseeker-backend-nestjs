// src/modules/redis/redis.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from '@upstash/redis';
import { TraceService } from '../../common/telemetry/tracing/trace.service';
import { ContextLogger } from '../../common/logger/context-logger';
import { LoggerFactory } from '../../common/logger/logger.factory';

@Injectable()
export class RedisService {
  private readonly logger: ContextLogger

  private readonly redis: Redis;

  private readonly prefix = 'jobseeker';

  constructor(
    private readonly configService: ConfigService,
    private readonly traceService: TraceService,
    loggerFactory: LoggerFactory
  ) {
    this.redis = new Redis({
      url: this.configService.getOrThrow<string>('UPSTASH_REDIS_REST_URL'),
      token: this.configService.getOrThrow<string>('UPSTASH_REDIS_REST_TOKEN'),
    });
    this.logger = loggerFactory.create(RedisService.name);
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
    return this.traceService.withSpan(
      'redis.get',
      {
        'cache.key': key,
        'cache.system': 'redis',
        'db.system': 'redis',
        'db.operation': 'GET',
      },
      async () => {
        try {
          const value = await this.redis.get<T>(this.buildKey(key));

          this.traceService.setCurrentAttribute(
            'cache.hit',
            value !== null,
          );

          this.logger.debug(
            value ? `[CACHE HIT] ${key}` : `[CACHE MISS] ${key}`,
          );

          return value;
        } catch (error) {
          this.traceService.setCurrentError(error);
          throw error;
        }
      },
    );
  }

  //! Set
  async set<T>(
    key: string,
    value: T,
    ttl?: number,
  ): Promise<void> {
    await this.traceService.withSpan(
      'redis.set',
      {
        'cache.key': key,
        'cache.system': 'redis',
        'db.system': 'redis',
        'db.operation': 'SET',
      },
      async () => {
        try {
          const cacheKey = this.buildKey(key);

          if (ttl !== undefined) {
            await this.redis.set(cacheKey, value, {
              ex: ttl,
            });

            this.traceService.setCurrentAttribute(
              'cache.ttl',
              ttl,
            );
          } else {
            await this.redis.set(cacheKey, value);
          }

          this.logger.debug(`[CACHE SET] ${key}`);
        } catch (error) {
          this.traceService.setCurrentError(error);
          throw error;
        }
      },
    );
  }

  //! Delete
  async del(key: string): Promise<void> {
    await this.traceService.withSpan(
      'redis.del',
      {
        'cache.key': key,
        'cache.system': 'redis',
        'db.system': 'redis',
        'db.operation': 'DEL',
      },
      async () => {
        try {
          await this.redis.del(this.buildKey(key));

          this.logger.debug(`[CACHE DELETE] ${key}`);
        } catch (error) {
          this.traceService.setCurrentError(error);
          throw error;
        }
      },
    );
  }

  //! Delete Many
  async deleteMany(keys: string[]): Promise<void> {
    await Promise.all(keys.map((key) => this.del(key)));
  }

  //! Exists
  async exists(key: string): Promise<boolean> {
    return this.traceService.withSpan(
      'redis.exists',
      {
        'cache.key': key,
        'cache.system': 'redis',
        'db.system': 'redis',
        'db.operation': 'EXISTS',
      },
      async () => {
        try {
          const result = await this.redis.exists(this.buildKey(key));

          return result === 1;
        } catch (error) {
          this.traceService.setCurrentError(error);
          throw error;
        }
      },
    );
  }

  //! TTL = Time to Live
  async ttl(key: string): Promise<number> {
    return this.traceService.withSpan(
      'redis.ttl',
      {
        'cache.key': key,
        'cache.system': 'redis',
        'db.system': 'redis',
        'db.operation': 'TTL',
      },
      async () => {
        try {
          return await this.redis.ttl(this.buildKey(key));
        } catch (error) {
          this.traceService.setCurrentError(error);
          throw error;
        }
      },
    );
  }

  //! Add Get or Set (Cache-Aside Pattern)
  async remember<T>(
    key: string,
    callback: () => Promise<T>,
    ttl = 300,
  ): Promise<T> {
    return this.traceService.withSpan(
      'cache.remember',
      {
        'cache.key': key,
        'cache.ttl': ttl,
      },
      async () => {
        try {
          const cached = await this.get<T>(key);

          if (cached !== null) {
            this.traceService.addCurrentEvent('cache.hit');

            this.logger.debug(`[CACHE HIT] ${key}`);

            return cached;
          }

          this.traceService.addCurrentEvent('cache.miss');

          this.logger.debug(`[CACHE MISS] ${key}`);
        } catch (error) {
          this.traceService.addCurrentEvent('cache.read.error');

          this.logger.warn(
            `[CACHE ERROR] Failed reading ${key}`,
          );
        }

        this.traceService.addCurrentEvent(
          'database.query.started',
        );

        const data = await callback();

        this.traceService.addCurrentEvent(
          'database.query.completed',
        );

        try {
          await this.set(key, data, ttl);

          this.traceService.addCurrentEvent(
            'cache.write.success',
          );
        } catch (error) {
          this.traceService.addCurrentEvent(
            'cache.write.error',
          );

          this.logger.warn(
            `[CACHE ERROR] Failed writing ${key}`,
          );
        }

        return data;
      },
    );
  }
}
