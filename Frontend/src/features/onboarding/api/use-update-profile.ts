import { useMutation } from '@tanstack/react-query'
import { useAuthStore } from '@/features/auth/hooks/use-auth-store'
import { usersApi } from './users.api'

export function useUpdateProfile() {
  const setUser = useAuthStore((state) => state.setUser)

  return useMutation({
    mutationFn: usersApi.updateMe,
    onSuccess: setUser,
  })
}
