#!/bin/bash
set -e

# Colors for terminal output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== NestJS Starter Kubernetes Deployment ===${NC}"

# Check if OrbStack is running
if ! command -v orb &> /dev/null; then
    echo -e "${YELLOW}OrbStack CLI not found. Make sure OrbStack is installed and in your PATH.${NC}"
    exit 1
fi

# Check if kubectl is available
if ! command -v kubectl &> /dev/null; then
    echo -e "${YELLOW}kubectl not found. Make sure it's installed and in your PATH.${NC}"
    exit 1
fi

# Check if OrbStack Kubernetes is running
if ! kubectl get nodes &> /dev/null; then
    echo -e "${YELLOW}Cannot connect to Kubernetes. Make sure OrbStack Kubernetes is running.${NC}"
    exit 1
fi

# Build the Docker image
echo -e "${GREEN}Building Docker image...${NC}"
docker build -t email-client-nestjs-app:latest .

# Create namespace if it doesn't exist
echo -e "${GREEN}Creating namespace...${NC}"
kubectl apply -f k8s/namespace.yaml

# Apply Kubernetes configurations
echo -e "${GREEN}Deploying PostgreSQL...${NC}"
kubectl apply -f k8s/postgres.yaml

echo -e "${GREEN}Deploying Redis...${NC}"
kubectl apply -f k8s/redis.yaml

echo -e "${GREEN}Deploying monitoring stack...${NC}"
kubectl apply -f k8s/monitoring.yaml

echo -e "${GREEN}Deploying Jaeger...${NC}"
kubectl apply -f k8s/jaeger.yaml

echo -e "${GREEN}Deploying NestJS application...${NC}"
kubectl apply -f k8s/app.yaml

# Wait for pods to be ready
echo -e "${GREEN}Waiting for pods to be ready...${NC}"
kubectl wait --namespace=email-client-nestjs --for=condition=ready pod --selector=app=postgres --timeout=120s
kubectl wait --namespace=email-client-nestjs --for=condition=ready pod --selector=app=redis --timeout=120s
kubectl wait --namespace=email-client-nestjs --for=condition=ready pod --selector=app=nestjs-app --timeout=120s

# Add hosts entries to /etc/hosts if they don't exist
echo -e "${GREEN}Setting up local hostnames...${NC}"
if ! grep -q "email-client-nestjs.local" /etc/hosts; then
    echo "127.0.0.1 email-client-nestjs.local" | sudo tee -a /etc/hosts
fi
if ! grep -q "grafana.email-client-nestjs.local" /etc/hosts; then
    echo "127.0.0.1 grafana.email-client-nestjs.local" | sudo tee -a /etc/hosts
fi
if ! grep -q "jaeger.email-client-nestjs.local" /etc/hosts; then
    echo "127.0.0.1 jaeger.email-client-nestjs.local" | sudo tee -a /etc/hosts
fi

echo -e "${GREEN}Deployment complete!${NC}"
echo -e "Your NestJS application is available at: ${YELLOW}http://email-client-nestjs.local${NC}"
echo -e "Grafana dashboard is available at: ${YELLOW}http://grafana.email-client-nestjs.local${NC}"
echo -e "Jaeger UI is available at: ${YELLOW}http://jaeger.email-client-nestjs.local${NC}"

# Display pod status
echo -e "${GREEN}Current pod status:${NC}"
kubectl get pods -n email-client-nestjs
