import type { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { ClientsModule } from '@nestjs/microservices';
import { Test } from '@nestjs/testing';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { IDENTITY_SERVICE, IdentityPatterns } from '@app/common';
import { of, throwError } from 'rxjs';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { AllExceptionsFilter } from '../common/all-exceptions.filter.js';
import { configureHttp } from '../common/configure-http.js';
import { AuthModule } from './auth.module.js';

const SECRET = 'test-secret';
const session = {
  user: { id: '1', email: 'ana@example.com', fullName: 'Ana Silva' },
  accessToken: 'access',
  refreshToken: 'refresh-secret',
  refreshExpiresAt: new Date(Date.now() + 60_000).toISOString(),
};

describe('AuthController', () => {
  let app: INestApplication<App>;
  const identity = { send: vi.fn() };

  beforeEach(async () => {
    identity.send.mockReset();
    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          load: [
            () => ({
              JWT_ACCESS_SECRET: SECRET,
              FRONTEND_URL: 'http://localhost:5173',
            }),
          ],
        }),
        ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
        ClientsModule.register({
          isGlobal: true,
          clients: [{ name: IDENTITY_SERVICE }],
        }),
        AuthModule,
      ],
      providers: [
        { provide: APP_GUARD, useClass: ThrottlerGuard },
        { provide: APP_FILTER, useClass: AllExceptionsFilter },
      ],
    })
      .overrideProvider(IDENTITY_SERVICE)
      .useValue(identity)
      .compile();

    app = moduleRef.createNestApplication();
    configureHttp(app);
    await app.init();
  });

  afterEach(() => app.close());

  const api = () => request(app.getHttpServer());

  it('keeps the refresh token in an httpOnly cookie and out of the body', async () => {
    identity.send.mockReturnValue(of(session));

    const response = await api()
      .post('/api/auth/login')
      .send({ email: ' Ana@Example.com ', password: 'secret' })
      .expect(200);

    expect(response.body).toEqual({
      user: session.user,
      accessToken: 'access',
    });
    const [cookie] = response.get('Set-Cookie') ?? [];
    expect(cookie).toContain('landed_refresh=refresh-secret');
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('Path=/api/auth');
    expect(identity.send).toHaveBeenCalledWith(IdentityPatterns.login, {
      email: 'ana@example.com',
      password: 'secret',
    });
  });

  it('returns field errors in the standard shape', async () => {
    const response = await api()
      .post('/api/auth/signup')
      .send({ fullName: ' ', email: 'nope', password: 'short' })
      .expect(400);

    expect(response.body.statusCode).toBe(400);
    expect(response.body.message).toBe('Please check the highlighted fields');
    expect(response.body.errors.fullName).toEqual(['Enter your full name']);
    expect(response.body.errors.email).toEqual([
      'Enter a valid email, like name@example.com',
    ]);
    expect(response.body.errors.password).toEqual(
      expect.arrayContaining([
        'Use at least 8 characters',
        'Use at least 1 number',
      ]),
    );
    expect(identity.send).not.toHaveBeenCalled();
  });

  it('passes a service error through with its status', async () => {
    identity.send.mockReturnValue(
      throwError(() => ({
        statusCode: 401,
        message: 'Email or password is incorrect',
      })),
    );

    const response = await api()
      .post('/api/auth/login')
      .send({ email: 'ana@example.com', password: 'wrong' })
      .expect(401);

    expect(response.body.message).toBe('Email or password is incorrect');
  });

  it('reports an unreachable service as a temporary outage', async () => {
    identity.send.mockReturnValue(throwError(() => new Error('no connection')));

    await api()
      .post('/api/auth/login')
      .send({ email: 'ana@example.com', password: 'secret' })
      .expect(503);
  });

  it('refuses to refresh without the cookie', async () => {
    await api().post('/api/auth/refresh').expect(401);
    expect(identity.send).not.toHaveBeenCalled();
  });

  it('rotates the cookie on refresh', async () => {
    identity.send.mockReturnValue(of(session));

    const response = await api()
      .post('/api/auth/refresh')
      .set('Cookie', 'landed_refresh=old-token')
      .expect(200);

    expect(identity.send).toHaveBeenCalledWith(IdentityPatterns.refresh, {
      refreshToken: 'old-token',
    });
    expect(response.get('Set-Cookie')?.[0]).toContain(
      'landed_refresh=refresh-secret',
    );
  });

  it('clears the cookie on logout', async () => {
    identity.send.mockReturnValue(of({}));

    const response = await api()
      .post('/api/auth/logout')
      .set('Cookie', 'landed_refresh=old-token')
      .expect(204);

    expect(response.get('Set-Cookie')?.[0]).toContain('landed_refresh=;');
  });

  it('redirects to the site after opening a verification link', async () => {
    identity.send.mockReturnValueOnce(of({}));
    await api()
      .get('/api/auth/verify-email?token=good')
      .expect(302)
      .expect('Location', 'http://localhost:5173/login?verified=true');

    identity.send.mockReturnValueOnce(
      throwError(() => ({ statusCode: 400, message: 'bad' })),
    );
    await api()
      .get('/api/auth/verify-email?token=bad')
      .expect(302)
      .expect('Location', 'http://localhost:5173/login?verified=false');
  });

  it('needs a valid access token to delete an account', async () => {
    await api().delete('/api/auth/account').expect(401);
    await api()
      .delete('/api/auth/account')
      .set('Authorization', 'Bearer not-a-token')
      .expect(401);
    expect(identity.send).not.toHaveBeenCalled();

    identity.send.mockReturnValue(of({}));
    const token = await new JwtService({ secret: SECRET }).signAsync({
      sub: 'user-1',
    });
    await api()
      .delete('/api/auth/account')
      .set('Authorization', `Bearer ${token}`)
      .expect(204);
    expect(identity.send).toHaveBeenCalledWith(IdentityPatterns.deleteAccount, {
      userId: 'user-1',
    });
  });

  it('rate limits auth routes to 10 requests a minute', async () => {
    identity.send.mockReturnValue(of({}));
    const send = () =>
      api().post('/api/auth/forgot-password').send({ email: 'a@b.co' });

    for (let i = 0; i < 10; i++) await send().expect(200);
    await send().expect(429);
  });
});
