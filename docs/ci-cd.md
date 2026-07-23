# CI/CD Pipeline

The application uses GitHub Actions for Continuous Integration and Continuous Deployment.

## CI Stage

- Checkout repository
- Install dependencies
- Run linting
- Build Docker image
- Push image to GHCR

## CD Stage

- SSH into EC2
- Pull latest image
- Restart backend container

## CI/CD Flow

```mermaid
flowchart LR

    Dev[Developer Push] --> Github[GitHub Repository]

    Github --> CI[GitHub Actions CI]

    CI --> Lint[Lint]
    Lint --> Build[Build Docker Image]
    Build --> Push[Push Image to GHCR]

    Push --> CD[GitHub Actions CD]

    CD --> SSH[SSH to EC2]

    SSH --> Pull[docker compose pull backend]
    Pull --> Deploy[docker compose up -d backend]
```