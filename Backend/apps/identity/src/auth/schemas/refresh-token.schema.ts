import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { SchemaTypes, Types } from 'mongoose';

@Schema({ timestamps: true })
export class RefreshToken {
  @Prop({ type: SchemaTypes.ObjectId, required: true, index: true })
  userId: Types.ObjectId;

  // All tokens rotated from one login share a family, so a stolen token can end the whole session.
  @Prop({ required: true, index: true })
  familyId: string;

  @Prop({ required: true, unique: true })
  tokenHash: string;

  @Prop({ required: true, expires: 0 })
  expiresAt: Date;

  @Prop({ type: Date })
  rotatedAt?: Date;
}

export const RefreshTokenSchema = SchemaFactory.createForClass(RefreshToken);
