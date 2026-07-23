import { NodeSDK } from '@opentelemetry/sdk-node';
import { resourceFromAttributes } from '@opentelemetry/resources';
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
} from '@opentelemetry/semantic-conventions';

import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-grpc';

import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { randomUUID } from 'crypto';

const tempoExporter = new OTLPTraceExporter({
  url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT ?? 'tempo:4317',
});

const jaegerExporter = new OTLPTraceExporter({
  url: process.env.OTEL_EXPORTER_JAEGER_ENDPOINT ?? 'jaeger:4317',
});

const sdk = new NodeSDK({
  resource: resourceFromAttributes({
    [ATTR_SERVICE_NAME]: 'jobseeker-backend',
    [ATTR_SERVICE_VERSION]: '1.0.0',
    'deployment.environment': process.env.NODE_ENV ?? 'development',
    'service.instance.id': randomUUID(),
    'service.namespace': 'jobseeker',
  }),

  spanProcessors: [
    new BatchSpanProcessor(tempoExporter),
    new BatchSpanProcessor(jaegerExporter),
  ],

  instrumentations: [
    getNodeAutoInstrumentations({
      '@opentelemetry/instrumentation-fs': {
        enabled: false,
      },
    }),
  ],
});

sdk.start();
console.log('✅ OpenTelemetry SDK started');

process.on('SIGTERM', () => {
  void (async () => {
    try {
      await sdk.shutdown();
      console.log('OpenTelemetry SDK shut down');
    } catch (err) {
      console.error('Error shutting down OpenTelemetry', err);
    } finally {
      process.exit(0);
    }
  })();
});
