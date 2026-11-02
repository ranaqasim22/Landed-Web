import { useEffect } from 'react'
import { refreshSession } from '@/lib/api'
import { useAuthStore } from './use-auth-store'

// The access token is lost on reload, so the httpOnly cookie is used to get a new one.
export function useRestoreSession() {
  const isSessionChecked = useAuthStore((state) => state.isSessionChecked)
  const markSessionChecked = useAuthStore((state) => state.markSessionChecked)

  useEffect(() => {
    if (isSessionChecked) return
    refreshSession()
      .catch(() => undefined)
      .finally(markSessionChecked)
  }, [isSessionChecked, markSessionChecked])
}
