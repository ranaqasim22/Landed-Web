import { create } from 'zustand'
import type { AuthSession, AuthUser } from '../api/auth.api'

type AuthState = {
  user: AuthUser | null
  accessToken: string | null
  isSessionChecked: boolean
  setSession: (session: AuthSession) => void
  setUser: (user: AuthUser) => void
  clearSession: () => void
  markSessionChecked: () => void
}

// Deliberately not persisted: the access token lives in memory only.
export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  isSessionChecked: false,
  setSession: ({ user, accessToken }) => set({ user, accessToken }),
  setUser: (user) => set({ user }),
  clearSession: () => set({ user: null, accessToken: null }),
  markSessionChecked: () => set({ isSessionChecked: true }),
}))
