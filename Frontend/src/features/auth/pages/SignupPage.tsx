import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, FormProvider, useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { getAuthErrorMessage } from '../api/auth.errors'
import { AuthCard } from '../components/AuthCard'
import { AuthDivider } from '../components/AuthDivider'
import { AuthLink } from '../components/AuthLink'
import { FormAlert } from '@/components/common/FormAlert'
import { FieldError, FormField } from '@/components/common/FormField'
import { GoogleAuthButton } from '../components/GoogleAuthButton'
import { NewPasswordFields } from '../components/NewPasswordFields'
import { SubmitButton } from '@/components/common/SubmitButton'
import { useSignup } from '../hooks/use-auth-mutations'
import { signupSchema, type SignupValues } from '../schemas/auth.schemas'

function NewTabLink({ to, children }: { to: string; children: string }) {
  return (
    <Link to={to} target="_blank" rel="noopener noreferrer" className="auth-link">
      {children}
      <span className="sr-only"> (opens in a new tab)</span>
    </Link>
  )
}

export function SignupPage() {
  const signup = useSignup()
  const form = useForm<SignupValues>({
    resolver: zodResolver(signupSchema),
    mode: 'onTouched',
    defaultValues: {
      fullName: '',
      email: '',
      password: '',
      confirmPassword: '',
      acceptedTerms: false,
    },
  })
  const { register, handleSubmit, control, formState } = form

  return (
    <AuthCard
      title="Create your account"
      subtitle="Join students heading to Germany — free"
      footer={
        <>
          Already have an account?
          <AuthLink to="/login">Log in</AuthLink>
        </>
      }
    >
      <FormProvider {...form}>
        <form
          noValidate
          onSubmit={handleSubmit(({ fullName, email, password }) =>
            signup.mutate({ fullName, email, password }),
          )}
          className="space-y-4"
        >
          <FormField
            id="fullName"
            label="Full name"
            autoComplete="name"
            autoFocus
            error={formState.errors.fullName?.message}
            {...register('fullName')}
          />
          <FormField
            id="email"
            label="Email"
            type="email"
            autoComplete="email"
            error={formState.errors.email?.message}
            {...register('email')}
          />
          <NewPasswordFields passwordLabel="Password" />
          <Controller
            control={control}
            name="acceptedTerms"
            render={({ field, fieldState }) => (
              <div className="space-y-1">
                <Label
                  htmlFor="acceptedTerms"
                  className="min-h-11 gap-3 leading-normal font-normal"
                >
                  <Checkbox
                    id="acceptedTerms"
                    ref={field.ref}
                    required
                    checked={field.value}
                    onCheckedChange={(checked) => field.onChange(checked === true)}
                    onBlur={field.onBlur}
                    aria-invalid={fieldState.invalid}
                    aria-describedby={fieldState.error && 'acceptedTerms-error'}
                    className="size-5"
                  />
                  <span>
                    I agree to the <NewTabLink to="/terms">Terms</NewTabLink> and{' '}
                    <NewTabLink to="/privacy">Privacy Policy</NewTabLink>
                  </span>
                </Label>
                <div className="min-h-5">
                  <FieldError id="acceptedTerms-error" message={fieldState.error?.message} />
                </div>
              </div>
            )}
          />
          {signup.isError && (
            <FormAlert
              message={getAuthErrorMessage(signup.error, {
                409: 'An account with this email already exists',
              })}
            />
          )}
          <SubmitButton
            isPending={signup.isPending}
            pendingLabel="Creating account..."
            disabled={!formState.isValid}
          >
            Create account
          </SubmitButton>
        </form>
      </FormProvider>
      <AuthDivider />
      <GoogleAuthButton text="signup_with" />
    </AuthCard>
  )
}
