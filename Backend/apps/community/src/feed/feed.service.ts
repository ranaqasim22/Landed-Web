import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { FeedPage, GetFeedInput } from '@app/common';
import { Model, Types } from 'mongoose';
import type { QueryFilter, SortOrder } from 'mongoose';
import { PostViewsService } from '../posts/post-views.service.js';
import {
  Post,
  TRENDING_WINDOW_MS,
  VISIBLE_POST,
  type PostDocument,
} from '../posts/post.schema.js';
import { intakeKey } from '../posts/posts.service.js';
import { decodeCursor, encodeCursor, type FeedCursor } from './feed-cursor.js';

const NEWEST_FIRST: Record<string, SortOrder> = { createdAt: -1, _id: -1 };

@Injectable()
export class FeedService {
  constructor(
    @InjectModel(Post.name) private readonly posts: Model<Post>,
    private readonly views: PostViewsService,
  ) {}

  async getFeed(input: GetFeedInput): Promise<FeedPage> {
    const cursor = input.cursor ? decodeCursor(input.cursor) : undefined;
    const { items, nextCursor } = await this.findPosts(input, cursor);
    return {
      items: await this.views.toViews(items, input.userId),
      nextCursor: nextCursor ? encodeCursor(nextCursor) : null,
    };
  }

  private findPosts({ tab, userId, limit }: GetFeedInput, cursor?: FeedCursor) {
    switch (tab) {
      case 'latest':
        return this.findNewest(VISIBLE_POST, limit, cursor);
      case 'unsolved':
        return this.findNewest(
          { ...VISIBLE_POST, status: 'open' },
          limit,
          cursor,
        );
      case 'trending':
        return this.findTrending(limit, cursor);
      case 'for_you':
        return this.findForYou(userId, limit, cursor);
    }
  }

  private async findNewest(
    filter: QueryFilter<Post>,
    limit: number,
    cursor?: FeedCursor,
  ) {
    const after = cursor?.createdAt
      ? {
          $or: [
            { createdAt: { $lt: new Date(cursor.createdAt) } },
            {
              createdAt: new Date(cursor.createdAt),
              _id: { $lt: new Types.ObjectId(cursor.id) },
            },
          ],
        }
      : {};
    const found = await this.posts
      .find({ $and: [filter, after] })
      .sort(NEWEST_FIRST)
      .limit(limit + 1);
    return toPage(found, limit, (post) => ({
      id: post.id as string,
      createdAt: post.createdAt.toISOString(),
    }));
  }

  private async findTrending(limit: number, cursor?: FeedCursor) {
    const after =
      cursor?.score === undefined
        ? {}
        : {
            $or: [
              { score: { $lt: cursor.score } },
              {
                score: cursor.score,
                _id: { $lt: new Types.ObjectId(cursor.id) },
              },
            ],
          };
    const found = await this.posts
      .find({
        $and: [
          {
            ...VISIBLE_POST,
            createdAt: { $gte: new Date(Date.now() - TRENDING_WINDOW_MS) },
          },
          after,
        ],
      })
      .sort({ score: -1, _id: -1 })
      .limit(limit + 1);
    return toPage(found, limit, (post) => ({
      id: post.id as string,
      score: post.score,
    }));
  }

  // Posts from people with the same embassy or intake come first, then everything else.
  // Followed communities join this list once communities exist.
  private async findForYou(userId: string, limit: number, cursor?: FeedCursor) {
    const [viewer] = await this.views.getUserCards([userId]);
    const matches: QueryFilter<Post>[] = [];
    if (viewer?.embassy) matches.push({ authorEmbassy: viewer.embassy });
    if (viewer?.intake)
      matches.push({ authorIntake: intakeKey(viewer.intake) });

    const others = matches.length
      ? { ...VISIBLE_POST, $nor: matches }
      : VISIBLE_POST;
    if (!matches.length || cursor?.matching === false) {
      const page = await this.findNewest(others, limit, cursor);
      return markMatching(page, false);
    }

    const page = markMatching(
      await this.findNewest({ ...VISIBLE_POST, $or: matches }, limit, cursor),
      true,
    );
    if (page.nextCursor) return page;

    // That list ran out partway through this page, so the rest starts from the top of the others.
    const remaining = limit - page.items.length;
    if (remaining === 0) {
      const hasOthers = await this.posts.exists(others);
      const lastId = page.items[page.items.length - 1].id as string;
      return {
        items: page.items,
        nextCursor: hasOthers ? { id: lastId, matching: false } : null,
      };
    }
    const rest = await this.findNewest(others, remaining);
    return {
      items: [...page.items, ...rest.items],
      nextCursor: rest.nextCursor && { ...rest.nextCursor, matching: false },
    };
  }
}

function toPage(
  found: PostDocument[],
  limit: number,
  toCursor: (post: PostDocument) => FeedCursor,
): { items: PostDocument[]; nextCursor: FeedCursor | null } {
  const items = found.slice(0, limit);
  return {
    items,
    nextCursor: found.length > limit ? toCursor(items[items.length - 1]) : null,
  };
}

function markMatching(
  page: { items: PostDocument[]; nextCursor: FeedCursor | null },
  matching: boolean,
) {
  return {
    items: page.items,
    nextCursor: page.nextCursor && { ...page.nextCursor, matching },
  };
}
