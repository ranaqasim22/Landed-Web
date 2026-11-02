import { LockIcon } from 'lucide-react'
import { Controller, useFormContext, useWatch } from 'react-hook-form'
import { FieldError, FormField } from '@/components/common/FormField'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import {
  BIO_MAX_LENGTH,
  FIELD_MAX_LENGTH,
  type OnboardingValues,
} from '../schemas/onboarding.schemas'
import { AvatarUpload } from './AvatarUpload'

export function StepProfile({ onAvatarBusyChange }: { onAvatarBusyChange: (busy: boolean) => void }) {
  const { control, register, formState } = useFormContext<OnboardingValues>()
  const fullName = useWatch({ control, name: 'fullName' })
  const bio = useWatch({ control, name: 'bio' })
  const bioError = formState.errors.bio?.message

  return (
    <>
      <Controller
        control={control}
        name="avatarUrl"
        render={({ field }) => (
          <AvatarUpload
            name={fullName}
            value={field.value}
            onChange={field.onChange}
            onBusyChange={onAvatarBusyChange}
          />
        )}
      />
      <FormField
        id="fullName"
        label="Display name"
        autoComplete="name"
        maxLength={FIELD_MAX_LENGTH}
        error={formState.errors.fullName?.message}
        {...register('fullName')}
      />
      <div className="space-y-2">
        <Label htmlFor="bio">Short bio (optional)</Label>
        <Textarea
          id="bio"
          rows={3}
          maxLength={BIO_MAX_LENGTH}
          placeholder="e.g. MSc CS applicant, WS2027, from Lahore"
          aria-invalid={Boolean(bioError)}
          aria-describedby={cn('bio-count', bioError && 'bio-error')}
          {...register('bio')}
        />
        <p id="bio-count" className="text-right text-sm text-muted-foreground">
          {bio.length} of {BIO_MAX_LENGTH} characters
        </p>
        <FieldError id="bio-error" message={bioError} />
      </div>
      <p className="flex items-start gap-2 rounded-lg bg-muted p-3 text-sm">
        <LockIcon aria-hidden className="mt-0.5 size-4 shrink-0" />
        Your visa timelines stay anonymous by default. You can change this anytime in Settings.
      </p>
    </>
  )
}
