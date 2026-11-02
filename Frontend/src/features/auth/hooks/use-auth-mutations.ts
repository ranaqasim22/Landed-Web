import { useMutation } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { authApi } from '../api/auth.api'
import { useAuthStore } from './use-auth-store'

export function useLogin() {
  const navigate = useNavigate()
  const setSession = useAuthStore((state) => state.setSession)

  return useMutation({
    mutationFn: authApi.login,
    onSuccess: (session) => {
      setSession(session)
      toast.success('Welcome back')
    },
    onError: (error, { email }) => {
      if (isAxiosError(error) && error.response?.status === 403) {
        navigate('/verify-email', { state: { email } })
      }
    },
  })
}

export function useSignup() {
  const navigate = useNavigate()

  return useMutation({
    mutationFn: authApi.signup,
    onSuccess: (_data, { email }) => {
      toast.success('Account created — check your email')
      navigate('/verify-email', { replace: true, state: { email } })
    },
  })
}

export function useGoogleAuth() {
  const setSession = useAuthStore((state) => state.setSession)

  return useMutation({
    mutationFn: authApi.google,
    onSuccess: (session) => {
      setSession(session)
      toast.success(session.isNewUser ? 'Welcome to Landed' : 'Welcome back')
    },
  })
}

export function useForgotPassword() {
  return useMutation({
    mutationFn: authApi.forgotPassword,
    onSuccess: () => {
      toast.success('Check your email')
    },
  })
}

export function useResetPassword() {
  const navigate = useNavigate()

  return useMutation({
    mutationFn: authApi.resetPassword,
    onSuccess: () => {
      toast.success('Password updated. Log in with your new password')
      navigate('/login', { replace: true })
    },
  })
}

export function useResendVerification() {
  return useMutation({
    mutationFn: authApi.resendVerification,
    onSuccess: () => {
      toast.success('We sent another email')
    },
  })
}
