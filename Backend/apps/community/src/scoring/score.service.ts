import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  Post,
  TRENDING_WINDOW_MS,
  VISIBLE_POST,
} from '../posts/post.schema.js';

@Injectable()
export class ScoreService {
  constructor(@InjectModel(Post.name) private readonly posts: Model<Post>) {}

  // score = (reactions + 2 * comments + saves) / (hoursSincePost + 2) ^ 1.5
  // Only the trending window matters, because older posts never appear on that tab.
  async recalculate() {
    const hoursOld = {
      $divide: [{ $subtract: ['$$NOW', '$createdAt'] }, 60 * 60 * 1000],
    };
    const { modifiedCount } = await this.posts.updateMany(
      {
        ...VISIBLE_POST,
        createdAt: { $gte: new Date(Date.now() - TRENDING_WINDOW_MS) },
      },
      [
        {
          $set: {
            score: {
              $divide: [
                {
                  $add: [
                    '$reactionCounts.like',
                    '$reactionCounts.love',
                    '$reactionCounts.support',
                    '$reactionCounts.wow',
                    { $multiply: [2, '$commentCount'] },
                    '$saveCount',
                  ],
                },
                { $pow: [{ $add: [hoursOld, 2] }, 1.5] },
              ],
            },
          },
        },
      ],
      { updatePipeline: true, timestamps: false },
    );
    return modifiedCount;
  }
}
