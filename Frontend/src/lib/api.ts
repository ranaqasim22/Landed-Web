import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios'
import type { AuthSession } from '@/features/auth/api/auth.api'
import { useAuthStore } from '@/features/auth/hooks/use-auth-store'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api',
  withCredentials: true,
})

api.interceptors.request.use((config) => {
  const { accessToken } = useAuthStore.getState()
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`
  return config
})

let refreshing: Promise<void> | null = null

// Refresh tokens rotate, so requests that expire together must share one refresh.
export function refreshSession() {
  refreshing ??= api
    .post<AuthSession>('/auth/refresh')
    .then(({ data }) => useAuthStore.getState().setSession(data))
    .finally(() => {
      refreshing = null
    })
  return refreshing
}

type RetriableRequest = InternalAxiosRequestConfig & { isRetry?: boolean }

api.interceptors.response.use(undefined, async (error: AxiosError) => {
  const request = error.config as RetriableRequest | undefined
  const isExpiredToken =
    error.response?.status === 401 && !request?.url?.startsWith('/auth/') && !request?.isRetry
  if (!request || !isExpiredToken) throw error

  try {
    await refreshSession()
  } catch {
    useAuthStore.getState().clearSession()
    throw error
  }
  return api({ ...request, isRetry: true } as RetriableRequest)
})
