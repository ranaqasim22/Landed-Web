import { Navigate, Route, Routes } from 'react-router-dom'
import { AuthLayout } from '@/features/auth/components/AuthLayout'
import { GuestRoute } from '@/features/auth/components/GuestRoute'
import { ProtectedRoute } from '@/features/auth/components/ProtectedRoute'
import { useRestoreSession } from '@/features/auth/hooks/use-restore-session'
import { ForgotPasswordPage } from '@/features/auth/pages/ForgotPasswordPage'
import { LoginPage } from '@/features/auth/pages/LoginPage'
import { ResetPasswordPage } from '@/features/auth/pages/ResetPasswordPage'
import { SignupPage } from '@/features/auth/pages/SignupPage'
import { VerifyEmailPage } from '@/features/auth/pages/VerifyEmailPage'
import { OnboardingPage } from '@/features/onboarding/pages/OnboardingPage'
import { HomePage } from '@/pages/HomePage'
import { PlaceholderPage } from '@/pages/PlaceholderPage'

export function App() {
  useRestoreSession()

  return (
    <Routes>
      <Route element={<AuthLayout />}>
        <Route element={<GuestRoute />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
        </Route>
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
      </Route>
      <Route element={<ProtectedRoute />}>
        <Route path="/home" element={<HomePage />} />
        <Route path="/onboarding" element={<OnboardingPage />} />
      </Route>
      <Route path="/terms" element={<PlaceholderPage title="Terms" />} />
      <Route path="/privacy" element={<PlaceholderPage title="Privacy Policy" />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}
