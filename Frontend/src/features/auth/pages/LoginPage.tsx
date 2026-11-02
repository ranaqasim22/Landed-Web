import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { getAuthErrorMessage } from '../api/auth.errors'
import { AuthCard } from '../components/AuthCard'
import { AuthDivider } from '../components/AuthDivider'
import { AuthLink } from '../components/AuthLink'
import { FormAlert } from '../components/FormAlert'
import { FormField } from '../components/FormField'
import { GoogleAuthButton } from '../components/GoogleAuthButton'
import { PasswordField } from '../components/PasswordField'
import { SubmitButton } from '../components/SubmitButton'
import { useLogin } from '../hooks/use-auth-mutations'
import { loginSchema, type LoginValues } from '../schemas/auth.schemas'

export function LoginPage() {
  const login = useLogin()
  const { register, handleSubmit, formState } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    mode: 'onTouched',
    defaultValues: { email: '', password: '' },
  })

  return (
    <AuthCard
      title="Welcome back"
      subtitle="Log in to continue to Landed"
      footer={
        <>
          New to Landed?
          <AuthLink to="/signup">Create an account</AuthLink>
        </>
      }
    >
      <GoogleAuthButton text="continue_with" />
      <AuthDivider />
      <form
        noValidate
        onSubmit={handleSubmit((values) => login.mutate(values))}
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
        <div className="space-y-1">
          <PasswordField
            id="password"
            label="Password"
            autoComplete="current-password"
            error={formState.errors.password?.message}
            {...register('password')}
          />
          <div className="flex justify-end text-sm">
            <AuthLink to="/forgot-password">Forgot password?</AuthLink>
          </div>
        </div>
        {login.isError && (
          <FormAlert
            message={getAuthErrorMessage(login.error, {
              401: 'Email or password is incorrect',
              403: 'Please verify your email first',
            })}
          />
        )}
        <SubmitButton
          isPending={login.isPending}
          pendingLabel="Logging in..."
          disabled={!formState.isValid}
        >
          Log in
        </SubmitButton>
      </form>
    </AuthCard>
  )
}
