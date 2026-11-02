import { Inject, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { TrendingTag } from '@app/common';
import type { Redis } from 'ioredis';
import { Model } from 'mongoose';
import {
  Post,
  TRENDING_WINDOW_MS,
  VISIBLE_POST,
} from '../posts/post.schema.js';

export const REDIS_CLIENT = 'REDIS_CLIENT';

const CACHE_KEY = 'community:trending-tags';
const CACHE_SECONDS = 10 * 60;
const TOP_TAGS = 8;

@Injectable()
export class TagsService {
  constructor(
    @InjectModel(Post.name) private readonly posts: Model<Post>,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  async getTrending(): Promise<TrendingTag[]> {
    const cached = await this.redis.get(CACHE_KEY);
    if (cached) return JSON.parse(cached) as TrendingTag[];

    const tags = await this.posts.aggregate<TrendingTag>([
      {
        $match: {
          ...VISIBLE_POST,
          createdAt: { $gte: new Date(Date.now() - TRENDING_WINDOW_MS) },
        },
      },
      { $unwind: '$tags' },
      { $group: { _id: '$tags', count: { $sum: 1 } } },
      { $sort: { count: -1, _id: 1 } },
      { $limit: TOP_TAGS },
      { $project: { _id: 0, tag: '$_id', count: 1 } },
    ]);
    await this.redis.set(CACHE_KEY, JSON.stringify(tags), 'EX', CACHE_SECONDS);
    return tags;
  }

  clearCache() {
    return this.redis.del(CACHE_KEY);
  }
}
