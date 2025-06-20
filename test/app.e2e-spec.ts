import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { Role } from '@prisma/client';
import * as request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service';
import { AppModule } from './../src/app.module';

describe('NestJS Starter E2E Tests', () => {
  let app: INestApplication;
  let prismaService: PrismaService;
  // jwtService is not used directly but it's needed for app initialization
  let _jwtService: JwtService;

  // Test user data
  const adminUser = {
    email: 'admin@example.com',
    password: 'Password123!',
    name: 'Admin User',
  };

  const regularUser = {
    email: 'user@example.com',
    password: 'Password123!',
    name: 'Regular User',
  };

  // Store tokens and IDs for tests
  let adminToken: string;
  let userToken: string;
  let adminId: string;
  let userId: string;

  beforeAll(async () => {
    // Create the testing module
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    // Create and initialize the app with validation pipe
    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();

    // Get services
    prismaService = app.get(PrismaService);
    _jwtService = app.get(JwtService);

    // Clean database before tests
    await prismaService.user.deleteMany();
  });

  afterAll(async () => {
    // Clean up database after tests
    await prismaService.user.deleteMany();
    await app.close();
  });

  describe('App Controller', () => {
    it('/ (GET) - should return welcome message', () => {
      return request(app.getHttpServer())
        .get('/')
        .expect(200)
        .expect('Hello World!');
    });

    it('/health (GET) - should return health status', () => {
      return request(app.getHttpServer())
        .get('/health')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('status');
          expect(res.body).toHaveProperty('timestamp');
          expect(res.body.status).toBe('ok');
        });
    });
  });

  describe('Auth Module', () => {
    it('/auth/register (POST) - should register a new user', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send(regularUser)
        .expect(201);

      userId = response.body.id;

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('email', regularUser.email);
      expect(response.body).toHaveProperty('name', regularUser.name);
      expect(response.body).toHaveProperty('role', Role.USER);
      expect(response.body).not.toHaveProperty('password');
    });

    it('/auth/register (POST) - should fail with duplicate email', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send(regularUser)
        .expect(409);
    });

    it('/auth/register (POST) - should fail with invalid data', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'invalid-email',
          password: 'short',
        })
        .expect(400);
    });

    it('/auth/login (POST) - should login and return token', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: regularUser.email,
          password: regularUser.password,
        })
        .expect(200);

      userToken = response.body.access_token;

      expect(response.body).toHaveProperty('access_token');
      expect(typeof response.body.access_token).toBe('string');
    });

    it('/auth/login (POST) - should fail with wrong credentials', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: regularUser.email,
          password: 'wrong-password',
        })
        .expect(401);
    });

    it('/auth/profile (GET) - should return user profile with valid token', async () => {
      return request(app.getHttpServer())
        .get('/auth/profile')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('id', userId);
          expect(res.body).toHaveProperty('email', regularUser.email);
          expect(res.body).toHaveProperty('name', regularUser.name);
          expect(res.body).toHaveProperty('role', Role.USER);
        });
    });

    it('/auth/profile (GET) - should fail with invalid token', () => {
      return request(app.getHttpServer())
        .get('/auth/profile')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });
  });

  describe('Users Module', () => {
    // Register admin user and update role
    beforeAll(async () => {
      // Register admin
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send(adminUser)
        .expect(201);

      adminId = response.body.id;

      // Update admin role
      await prismaService.user.update({
        where: { id: adminId },
        data: { role: Role.ADMIN },
      });

      // Login as admin
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: adminUser.email,
          password: adminUser.password,
        })
        .expect(200);

      adminToken = loginResponse.body.access_token;
    });

    it('/users (GET) - should return all users for admin', async () => {
      return request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBeGreaterThanOrEqual(2);
          expect(res.body.some((user) => user.id === adminId)).toBe(true);
          expect(res.body.some((user) => user.id === userId)).toBe(true);
        });
    });

    it('/users (GET) - should fail for regular user', async () => {
      return request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });

    it('/users/:id (GET) - should return user by id', async () => {
      return request(app.getHttpServer())
        .get(`/users/${userId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('id', userId);
          expect(res.body).toHaveProperty('email', regularUser.email);
          expect(res.body).toHaveProperty('name', regularUser.name);
        });
    });

    it('/users/:id (GET) - should fail with invalid id', async () => {
      return request(app.getHttpServer())
        .get('/users/invalid-id')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(404);
    });

    it('/users/:id (PATCH) - should update user', async () => {
      const updatedName = 'Updated User Name';

      return request(app.getHttpServer())
        .patch(`/users/${userId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ name: updatedName })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('id', userId);
          expect(res.body).toHaveProperty('name', updatedName);
        });
    });

    it('/users/:id (PATCH) - should fail with invalid data', async () => {
      return request(app.getHttpServer())
        .patch(`/users/${userId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ email: 'invalid-email' })
        .expect(400);
    });

    it('/users/:id (DELETE) - should fail for regular user', async () => {
      return request(app.getHttpServer())
        .delete(`/users/${adminId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });

    it('/users/:id (DELETE) - should delete user for admin', async () => {
      // Create a test user to delete
      const testUser = {
        email: 'delete-test@example.com',
        password: 'Password123!',
        name: 'Delete Test User',
      };

      const createResponse = await request(app.getHttpServer())
        .post('/auth/register')
        .send(testUser)
        .expect(201);

      const testUserId = createResponse.body.id;

      // Delete the test user
      return request(app.getHttpServer())
        .delete(`/users/${testUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('id', testUserId);
        });
    });
  });

  describe('Health Module', () => {
    it('/health (GET) - should return health check status', () => {
      return request(app.getHttpServer())
        .get('/health')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('status');
          expect(res.body.status).toBe('ok');
          expect(res.body).toHaveProperty('info');
          expect(res.body.info).toHaveProperty('database');
        });
    });
  });

  describe('Chaos Module', () => {
    it('/chaos/status (GET) - should return chaos status for admin', () => {
      return request(app.getHttpServer())
        .get('/chaos/status')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('message');
          expect(res.body).toHaveProperty('redisEnabled');
          expect(res.body).toHaveProperty('chaosProbability');
        });
    });

    it('/chaos/status (GET) - should fail for regular user', () => {
      return request(app.getHttpServer())
        .get('/chaos/status')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });

    it('/chaos/toggle-redis (POST) - should toggle redis for admin', () => {
      return request(app.getHttpServer())
        .post('/chaos/toggle-redis')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ enabled: false })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('message');
          expect(res.body.message).toContain('Redis cache disabled');
        });
    });

    it('/chaos/set-probability (POST) - should set chaos probability for admin', () => {
      return request(app.getHttpServer())
        .post('/chaos/set-probability')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ probability: 0.5 })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('message');
          expect(res.body.message).toContain(
            'Set Redis chaos probability to 0.5',
          );
        });
    });

    it('/chaos/set-probability (POST) - should fail with invalid probability', () => {
      return request(app.getHttpServer())
        .post('/chaos/set-probability')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ probability: 2 })
        .expect(400);
    });
  });

  describe('Rate Limiting', () => {
    it('should apply rate limiting after exceeding the limit', async () => {
      // The test endpoint is configured with a limit of 3 requests per 10 seconds
      // First make 3 requests that should succeed
      for (let i = 0; i < 3; i++) {
        await request(app.getHttpServer())
          .get('/test/rate-limit')
          .expect(200)
          .expect((res) => {
            expect(res.body).toHaveProperty(
              'message',
              'Rate limit test endpoint',
            );
          });
      }

      // The 4th request should be rate limited
      const response = await request(app.getHttpServer())
        .get('/test/rate-limit')
        .expect(429);

      // Verify the presence of the Retry-After header
      expect(response.headers).toHaveProperty('retry-after');
      expect(parseInt(response.headers['retry-after'], 10)).toBeGreaterThan(0);
    });
  });
});
