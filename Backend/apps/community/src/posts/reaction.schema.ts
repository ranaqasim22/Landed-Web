import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { REACTION_TYPES } from '@app/common';
import type { ReactionType } from '@app/common';
import { Schema as MongooseSchema, Types } from 'mongoose';

export const REACTION_TARGETS = ['post', 'comment'] as const;
export type ReactionTarget = (typeof REACTION_TARGETS)[number];

@Schema({ timestamps: true })
export class Reaction {
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true })
  userId: Types.ObjectId;

  @Prop({ type: String, enum: REACTION_TARGETS, required: true })
  targetType: ReactionTarget;

  @Prop({ type: MongooseSchema.Types.ObjectId, required: true })
  targetId: Types.ObjectId;

  @Prop({ type: String, enum: REACTION_TYPES, required: true })
  type: ReactionType;
}

export const ReactionSchema = SchemaFactory.createForClass(Reaction);
ReactionSchema.index(
  { userId: 1, targetType: 1, targetId: 1 },
  { unique: true },
);
