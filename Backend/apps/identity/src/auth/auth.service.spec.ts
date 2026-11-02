import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { getModelToken, MongooseModule } from '@nestjs/mongoose';
import { Test, type TestingModule } from '@nestjs/testing';
import { MongoMemoryServer } from 'mongodb-memory-server';
import type { Model } from 'mongoose';
import { AuthMailService } from '../mail/auth-mail.service.js';
import { User, UserSchema } from '../users/user.schema.js';
import { AuthService } from './auth.service.js';
import { GoogleVerifierService } from './google-verifier.service.js';
import { OneTimeTokenService } from './one-time-token.service.js';
import {
  OneTimeToken,
  OneTimeTokenSchema,
} from './schemas/one-time-token.schema.js';
import {
  RefreshToken,
  RefreshTokenSchema,
} from './schemas/refresh-token.schema.js';
import { SessionService } from './session.service.js';

const credentials = {
  fullName: 'Ana Silva',
  email: 'ana@example.com',
  password: 'abcd1234',
};
const googleProfile = {
  googleId: 'google-1',
  email: 'ana@example.com',
  fullName: 'Ana From Google',
};

describe('AuthService', () => {
  let mongo: MongoMemoryServer;
  let moduleRef: TestingModule;
  let auth: AuthService;
  let users: Model<User>;
  let refreshTokens: Model<RefreshToken>;
  const mail = {
    sendEmailVerification: vi.fn(),
    sendPasswordReset: vi.fn(),
  };
  const google = { verify: vi.fn() };

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ ignoreEnvFile: true }),
        JwtModule.register({
          secret: 'test-secret',
          signOptions: { expiresIn: '15m' },
        }),
        MongooseModule.forRoot(mongo.getUri()),
        MongooseModule.forFeature([
          { name: User.name, schema: UserSchema },
          { name: RefreshToken.name, schema: RefreshTokenSchema },
          { name: OneTimeToken.name, schema: OneTimeTokenSchema },
        ]),
      ],
      providers: [
        AuthService,
        SessionService,
        OneTimeTokenService,
        { provide: AuthMailService, useValue: mail },
        { provide: GoogleVerifierService, useValue: google },
      ],
    }).compile();

    auth = moduleRef.get(AuthService);
    users = moduleRef.get(getModelToken(User.name));
    refreshTokens = moduleRef.get(getModelToken(RefreshToken.name));
    await users.init();
  }, 120_000);

  afterAll(async () => {
    await moduleRef.close();
    await mongo.stop();
  });

  beforeEach(async () => {
    vi.clearAllMocks();
    await Promise.all(
      [User, RefreshToken, OneTimeToken].map(({ name }) =>
        moduleRef.get<Model<unknown>>(getModelToken(name)).deleteMany({}),
      ),
    );
  });

  async function signupAndVerify() {
    await auth.signup(credentials);
    const [, token] = mail.sendEmailVerification.mock.lastCall as string[];
    await auth.verifyEmail(token);
  }

  describe('signup and login', () => {
    it('stores a hash, never the password, and emails a verification link', async () => {
      await auth.signup(credentials);

      const user = await users.findOne({ email: credentials.email });
      expect(user?.passwordHash).toMatch(/^\$argon2/);
      expect(mail.sendEmailVerification).toHaveBeenCalledWith(
        credentials.email,
        expect.any(String),
      );
    });

    it('rejects a duplicate email', async () => {
      await auth.signup(credentials);
      await expect(auth.signup(credentials)).rejects.toMatchObject({
        status: 409,
      });
    });

    it('blocks login until the email is verified', async () => {
      await auth.signup(credentials);
      await expect(auth.login(credentials)).rejects.toMatchObject({
        status: 403,
      });
    });

    it('logs in after verification', async () => {
      await signupAndVerify();
      const session = await auth.login(credentials);
      expect(session.user.email).toBe(credentials.email);
      expect(session.accessToken).toBeTruthy();
    });

    it('gives the same answer for a wrong password and an unknown email', async () => {
      await signupAndVerify();
      const expected = {
        status: 401,
        message: 'Email or password is incorrect',
      };
      await expect(
        auth.login({ ...credentials, password: 'wrong1234' }),
      ).rejects.toMatchObject(expected);
      await expect(
        auth.login({ ...credentials, email: 'no@example.com' }),
      ).rejects.toMatchObject(expected);
    });

    it('does not reveal an unverified account to a wrong password', async () => {
      await auth.signup(credentials);
      await expect(
        auth.login({ ...credentials, password: 'wrong1234' }),
      ).rejects.toMatchObject({ status: 401 });
    });

    it('only accepts a verification link once', async () => {
      await auth.signup(credentials);
      const [, token] = mail.sendEmailVerification.mock.lastCall as string[];
      await auth.verifyEmail(token);
      await expect(auth.verifyEmail(token)).rejects.toMatchObject({
        status: 400,
      });
    });

    it('invalidates the old link when a new one is sent', async () => {
      await auth.signup(credentials);
      const [, oldToken] = mail.sendEmailVerification.mock.lastCall as string[];
      await auth.resendVerification(credentials.email);
      await expect(auth.verifyEmail(oldToken)).rejects.toMatchObject({
        status: 400,
      });
    });
  });

  describe('refresh tokens', () => {
    it('stores only a hash of the token', async () => {
      await signupAndVerify();
      const { refreshToken } = await auth.login(credentials);
      const stored = await refreshTokens.findOne({});
      expect(stored?.tokenHash).not.toBe(refreshToken);
    });

    it('rotates to a new token', async () => {
      await signupAndVerify();
      const first = await auth.login(credentials);
      const second = await auth.refresh(first.refreshToken);
      expect(second.refreshToken).not.toBe(first.refreshToken);
      await expect(auth.refresh(second.refreshToken)).resolves.toBeTruthy();
    });

    it('does not end the session when two tabs refresh together', async () => {
      await signupAndVerify();
      const first = await auth.login(credentials);
      const second = await auth.refresh(first.refreshToken);

      await expect(auth.refresh(first.refreshToken)).rejects.toMatchObject({
        status: 401,
      });
      await expect(auth.refresh(second.refreshToken)).resolves.toBeTruthy();
    });

    it('ends the whole session when an old token is replayed later', async () => {
      await signupAndVerify();
      const first = await auth.login(credentials);
      const second = await auth.refresh(first.refreshToken);
      await refreshTokens.updateMany(
        { rotatedAt: { $ne: null } },
        { rotatedAt: new Date(Date.now() - 60_000) },
      );

      await expect(auth.refresh(first.refreshToken)).rejects.toMatchObject({
        status: 401,
      });
      await expect(auth.refresh(second.refreshToken)).rejects.toMatchObject({
        status: 401,
      });
    });

    it('rejects an expired token', async () => {
      await signupAndVerify();
      const { refreshToken } = await auth.login(credentials);
      await refreshTokens.updateMany({}, { expiresAt: new Date(0) });
      await expect(auth.refresh(refreshToken)).rejects.toMatchObject({
        status: 401,
      });
    });

    it('stops working after logout', async () => {
      await signupAndVerify();
      const { refreshToken } = await auth.login(credentials);
      await auth.logout(refreshToken);
      await expect(auth.refresh(refreshToken)).rejects.toMatchObject({
        status: 401,
      });
    });
  });

  describe('Google sign-in', () => {
    beforeEach(() => google.verify.mockResolvedValue(googleProfile));

    it('creates a verified account for a new user', async () => {
      const session = await auth.loginWithGoogle('id-token');
      expect(session.isNewUser).toBe(true);
      const user = await users.findOne({ email: googleProfile.email });
      expect(user?.emailVerifiedAt).toBeInstanceOf(Date);
    });

    it('recognises a returning user', async () => {
      await auth.loginWithGoogle('id-token');
      const session = await auth.loginWithGoogle('id-token');
      expect(session.isNewUser).toBe(false);
      expect(await users.countDocuments()).toBe(1);
    });

    it('links to a verified account and keeps its password', async () => {
      await signupAndVerify();
      const session = await auth.loginWithGoogle('id-token');
      expect(session.isNewUser).toBe(false);
      await expect(auth.login(credentials)).resolves.toBeTruthy();
    });

    it('removes a password set by someone who never verified the email', async () => {
      await auth.signup(credentials);
      await auth.loginWithGoogle('id-token');
      await expect(auth.login(credentials)).rejects.toMatchObject({
        status: 401,
      });
    });
  });

  describe('password reset', () => {
    it('stays silent for an unknown email', async () => {
      await expect(
        auth.forgotPassword('no@example.com'),
      ).resolves.toBeUndefined();
      expect(mail.sendPasswordReset).not.toHaveBeenCalled();
    });

    it('changes the password, ends sessions and works only once', async () => {
      await signupAndVerify();
      const { refreshToken } = await auth.login(credentials);
      await auth.forgotPassword(credentials.email);
      const [, token] = mail.sendPasswordReset.mock.lastCall as string[];

      await auth.resetPassword({ token, password: 'newpass123' });

      await expect(auth.refresh(refreshToken)).rejects.toMatchObject({
        status: 401,
      });
      await expect(auth.login(credentials)).rejects.toMatchObject({
        status: 401,
      });
      await expect(
        auth.login({ ...credentials, password: 'newpass123' }),
      ).resolves.toBeTruthy();
      await expect(
        auth.resetPassword({ token, password: 'another123' }),
      ).rejects.toMatchObject({ status: 400 });
    });
  });

  describe('delete account', () => {
    it('removes the user and all their tokens', async () => {
      await signupAndVerify();
      const { user, refreshToken } = await auth.login(credentials);

      await auth.deleteAccount(user.id);

      expect(await users.countDocuments()).toBe(0);
      expect(await refreshTokens.countDocuments()).toBe(0);
      await expect(auth.refresh(refreshToken)).rejects.toMatchObject({
        status: 401,
      });
    });
  });
});
