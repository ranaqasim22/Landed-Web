import { Global, HttpException, Module } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { getModelToken, MongooseModule } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import {
  COMMUNITY_SERVICE,
  IDENTITY_SERVICE,
  IdentityPatterns,
} from '@app/common';
import type { FeedPage, PostView, UserCard } from '@app/common';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { Types, type Model } from 'mongoose';
import { from, of, throwError } from 'rxjs';
import request from 'supertest';
import { FeedController as ServiceFeedController } from '../apps/community/src/feed/feed.controller.js';
import { FeedModule } from '../apps/community/src/feed/feed.module.js';
import { REDIS_CLIENT } from '../apps/community/src/feed/tags.service.js';
import { Post } from '../apps/community/src/posts/post.schema.js';
import { PostsController as ServicePostsController } from '../apps/community/src/posts/posts.controller.js';
import { PostsModule } from '../apps/community/src/posts/posts.module.js';
import { Reaction } from '../apps/community/src/posts/reaction.schema.js';
import { ScoreService } from '../apps/community/src/scoring/score.service.js';
import { configureHttp } from '../apps/gateway/src/common/configure-http.js';
import { CommunityModule } from '../apps/gateway/src/community/community.module.js';
import { FeedEventsGateway } from '../apps/gateway/src/community/feed-events.gateway.js';

const ana = new Types.ObjectId().toString();
const ben = new Types.ObjectId().toString();
const cards: UserCard[] = [
  {
    id: ana,
    fullName: 'Ana Silva',
    embassy: 'Karachi',
    intake: { season: 'WS', year: 2027 },
  },
  {
    id: ben,
    fullName: 'Ben Okafor',
    embassy: 'Lagos',
    intake: { season: 'SS', year: 2028 },
  },
];

const PATTERN_METADATA = 'microservices:pattern';
type Handler = (payload: unknown) => unknown;
const handlers = new Map<string, Handler>();

// Sends each message straight to the real service controller, with the same error shape Redis carries.
const communityClient = {
  send: (pattern: string, payload: unknown) => {
    const handler = handlers.get(pattern);
    if (!handler)
      return throwError(() => new Error(`No handler for ${pattern}`));
    return from(
      Promise.resolve()
        .then(() => handler(payload))
        .catch((error: unknown) => {
          if (error instanceof HttpException) {
            throw { statusCode: error.getStatus(), message: error.message };
          }
          throw error;
        }),
    );
  },
};

const identityClient = {
  send: (pattern: string, payload: { userIds: string[] }) =>
    pattern === IdentityPatterns.getUserCards
      ? of(cards.filter(({ id }) => payload.userIds.includes(id)))
      : throwError(() => new Error(`Unexpected ${pattern}`)),
};

@Global()
@Module({
  providers: [
    { provide: IDENTITY_SERVICE, useValue: identityClient },
    { provide: COMMUNITY_SERVICE, useValue: communityClient },
  ],
  exports: [IDENTITY_SERVICE, COMMUNITY_SERVICE],
})
class FakeTransportModule {}

function registerHandlers(controller: object) {
  const prototype = Object.getPrototypeOf(controller) as Record<
    string,
    Handler
  >;
  for (const name of Object.getOwnPropertyNames(prototype)) {
    const patterns = Reflect.getMetadata(PATTERN_METADATA, prototype[name]) as
      string[] | undefined;
    patterns?.forEach((pattern) =>
      handlers.set(pattern, (payload) =>
        prototype[name].call(controller, payload),
      ),
    );
  }
}

describe('Feed API', () => {
  let mongo: MongoMemoryReplSet;
  let app: INestApplication;
  let posts: Model<Post>;
  let reactions: Model<Reaction>;
  let scores: ScoreService;
  let anaToken: string;
  let benToken: string;
  const cache = new Map<string, string>();

  const as = (token: string) => ({ Authorization: `Bearer ${token}` });
  const http = () => request(app.getHttpServer());

  async function seedPost(
    overrides: Partial<Post> & { createdAt?: Date } = {},
  ) {
    const createdAt = overrides.createdAt ?? new Date();
    const post = await posts.create({
      authorId: new Types.ObjectId(ben),
      text: 'A question',
      ...overrides,
      createdAt,
      updatedAt: createdAt,
    });
    return post.id as string;
  }

  async function getFeed(
    tab: string,
    token = anaToken,
    limit = 10,
    cursor?: string,
  ) {
    const { body } = await http()
      .get('/api/feed')
      .query({ tab, limit, ...(cursor && { cursor }) })
      .set(as(token))
      .expect(200);
    return body as FeedPage;
  }

  async function walkFeed(tab: string, limit: number) {
    const ids: string[] = [];
    let cursor: string | undefined;
    do {
      const page = await getFeed(tab, anaToken, limit, cursor);
      expect(page.items.length).toBeLessThanOrEqual(limit);
      ids.push(...page.items.map(({ id }) => id));
      cursor = page.nextCursor ?? undefined;
    } while (cursor);
    return ids;
  }

  beforeAll(async () => {
    mongo = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          load: [
            () => ({
              JWT_ACCESS_SECRET: 'test-secret',
              FRONTEND_URL: 'http://localhost:5173',
              REDIS_HOST: 'localhost',
              REDIS_PORT: '6379',
            }),
          ],
        }),
        MongooseModule.forRoot(mongo.getUri('landed_test')),
        FakeTransportModule,
        PostsModule,
        FeedModule,
        CommunityModule,
      ],
      providers: [ScoreService],
    })
      .overrideProvider(REDIS_CLIENT)
      .useValue({
        get: (key: string) => Promise.resolve(cache.get(key) ?? null),
        set: (key: string, value: string) => {
          cache.set(key, value);
          return Promise.resolve('OK');
        },
        del: (key: string) => Promise.resolve(cache.delete(key) ? 1 : 0),
      })
      .compile();

    app = moduleRef.createNestApplication();
    configureHttp(app);
    await app.init();

    registerHandlers(app.get(ServicePostsController));
    registerHandlers(app.get(ServiceFeedController));

    posts = app.get(getModelToken(Post.name));
    reactions = app.get(getModelToken(Reaction.name));
    scores = app.get(ScoreService);
    const jwt = app.get(JwtService);
    anaToken = await jwt.signAsync({ sub: ana });
    benToken = await jwt.signAsync({ sub: ben });
    await Promise.all([posts.init(), reactions.init()]);
  }, 180_000);

  afterAll(async () => {
    await app.close();
    await mongo.stop();
  });

  beforeEach(async () => {
    cache.clear();
    await Promise.all([
      posts.deleteMany({}),
      reactions.deleteMany({}),
      app.get<Model<unknown>>(getModelToken('SavedPost')).deleteMany({}),
    ]);
  });

  it('needs a logged-in user', async () => {
    await http().get('/api/feed').expect(401);
    await http().post('/api/posts').send({ text: 'Hi' }).expect(401);
  });

  describe('pagination', () => {
    it('walks every post once, newest first, even when times are identical', async () => {
      const sameTime = new Date('2027-01-01T10:00:00Z');
      const ids: string[] = [];
      for (let index = 0; index < 25; index++) {
        // Every fifth step shares its time with the previous posts, so only the id can separate them.
        const createdAt =
          index % 5 === 0
            ? new Date(sameTime.getTime() + index * 1000)
            : sameTime;
        ids.push(await seedPost({ createdAt }));
      }

      const walked = await walkFeed('latest', 10);
      expect(walked).toHaveLength(25);
      expect(new Set(walked).size).toBe(25);
      const stored = await posts.find().sort({ createdAt: -1, _id: -1 });
      expect(walked).toEqual(stored.map(({ id }) => id as string));
      expect(new Set(walked)).toEqual(new Set(ids));
    });

    it('ends with no next page when the last page is exactly full', async () => {
      for (let index = 0; index < 20; index++) await seedPost();
      const first = await getFeed('latest');
      expect(first.nextCursor).not.toBeNull();
      const second = await getFeed('latest', anaToken, 10, first.nextCursor!);
      expect(second.items).toHaveLength(10);
      expect(second.nextCursor).toBeNull();
    });

    it('rejects a damaged cursor in plain words', async () => {
      const { body } = await http()
        .get('/api/feed')
        .query({ cursor: 'not-a-real-cursor' })
        .set(as(anaToken))
        .expect(400);
      expect((body as { message: string }).message).toBe(
        'This page link is no longer valid',
      );
    });

    it('rejects a limit outside the allowed range', async () => {
      await http()
        .get('/api/feed')
        .query({ limit: 500 })
        .set(as(anaToken))
        .expect(400);
    });
  });

  describe('tabs', () => {
    it('unsolved leaves out solved posts', async () => {
      const open = await seedPost();
      await seedPost({ status: 'solved' });
      const { items } = await getFeed('unsolved');
      expect(items.map(({ id }) => id)).toEqual([open]);
    });

    it('trending sorts by score, keeps paging stable and ignores old posts', async () => {
      const low = await seedPost({ score: 1 });
      const high = await seedPost({ score: 9 });
      const tiedA = await seedPost({ score: 5 });
      const tiedB = await seedPost({ score: 5 });
      await seedPost({
        score: 100,
        createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
      });

      const walked = await walkFeed('trending', 1);
      expect(walked).toEqual([high, tiedB, tiedA, low]);
    });

    it('for you shows matching embassy or intake first, then the rest, across pages', async () => {
      const others = [await seedPost(), await seedPost(), await seedPost()];
      const embassyMatch = await seedPost({ authorEmbassy: 'Karachi' });
      const intakeMatch = await seedPost({ authorIntake: 'WS2027' });
      await posts.updateOne({ _id: others[2] }, { authorEmbassy: 'Lagos' });

      for (const limit of [1, 2, 3, 10]) {
        const walked = await walkFeed('for_you', limit);
        expect(walked.slice(0, 2)).toEqual([intakeMatch, embassyMatch]);
        expect(walked.slice(2)).toEqual([...others].reverse());
      }
    });

    it('never shows hidden or deleted posts', async () => {
      const visible = await seedPost();
      await seedPost({ isHidden: true });
      await seedPost({ deletedAt: new Date() });
      for (const tab of ['latest', 'unsolved', 'trending', 'for_you']) {
        const { items } = await getFeed(tab);
        expect(items.map(({ id }) => id)).toEqual([visible]);
      }
    });

    it('fills in the author without exposing private details', async () => {
      await seedPost();
      const [post] = (await getFeed('latest')).items;
      expect(post.author).toEqual({
        id: ben,
        fullName: 'Ben Okafor',
        embassy: 'Lagos',
        intake: { season: 'SS', year: 2028 },
      });
    });

    it('still returns a post whose author deleted their account', async () => {
      await seedPost({ authorId: new Types.ObjectId() });
      const [post] = (await getFeed('latest')).items;
      expect(post.author).toBeNull();
    });
  });

  describe('reactions', () => {
    const counts = async (id: string) =>
      (await posts.findById(id))!.reactionCounts;

    it('adds, changes and removes one reaction with correct counts', async () => {
      const id = await seedPost();

      const added = await http()
        .put(`/api/posts/${id}/reaction`)
        .set(as(anaToken))
        .send({ type: 'like' })
        .expect(200);
      expect(added.body).toEqual({
        myReaction: 'like',
        reactionCounts: { like: 1, love: 0, support: 0, wow: 0 },
      });

      await http()
        .put(`/api/posts/${id}/reaction`)
        .set(as(anaToken))
        .send({ type: 'love' })
        .expect(200);
      expect(await counts(id)).toMatchObject({ like: 0, love: 1 });
      expect(await reactions.countDocuments()).toBe(1);

      await http()
        .put(`/api/posts/${id}/reaction`)
        .set(as(benToken))
        .send({ type: 'love' })
        .expect(200);
      expect(await counts(id)).toMatchObject({ love: 2 });

      const removed = await http()
        .delete(`/api/posts/${id}/reaction`)
        .set(as(anaToken))
        .expect(200);
      expect(removed.body).toMatchObject({
        myReaction: null,
        reactionCounts: { love: 1 },
      });
    });

    it('does not double count the same reaction', async () => {
      const id = await seedPost();
      for (let index = 0; index < 2; index++) {
        await http()
          .put(`/api/posts/${id}/reaction`)
          .set(as(anaToken))
          .send({ type: 'wow' })
          .expect(200);
      }
      expect(await counts(id)).toMatchObject({ wow: 1 });
    });

    it('does not go negative when removing a reaction that was never there', async () => {
      const id = await seedPost();
      await http()
        .delete(`/api/posts/${id}/reaction`)
        .set(as(anaToken))
        .expect(200);
      expect(await counts(id)).toMatchObject({
        like: 0,
        love: 0,
        support: 0,
        wow: 0,
      });
    });

    it('stays correct when the same person taps several times at once', async () => {
      const id = await seedPost();
      const replies = await Promise.all(
        Array.from({ length: 5 }, () =>
          http()
            .put(`/api/posts/${id}/reaction`)
            .set(as(anaToken))
            .send({ type: 'like' }),
        ),
      );
      expect(replies.map(({ status }) => status)).toEqual(Array(5).fill(200));
      expect(await counts(id)).toMatchObject({ like: 1 });
      expect(await reactions.countDocuments({ targetId: id })).toBe(1);
    });

    it('shows each viewer only their own reaction in the feed', async () => {
      const id = await seedPost();
      await http()
        .put(`/api/posts/${id}/reaction`)
        .set(as(anaToken))
        .send({ type: 'support' })
        .expect(200);
      expect((await getFeed('latest', anaToken)).items[0].myReaction).toBe(
        'support',
      );
      expect(
        (await getFeed('latest', benToken)).items[0].myReaction,
      ).toBeNull();
    });

    it('rejects unknown reactions and missing posts, and leaves nothing behind', async () => {
      const id = await seedPost();
      await http()
        .put(`/api/posts/${id}/reaction`)
        .set(as(anaToken))
        .send({ type: 'angry' })
        .expect(400);
      await http()
        .put('/api/posts/not-an-id/reaction')
        .set(as(anaToken))
        .send({ type: 'like' })
        .expect(404);
      const gone = await seedPost({ deletedAt: new Date() });
      await http()
        .put(`/api/posts/${gone}/reaction`)
        .set(as(anaToken))
        .send({ type: 'like' })
        .expect(404);
      expect(await reactions.countDocuments()).toBe(0);
    });
  });

  describe('saving', () => {
    it('saves once and removes it again', async () => {
      const id = await seedPost();
      for (let index = 0; index < 2; index++) {
        const { body } = await http()
          .post(`/api/posts/${id}/save`)
          .set(as(anaToken))
          .expect(200);
        expect(body).toEqual({ isSaved: true, saveCount: 1 });
      }
      expect((await getFeed('latest', anaToken)).items[0].isSaved).toBe(true);
      expect((await getFeed('latest', benToken)).items[0].isSaved).toBe(false);

      const { body } = await http()
        .delete(`/api/posts/${id}/save`)
        .set(as(anaToken))
        .expect(200);
      expect(body).toEqual({ isSaved: false, saveCount: 0 });
    });
  });

  describe('posts', () => {
    it('creates a post, cleans its tags and announces it', async () => {
      const announce = vi
        .spyOn(app.get(FeedEventsGateway), 'announcePost')
        .mockReturnValue();
      const { body } = await http()
        .post('/api/posts')
        .set(as(anaToken))
        .send({ text: '  How long is APS?  ', tags: ['#APS', 'aps', ' Visa '] })
        .expect(201);
      const post = body as PostView;
      expect(post.text).toBe('How long is APS?');
      expect(post.tags).toEqual(['aps', 'visa']);
      expect(post.author?.fullName).toBe('Ana Silva');
      expect(announce).toHaveBeenCalledWith({ id: post.id, authorId: ana });

      const stored = await posts.findById(post.id);
      expect(stored).toMatchObject({
        authorEmbassy: 'Karachi',
        authorIntake: 'WS2027',
      });
    });

    it('rejects empty text, too much text and too many tags', async () => {
      const send = (body: object) =>
        http().post('/api/posts').set(as(anaToken)).send(body);
      await send({ text: '   ' }).expect(400);
      await send({ text: 'x'.repeat(5001) }).expect(400);
      await send({ text: 'Hi', tags: ['a', 'b', 'c', 'd', 'e', 'f'] }).expect(
        400,
      );
      await send({ text: 'Hi', tags: ['has space'] }).expect(400);
    });

    it('lets only the owner edit or delete', async () => {
      const id = await seedPost({ authorId: new Types.ObjectId(ana) });
      await http()
        .patch(`/api/posts/${id}`)
        .set(as(benToken))
        .send({ text: 'Mine now' })
        .expect(403);
      await http().delete(`/api/posts/${id}`).set(as(benToken)).expect(403);

      const { body } = await http()
        .patch(`/api/posts/${id}`)
        .set(as(anaToken))
        .send({ text: 'Fixed' })
        .expect(200);
      expect((body as PostView).text).toBe('Fixed');
    });

    it('deletes softly, so the post leaves the feed but the record remains', async () => {
      const id = await seedPost({ authorId: new Types.ObjectId(ana) });
      await http().delete(`/api/posts/${id}`).set(as(anaToken)).expect(204);
      expect((await getFeed('latest')).items).toHaveLength(0);
      expect((await posts.findById(id))?.deletedAt).toBeInstanceOf(Date);
      await http().delete(`/api/posts/${id}`).set(as(anaToken)).expect(404);
    });
  });

  describe('trending tags', () => {
    it('counts tags from the last 7 days and serves repeats from the cache', async () => {
      await seedPost({ tags: ['visa', 'aps'] });
      await seedPost({ tags: ['visa'] });
      await seedPost({
        tags: ['old'],
        createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
      });

      const first = await http()
        .get('/api/tags/trending')
        .set(as(anaToken))
        .expect(200);
      expect(first.body).toEqual([
        { tag: 'visa', count: 2 },
        { tag: 'aps', count: 1 },
      ]);

      await seedPost({ tags: ['new-one'] });
      const second = await http()
        .get('/api/tags/trending')
        .set(as(anaToken))
        .expect(200);
      expect(second.body).toEqual(first.body);
    });
  });

  describe('score job', () => {
    it('applies the formula and ignores posts outside the window', async () => {
      const now = Date.now();
      const id = await seedPost({
        createdAt: new Date(now - 2 * 60 * 60 * 1000),
        reactionCounts: { like: 3, love: 1, support: 0, wow: 0 },
        commentCount: 2,
        saveCount: 2,
      });
      const old = await seedPost({
        createdAt: new Date(now - 8 * 24 * 60 * 60 * 1000),
        reactionCounts: { like: 9, love: 0, support: 0, wow: 0 },
      });

      await scores.recalculate();

      // (4 reactions + 2 * 2 comments + 2 saves) / (2 hours + 2) ^ 1.5 = 10 / 8
      expect((await posts.findById(id))!.score).toBeCloseTo(1.25, 2);
      expect((await posts.findById(old))!.score).toBe(0);
    });
  });
});
