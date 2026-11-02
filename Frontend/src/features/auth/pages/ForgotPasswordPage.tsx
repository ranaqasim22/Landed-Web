import { zodResolver } from '@hookform/resolvers/zod'
import { CircleCheckIcon } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { getAuthErrorMessage } from '../api/auth.errors'
import { AuthCard } from '../components/AuthCard'
import { AuthLink } from '../components/AuthLink'
import { FormAlert } from '../components/FormAlert'
import { FormField } from '../components/FormField'
import { SubmitButton } from '../components/SubmitButton'
import { useForgotPassword } from '../hooks/use-auth-mutations'
import {
  forgotPasswordSchema,
  type ForgotPasswordValues,
} from '../schemas/auth.schemas'

export function ForgotPasswordPage() {
  const forgotPassword = useForgotPassword()
  const { register, handleSubmit, formState } = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    mode: 'onTouched',
    defaultValues: { email: '' },
  })

  return (
    <AuthCard
      title="Forgot your password?"
      subtitle="Enter your email and we'll send you a reset link"
      footer={
        <AuthLink to="/login">Back to log in</AuthLink>
      }
    >
      {forgotPassword.isSuccess ? (
        <p role="status" className="flex items-start gap-2 rounded-lg border p-3 text-sm">
          <CircleCheckIcon aria-hidden className="mt-0.5 size-4 shrink-0 text-success" />
          If an account exists, we sent a reset link
        </p>
      ) : (
        <form
          noValidate
          onSubmit={handleSubmit((values) => forgotPassword.mutate(values))}
          className="space-y-4"
        >
          <FormField
            id="email"
            label="Email"
            type="email"
            autoComplete="email"
            autoFocus
            error={formState.errors.email?.message}
            {...register('email')}
          />
          {forgotPassword.isError && (
            <FormAlert message={getAuthErrorMessage(forgotPassword.error)} />
          )}
          <SubmitButton
            isPending={forgotPassword.isPending}
            pendingLabel="Sending..."
            disabled={!formState.isValid}
          >
            Send reset link
          </SubmitButton>
        </form>
      )}
    </AuthCard>
  )
}
