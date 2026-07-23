# Deployment

## Infrastructure

Infrastructure provisioning is performed using:

- Terraform
- AWS VPC
- Security Groups
- EC2 Instance

Configuration management is handled using:

- Ansible

Deployment is performed using:

- Docker Compose
- GitHub Actions
- GitHub Container Registry

## Deployment Architecture

```mermaid
flowchart TD

    Internet((Internet))

    Internet --> Route53[DNS]
    Route53 --> EC2[AWS EC2 Instance]

    subgraph EC2 Docker Host
        Nginx[Nginx Container]
        Backend[NestJS Container]

        Prometheus[Prometheus]
        Grafana[Grafana]
        Loki[Loki]
        Tempo[Tempo]
        Alloy[Alloy]
        NodeExporter[Node Exporter]
        cAdvisor[cAdvisor]
        Certbot[Certbot]

        Nginx --> Backend
        Backend --> Prometheus
        Backend --> Tempo
        Backend --> Alloy

        Alloy --> Loki

        Prometheus --> Grafana
        Loki --> Grafana
        Tempo --> Grafana
    end

    Backend --> Mongo[(MongoDB Atlas)]
    Backend --> Redis[(Upstash Redis)]
```