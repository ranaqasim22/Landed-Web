import { NestFactory } from '@nestjs/core';
import { getModelToken } from '@nestjs/mongoose';
import { REACTION_TYPES } from '@app/common';
import argon2 from 'argon2';
import mongoose, { type Model, type Types } from 'mongoose';
import { CommunityModule } from '../community.module.js';
import { TagsService } from '../feed/tags.service.js';
import { Post } from '../posts/post.schema.js';
import { intakeKey } from '../posts/posts.service.js';
import { Reaction } from '../posts/reaction.schema.js';
import { SavedPost } from '../posts/saved-post.schema.js';
import { ScoreService } from '../scoring/score.service.js';
import { SAMPLE_PASSWORD, SAMPLE_POSTS, SAMPLE_USERS } from './sample-posts.js';

const HOUR_MS = 60 * 60 * 1000;

// Sample accounts live in identity's database. This development tool is the only place one
// service touches another's data, so production code never needs a route for creating them.
async function createSampleUsers() {
  const uri = process.env.IDENTITY_MONGODB_URI;
  if (!uri)
    throw new Error('IDENTITY_MONGODB_URI is needed to create sample users');

  const connection = await mongoose.createConnection(uri).asPromise();
  const users = connection.collection('users');
  const passwordHash = await argon2.hash(SAMPLE_PASSWORD);
  const now = new Date();
  const ids: Types.ObjectId[] = [];
  for (const user of SAMPLE_USERS) {
    const saved = await users.findOneAndUpdate(
      { email: user.email },
      {
        $set: {
          ...user,
          passwordHash,
          emailVerifiedAt: now,
          onboardingCompleted: true,
          onboardingSkipped: false,
          updatedAt: now,
        },
        $setOnInsert: { createdAt: now },
      },
      { upsert: true, returnDocument: 'after' },
    );
    ids.push(saved!._id as unknown as Types.ObjectId);
  }
  await connection.close();
  return ids;
}

export async function seed() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('The seed script is for development only');
  }

  const app = await NestFactory.createApplicationContext(CommunityModule, {
    logger: ['error'],
  });
  const posts = app.get<Model<Post>>(getModelToken(Post.name));
  const reactions = app.get<Model<Reaction>>(getModelToken(Reaction.name));
  const saved = app.get<Model<SavedPost>>(getModelToken(SavedPost.name));

  const userIds = await createSampleUsers();

  // Removing only the sample posts lets the script run again without touching real ones.
  const previous = await posts.find({ authorId: { $in: userIds } }, '_id');
  const previousIds = previous.map(({ _id }) => _id);
  await reactions.deleteMany({ targetId: { $in: previousIds } });
  await saved.deleteMany({ postId: { $in: previousIds } });
  await posts.deleteMany({ _id: { $in: previousIds } });

  for (const sample of SAMPLE_POSTS) {
    const author = SAMPLE_USERS[sample.author];
    const sampleReactions = sample.reactions ?? [];
    const saves = sample.saves ?? [];
    const createdAt = new Date(Date.now() - sample.hoursAgo * HOUR_MS);

    const post = await posts.create({
      authorId: userIds[sample.author],
      authorEmbassy: author.embassy,
      authorIntake: intakeKey(author.intake),
      text: sample.text,
      tags: sample.tags,
      images: sample.images ?? [],
      status: sample.solved ? 'solved' : 'open',
      commentCount: sample.comments ?? 0,
      saveCount: saves.length,
      reactionCounts: Object.fromEntries(
        REACTION_TYPES.map((type) => [
          type,
          sampleReactions.filter((reaction) => reaction === type).length,
        ]),
      ),
      createdAt,
      updatedAt: createdAt,
    });

    // Each sample user reacts at most once, so the counts match what the rows say.
    await reactions.insertMany(
      sampleReactions.map((type, index) => ({
        userId: userIds[index % userIds.length],
        targetType: 'post',
        targetId: post._id,
        type,
      })),
    );
    await saved.insertMany(
      saves.map((user) => ({ userId: userIds[user], postId: post._id })),
    );
  }

  await app.get(ScoreService).recalculate();
  await app.get(TagsService).clearCache();
  await app.close();

  console.log(
    `Seeded ${SAMPLE_POSTS.length} posts from ${SAMPLE_USERS.length} sample users. Log in as ${SAMPLE_USERS[0].email} with password ${SAMPLE_PASSWORD}`,
  );
  process.exit(0);
}
