#!/bin/bash
set -e

# Colors for terminal output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Updating NestJS Starter Kubernetes Deployment ===${NC}"

# Check if kubectl is available
if ! command -v kubectl &> /dev/null; then
    echo -e "${YELLOW}kubectl not found. Make sure it's installed and in your PATH.${NC}"
    exit 1
fi

# Check if Kubernetes is running
if ! kubectl get nodes &> /dev/null; then
    echo -e "${YELLOW}Cannot connect to Kubernetes. Make sure OrbStack Kubernetes is running.${NC}"
    exit 1
fi

# Rebuild the Docker image with the latest code changes
echo -e "${GREEN}Rebuilding Docker image...${NC}"
docker build -t email-client-nestjs-app:latest .

# Update the ConfigMap
echo -e "${GREEN}Updating ConfigMap...${NC}"
kubectl apply -f k8s/app.yaml

# Restart the NestJS application deployment
echo -e "${GREEN}Restarting NestJS application...${NC}"
kubectl rollout restart deployment/nestjs-app -n email-client-nestjs

# Wait for the deployment to complete
echo -e "${GREEN}Waiting for deployment to complete...${NC}"
kubectl rollout status deployment/nestjs-app -n email-client-nestjs

echo -e "${GREEN}Update complete!${NC}"
echo -e "Your updated NestJS application is available at: ${YELLOW}http://email-client-nestjs.local${NC}"

# Display pod status
echo -e "${GREEN}Current pod status:${NC}"
kubectl get pods -n email-client-nestjs
