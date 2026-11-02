import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { FormProvider, useForm, useWatch } from 'react-hook-form'
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import logo from '@/assets/logo.png'
import { FormAlert } from '@/components/common/FormAlert'
import { SubmitButton } from '@/components/common/SubmitButton'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { ThemeToggle } from '@/features/auth/components/ThemeToggle'
import { useAuthStore } from '@/features/auth/hooks/use-auth-store'
import { useUpdateProfile } from '../api/use-update-profile'
import { StepPlan } from '../components/StepPlan'
import { StepProfile } from '../components/StepProfile'
import { StepTimeline } from '../components/StepTimeline'
import {
  isStepValid,
  onboardingSchema,
  toFormValues,
  toStepChanges,
  TOTAL_STEPS,
  type OnboardingValues,
  type ProfileChanges,
} from '../schemas/onboarding.schemas'

const STEP_TEXT = [
  {
    title: 'What are you planning?',
    reason: 'This helps us show you the right universities and posts.',
  },
  {
    title: 'When do you want to start?',
    reason: "We'll connect you with students from the same intake.",
  },
  { title: 'Let others know you', reason: 'Optional — helps people trust and help you.' },
]

type SaveAction = 'continue' | 'skip'

function parseStep(value: string | null) {
  const step = Number(value)
  return Number.isInteger(step) && step >= 1 && step <= TOTAL_STEPS ? step : 1
}

export function OnboardingPage() {
  const user = useAuthStore((state) => state.user)
  if (!user || user.onboardingCompleted) return <Navigate to="/home" replace />
  return <OnboardingWizard values={toFormValues(user)} />
}

function OnboardingWizard({ values: initialValues }: { values: OnboardingValues }) {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const updateProfile = useUpdateProfile()
  const [lastAction, setLastAction] = useState<SaveAction>('continue')
  const [isAvatarBusy, setIsAvatarBusy] = useState(false)
  const stepRef = useRef<HTMLDivElement>(null)
  const formRef = useRef<HTMLFormElement>(null)

  const form = useForm<OnboardingValues>({
    resolver: zodResolver(onboardingSchema),
    mode: 'onTouched',
    defaultValues: initialValues,
  })
  const values = useWatch({ control: form.control }) as OnboardingValues

  const requestedStep = parseStep(searchParams.get('step'))
  // A link to a later step can't skip past a required answer.
  const missingStep = [1, 2].find((n) => n < requestedStep && !isStepValid(n, values))
  const step = missingStep ?? requestedStep
  const isFinalStep = step === TOTAL_STEPS
  const { title, reason } = STEP_TEXT[step - 1]
  const canContinue = isStepValid(step, values) && !(isFinalStep && isAvatarBusy)
  const isSaving = updateProfile.isPending

  useEffect(() => {
    stepRef.current
      ?.querySelector<HTMLElement>('button, input:not([type="file"]), select, textarea')
      ?.focus()
  }, [step])

  function saveAndContinue() {
    setLastAction('continue')
    const changes = toStepChanges(step, form.getValues())
    if (isFinalStep) {
      save({ ...changes, onboardingCompleted: true }, ({ fullName }) => {
        toast.success(`Welcome to Landed, ${fullName}!`)
        navigate('/home', { replace: true })
      })
      return
    }
    save(changes, () => setSearchParams({ step: String(step + 1) }))
  }

  function saveAndSkip() {
    setLastAction('skip')
    save({ ...toStepChanges(step, form.getValues()), onboardingSkipped: true }, () =>
      navigate('/home', { replace: true }),
    )
  }

  // Finishing unmounts this page as soon as the user updates, and a promise still resolves after
  // that where mutate's callback wouldn't. Failures show through updateProfile.isError.
  function save(changes: ProfileChanges, onSaved: (saved: { fullName: string }) => void) {
    updateProfile.mutateAsync(changes).then(onSaved, () => undefined)
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (canContinue && !isSaving) saveAndContinue()
  }

  // Chips and the year select keep Enter for themselves, so it's passed on to Continue here.
  function handleKeyDown(event: KeyboardEvent<HTMLFormElement>) {
    const target = event.target as HTMLElement
    if (event.key === 'Enter' && target.matches('[role="radio"], select')) {
      event.preventDefault()
      formRef.current?.requestSubmit()
    }
  }

  return (
    <div className="relative flex min-h-dvh justify-center px-4 pt-14 lg:items-center lg:py-12">
      <title>{`${title} · Landed`}</title>
      <div className="absolute top-2 right-2">
        <ThemeToggle />
      </div>
      <main className="w-full max-w-140">
        <Card className="border-0 bg-transparent py-0 shadow-none lg:border lg:bg-card lg:py-8 lg:shadow-sm">
          <CardHeader className="gap-4 px-0 lg:px-8">
            <img src={logo} alt="Landed" className="size-14" />
            <div className="space-y-2">
              <p className="text-sm font-medium">
                Step {step} of {TOTAL_STEPS}
              </p>
              <Progress
                value={(step / TOTAL_STEPS) * 100}
                aria-label={`Step ${step} of ${TOTAL_STEPS}`}
              />
            </div>
            <div className="space-y-2">
              <CardTitle>
                <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
              </CardTitle>
              <CardDescription className="text-base">{reason}</CardDescription>
            </div>
            <p aria-live="polite" className="sr-only">
              Step {step} of {TOTAL_STEPS}: {title}
            </p>
          </CardHeader>
          <CardContent className="px-0 lg:px-8">
            <FormProvider {...form}>
              <form
                ref={formRef}
                noValidate
                onSubmit={handleSubmit}
                onKeyDown={handleKeyDown}
                className="space-y-6"
              >
                <div ref={stepRef} className="space-y-6">
                  {step === 1 && <StepPlan />}
                  {step === 2 && <StepTimeline />}
                  {step === 3 && <StepProfile onAvatarBusyChange={setIsAvatarBusy} />}
                </div>
                <div className="sticky bottom-0 -mx-4 space-y-3 border-t bg-background px-4 py-3 lg:static lg:mx-0 lg:border-0 lg:bg-transparent lg:p-0">
                  {/* Inside the sticky bar so a failed save is never hidden below the fold on a phone. */}
                  {updateProfile.isError && (
                    <FormAlert
                      message="Couldn't save — check your internet and try again"
                      action={
                        <Button
                          type="button"
                          variant="outline"
                          className="h-11 text-foreground"
                          disabled={isSaving}
                          onClick={lastAction === 'skip' ? saveAndSkip : saveAndContinue}
                        >
                          Retry
                        </Button>
                      }
                    />
                  )}
                  <div className="flex flex-wrap items-center gap-2">
                    {step > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        className="h-11"
                        disabled={isSaving}
                        onClick={() => setSearchParams({ step: String(step - 1) })}
                      >
                        Back
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      className="ml-auto h-11"
                      disabled={isSaving}
                      onClick={saveAndSkip}
                    >
                      {isSaving && lastAction === 'skip' ? 'Saving...' : 'Skip for now'}
                    </Button>
                    <SubmitButton
                      className="w-auto"
                      isPending={isSaving && lastAction === 'continue'}
                      pendingLabel="Saving..."
                      disabled={!canContinue || isSaving}
                    >
                      {isFinalStep ? 'Finish & go to feed' : 'Continue'}
                    </SubmitButton>
                  </div>
                </div>
              </form>
            </FormProvider>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
