// Deno type declarations
declare global {
  interface Deno {
    env: {
      get(key: string): string | undefined;
    };
  }
}

// Import polyfills and compatibility layers first
import 'reflect-metadata';

// Import NestJS core
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory, Reflector } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { apiReference } from '@scalar/nestjs-api-reference';

// Import application modules
import { DenoMinimalAppModule } from './deno-minimal-app.module';
import { RateLimitGuard } from './common/guards/throttler.guard';
import { CustomScalars } from './common/scalars/index';

// Deno-specific session handling (simplified for Deno compatibility)
const session = {
  session: (_options: Record<string, unknown>) => {
    return (
      req: Record<string, unknown>,
      _res: Record<string, unknown>,
      next: () => void,
    ) => {
      // Simplified session implementation for Deno
      req.session = {};
      next();
    };
  },
};

/**
 * Initializes and starts the NestJS application with Deno compatibility.
 */
async function bootstrap() {
  // Create the NestJS application
  const app = await NestFactory.create(DenoMinimalAppModule);
  const _configService = app.get(ConfigService);

  // Enable CORS
  app.enableCors();

  // Global prefix
  app.setGlobalPrefix('api');

  // Configure simplified session middleware for Deno
  app.use(
    session.session({
      secret:
        (
          globalThis as unknown as {
            Deno: { env: { get: (key: string) => string | undefined } };
          }
        ).Deno?.env.get('SESSION_SECRET') || 'msal-session-secret',
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure:
          (
            globalThis as unknown as {
              Deno: { env: { get: (key: string) => string | undefined } };
            }
          ).Deno?.env.get('DENO_ENV') === 'production',
        maxAge: 60 * 60 * 1000, // 1 hour
      },
    }),
  );

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Apply the rate limit guard globally
  const reflector = app.get(Reflector);
  app.useGlobalGuards(new RateLimitGuard(reflector));

  // Setup Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('NestJS Email Client API')
    .setDescription('API documentation for NestJS Email Client project.')
    .setVersion('1.0')
    .addServer('https://email-client-nestjs.deno.dev', 'Deno Deploy server')
    .addTag(
      'auth',
      'Authentication endpoints for login, registration, and profile management',
    )
    .addTag('email', 'Email management endpoints')
    .setContact(
      'API Support',
      'https://github.com/dhiazfathra/email-client-nestjs',
      'support@example.com',
    )
    .setLicense('MIT', 'https://opensource.org/licenses/MIT')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);

  // Add custom scalar types to schema
  Object.entries(CustomScalars).forEach(([name, schema]) => {
    document.components.schemas[name] = schema;
  });

  // Set up standard Swagger UI
  SwaggerModule.setup('api/docs', app, document);

  // Set up Scalar API Reference
  app.use(
    '/api/reference',
    apiReference({
      // Use the Swagger document we created
      content: document,
      // Use the NestJS theme
      theme: 'nestjs',
      // Pin to a specific version for stability
      cdn: 'https://cdn.jsdelivr.net/npm/@scalar/api-reference@1.25.28',
      // Additional configuration
      layout: 'modern',
      title: 'NestJS Email Client API Reference',
      logo: 'https://nestjs.com/img/logo-small.svg',
      favicon: 'https://nestjs.com/img/favicon.png',
    }),
  );

  // For Deno Deploy, we need to listen on the port provided by the environment
  // or default to 8000 which is Deno Deploy's standard port
  const port =
    (
      globalThis as unknown as {
        Deno: { env: { get: (key: string) => string | undefined } };
      }
    ).Deno?.env.get('PORT') || '8000';
  await app.listen(Number(port));
  console.log(`Application is running on port ${port}`);
}

// Start the application
bootstrap();
