import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import type {
  PostActionInput,
  PostContentInput,
  PostView,
  ReactionResult,
  ReactionType,
  SaveResult,
} from '@app/common';
import { Connection, isValidObjectId, Model, Types } from 'mongoose';
import type { ClientSession } from 'mongoose';
import { PostViewsService } from './post-views.service.js';
import { Post, VISIBLE_POST, type PostDocument } from './post.schema.js';
import { Reaction } from './reaction.schema.js';
import { SavedPost } from './saved-post.schema.js';

const DUPLICATE_KEY = 11000;

@Injectable()
export class PostsService {
  constructor(
    @InjectConnection() private readonly connection: Connection,
    @InjectModel(Post.name) private readonly posts: Model<Post>,
    @InjectModel(Reaction.name) private readonly reactions: Model<Reaction>,
    @InjectModel(SavedPost.name) private readonly savedPosts: Model<SavedPost>,
    private readonly views: PostViewsService,
  ) {}

  async create(userId: string, content: PostContentInput): Promise<PostView> {
    const [author] = await this.views.getUserCards([userId]);
    const post = await this.posts.create({
      ...content,
      authorId: userId,
      authorEmbassy: author?.embassy,
      authorIntake: author?.intake && intakeKey(author.intake),
    });
    return this.toView(post, userId);
  }

  async update(
    { userId, postId }: PostActionInput,
    changes: Partial<PostContentInput>,
  ): Promise<PostView> {
    const post = await this.findOwnedOrThrow(userId, postId);
    post.set(changes);
    await post.save();
    return this.toView(post, userId);
  }

  async remove({ userId, postId }: PostActionInput) {
    const post = await this.findOwnedOrThrow(userId, postId);
    post.deletedAt = new Date();
    await post.save();
    return { deleted: true };
  }

  setReaction(
    { userId, postId }: PostActionInput,
    type: ReactionType,
  ): Promise<ReactionResult> {
    return this.inTransaction(async (session) => {
      const key = reactionKey(userId, postId);
      const existing = await this.reactions.findOne(key, null, { session });
      const change: Partial<Record<string, number>> = {};
      if (existing?.type !== type) change[`reactionCounts.${type}`] = 1;
      if (existing && existing.type !== type) {
        change[`reactionCounts.${existing.type}`] = -1;
      }

      if (existing) {
        existing.type = type;
        await existing.save({ session });
      } else {
        await this.reactions.create([{ ...key, type }], { session });
      }
      const post = await this.incrementOrThrow(postId, change, session);
      return { reactionCounts: post.reactionCounts, myReaction: type };
    });
  }

  removeReaction({ userId, postId }: PostActionInput): Promise<ReactionResult> {
    return this.inTransaction(async (session) => {
      const removed = await this.reactions.findOneAndDelete(
        reactionKey(userId, postId),
        { session },
      );
      const post = await this.incrementOrThrow(
        postId,
        removed ? { [`reactionCounts.${removed.type}`]: -1 } : {},
        session,
      );
      return { reactionCounts: post.reactionCounts, myReaction: null };
    });
  }

  save({ userId, postId }: PostActionInput): Promise<SaveResult> {
    return this.inTransaction(async (session) => {
      const key = savedKey(userId, postId);
      const isNew = !(await this.savedPosts.exists(key).session(session));
      if (isNew) await this.savedPosts.create([key], { session });
      const post = await this.incrementOrThrow(
        postId,
        isNew ? { saveCount: 1 } : {},
        session,
      );
      return { isSaved: true, saveCount: post.saveCount };
    });
  }

  unsave({ userId, postId }: PostActionInput): Promise<SaveResult> {
    return this.inTransaction(async (session) => {
      const removed = await this.savedPosts.findOneAndDelete(
        savedKey(userId, postId),
        { session },
      );
      const post = await this.incrementOrThrow(
        postId,
        removed ? { saveCount: -1 } : {},
        session,
      );
      return { isSaved: false, saveCount: post.saveCount };
    });
  }

  private async toView(post: PostDocument, viewerId: string) {
    const [view] = await this.views.toViews([post], viewerId);
    return view;
  }

  private async findOwnedOrThrow(userId: string, postId: string) {
    const post = await this.posts.findOne({
      _id: toObjectIdOrThrow(postId),
      deletedAt: null,
    });
    if (!post) throw new NotFoundException('This post no longer exists');
    if (post.authorId.toString() !== userId) {
      throw new ForbiddenException('You can only change your own posts');
    }
    return post;
  }

  private async incrementOrThrow(
    postId: string,
    change: Partial<Record<string, number>>,
    session: ClientSession,
  ) {
    const post = await this.posts.findOneAndUpdate(
      { _id: postId, ...VISIBLE_POST },
      { $inc: change },
      { session, returnDocument: 'after', timestamps: false },
    );
    if (!post) throw new NotFoundException('This post no longer exists');
    return post;
  }

  // Two taps at once can both see no reaction yet. The unique index stops the second,
  // and running it again finds the first one's reaction.
  private async inTransaction<T>(
    work: (session: ClientSession) => Promise<T>,
  ): Promise<T> {
    try {
      return await this.connection.transaction(work);
    } catch (error) {
      if ((error as { code?: number }).code !== DUPLICATE_KEY) throw error;
      return this.connection.transaction(work);
    }
  }
}

export function intakeKey({ season, year }: { season: string; year: number }) {
  return `${season}${year}`;
}

function toObjectIdOrThrow(id: string) {
  if (!isValidObjectId(id)) {
    throw new NotFoundException('This post no longer exists');
  }
  return new Types.ObjectId(id);
}

function reactionKey(userId: string, postId: string) {
  return {
    userId: new Types.ObjectId(userId),
    targetType: 'post' as const,
    targetId: toObjectIdOrThrow(postId),
  };
}

function savedKey(userId: string, postId: string) {
  return {
    userId: new Types.ObjectId(userId),
    postId: toObjectIdOrThrow(postId),
  };
}
