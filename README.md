# NestJS Starter Project

<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

<p align="center">
  <a href="https://github.com/dhiazfathra/email-client-nestjs/actions/workflows/test.yml">
    <img src="https://github.com/dhiazfathra/email-client-nestjs/actions/workflows/test.yml/badge.svg" alt="Tests" />
  </a>
  <a href="https://codecov.io/gh/dhiazfathra/email-client-nestjs">
    <img src="https://codecov.io/gh/dhiazfathra/email-client-nestjs/graph/badge.svg" alt="Coverage" />
  </a>
  <a href="https://github.com/dhiazfathra/email-client-nestjs/actions/workflows/static-analysis.yml">
    <img src="https://github.com/dhiazfathra/email-client-nestjs/actions/workflows/static-analysis.yml/badge.svg" alt="Static Analysis" />
  </a>
  <a href="https://github.com/dhiazfathra/email-client-nestjs/actions/workflows/semantic-release.yml">
    <img src="https://github.com/dhiazfathra/email-client-nestjs/actions/workflows/semantic-release.yml/badge.svg" alt="Semantic Release" />
  </a>
  <a href="https://github.com/dhiazfathra/email-client-nestjs/actions/workflows/chaos-test.yml">
    <img src="https://github.com/dhiazfathra/email-client-nestjs/actions/workflows/chaos-test.yml/badge.svg" alt="Chaos Testing" />
  </a>
  <a href="https://github.com/dhiazfathra/email-client-nestjs/actions/workflows/docker-validate.yml">
    <img src="https://github.com/dhiazfathra/email-client-nestjs/actions/workflows/docker-validate.yml/badge.svg" alt="Docker Validation" />
  </a>
  <a href="https://github.com/dhiazfathra/email-client-nestjs/actions/workflows/security.yml">
    <img src="https://github.com/dhiazfathra/email-client-nestjs/actions/workflows/security.yml/badge.svg" alt="Security Scan" />
  </a>
</p>

## Table of Contents

- [Description](#description)
- [Features](#features)
- [Technologies Used](#technologies-used)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Running the app](#running-the-app)
- [API Documentation](#api-documentation)
  - [Standard Swagger UI](#standard-swagger-ui)
  - [Scalar API Reference](#scalar-api-reference)
  - [Scalar Types](#scalar-types)
  - [API Endpoints](#api-endpoints)
- [Bundle Analysis](#bundle-analysis)
- [Redis Caching](#redis-caching)
- [Monitoring](#monitoring)
- [Project Structure](#project-structure)
- [Testing](#testing)
- [CI/CD](#ci-cd)
- [Contributing](#contributing)
- [License](#license)

## Description

A NestJS TypeScript starter project with user authentication, following best practices, DRY and SOLID principles. This project provides a solid foundation for building secure and scalable backend applications.

## Features

- **Authentication** - JWT-based authentication system
- **User Management** - Complete CRUD operations for users
- **Role-Based Access Control** - User and Admin roles with proper guards
- **Database Integration** - PostgreSQL with Prisma ORM
- **Redis Caching** - Performance optimization with Redis-based caching
- **Chaos Testing** - Resilience testing with Redis fault injection
- **Rate Limiting** - Protection against abuse and DoS attacks
- **Bundle Analysis** - Monitor and optimize bundle size with Codecov integration
- **Validation** - Request validation using class-validator
- **Environment Configuration** - Using dotenv and NestJS ConfigModule
- **API Documentation** - Swagger/OpenAPI and Scalar API Reference
- **Monitoring** - Grafana and Prometheus for metrics and monitoring
- **Distributed Tracing** - Jaeger for request tracing and performance analysis

## Technologies Used

- **NestJS** - Progressive Node.js framework for building server-side applications
- **TypeScript** - Typed superset of JavaScript
- **Prisma** - Next-generation ORM for Node.js and TypeScript
- **PostgreSQL** - Open-source relational database
- **Redis** - In-memory data structure store for caching
- **JWT** - JSON Web Tokens for authentication
- **Passport** - Authentication middleware for Node.js
- **class-validator** - Decorator-based validation for classes
- **class-transformer** - Transform plain objects to class instances
- **Swagger/OpenAPI** - API documentation
- **Scalar** - Modern API reference
- **Jest** - JavaScript testing framework
- **Supertest** - HTTP assertion library
- **Prometheus** - Monitoring and alerting toolkit
- **Grafana** - Observability and data visualization platform
- **Jaeger** - Distributed tracing system
- **Docker** - Containerization platform
- **Docker Compose** - Multi-container Docker applications
- **GitHub Actions** - CI/CD automation
- **Semantic Release** - Automated versioning and package publishing
- **Codecov** - Code coverage reporting
- **ESLint** - JavaScript linting utility
- **Prettier** - Code formatter
- **Husky** - Git hooks
- **Commitlint** - Lint commit messages

## Prerequisites

- Node.js (v14 or later)
- npm or yarn
- PostgreSQL database
- Docker and Docker Compose (optional, for containerized setup)

## Installation

```bash
# Install dependencies
$ npm install

# Generate Prisma client
$ npx prisma generate

# Run database migrations
$ npx prisma migrate dev --name init
```

## Configuration

Create a `.env` file in the root directory with the following variables:

```env
# Database connection
DATABASE_URL="postgresql://username:password@localhost:5432/dbname?schema=public"

# JWT Configuration
JWT_SECRET="your-secret-key-change-in-production"
JWT_EXPIRATION="1d"

# Application
PORT=3000

# Redis Cache Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
CACHE_TTL=300

# Jaeger Configuration
JAEGER_HOST=localhost
JAEGER_PORT=6831
```

## Running the app

```bash
# Development mode
$ npm run start

# Watch mode (recommended for development)
$ npm run start:dev

# Production mode
$ npm run start:prod
```

## API Documentation

The API is documented using Swagger/OpenAPI with two different interfaces:

### Standard Swagger UI

When the application is running, you can access the standard Swagger UI at:

```
http://localhost:3000/api/docs
```

### Scalar API Reference

A beautiful, modern API reference powered by Scalar is available at:

```
http://localhost:3000/api/reference
```

The Scalar API Reference provides a more user-friendly and visually appealing interface for exploring the API.

Both documentation interfaces include:

- Interactive API explorer
- Request/response schemas with examples
- Authentication requirements
- Custom scalar types for consistent data representation

### Scalar Types

The API uses the following scalar types for consistent data representation:

- **UUID** - For entity IDs (format: uuid)
- **Date** - For timestamps (format: date-time, ISO8601)
- **Email** - For email addresses (format: email)
- **Password** - For password fields (format: password)

### API Endpoints

#### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login and get access token
- `GET /api/auth/profile` - Get current user profile (requires authentication)

#### Users
- `GET /api/users` - Get all users (admin only)
- `GET /api/users/:id` - Get user by ID (authenticated users)
- `PATCH /api/users/:id` - Update user (authenticated users)
- `DELETE /api/users/:id` - Delete user (admin only)

## Bundle Analysis

This project includes bundle analysis integration with Codecov to help monitor and optimize your application's bundle size.

### Features

- **Bundle Size Monitoring** - Track bundle size changes over time
- **PR Comments** - Automatic bundle size reports in PR comments
- **Commit Status** - Bundle size information in commit statuses
- **Threshold Alerts** - Configurable warnings for significant bundle size increases

### Usage

Bundle analysis is automatically performed during the CI/CD pipeline. The results are available in:

- Codecov UI under the "Bundles" tab
- PR comments showing bundle size changes
- Commit statuses with bundle size information

## Redis Caching

This project implements Redis caching to improve performance and reduce database load. The caching system is designed to be transparent and easy to use throughout the application.

### Features

- **Transparent Caching** - Data is automatically cached and invalidated when needed
- **Configurable TTL** - Cache expiration times are configurable via environment variables
- **Cache Invalidation** - Automatic cache invalidation on data updates/deletes
- **Centralized Service** - A dedicated CacheService for all caching operations

### Implementation

The caching system is implemented using:

- `@nestjs/cache-manager` - NestJS cache manager module
- `cache-manager` - Flexible cache manager
- `cache-manager-redis-store` - Redis store for cache-manager
- `redis` - Redis client for Node.js

### Usage

The CacheService provides the following methods:

```typescript
// Get a value from cache
const value = await cacheService.get<T>(key);

// Set a value in cache
await cacheService.set(key, value, ttl);

// Delete a value from cache
await cacheService.del(key);

// Get a value from cache or compute it if not found
const value = await cacheService.getOrSet(
  key,
  async () => computeValue(),
  ttl
);
```

## Chaos Testing

This project includes chaos testing capabilities to ensure the application remains resilient when Redis experiences failures. The chaos testing system allows you to simulate Redis failures in a controlled manner.

### Features

- **Redis Fault Injection** - Simulate Redis failures with configurable probability
- **Redis Toggle** - Enable/disable Redis cache entirely for testing
- **API Control** - Manage chaos testing through a secure API
- **GitHub Actions Integration** - Automated chaos testing in CI/CD pipeline

### API Endpoints

The chaos testing API is protected and requires admin authentication:

```
# Toggle Redis on/off
POST /chaos/toggle-redis
{ "enabled": true|false }

# Set Redis failure probability (0-1)
POST /chaos/set-probability
{ "probability": 0.3 }

# Get current chaos testing status
GET /chaos/status
```

### GitHub Actions Workflow

The project includes a GitHub Actions workflow for automated chaos testing:

- **Trigger Events**: Runs on pushes to main/master, pull requests, or manual triggers
- **Configurable**: Adjustable Redis failure probability
- **Comprehensive**: Tests application resilience under Redis failures
- **Verification**: Ensures no fatal errors occur during chaos conditions

To manually trigger chaos testing:

1. Go to the Actions tab in your GitHub repository
2. Select the "Chaos Testing" workflow
3. Click "Run workflow"
4. Set your desired Redis failure probability
5. Click "Run workflow"

### Implementation

Chaos testing is implemented in the `CacheService` with the following mechanisms:

- Probability-based failure simulation
- Graceful fallbacks for all cache operations
- Comprehensive logging of simulated failures
- Automatic factory execution when cache is disabled

This approach ensures your application can handle Redis failures without affecting user experience.

## Distributed Tracing with Jaeger

This project implements distributed tracing using Jaeger to help monitor and troubleshoot your application, especially in microservices architectures.

### Features

- **Request Tracing** - Track HTTP requests across your application
- **Performance Analysis** - Identify bottlenecks and slow operations
- **Error Tracking** - Visualize where errors occur in the request flow
- **Dependency Visualization** - See how services interact with each other

### Implementation

The distributed tracing system is implemented using:

- `@opentelemetry/api` - OpenTelemetry API for instrumentation
- `@opentelemetry/sdk-node` - OpenTelemetry SDK for Node.js
- `@opentelemetry/auto-instrumentations-node` - Auto-instrumentation for Node.js
- `@opentelemetry/exporter-jaeger` - Jaeger exporter for OpenTelemetry

### Usage

Jaeger UI is available at:

```
http://localhost:16686
```

The Jaeger UI provides:

- Search for traces based on service, operation, tags, and duration
- Detailed trace view with span information
- Dependency graphs showing service interactions
- Comparison of multiple traces

### Endpoints

- `GET /api/tracing` - Get information about the tracing setup

## Project Structure

```
├── prisma/              # Prisma schema and migrations
├── src/
│   ├── auth/            # Authentication module
│   │   ├── decorators/  # Custom decorators
│   │   ├── dto/         # Data transfer objects
│   │   ├── guards/      # Authentication guards
│   │   └── strategies/  # Passport strategies
│   ├── cache/           # Redis caching module
│   ├── common/          # Shared resources
│   │   ├── enums/       # Enumerations
│   │   └── scalars/     # Custom scalar types for API docs
│   ├── prisma/          # Prisma service
│   ├── tracing/         # Distributed tracing with Jaeger
│   ├── users/           # Users module
│   │   ├── dto/         # Data transfer objects
│   │   └── entities/    # Entity definitions for API docs
│   ├── app.module.ts    # Main application module
│   └── main.ts          # Application entry point
└── test/                # Test files
```

## Testing

```bash
# Unit tests
$ npm run test

# Watch mode for tests
$ npm run test:watch

# Test coverage
$ npm run test:cov

# Test with JUnit XML output for test analytics
$ npm run test:junit

# E2E tests
$ npm run test:e2e
```

## Test Analytics

This project is configured with Codecov Test Analytics to provide insights into test performance and reliability:

- Overview of test run times and failure rates across branches
- Identification of failed tests in PR comments with stack traces for easier debugging
- Detection of flaky tests that fail intermittently

Test results are automatically uploaded to Codecov during CI runs via GitHub Actions. The workflow generates JUnit XML test reports and uploads them alongside coverage reports using the Codecov Test Results Action.

## Docker Setup

This project includes Docker support for easy deployment and development.

### Requirements

- Docker version 20.10.0 or higher
- Docker Compose V2 (2.0.0 or higher)

Older versions may cause compatibility issues with the healthchecks and Docker Compose commands used in this project.

### Using Docker Compose

This project uses Docker Compose to manage multiple services (NestJS app, PostgreSQL, and Redis). The commands below use Docker Compose V2 syntax (without hyphen):

```bash
# Start all services (app, database, and Redis)
$ docker compose up -d

# Start all services (app, database, and Redis) for Apple Silicon
$ docker compose -f docker-compose.arm64.yaml up -d

# View logs
$ docker compose logs -f

# Stop all services
$ docker compose down

# Rebuild containers after making changes to Dockerfile
$ docker compose up -d --build

# Check application health
$ curl http://localhost:3000/api/health
```

### Health Check

The application includes a health check endpoint at `/api/health` that returns a status object:

```json
{
  "status": "ok",
  "timestamp": "<ISO8601_timestamp>"
}
```

This endpoint is used by the Docker validation workflow to verify that the application is functioning correctly.

### Environment Variables for Docker

When using Docker, you can configure these additional environment variables in your `.env` file:

```env
# PostgreSQL Docker Configuration
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=nestjs

# Redis Configuration
# For Docker environment, use the service name
REDIS_HOST=redis  # Use 'localhost' for local development

# Jaeger Configuration
# For Docker environment, use the service name
JAEGER_HOST=jaeger  # Use 'localhost' for local development
JAEGER_PORT=6831
```

### Apple Silicon Support

This project includes a dedicated Docker Compose file optimized for Apple Silicon ARM64 architecture:

- **Optimized Images**: Uses ARM64-compatible images for all services
- **Native Performance**: Runs natively on ARM64 architecture without emulation
- **Platform Specification**: Explicitly sets the platform for each service

To use the ARM64-optimized setup:

```bash
# Start all services optimized for Apple Silicon
$ docker compose -f docker-compose.arm64.yaml up -d
```

This approach provides better performance than using the platform flag with the standard Docker Compose file.

### Building the Docker Image Separately

This project uses a multi-stage Docker build process for optimized production images:

1. **Builder Stage**: Installs dependencies, generates Prisma client, builds the application, and prunes development dependencies
2. **Production Stage**: Creates a minimal production image with only the necessary runtime files

This approach significantly reduces the final image size and improves security by excluding development dependencies and build tools from the production environment.

```bash
# Build the image
$ docker build -t email-client-nestjs .

# Run the container
$ docker run -p 3000:3000 --env-file .env email-client-nestjs
```

## Testing GitHub Actions Locally

This project includes several GitHub Actions workflows for CI/CD. You can test these workflows locally using [Act](https://github.com/nektos/act), a tool that runs GitHub Actions locally using Docker.

### Prerequisites

- Docker installed and running
- [Act](https://github.com/nektos/act) installed (`brew install act` on macOS)

### Running Workflows Locally

```bash
# List all available workflows
$ act -l

# Run the Docker validation workflow
$ act -j validate-docker-compose --container-architecture linux/amd64

# Run a specific job with verbose output
$ act -j validate-docker-compose -v

# Run a workflow with specific event
$ act push
```

### Troubleshooting Act

- If you're using Apple Silicon, add `--container-architecture linux/amd64` to avoid platform compatibility issues
- Use `-v` flag for verbose output to debug issues
- Check container logs with `docker logs` if a job fails

## Monitoring with Grafana and Prometheus

This project includes a comprehensive monitoring setup using Grafana and Prometheus, providing real-time insights into application performance and health.

### Features

- **Real-time Metrics**: Monitor HTTP request rates, response times, memory usage, and CPU utilization
- **Pre-configured Dashboards**: Ready-to-use Grafana dashboards for NestJS applications
- **Automatic Service Discovery**: Prometheus automatically discovers and monitors services
- **Health Checks**: Integrated health endpoints for monitoring application and database status

### Accessing Monitoring Tools

- **Prometheus**: Available at http://localhost:9090 when running with Docker Compose
- **Grafana**: Available at http://localhost:3001 when running with Docker Compose
  - Default credentials: admin/admin

### Custom Metrics

The application exposes custom metrics through the `/metrics` endpoint, which Prometheus scrapes at regular intervals. Key metrics include:

- HTTP request counts by endpoint and status code
- Request duration histograms
- In-progress request counts
- Node.js runtime metrics (memory, CPU, event loop)

### Adding Custom Dashboards

To add custom Grafana dashboards:

## Kubernetes Deployment

This project includes Kubernetes configuration for local deployment using OrbStack on MacBook M1.

### Prerequisites

- OrbStack installed on your MacBook M1
- Kubernetes enabled in OrbStack
- Docker installed and running

### Deployment Files

The Kubernetes configuration files are located in the `k8s` directory:

- `namespace.yaml` - Creates a dedicated namespace for the application
- `postgres.yaml` - PostgreSQL database deployment
- `redis.yaml` - Redis cache deployment
- `app.yaml` - NestJS application deployment
- `monitoring.yaml` - Prometheus and Grafana monitoring stack
- `jaeger.yaml` - Jaeger distributed tracing
- `deploy.sh` - Deployment script to automate the deployment process
- `update.sh` - Script to update an existing deployment

### Deployment Instructions

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

### Accessing the Application

After deployment, you can access:

- NestJS Application: http://localhost:30000/api
- Swagger Documentation: http://localhost:30000/api/docs
- Scalar API Reference: http://localhost:30000/api/reference
- Grafana Dashboard: http://localhost:3001 (default credentials: admin/admin)
- Jaeger UI: http://localhost:16686

### Updating the Deployment

To update an existing deployment with code changes:

```bash
./k8s/update.sh
```

### Troubleshooting

- If pods are restarting or crashing, check the logs with: `kubectl logs -n email-client-nestjs -l app=nestjs-app`
- For database issues, check PostgreSQL logs: `kubectl logs -n email-client-nestjs -l app=postgres`
- For Redis issues, check Redis logs: `kubectl logs -n email-client-nestjs -l app=redis`

1. Create a JSON dashboard definition in `monitoring/grafana/provisioning/dashboards/`
2. Update the dashboard configuration in `monitoring/grafana/provisioning/dashboards/dashboards.yml`
3. Restart the Grafana container

## Rate Limiting

This project includes a robust rate limiting implementation to protect your API from abuse and DoS attacks.

### Features

- **Global Rate Limiting**: Limits API requests to 10 requests per minute by default
- **IP-Based Tracking**: Identifies clients by their IP address
- **Customizable Limits**: Easily configure different rate limits for different routes
- **Exclusion Support**: Ability to exclude specific routes from rate limiting

### Configuration

Rate limiting is configured in the `app.module.ts` file:

```typescript
ThrottlerModule.forRoot([{
  ttl: 60, // time to live in seconds
  limit: 10, // the maximum number of requests within the TTL
}]),
```

### Excluding Routes from Rate Limiting

You can exclude specific routes from rate limiting using the `@SkipThrottle()` decorator:

```typescript
import { SkipThrottle } from './common/decorators/skip-throttle.decorator';

@SkipThrottle()
@Get('health')
checkHealth() {
  return { status: 'ok' };
}
```

You can also exclude entire controllers:

```typescript
@SkipThrottle()
@Controller('health')
export class HealthController {
  // All routes in this controller will be excluded from rate limiting
}
```

### Custom Rate Limiting Logic

The rate limiting implementation can be customized by extending the `AppThrottlerGuard` class in `src/common/guards/throttler.guard.ts`. This allows you to implement custom tracking logic, such as using user IDs for authenticated users or combining IP addresses with route paths.

## Pre-commit Hooks

This project uses Git hooks to enforce code quality standards before commits and pushes. These hooks help maintain high code quality and ensure that all tests pass before code is committed to the repository.

### Features

- 🔍 **Lint Checking** - Automatically runs ESLint on changed files before commit
- 🧪 **Test Verification** - Runs tests related to changed files
- 📊 **Coverage Enforcement** - Verifies test coverage meets thresholds before pushing
- 🔄 **Changed Files Only** - Optimized to only check files that have been modified
- 📝 **Commit Message Linting** - Enforces conventional commit message format

### Pre-commit Hook

The pre-commit hook runs automatically when you attempt to commit changes. It performs:

1. ESLint checks on changed files with automatic fixing when possible
2. Tests related to changed files to ensure your changes don't break existing functionality

### Pre-push Hook

The pre-push hook runs before pushing to the remote repository and performs:

1. Full test suite with coverage reporting
2. Coverage threshold verification against the project requirements

### Commit Message Hook

The commit-msg hook enforces the use of conventional commit messages, which are required for semantic versioning and automated changelog generation. The hook validates that commit messages follow this format:

```
<type>(<optional scope>): <description>

<optional body>

<optional footer>
```

Where `type` is one of:

- **feat**: A new feature
- **fix**: A bug fix
- **docs**: Documentation only changes
- **style**: Changes that do not affect the meaning of the code (white-space, formatting, etc)
- **refactor**: A code change that neither fixes a bug nor adds a feature
- **perf**: A code change that improves performance
- **test**: Adding missing tests or correcting existing tests
- **build**: Changes that affect the build system or external dependencies
- **ci**: Changes to CI configuration files and scripts
- **chore**: Other changes that don't modify src or test files
- **revert**: Reverts a previous commit

Examples:

```
feat(auth): add JWT authentication
fix(api): resolve user creation issue
docs(readme): update installation instructions
```

### Configuration

The pre-commit hooks are configured using:

- **Husky** - For Git hooks integration
- **lint-staged** - For running linters on staged files only
- **commitlint** - For validating commit messages
- **Custom scripts** - For coverage verification

You can customize:
- The lint-staged configuration in `.lintstagedrc.js`
- The coverage thresholds in `package.json` under the `jest.coverageThreshold` section
- The commit message rules in `commitlint.config.js`

## License

This project is [MIT licensed](LICENSE).
