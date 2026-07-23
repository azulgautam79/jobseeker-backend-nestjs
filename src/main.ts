import './telemetry/instrumentation';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import {
  INestApplication,
  Type,
  ValidationPipe,
  VersioningType,
  RequestMethod,
} from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import cookieParser from 'cookie-parser';
import { MetricsInterceptor } from './common/interceptors/metrics.interceptor';
import { PrometheusLoggerMiddleware } from './common/middlewares/prometheus_logger/prometheus_logger.middleware';
import { PrometheusService } from './common/prometheus/prometheus.service';
import {
  DebuggedProvider,
  DebuggedTree,
  SpelunkerModule,
} from 'nestjs-spelunker';
import * as fs from 'fs';
import * as os from 'os';
import { Logger } from 'nestjs-pino';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  });

  app.useLogger(app.get(Logger));

  // Enable graceful shutdown
  app.enableShutdownHooks();

  app.use(cookieParser());

  app.useStaticAssets(join(__dirname, '..', 'uploads'), {
    prefix: '/uploads',
  });

  //! Backend Versioning
  app.setGlobalPrefix('api', {
    exclude: [
      { path: '', method: RequestMethod.GET }, // GET /
      'api/docs',
      'api/health',
      'api/docs-json',
      'uploads',
    ],
  });

  app.enableVersioning({
    type: VersioningType.URI,
    prefix: 'v',
  });

  // Set Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Enable Cors
  app.enableCors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') ?? 'http://localhost:5173',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  });

  // Enable Swagger docs
  const config = new DocumentBuilder()
    .setTitle('API Documentation')
    .setDescription('API documentation for Job Seeker Application')
    .setVersion('1.0')
    // .addTag('auth', 'Authentication related endpoints')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth',
    )
    // .addBearerAuth(
    //   {
    //     type: 'http',
    //     scheme: 'bearer',
    //     bearerFormat: 'JWT',
    //     name: 'Refresh-JWT',
    //     description: 'Enter refresh JWT token',
    //     in: 'header',
    //   },
    //   'JWT-refresh',
    // )
    .addServer(
      process.env.NODE_ENV === 'production'
        ? 'https://api.jobseeker.lemongautam.com.np'
        : 'http://localhost:7000',
      process.env.NODE_ENV === 'production'
        ? 'Production server'
        : 'Development server',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
    customSiteTitle: 'API Documentation',
    // customfavIcon: 'https://www.lemongautam.com.np/logo.svg',
    customfavIcon: 'https://i.imgur.com/Bk96b3D.png',

    customCss: `
      .swagger-ui .topbar {display: none}
      .swagger-ui .info { margin: 50px 0; }
      .swagger-ui .info .title {color: #4A90E2;}
    `,
    customCssUrl: 'https://unpkg.com/swagger-ui-dist/swagger-ui.css',
    customJs: [
      'https://unpkg.com/swagger-ui-dist/swagger-ui-bundle.js',
      'https://unpkg.com/swagger-ui-dist/swagger-ui-standalone-preset.js',
    ],
  });

  // app.useGlobalInterceptors(app.get(MetricsInterceptor));

  // const prometheusService = app.get(PrometheusService);

  // app.use((req, res, next) => {
  //   const middleware = new PrometheusLoggerMiddleware(prometheusService);
  //   middleware.use(req, res, next);
  // });

  // await app.listen(process.env.PORT ?? 7000, '0.0.0.0');

  const port = process.env.PORT ?? 7000;
  await app.listen(port, '0.0.0.0');

  const networkInterfaces = os.networkInterfaces();

  console.log(`🚀 Server running on:`);

  for (const name of Object.keys(networkInterfaces)) {
    for (const net of networkInterfaces[name]!) {
      if (net.family === 'IPv4' && !net.internal) {
        console.log(`http://${net.address}:${port}`);
      }
    }
  }

  console.log(`http://localhost:${port}`);
}

bootstrap().catch((error) => {
  console.error(error);
  process.exit(1);
});
