import { Navigate, Outlet } from 'react-router-dom'
import { PageLoader } from '@/components/common/PageLoader'
import { useAuthStore } from '../hooks/use-auth-store'

export function ProtectedRoute() {
  const user = useAuthStore((state) => state.user)
  const isSessionChecked = useAuthStore((state) => state.isSessionChecked)

  if (!isSessionChecked) return <PageLoader />
  return user ? <Outlet /> : <Navigate to="/login" replace />
}
