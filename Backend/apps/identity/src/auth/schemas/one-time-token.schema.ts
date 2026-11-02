import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { SchemaTypes, Types } from 'mongoose';

export enum OneTimeTokenPurpose {
  VerifyEmail = 'verify-email',
  ResetPassword = 'reset-password',
}

@Schema({ timestamps: true })
export class OneTimeToken {
  @Prop({ type: SchemaTypes.ObjectId, required: true })
  userId: Types.ObjectId;

  @Prop({ type: String, required: true, enum: OneTimeTokenPurpose })
  purpose: OneTimeTokenPurpose;

  @Prop({ required: true, unique: true })
  tokenHash: string;

  @Prop({ required: true, expires: 0 })
  expiresAt: Date;
}

export const OneTimeTokenSchema = SchemaFactory.createForClass(OneTimeToken);
OneTimeTokenSchema.index({ userId: 1, purpose: 1 });
