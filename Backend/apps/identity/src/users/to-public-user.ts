import type { PublicUser } from '@app/common';
import type { UserDocument } from './user.schema.js';

export function toPublicUser(user: UserDocument): PublicUser {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    country: user.country,
    targetDegree: user.targetDegree,
    fieldOfStudy: user.fieldOfStudy,
    intake: user.intake && {
      season: user.intake.season,
      year: user.intake.year,
    },
    stage: user.stage,
    embassy: user.embassy,
    avatarUrl: user.avatarUrl,
    bio: user.bio,
    onboardingCompleted: user.onboardingCompleted,
    onboardingSkipped: user.onboardingSkipped,
  };
}
