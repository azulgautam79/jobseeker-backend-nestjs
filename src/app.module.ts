import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { LoggerMiddleware } from './common/middlewares/morgan_logger/logger.middleware';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { ApplicationsModule } from './modules/applications/applications.module';
import { JobsModule } from './modules/jobs/jobs.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { MongooseModule } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { SavedJobsModule } from './modules/savedJobs/savedJobs.module';
import { envSchema } from './common/config/env.schema';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { CustomThrottlerGuard } from './common/guards/custom-throttler.guard';
import { PrometheusModule } from './common/prometheus/prometheus.module';
import { TestModule } from './modules/test/test.module';
import { ProductsModule } from './modules/products/products.module';
import { RedisModule } from './modules/redis/redis.module';
import { LoggerModule } from 'nestjs-pino';
import { ClsModule, ClsServiceManager } from 'nestjs-cls';
import { RequestContextMiddleware } from './common/middlewares/request-context.middleware';
import { getTraceContext } from './common/telemetry/trace-context';
import { CLS_KEYS } from './common/cls/cls.constants';
import { AppLoggerModule } from './common/logger/logger.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { HealthModule } from './common/health/health.module';
import { randomUUID } from 'crypto';
import { context, trace } from '@opentelemetry/api';
@Module({
  imports: [
    //! Config Module
    ConfigModule.forRoot({
      isGlobal: true,

      envFilePath: process.env.ENV_FILE ?? '.env.development.local',

      validationSchema: envSchema,
      validationOptions: {
        abortEarly: true,
      },
    }),

    //! DB Connection
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        return {
          // uri: config.getOrThrow<string>('DATABASE_URL'),
          uri:
            process.env.DATABASE_URL ??
            config.getOrThrow<string>('DATABASE_URL'),

          connectionFactory: (connection: Connection) => {
            connection.on('connected', () =>
              console.log('✅ MongoDB connected'),
            );
            connection.on('disconnected', () =>
              console.log('❌ MongoDB disconnected'),
            );
            return connection;
          },
        };
      },
    }),

    //! Rate Limiting
    ThrottlerModule.forRoot([
      {
        ttl: 60_000, // 1 minute
        limit: 100, // global fallback
        skipIf: () => process.env.NODE_ENV === 'test',
      },
    ]),

    //! Redis
    RedisModule,

    //! Health
    HealthModule,

    //! Other packages
    AuthModule,
    UsersModule,
    ApplicationsModule,
    JobsModule,
    AnalyticsModule,
    SavedJobsModule,

    //! Prometheus Metrics
    PrometheusModule,

    TestModule,

    ProductsModule,

    ClsModule.forRoot({
      global: true,
      middleware: {
        mount: true,
        setup: (cls, req) => {
          cls.set(CLS_KEYS.REQUEST_ID, req.id ?? randomUUID());

          cls.set(CLS_KEYS.IP, req.ip);
          cls.set(CLS_KEYS.USER_AGENT, req.headers['user-agent']);

          const span = trace.getSpan(context.active());

          if (span) {
            const spanContext = span.spanContext();

            cls.set(CLS_KEYS.TRACE_ID, spanContext.traceId);
            cls.set(CLS_KEYS.SPAN_ID, spanContext.spanId);
          }
        },
      },
    }),

    //! Pino Logging (Transport, Format, Req log, Redaction, Req ID generation etc)
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',

        autoLogging: true,

        genReqId(req) {
          return req.headers['x-request-id']?.toString() ?? crypto.randomUUID();
        },

        redact: [
          'req.headers.authorization',
          'req.headers.cookie',
          'req.body.password',
          'req.body.confirmPassword',
          'req.body.refreshToken',
          'req.body.token',
        ],

        customProps(req) {
          const cls = ClsServiceManager.getClsService();

          return {
            requestId: cls.get(CLS_KEYS.REQUEST_ID),
            role: cls.get(CLS_KEYS.ROLE),
            userId: cls.get(CLS_KEYS.USER_ID),

            trace_id: cls.get(CLS_KEYS.TRACE_ID),
            span_id: cls.get(CLS_KEYS.SPAN_ID),

            ip: cls.get(CLS_KEYS.IP),
            userAgent: cls.get(CLS_KEYS.USER_AGENT),
          };
        },

        transport:
          process.env.NODE_ENV === 'production'
            ? undefined
            : {
                target: 'pino-pretty',
                options: {
                  colorize: true,
                  translateTime: 'SYS:standard',
                  singleLine: true,
                  ignore: 'pid,hostname',
                },
              },
      },
    }),

    //! Application Logging (Services, Controllers and Filters etc)
    AppLoggerModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: CustomThrottlerGuard,
    },
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
  ],
})
export class AppModule implements NestModule {
  //! Logger Middleware
  configure(consumer: MiddlewareConsumer) {
    // consumer.apply(LoggerMiddleware).forRoutes('*');
    // consumer.apply(RequestContextMiddleware).forRoutes('*');
  }
}
