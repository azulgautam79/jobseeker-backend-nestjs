# Changelog

All notable changes to this project will be documented in this file.

---

## [2026-07-24] - Add OpenTelemetry tracing

### Added
- OpenTelemetry SDK integration
- OTLP exporter configuration
- Automatic HTTP request tracing
- Trace ID propagation middleware

### Why
Needed distributed tracing to correlate API requests with logs and metrics.

### Challenges
- Context propagation across async operations
- Integrating tracing with NestJS middleware

### Outcome
- Each request now includes a trace ID
- Traces can be visualized in Tempo
- Logs and traces are correlated for easier debugging

---

## [2026-07-23] - Project recovery and roadmap reset

### Context

* Lost access to previous AWS account and deployment environment.
* Lost access to previous GitHub account used for automated deployments.
* Existing application source code was preserved and migrated to the current repository.

### Current repository status

* NestJS backend remains functional.
* Core modules are available:

  * Authentication
  * Users
  * Jobs
  * Applications
  * Saved Jobs
  * Analytics
* Docker support is available locally.
* Swagger API documentation is configured.
* JWT authentication and refresh token flow are implemented.

### Decision&#10-Adopt a new development roadmap focused on:

1. Completing and polishing the backend.
2. Rebuilding observability (Prometheus, Grafana, Loki, Tempo, OpenTelemetry).
3. Recreating infrastructure-as-code (Terraform and Ansible).
4. Adding CI/CD automation.
5. Improving testing and documentation.

### Time allocation

* 70% JobSeeker platform development.
* 30% DSA and problem-solving practice.

### Notes&#10- This is considered the start of **JobSeeker v2**, with an emphasis on production-grade engineering practices and better documentation than the original deployment.
