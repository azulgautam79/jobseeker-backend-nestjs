import { Throttle } from '@nestjs/throttler';

/**
 *! Strict rate for auth, payments  [5 requests per minute]
 */
export const StrictThrottler = () =>
  Throttle({
    default: {
      ttl: 60_000, // 1 minute
      limit: 5,
    },
  });

/**
 *! Moderate rate for orders  [30 requests per minute]
 */
export const ModerateThrottler = () =>
  Throttle({
    default: {
      ttl: 60_000, // 1 minute
      limit: 30,
    },
  });

/**
 *! Relaxed rate for read operations in products, categories etc. [300 requests per minute]
 */
export const RelaxedThrottler = () =>
  Throttle({
    default: {
      ttl: 60_000, // 1 minute
      limit: 300,
    },
  });
