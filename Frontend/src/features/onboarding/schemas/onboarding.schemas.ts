import { z } from 'zod'
import type { AuthUser, Intake } from '@/features/auth/api/auth.api'

export const TOTAL_STEPS = 3
export const BIO_MAX_LENGTH = 160
export const FIELD_MAX_LENGTH = 100
const AVATAR_MAX_BYTES = 5 * 1024 * 1024
const AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp']

const fullName = z.string().trim().min(1, 'Enter your name').max(FIELD_MAX_LENGTH)
const bio = z.string().trim().max(BIO_MAX_LENGTH, `Keep your bio to ${BIO_MAX_LENGTH} characters`)
const fieldOfStudy = z.string().trim().max(FIELD_MAX_LENGTH)

export const onboardingSchema = z.object({
  country: z.string(),
  targetDegree: z.string(),
  fieldOfStudy,
  season: z.string(),
  year: z.string(),
  stage: z.string(),
  embassy: z.string(),
  avatarUrl: z.string().nullable(),
  fullName,
  bio,
})

export type OnboardingValues = z.infer<typeof onboardingSchema>

// Degree and intake are the only answers we require. Everything else stays optional.
const stepRequirements = [
  z.object({ targetDegree: z.string().min(1), fieldOfStudy }),
  z.object({ season: z.string().min(1), year: z.string().min(1) }),
  z.object({ fullName, bio }),
]

export function isStepValid(step: number, values: OnboardingValues) {
  return stepRequirements[step - 1].safeParse(values).success
}

export function toFormValues(user: AuthUser): OnboardingValues {
  return {
    country: user.country ?? '',
    targetDegree: user.targetDegree ?? '',
    fieldOfStudy: user.fieldOfStudy ?? '',
    season: user.intake?.season ?? '',
    year: user.intake ? String(user.intake.year) : '',
    stage: user.stage ?? '',
    embassy: user.embassy ?? '',
    avatarUrl: user.avatarUrl ?? null,
    fullName: user.fullName,
    bio: user.bio ?? '',
  }
}

export type ProfileChanges = Partial<
  Pick<
    AuthUser,
    | 'country'
    | 'targetDegree'
    | 'fieldOfStudy'
    | 'intake'
    | 'stage'
    | 'embassy'
    | 'avatarUrl'
    | 'fullName'
    | 'bio'
    | 'onboardingCompleted'
    | 'onboardingSkipped'
  >
>

// Blank answers are left out, so skipping a half-filled step saves only what was filled in.
export function toStepChanges(step: number, values: OnboardingValues): ProfileChanges {
  if (step === 1) {
    return {
      ...(values.country && { country: values.country }),
      ...(values.targetDegree && { targetDegree: values.targetDegree }),
      ...(values.fieldOfStudy.trim() && { fieldOfStudy: values.fieldOfStudy.trim() }),
    }
  }
  if (step === 2) {
    const intake =
      values.season && values.year
        ? ({ season: values.season, year: Number(values.year) } as Intake)
        : undefined
    return {
      ...(intake && { intake }),
      ...(values.stage && { stage: values.stage }),
      ...(values.embassy && { embassy: values.embassy }),
    }
  }
  return {
    ...(values.fullName.trim() && { fullName: values.fullName.trim() }),
    bio: values.bio.trim(),
    avatarUrl: values.avatarUrl,
  }
}

export function getAvatarFileError(file: File) {
  if (!AVATAR_TYPES.includes(file.type)) return 'Please choose a JPG, PNG or WebP image'
  if (file.size > AVATAR_MAX_BYTES) return 'Please choose an image smaller than 5 MB'
  return null
}
