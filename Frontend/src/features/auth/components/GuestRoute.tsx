import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '../hooks/use-auth-store'

// The only place that redirects after sign-in. Navigating from the mutations as well would race
// with this redirect and could send a new Google user to /home instead of /onboarding.
export function GuestRoute() {
  const accessToken = useAuthStore((state) => state.accessToken)
  const isNewUser = useAuthStore((state) => state.isNewUser)

  if (accessToken) {
    return <Navigate to={isNewUser ? '/onboarding' : '/home'} replace />
  }
  return <Outlet />
}
