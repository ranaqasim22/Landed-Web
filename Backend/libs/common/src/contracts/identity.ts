export const IDENTITY_SERVICE = 'IDENTITY_SERVICE';

export const IdentityPatterns = {
  health: 'identity.health',
  signup: 'auth.signup',
  login: 'auth.login',
  google: 'auth.google',
  refresh: 'auth.refresh',
  logout: 'auth.logout',
  verifyEmail: 'auth.verify-email',
  resendVerification: 'auth.resend-verification',
  forgotPassword: 'auth.forgot-password',
  resetPassword: 'auth.reset-password',
  deleteAccount: 'auth.delete-account',
  getMe: 'users.get-me',
  updateMe: 'users.update-me',
  getUserCards: 'users.get-cards',
} as const;

export const TARGET_DEGREES = [
  'bachelor',
  'master',
  'phd',
  'language_course',
  'other',
] as const;

export const APPLICATION_STAGES = [
  'exploring',
  'shortlisting',
  'applied',
  'admitted',
  'visa_applied',
  'visa_received',
] as const;

export const INTAKE_SEASONS = ['WS', 'SS'] as const;

export type TargetDegree = (typeof TARGET_DEGREES)[number];
export type ApplicationStage = (typeof APPLICATION_STAGES)[number];
export type IntakeSeason = (typeof INTAKE_SEASONS)[number];

export interface Intake {
  season: IntakeSeason;
  year: number;
}

export interface PublicUser {
  id: string;
  email: string;
  fullName: string;
  country?: string;
  targetDegree?: TargetDegree;
  fieldOfStudy?: string;
  intake?: Intake;
  stage?: ApplicationStage;
  embassy?: string;
  avatarUrl?: string | null;
  bio?: string;
  onboardingCompleted: boolean;
  onboardingSkipped: boolean;
}

// What other people can see about someone, so it never includes their email.
export type UserCard = Pick<
  PublicUser,
  'id' | 'fullName' | 'avatarUrl' | 'intake' | 'embassy'
>;

export type UpdateProfileInput = Partial<Omit<PublicUser, 'id' | 'email'>>;

export interface AuthSession {
  user: PublicUser;
  accessToken: string;
  refreshToken: string;
  refreshExpiresAt: string;
  isNewUser?: boolean;
}

export interface AccessTokenPayload {
  sub: string;
}
