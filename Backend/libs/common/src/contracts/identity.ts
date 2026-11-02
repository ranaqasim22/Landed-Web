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
} as const;

export interface PublicUser {
  id: string;
  email: string;
  fullName: string;
}

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
