import { CircleCheckIcon, CircleIcon } from 'lucide-react'
import { useFormContext, useWatch } from 'react-hook-form'
import {
  getPasswordStrength,
  passwordRules,
  type ResetPasswordValues,
} from '../schemas/auth.schemas'
import { PasswordField } from './PasswordField'

function PasswordChecklist({ password }: { password: string }) {
  return (
    <div id="password-rules" className="space-y-2 text-sm">
      <ul className="space-y-1">
        {passwordRules.map((rule) => {
          const isMet = rule.test(password)
          return (
            <li key={rule.label} className="flex items-center gap-2">
              {isMet ? (
                <CircleCheckIcon aria-hidden className="size-4 shrink-0 text-success" />
              ) : (
                <CircleIcon aria-hidden className="size-4 shrink-0 text-muted-foreground" />
              )}
              <span className="sr-only">{isMet ? 'Done:' : 'Not yet:'}</span>
              {rule.label}
            </li>
          )
        })}
      </ul>
      <p aria-live="polite" className="min-h-5 font-medium">
        {password && `Password strength: ${getPasswordStrength(password)}`}
      </p>
    </div>
  )
}

export function NewPasswordFields({
  passwordLabel,
  autoFocus,
}: {
  passwordLabel: string
  autoFocus?: boolean
}) {
  const { register, trigger, control, formState } =
    useFormContext<ResetPasswordValues>()
  const password = useWatch({ control, name: 'password' })

  return (
    <>
      <PasswordField
        id="password"
        label={passwordLabel}
        autoComplete="new-password"
        autoFocus={autoFocus}
        error={formState.errors.password?.message}
        describedBy="password-rules"
        {...register('password', {
          // Keeps the match error current without nagging before the confirm field is reached.
          onChange: () => {
            if (formState.touchedFields.confirmPassword) trigger('confirmPassword')
          },
        })}
      />
      <PasswordChecklist password={password} />
      <PasswordField
        id="confirmPassword"
        label="Confirm password"
        autoComplete="new-password"
        error={formState.errors.confirmPassword?.message}
        {...register('confirmPassword')}
      />
    </>
  )
}
