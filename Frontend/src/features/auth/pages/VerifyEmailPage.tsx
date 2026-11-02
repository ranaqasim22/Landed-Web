import { Navigate, useLocation } from 'react-router-dom'
import { getAuthErrorMessage } from '../api/auth.errors'
import { AuthCard } from '../components/AuthCard'
import { AuthLink } from '../components/AuthLink'
import { FormAlert } from '@/components/common/FormAlert'
import { SubmitButton } from '@/components/common/SubmitButton'
import { useResendVerification } from '../hooks/use-auth-mutations'
import { useCooldown } from '../hooks/use-cooldown'

const RESEND_COOLDOWN_SECONDS = 60

export function VerifyEmailPage() {
  const email: string | undefined = useLocation().state?.email
  const resend = useResendVerification()
  const { secondsLeft, restart } = useCooldown(RESEND_COOLDOWN_SECONDS)

  if (!email) return <Navigate to="/signup" replace />

  return (
    <AuthCard
      title="Check your inbox"
      subtitle={
        <>
          We sent a verification link to{' '}
          <span className="font-medium break-all text-foreground">{email}</span>. Open it to
          activate your account.
        </>
      }
      footer={
        <AuthLink to="/login">Back to log in</AuthLink>
      }
    >
      {resend.isError && <FormAlert message={getAuthErrorMessage(resend.error)} />}
      <SubmitButton
        type="button"
        variant="outline"
        isPending={resend.isPending}
        pendingLabel="Sending..."
        disabled={secondsLeft > 0}
        onClick={() => resend.mutate({ email }, { onSuccess: restart })}
      >
        {secondsLeft > 0 ? `Resend email in ${secondsLeft}s` : 'Resend email'}
      </SubmitButton>
    </AuthCard>
  )
}
