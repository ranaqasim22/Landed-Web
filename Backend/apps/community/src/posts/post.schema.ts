import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import {
  POST_MAX_IMAGES,
  POST_MAX_TAGS,
  POST_STATUSES,
  POST_TEXT_MAX_LENGTH,
} from '@app/common';
import type { PostImage, PostStatus, ReactionCounts } from '@app/common';
import { Schema as MongooseSchema, Types } from 'mongoose';
import type { HydratedDocument } from 'mongoose';

export type PostDocument = HydratedDocument<Post>;

const PostImageSchema = new MongooseSchema(
  {
    url: { type: String, required: true },
    alt: { type: String, default: '' },
  },
  { _id: false },
);

const ReactionCountsSchema = new MongooseSchema(
  {
    like: { type: Number, default: 0 },
    love: { type: Number, default: 0 },
    support: { type: Number, default: 0 },
    wow: { type: Number, default: 0 },
  },
  { _id: false },
);

@Schema({ timestamps: true })
export class Post {
  // Users live in the identity service's database, so this can't be a Mongoose ref.
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true })
  authorId: Types.ObjectId;

  // Copied when posting so For You can match on them with an index instead of asking
  // identity about every author. They describe the author at the time of the post.
  @Prop({ type: String })
  authorEmbassy?: string;

  @Prop({ type: String })
  authorIntake?: string;

  @Prop({ required: true, trim: true, maxlength: POST_TEXT_MAX_LENGTH })
  text: string;

  @Prop({
    type: [PostImageSchema],
    default: [],
    validate: (images: PostImage[]) => images.length <= POST_MAX_IMAGES,
  })
  images: PostImage[];

  @Prop({
    type: [{ type: String, lowercase: true, trim: true }],
    default: [],
    validate: (tags: string[]) => tags.length <= POST_MAX_TAGS,
  })
  tags: string[];

  @Prop({ type: MongooseSchema.Types.ObjectId })
  communityId?: Types.ObjectId;

  @Prop({ type: String, enum: POST_STATUSES, default: 'open' })
  status: PostStatus;

  @Prop({ type: MongooseSchema.Types.ObjectId })
  solvedCommentId?: Types.ObjectId;

  @Prop({ type: ReactionCountsSchema, default: () => ({}) })
  reactionCounts: ReactionCounts;

  @Prop({ default: 0 })
  commentCount: number;

  @Prop({ default: 0 })
  saveCount: number;

  @Prop({ default: 0 })
  score: number;

  @Prop({ default: false })
  isHidden: boolean;

  @Prop({ type: Date, default: null })
  deletedAt: Date | null;

  createdAt: Date;
  updatedAt: Date;
}

export const PostSchema = SchemaFactory.createForClass(Post);
PostSchema.index({ createdAt: -1, _id: -1 });
PostSchema.index({ status: 1, createdAt: -1 });
PostSchema.index({ score: -1, _id: -1 });
PostSchema.index({ tags: 1, createdAt: -1 });
PostSchema.index({ authorId: 1, createdAt: -1 });
PostSchema.index({ text: 'text', tags: 'text' });

export const VISIBLE_POST = { isHidden: false, deletedAt: null };
export const TRENDING_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
