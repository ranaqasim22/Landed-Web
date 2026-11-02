import { zodResolver } from '@hookform/resolvers/zod'
import { FormProvider, useForm } from 'react-hook-form'
import { useParams } from 'react-router-dom'
import { getAuthErrorMessage } from '../api/auth.errors'
import { AuthCard } from '../components/AuthCard'
import { AuthLink } from '../components/AuthLink'
import { FormAlert } from '@/components/common/FormAlert'
import { NewPasswordFields } from '../components/NewPasswordFields'
import { SubmitButton } from '@/components/common/SubmitButton'
import { useResetPassword } from '../hooks/use-auth-mutations'
import {
  resetPasswordSchema,
  type ResetPasswordValues,
} from '../schemas/auth.schemas'

export function ResetPasswordPage() {
  const { token = '' } = useParams()
  const resetPassword = useResetPassword()
  const form = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    mode: 'onTouched',
    defaultValues: { password: '', confirmPassword: '' },
  })

  return (
    <AuthCard
      title="Set a new password"
      subtitle="Choose a password you don't use anywhere else"
      footer={
        <>
          Link not working?
          <AuthLink to="/forgot-password">Request a new one</AuthLink>
        </>
      }
    >
      <FormProvider {...form}>
        <form
          noValidate
          onSubmit={form.handleSubmit(({ password }) =>
            resetPassword.mutate({ token, password }),
          )}
          className="space-y-4"
        >
          <NewPasswordFields passwordLabel="New password" autoFocus />
          {resetPassword.isError && (
            <FormAlert
              message={getAuthErrorMessage(resetPassword.error, {
                400: 'This reset link is invalid or has expired',
                401: 'This reset link is invalid or has expired',
              })}
            />
          )}
          <SubmitButton
            isPending={resetPassword.isPending}
            pendingLabel="Updating password..."
            disabled={!form.formState.isValid}
          >
            Update password
          </SubmitButton>
        </form>
      </FormProvider>
    </AuthCard>
  )
}
