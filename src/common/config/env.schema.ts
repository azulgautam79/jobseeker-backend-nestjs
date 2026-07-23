import * as Joi from 'joi';

export const envSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test', 'provision')
    .required(),

  PORT: Joi.number().default(7000),

  // MongoDB
  DATABASE_URL: Joi.string().required(),

  // Redis

  JWT_SECRET: Joi.string().min(10).required(),
  JWT_EXPIRES_IN: Joi.number().required(),

  ACCESS_TOKEN_TIME: Joi.string().required(),
  REFRESH_TOKEN_TIME: Joi.string().required(),

  OTP_EXPIRY_TIME: Joi.number().required(),

  SMTP_HOST: Joi.string().required(),
  SMTP_PORT: Joi.number().default(587),
  SMTP_USER: Joi.string().required(),
  SMTP_PASS: Joi.string().required(),
});
