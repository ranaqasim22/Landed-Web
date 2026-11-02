import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { InjectModel } from '@nestjs/mongoose';
import { callService, IDENTITY_SERVICE, IdentityPatterns } from '@app/common';
import type { PostView, ReactionType, UserCard } from '@app/common';
import { Model, Types } from 'mongoose';
import type { PostDocument } from './post.schema.js';
import { Reaction } from './reaction.schema.js';
import { SavedPost } from './saved-post.schema.js';

@Injectable()
export class PostViewsService {
  constructor(
    @Inject(IDENTITY_SERVICE) private readonly identity: ClientProxy,
    @InjectModel(Reaction.name) private readonly reactions: Model<Reaction>,
    @InjectModel(SavedPost.name) private readonly savedPosts: Model<SavedPost>,
  ) {}

  getUserCards(userIds: string[]) {
    return callService<UserCard[]>(
      this.identity,
      IdentityPatterns.getUserCards,
      { userIds },
    );
  }

  // Everything is looked up once per page rather than once per post.
  async toViews(posts: PostDocument[], viewerId: string): Promise<PostView[]> {
    const postIds = posts.map((post) => post._id);
    const viewer = new Types.ObjectId(viewerId);
    const [cards, reactions, saved] = await Promise.all([
      this.getUserCards([
        ...new Set(posts.map((post) => post.authorId.toString())),
      ]),
      this.reactions.find({
        userId: viewer,
        targetType: 'post',
        targetId: { $in: postIds },
      }),
      this.savedPosts.find({ userId: viewer, postId: { $in: postIds } }),
    ]);

    const authors = new Map(cards.map((card) => [card.id, card]));
    const myReactions = new Map(
      reactions.map(({ targetId, type }) => [targetId.toString(), type]),
    );
    const savedIds = new Set(saved.map(({ postId }) => postId.toString()));

    return posts.map((post) =>
      this.toView(
        post,
        authors.get(post.authorId.toString()) ?? null,
        myReactions.get(post.id as string) ?? null,
        savedIds.has(post.id as string),
      ),
    );
  }

  private toView(
    post: PostDocument,
    author: UserCard | null,
    myReaction: ReactionType | null,
    isSaved: boolean,
  ): PostView {
    const { like, love, support, wow } = post.reactionCounts;
    return {
      id: post.id as string,
      author,
      text: post.text,
      images: post.images.map(({ url, alt }) => ({ url, alt })),
      tags: post.tags,
      communityId: post.communityId?.toString(),
      status: post.status,
      reactionCounts: { like, love, support, wow },
      commentCount: post.commentCount,
      saveCount: post.saveCount,
      myReaction,
      isSaved,
      createdAt: post.createdAt.toISOString(),
      updatedAt: post.updatedAt.toISOString(),
    };
  }
}
