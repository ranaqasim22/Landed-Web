import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import {
  APPLICATION_STAGES,
  INTAKE_SEASONS,
  TARGET_DEGREES,
} from '@app/common';
import type { ApplicationStage, Intake, TargetDegree } from '@app/common';
import { Schema as MongooseSchema } from 'mongoose';
import type { HydratedDocument } from 'mongoose';

export type UserDocument = HydratedDocument<User>;

const IntakeSchema = new MongooseSchema(
  {
    season: { type: String, enum: INTAKE_SEASONS, required: true },
    year: { type: Number, required: true },
  },
  { _id: false },
);

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

  @Prop({ type: String })
  country?: string;

  @Prop({ type: String, enum: TARGET_DEGREES })
  targetDegree?: TargetDegree;

  @Prop({ type: String })
  fieldOfStudy?: string;

  @Prop({ type: IntakeSchema })
  intake?: Intake;

  @Prop({ type: String, enum: APPLICATION_STAGES })
  stage?: ApplicationStage;

  @Prop({ type: String })
  embassy?: string;

  @Prop({ type: String })
  avatarUrl?: string | null;

  @Prop({ type: String, maxlength: 160 })
  bio?: string;

  @Prop({ default: false })
  onboardingCompleted: boolean;

  // Choosing "Skip for now" is remembered so that logging in again never forces the wizard.
  @Prop({ default: false })
  onboardingSkipped: boolean;
}

export const UserSchema = SchemaFactory.createForClass(User);
UserSchema.index({ embassy: 1, 'intake.season': 1, 'intake.year': 1 });
