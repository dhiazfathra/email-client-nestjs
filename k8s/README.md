# NestJS Starter Kubernetes Deployment

This directory contains Kubernetes configuration files for deploying the NestJS starter application on OrbStack for MacBook M1.

## Prerequisites

- OrbStack installed on your MacBook M1
- Kubernetes enabled in OrbStack
- Docker installed and running

## Directory Structure

- `namespace.yaml` - Creates a dedicated namespace for the NestJS starter application
- `postgres.yaml` - PostgreSQL database deployment
- `redis.yaml` - Redis cache deployment
- `app.yaml` - NestJS application deployment
- `monitoring.yaml` - Prometheus and Grafana monitoring stack
- `jaeger.yaml` - Jaeger distributed tracing
- `deploy.sh` - Deployment script to automate the deployment process

## Deployment Instructions

1. Make sure OrbStack is running with Kubernetes enabled
2. Run the deployment script:

```bash
./k8s/deploy.sh
```

This script will:
- Build the Docker image for your NestJS application
- Create the Kubernetes namespace
- Deploy all components (PostgreSQL, Redis, Prometheus, Grafana, Jaeger, and the NestJS app)
- Set up local hostnames in your /etc/hosts file (requires sudo)
- Wait for pods to be ready
- Display the status of all pods

## Accessing the Applications

After deployment, you can access:

- NestJS Application: http://email-client-nestjs.local
- Grafana Dashboard: http://grafana.email-client-nestjs.local (default credentials: admin/admin)
- Jaeger UI: http://jaeger.email-client-nestjs.local

## Manual Deployment

If you prefer to deploy components individually:

```bash
# Create namespace
kubectl apply -f k8s/namespace.yaml

# Deploy PostgreSQL
kubectl apply -f k8s/postgres.yaml

# Deploy Redis
kubectl apply -f k8s/redis.yaml

# Deploy monitoring stack
kubectl apply -f k8s/monitoring.yaml

# Deploy Jaeger
kubectl apply -f k8s/jaeger.yaml

# Deploy NestJS application
kubectl apply -f k8s/app.yaml
```

## Checking Deployment Status

```bash
# Get all pods in the email-client-nestjs namespace
kubectl get pods -n email-client-nestjs

# Get services
kubectl get services -n email-client-nestjs

# Get persistent volume claims
kubectl get pvc -n email-client-nestjs

# View logs for the NestJS application
kubectl logs -n email-client-nestjs deployment/nestjs-app
```

## Cleanup

To remove all deployed resources:

```bash
kubectl delete namespace email-client-nestjs
```

This will delete all resources created in the email-client-nestjs namespace.
