import { api } from '@/lib/api'

export type Intake = { season: 'WS' | 'SS'; year: number }

export type AuthUser = {
  id: string
  email: string
  fullName: string
  country?: string
  targetDegree?: string
  fieldOfStudy?: string
  intake?: Intake
  stage?: string
  embassy?: string
  avatarUrl?: string | null
  bio?: string
  onboardingCompleted: boolean
  onboardingSkipped: boolean
}

export type AuthSession = {
  user: AuthUser
  accessToken: string
  isNewUser?: boolean
}

export const authApi = {
  login: (body: { email: string; password: string }) =>
    api.post<AuthSession>('/auth/login', body).then((res) => res.data),
  signup: (body: { fullName: string; email: string; password: string }) =>
    api.post<void>('/auth/signup', body).then((res) => res.data),
  google: (body: { idToken: string }) =>
    api.post<AuthSession>('/auth/google', body).then((res) => res.data),
  forgotPassword: (body: { email: string }) =>
    api.post<void>('/auth/forgot-password', body).then((res) => res.data),
  resetPassword: (body: { token: string; password: string }) =>
    api.post<void>('/auth/reset-password', body).then((res) => res.data),
  resendVerification: (body: { email: string }) =>
    api.post<void>('/auth/resend-verification', body).then((res) => res.data),
}
