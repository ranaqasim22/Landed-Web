import type { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { ClientsModule } from '@nestjs/microservices';
import { Test } from '@nestjs/testing';
import { IDENTITY_SERVICE, IdentityPatterns } from '@app/common';
import { of } from 'rxjs';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { AllExceptionsFilter } from '../common/all-exceptions.filter.js';
import { configureHttp } from '../common/configure-http.js';
import { UsersModule } from './users.module.js';

const SECRET = 'test-secret';
const PUBLIC_URL = 'http://cdn.test/bucket';

describe('users and uploads routes', () => {
  let app: INestApplication<App>;
  let token: string;
  const identity = { send: vi.fn() };

  beforeAll(async () => {
    token = await new JwtService({ secret: SECRET }).signAsync({
      sub: 'user-1',
    });
  });

  beforeEach(async () => {
    identity.send.mockReset();
    identity.send.mockReturnValue(of({ id: 'user-1' }));
    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          load: [
            () => ({
              JWT_ACCESS_SECRET: SECRET,
              FRONTEND_URL: 'http://localhost:5173',
              S3_ENDPOINT: 'http://storage.test',
              S3_BUCKET: 'bucket',
              S3_PUBLIC_URL: PUBLIC_URL,
              S3_ACCESS_KEY: 'key',
              S3_SECRET_KEY: 'secret',
            }),
          ],
        }),
        ClientsModule.register({
          isGlobal: true,
          clients: [{ name: IDENTITY_SERVICE }],
        }),
        UsersModule,
      ],
      providers: [{ provide: APP_FILTER, useClass: AllExceptionsFilter }],
    })
      .overrideProvider(IDENTITY_SERVICE)
      .useValue(identity)
      .compile();
    app = moduleRef.createNestApplication();
    configureHttp(app);
    await app.init();
  });

  afterEach(() => app.close());

  const patch = (body: object) =>
    request(app.getHttpServer())
      .patch('/api/users/me')
      .set('Authorization', `Bearer ${token}`)
      .send(body);

  const presign = (body: object) =>
    request(app.getHttpServer())
      .post('/api/uploads/presign')
      .set('Authorization', `Bearer ${token}`)
      .send(body);

  it('needs a login', async () => {
    const server = app.getHttpServer();
    await request(server).get('/api/users/me').expect(401);
    await request(server).patch('/api/users/me').send({}).expect(401);
    await request(server).post('/api/uploads/presign').send({}).expect(401);
  });

  it('returns the current user', async () => {
    await request(app.getHttpServer())
      .get('/api/users/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(identity.send).toHaveBeenCalledWith(IdentityPatterns.getMe, {
      userId: 'user-1',
    });
  });

  it('accepts valid answers and ignores unknown fields', async () => {
    await patch({
      targetDegree: 'master',
      intake: { season: 'WS', year: 2027 },
      stage: 'applied',
      bio: '  Hello  ',
      email: 'hacker@example.com',
      passwordHash: 'x',
    }).expect(200);

    const [, payload] = identity.send.mock.lastCall as [
      string,
      { changes: Record<string, unknown> },
    ];
    expect(payload.changes).toMatchObject({
      targetDegree: 'master',
      stage: 'applied',
      bio: 'Hello',
    });
    expect(payload.changes).not.toHaveProperty('email');
    expect(payload.changes).not.toHaveProperty('passwordHash');
  });

  it.each([
    [{ targetDegree: 'wizard' }],
    [{ stage: 'nope' }],
    [{ intake: { season: 'AUTUMN', year: 2027 } }],
    [{ intake: { season: 'WS', year: 'soon' } }],
    [{ bio: 'x'.repeat(161) }],
    [{ fullName: '   ' }],
  ])('rejects %j', async (body) => {
    await patch(body).expect(400);
    expect(identity.send).not.toHaveBeenCalled();
  });

  it('only accepts an avatar this user uploaded', async () => {
    await patch({ avatarUrl: 'http://evil.test/a.jpg' }).expect(400);
    await patch({
      avatarUrl: `${PUBLIC_URL}/avatars/someone-else/a.jpg`,
    }).expect(400);
    expect(identity.send).not.toHaveBeenCalled();

    await patch({ avatarUrl: `${PUBLIC_URL}/avatars/user-1/a.jpg` }).expect(
      200,
    );
  });

  it('allows removing the avatar', async () => {
    await patch({ avatarUrl: null }).expect(200);
    expect(identity.send).toHaveBeenCalledWith(IdentityPatterns.updateMe, {
      userId: 'user-1',
      changes: { avatarUrl: null },
    });
  });

  it('signs an upload scoped to this user', async () => {
    const { body } = await presign({
      contentType: 'image/png',
      size: 1000,
    }).expect(201);

    expect(body.fileUrl).toMatch(
      new RegExp(`^${PUBLIC_URL}/avatars/user-1/.+\\.png$`),
    );
    expect(body.uploadUrl).toContain('X-Amz-Signature');
    expect(body.uploadUrl).toContain('content-length');
  });

  it.each([
    [{ contentType: 'application/pdf', size: 1000 }],
    [{ contentType: 'image/gif', size: 1000 }],
    [{ contentType: 'image/png', size: 5 * 1024 * 1024 + 1 }],
    [{ contentType: 'image/png', size: 0 }],
  ])('refuses to sign %j', async (body) => {
    await presign(body).expect(400);
  });
});
