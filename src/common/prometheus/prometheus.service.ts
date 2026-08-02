import { Injectable } from '@nestjs/common';
import {
  Histogram,
  Counter,
  Gauge,
  Registry,
  collectDefaultMetrics,
} from 'prom-client';

@Injectable()
export class PrometheusService {
  private readonly register = new Registry();

  public readonly httpDuration: Histogram<string>;
  public readonly httpRequests: Counter<string>;
  public readonly httpResponseSize: Histogram<string>;
  public readonly httpInFlight: Gauge<string>;

  // Business Metrices
  public readonly usersRegistered: Counter<string>;
  public readonly userLogins: Counter<string>;
  public readonly loginFailures: Counter<string>;
  public readonly jobsCreated: Counter<string>;
  public readonly applicationsSubmitted: Counter<string>;
  public readonly jobsSaved: Counter<string>;
  public readonly otpSent: Counter<string>;

  constructor() {
    this.register.setDefaultLabels({
      service: 'jobseeker-api',
    });

    //! Collect Node.js default metrics (CPU, memory, event loop, etc.)
    collectDefaultMetrics({
      register: this.register,
    });

    //! Request latency histogram
    this.httpDuration = new Histogram({
      name: 'http_request_duration_seconds',
      help: 'HTTP request latency',
      labelNames: [
        'method',
        'route',
        'status',
        'controller',
        'handler',
      ],
      buckets: [0.05, 0.1, 0.2, 0.4, 0.5, 1, 2, 5],
      registers: [this.register],
    });

    //! Request counter
    this.httpRequests = new Counter({
      name: 'http_requests_total',
      help: 'Total HTTP requests',
      labelNames: ['method', 'route', 'status', 'controller', 'handler'],
      registers: [this.register],
    });

    //! Response sizes
    this.httpResponseSize = new Histogram({
      name: 'http_response_size_bytes',
      help: 'HTTP response size in bytes',
      labelNames: ['method', 'route', 'status', 'controller', 'handler'],
      buckets: [100, 500, 1000, 5000, 10000, 50000, 100000],
      registers: [this.register],
    });

    //! Guages
    this.httpInFlight = new Gauge({
      name: 'http_requests_in_flight',
      help: 'Current number of HTTP requests being processed',
      labelNames: ['method', 'route'],
      registers: [this.register],
    });

    //! Business Metrices
    this.usersRegistered = new Counter({
      name: 'business_users_registered_total',
      help: 'Total registered users',
      labelNames: ['role', 'provider'],
      registers: [this.register],
    });

    this.userLogins = new Counter({
      name: 'business_user_logins_total',
      help: 'Successful user logins',
      labelNames: ['role', 'provider'],
      registers: [this.register],
    });

    this.loginFailures = new Counter({
      name: 'business_login_failures_total',
      help: 'Failed login attempts',
      labelNames: ['reason'],
      registers: [this.register],
    });

    this.jobsCreated = new Counter({
      name: 'business_jobs_created_total',
      help: 'Jobs created',
      labelNames: ['jobType'],
      registers: [this.register],
    });

    this.applicationsSubmitted = new Counter({
      name: 'business_applications_submitted_total',
      help: 'Applications submitted',
      labelNames: ['status'],
      registers: [this.register],
    });

    this.jobsSaved = new Counter({
      name: 'business_jobs_saved_total',
      help: 'Saved jobs',
      labelNames: ['action'],
      registers: [this.register],
    });

    this.otpSent = new Counter({
      name: 'business_otps_sent_total',
      help: 'OTPs sent',
      labelNames: ['type'],
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
