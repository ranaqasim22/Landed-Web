import { create } from 'zustand'
import type { AuthSession, AuthUser } from '../api/auth.api'

type AuthState = {
  user: AuthUser | null
  accessToken: string | null
  isNewUser: boolean
  setSession: (session: AuthSession) => void
}

// Deliberately not persisted: the access token lives in memory only.
export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  isNewUser: false,
  setSession: ({ user, accessToken, isNewUser = false }) =>
    set({ user, accessToken, isNewUser }),
}))
