import { Injectable } from '@nestjs/common';
import {
  Histogram,
  Counter,
  Registry,
  collectDefaultMetrics,
} from 'prom-client';

@Injectable()
export class PrometheusService {
  private readonly register = new Registry();

  public readonly httpDuration: Histogram<string>;
  public readonly httpRequests: Counter<string>;
  public readonly httpResponseSize: Histogram<string>;

  constructor() {
    this.register.setDefaultLabels({ app: 'nestjs-prometheus' });

    //! Collect Node.js default metrics (CPU, memory, event loop, etc.)
    collectDefaultMetrics({
      register: this.register,
    });

    //! Request latency histogram
    this.httpDuration = new Histogram({
      name: 'http_request_duration_seconds',
      help: 'HTTP request latency',
      labelNames: ['method', 'route', 'status'],
      buckets: [0.05, 0.1, 0.2, 0.4, 0.5, 1, 2, 5],
      registers: [this.register],
    });

    //! Request counter
    this.httpRequests = new Counter({
      name: 'http_requests_total',
      help: 'Total HTTP requests',
      labelNames: ['method', 'route', 'status'],
      registers: [this.register],
    });

    //! Response sizes
    this.httpResponseSize = new Histogram({
      name: 'http_response_size_bytes',
      help: 'HTTP response size in bytes',
      labelNames: ['method', 'route', 'status'],
      buckets: [100, 500, 1000, 5000, 10000, 50000, 100000],
      registers: [this.register],
    });
  }

  async getMetrics(externalRegisters: Registry[] = []): Promise<string> {
    let metrics = await this.register.metrics();

    for (const reg of externalRegisters) {
      metrics += '\n' + (await reg.metrics());
    }

    return metrics;
  }
}
