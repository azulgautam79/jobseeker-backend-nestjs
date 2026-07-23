export default () => ({
  DATABASE_URL: process.env.DATABASE_URL,

  JWT_SECRET: 'test-secret-key',

  JWT_EXPIRES_IN: 3600,

  ACCESS_TOKEN_TIME: '1h',

  REFRESH_TOKEN_TIME: '7d',

  OTP_EXPIRY_TIME: 10,

  SMTP_HOST: 'localhost',

  SMTP_PORT: 587,

  SMTP_USER: 'test',

  SMTP_PASS: 'test',
});
