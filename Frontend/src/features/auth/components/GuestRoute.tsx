import { Navigate, Outlet } from 'react-router-dom'
import { PageLoader } from '@/components/common/PageLoader'
import { useAuthStore } from '../hooks/use-auth-store'

// The only place that redirects after sign-in. Navigating from the mutations as well would race
// with this redirect and could send a new user to /home instead of /onboarding.
export function GuestRoute() {
  const user = useAuthStore((state) => state.user)
  const isSessionChecked = useAuthStore((state) => state.isSessionChecked)

  if (!isSessionChecked) return <PageLoader />
  if (user) {
    const hasSeenOnboarding = user.onboardingCompleted || user.onboardingSkipped
    return <Navigate to={hasSeenOnboarding ? '/home' : '/onboarding'} replace />
  }
  return <Outlet />
}
