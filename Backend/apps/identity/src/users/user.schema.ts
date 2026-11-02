import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';

export type UserDocument = HydratedDocument<User>;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email: string;

  @Prop({ required: true, trim: true })
  fullName: string;

  @Prop({ type: String })
  passwordHash?: string | null;

  @Prop({ type: String, unique: true, sparse: true })
  googleId?: string;

  @Prop({ type: Date })
  emailVerifiedAt?: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);
