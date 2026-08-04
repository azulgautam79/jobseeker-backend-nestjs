
## Some Improvements

### Performance
<!-- - [x] Write the press release -->
- [ ] N+1 Query Optimization
- [ ] No time based but event based cache invalidation
- [ ] Redis wala Rate Limiting
- [ ] Store refresh token in redis, instead of mongodb
- [ ] Store otps in redis, instead of mongodb

### Backend Features
- [ ] OAuth2 (Google)
- [ ] If provider google no email validation check
- [ ] Webpush / SSE (Server Sent Events for notifications)
- [ ] BullMQ for backgrounds tasks (emails)
- [ ] Profiling tool for nestjs (if possible)-Grafana Pyroscope, Clinic.js
- [ ] Query Analyzer for mongodb
    ```
        db.jobs.aggregate().explain("executionStats") 
                            .explain("queryPlanner")
                            .explain("allPlansExecution")
    ```
- [x] PgBouncer type of external pooler for mongodb
    MongoDB driver creates its own connection pool
- [ ] MongoDB/ Redis images in docker no cloud
- [ ] Yo Pino pretty wala enable in dev wala
- [ ] Audit Log Service

### Frontend Features
- [ ] OAuth2 (Google) form login/signup
- [ ] Webpush / SSE (Server Sent Events for notifications)
- [x] Refresh Token persist in reduxtoolkit
- [x] Static Pages Cache

### Observability
- [ ] Add Grafana Pyroscope for profiling (LGTM + P)
- [ ] Cache Hit/ Cache Miss Rate visualization
- [ ] Webpush / SSE visualization
- [ ] BullMQ dashboard visuals
- [ ] Auth provider visualization improve
- [ ] Slow requests correlate with (traces, logs)
- [ ] Add alertmanager for alerts
- [ ] Store metrices, traces and logs 7 days time
- [ ] Add variables in grafana dashboard to change settings
- [ ] Prometheus custom metrics for email sent
- [ ] Custom metrices for file uploads (resumes, avatars) etc


