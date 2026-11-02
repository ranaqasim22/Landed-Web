import { getModelToken, MongooseModule } from '@nestjs/mongoose';
import { Test, type TestingModule } from '@nestjs/testing';
import { MongoMemoryServer } from 'mongodb-memory-server';
import type { Model } from 'mongoose';
import { User, UserSchema } from './user.schema.js';
import { UsersService } from './users.service.js';

describe('UsersService', () => {
  let mongo: MongoMemoryServer;
  let moduleRef: TestingModule;
  let service: UsersService;
  let users: Model<User>;
  let userId: string;

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    moduleRef = await Test.createTestingModule({
      imports: [
        MongooseModule.forRoot(mongo.getUri()),
        MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
      ],
      providers: [UsersService],
    }).compile();
    service = moduleRef.get(UsersService);
    users = moduleRef.get(getModelToken(User.name));
  }, 120_000);

  afterAll(async () => {
    await moduleRef.close();
    await mongo.stop();
  });

  beforeEach(async () => {
    await users.deleteMany({});
    const user = await users.create({
      fullName: 'Ana Silva',
      email: 'ana@example.com',
      passwordHash: 'secret-hash',
    });
    userId = user.id as string;
  });

  it('starts with onboarding unfinished and hides private fields', async () => {
    const me = await service.getMe(userId);
    expect(me.onboardingCompleted).toBe(false);
    expect(me.onboardingSkipped).toBe(false);
    expect(me).not.toHaveProperty('passwordHash');
    expect(me).not.toHaveProperty('googleId');
  });

  it('saves one step at a time without losing earlier answers', async () => {
    await service.updateMe(userId, {
      country: 'Pakistan',
      targetDegree: 'master',
    });
    const me = await service.updateMe(userId, {
      intake: { season: 'WS', year: 2027 },
      embassy: 'Karachi',
    });
    expect(me).toMatchObject({
      country: 'Pakistan',
      targetDegree: 'master',
      intake: { season: 'WS', year: 2027 },
      embassy: 'Karachi',
    });
  });

  it('removes an avatar when it is set to null', async () => {
    await service.updateMe(userId, { avatarUrl: 'http://cdn/a.jpg' });
    const me = await service.updateMe(userId, { avatarUrl: null });
    expect(me.avatarUrl).toBeNull();
  });

  it('refuses to finish without a degree and intake', async () => {
    await expect(
      service.updateMe(userId, { onboardingCompleted: true }),
    ).rejects.toMatchObject({ status: 400 });
    expect((await service.getMe(userId)).onboardingCompleted).toBe(false);
  });

  it('finishes once the degree and intake are saved', async () => {
    await service.updateMe(userId, {
      targetDegree: 'phd',
      intake: { season: 'SS', year: 2028 },
    });
    const me = await service.updateMe(userId, { onboardingCompleted: true });
    expect(me.onboardingCompleted).toBe(true);
  });

  it('lets a user skip with nothing filled in', async () => {
    const me = await service.updateMe(userId, { onboardingSkipped: true });
    expect(me.onboardingSkipped).toBe(true);
    expect(me.onboardingCompleted).toBe(false);
  });

  it('answers 404 for an account that no longer exists', async () => {
    await users.deleteMany({});
    await expect(service.getMe(userId)).rejects.toMatchObject({ status: 404 });
  });
});
