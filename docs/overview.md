# Email Client NestJS: Codebase Overview

## Introduction

This document provides an overview of the Email Client NestJS codebase. This application is an email client backend built with NestJS, TypeScript, and various modern technologies. It provides a secure, scalable foundation for email management with multiple protocol support and integration with Microsoft Graph API.

## Project Purpose

The Email Client NestJS application serves as a backend service for managing emails with the following core capabilities:

- Email retrieval via multiple protocols (IMAP, POP3, Microsoft Graph)
- Email sending via SMTP and Microsoft Graph
- Email organization (folders, read/unread status, flagging)
- User authentication and authorization
- Secure email storage and management

## Technology Stack

### Core Technologies
- **NestJS**: Progressive Node.js framework for building server-side applications
- **TypeScript**: Typed superset of JavaScript
- **Prisma**: Next-generation ORM for Node.js and TypeScript
- **PostgreSQL**: Open-source relational database
- **Redis**: In-memory data structure store for caching

### Authentication & Security
- **JWT**: JSON Web Tokens for authentication
- **Passport**: Authentication middleware for Node.js
- **Bcrypt**: Password hashing
- **Crypto-JS**: Cryptographic functionality

### Email Protocols & APIs
- **IMAP**: Internet Message Access Protocol for email retrieval
- **POP3**: Post Office Protocol for email retrieval
- **SMTP**: Simple Mail Transfer Protocol for sending emails
- **Microsoft Graph API**: Microsoft's unified API for accessing Microsoft 365 services

### Monitoring & Observability
- **OpenTelemetry**: Distributed tracing
- **Jaeger**: End-to-end distributed tracing
- **Prometheus**: Monitoring and alerting toolkit
- **Grafana**: Observability and data visualization platform

### Development & DevOps
- **Docker**: Containerization
- **Kubernetes**: Container orchestration
- **Jest**: Testing framework
- **GitHub Actions**: CI/CD automation
- **Semantic Release**: Automated versioning and package publishing

## Architecture Overview

The application follows a modular architecture based on NestJS's module system. Each functional area is encapsulated in its own module with controllers, services, and related components.

### Key Modules

1. **App Module**: The root module that ties everything together
2. **Auth Module**: Handles user authentication and authorization
3. **Email Module**: Core email functionality (sending, receiving, organizing)
4. **Microsoft Graph Module**: Integration with Microsoft's Graph API
5. **Users Module**: User management
6. **Prisma Module**: Database access and ORM functionality
7. **Cache Module**: Redis-based caching for performance optimization
8. **Tracing Module**: Distributed tracing for monitoring and debugging
9. **Health Module**: Application health monitoring
10. **Chaos Module**: Resilience testing with fault injection

### Data Model

The application uses Prisma ORM with a PostgreSQL database. Key entities include:

#### User
- Personal information (name, email)
- Authentication details (password)
- Role-based access control (USER, ADMIN)
- Email configuration (hosts, ports, credentials)
- Protocol preferences (IMAP, POP3, SMTP, Microsoft Graph)
- Soft delete support

#### Email
- Message metadata (from, to, cc, bcc, subject)
- Content (text, HTML)
- Status flags (read, flagged, deleted, spam, draft, sent)
- Folder organization
- Timestamps (received, sent, created, updated)
- Attachments support
- Soft delete support

## Key Features

### Email Management
- **Multiple Protocol Support**: Retrieve emails via IMAP, POP3, or Microsoft Graph
- **Email Sending**: Send emails via SMTP or Microsoft Graph
- **Folder Organization**: Organize emails in folders
- **Status Management**: Mark emails as read/unread, flagged, deleted, etc.
- **Search & Filtering**: Find emails based on various criteria
- **Pagination**: Efficient retrieval of large email collections

### Authentication & Security
- **JWT Authentication**: Secure token-based authentication
- **Role-Based Access Control**: Different permissions for users and admins
- **Password Hashing**: Secure storage of user credentials
- **Rate Limiting**: Protection against abuse and DoS attacks

### Performance Optimization
- **Redis Caching**: Improve performance and reduce database load
- **Soft Delete**: Efficient handling of deleted records
- **Database Indexing**: Optimized queries with strategic indexes

### Monitoring & Resilience
- **Health Checks**: Monitor application health
- **Distributed Tracing**: Track request flow through the system
- **Metrics Collection**: Gather performance metrics
- **Chaos Testing**: Test application resilience with fault injection

### Developer Experience
- **API Documentation**: Swagger/OpenAPI and Scalar API Reference
- **Testing**: Comprehensive unit and integration tests
- **CI/CD**: Automated testing, building, and deployment
- **Docker Support**: Easy containerization for development and deployment
- **Kubernetes Support**: Production-ready container orchestration

## Implementation Details

### Soft Delete Pattern
The application implements a soft delete pattern for both users and emails. This allows "deleted" records to remain in the database but be excluded from normal queries. Implementation includes:

- `isDeleted` boolean field on entities
- Database indexes for query optimization
- Partial unique indexes for email uniqueness among active users
- Query filters to exclude deleted records

### Microsoft Graph Integration
The application integrates with Microsoft Graph API to provide:

- Email retrieval from Microsoft 365/Outlook accounts
- Email sending through Microsoft services
- Mail folder management
- Detailed email content retrieval

### Caching Strategy
Redis caching is implemented to improve performance:

- Transparent caching with configurable TTL
- Automatic cache invalidation on data updates/deletes
- Centralized cache service for consistent implementation
- Chaos testing for resilience when Redis fails

### Distributed Tracing
OpenTelemetry and Jaeger are used for distributed tracing:

- Request tracing across the application
- Performance analysis to identify bottlenecks
- Error tracking for troubleshooting
- Dependency visualization for service interactions

## API Endpoints

### Authentication
- `POST /api/auth/register`: Register a new user
- `POST /api/auth/login`: Login and get access token
- `GET /api/auth/profile`: Get current user profile

### Email Management
- `GET /email/config`: Get user email configuration
- `POST /email/config`: Update user email configuration
- `POST /email/send`: Send an email
- `GET /email/imap`: Fetch emails using IMAP
- `GET /email/pop3`: Fetch emails using POP3
- `GET /email`: Get emails from database
- `PATCH /email/:id/read`: Mark email as read
- `PATCH /email/:id/delete`: Mark email as deleted
- `PATCH /email/:id/move`: Move email to folder

### User Management
- `GET /api/users`: Get all users (admin only)
- `GET /api/users/:id`: Get user by ID
- `PATCH /api/users/:id`: Update user
- `DELETE /api/users/:id`: Delete user (admin only)

## Development & Deployment

### Local Development
The application supports local development with:
- npm/yarn scripts for common tasks
- Docker Compose for local dependencies
- Environment configuration via .env files
- Database migrations with Prisma

### Testing
Comprehensive testing is implemented with:
- Unit tests with Jest
- Integration tests
- Coverage reporting with Codecov
- Automated testing in CI/CD pipeline

### Deployment
The application can be deployed using:
- Docker containers
- Kubernetes manifests
- CI/CD automation with GitHub Actions

## Conclusion

The Email Client NestJS application provides a robust, secure, and scalable backend for email management. Its modular architecture, comprehensive feature set, and modern technology stack make it suitable for a wide range of email client applications.
