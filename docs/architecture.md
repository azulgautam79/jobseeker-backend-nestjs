# Architecture

## Overview

JobSeeker is a full-stack job portal platform built with React, NestJS, MongoDB Atlas, Redis, Docker, and AWS.

The platform consists of:

- React + Vite frontend
- NestJS backend API
- MongoDB Atlas database
- Upstash Redis cache
- Nginx reverse proxy
- Prometheus metrics collection
- Grafana dashboards
- Loki centralized logging
- Tempo distributed tracing
- GitHub Actions CI/CD
- AWS EC2 deployment infrastructure

## High-Level Architecture

```mermaid
flowchart TD

    User[Users] -->|HTTPS| FE[Vercel Frontend]
    FE -->|REST API| Nginx[Nginx Reverse Proxy]
    Nginx --> Backend[NestJS Backend]

    Backend --> Mongo[(MongoDB Atlas)]
    Backend --> Redis[(Upstash Redis)]

    Backend --> OTEL[OpenTelemetry SDK]

    OTEL --> Tempo[Tempo Traces]
    Backend --> Prometheus[Prometheus Metrics]
    Backend --> Alloy[Alloy Log Collector]

    Alloy --> Loki[Loki Logs]

    Prometheus --> Grafana[Grafana Dashboard]
    Loki --> Grafana
    Tempo --> Grafana
```

## Container Architecture

```mermaid
graph TD

    nginx --> backend

    backend --> mongodb[(MongoDB Atlas)]
    backend --> redis[(Upstash Redis)]

    backend --> prometheus
    backend --> tempo
    backend --> alloy

    alloy --> loki

    prometheus --> grafana
    loki --> grafana
    tempo --> grafana

    nodeexporter --> prometheus
    cadvisor --> prometheus
```

## Request Flow

```mermaid
sequenceDiagram
    autonumber

    actor User
    participant Frontend
    participant Nginx
    participant Backend
    participant MongoDB
    participant Redis

    User->>Frontend: Search Jobs
    Frontend->>Nginx: GET /jobs
    Nginx->>Backend: Forward Request

    Backend->>Redis: Check Cache

    alt Cache Hit
        Redis-->>Backend: Cached Jobs
    else Cache Miss
        Backend->>MongoDB: Query Jobs
        MongoDB-->>Backend: Jobs
        Backend->>Redis: Store Cache
    end

    Backend-->>Nginx: Response
    Nginx-->>Frontend: JSON Response
    Frontend-->>User: Display Jobs
```