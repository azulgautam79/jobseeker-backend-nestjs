import * as Joi from 'joi';

export const envSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test', 'provision')
    .required(),

  PORT: Joi.number().default(7000),
  RECOMMENDATION_THRESHOLD: Joi.number().min(0).max(1).default(0.4),

  // MongoDB
  DATABASE_URL: Joi.string().required(),

  // Redis
  UPSTASH_REDIS_REST_URL: Joi.string().required(),
  UPSTASH_REDIS_REST_TOKEN: Joi.string().required(),

  JWT_SECRET: Joi.string().min(10).required(),
  JWT_EXPIRES_IN: Joi.number().required(),

  ACCESS_TOKEN_TIME: Joi.string().required(),
  REFRESH_TOKEN_TIME: Joi.string().required(),
  REFRESH_TOKEN_REMEMBER_TIME: Joi.string().required(),

  OTP_EXPIRY_TIME: Joi.string().required(),

  SMTP_HOST: Joi.string().required(),
  SMTP_PORT: Joi.number().default(587),
  SMTP_USER: Joi.string().required(),
  SMTP_PASS: Joi.string().required(),
});
