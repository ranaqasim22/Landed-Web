import { useState } from 'react'
import { XIcon } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/features/auth/hooks/use-auth-store'

const DISMISSED_KEY = 'landed:profile-banner-dismissed'

export function CompleteProfileBanner() {
  const isCompleted = useAuthStore((state) => state.user?.onboardingCompleted)
  const [isDismissed, setIsDismissed] = useState(() => localStorage.getItem(DISMISSED_KEY) === 'true')

  if (isCompleted || isDismissed) return null

  return (
    <aside
      aria-label="Complete your profile"
      className="flex items-center gap-2 border-b bg-muted py-1 pr-1 pl-4 text-sm"
    >
      <Link to="/onboarding" className="auth-link flex-1 py-2">
        Complete your profile to see posts from your intake
      </Link>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label="Dismiss this message"
        className="size-11"
        onClick={() => {
          localStorage.setItem(DISMISSED_KEY, 'true')
          setIsDismissed(true)
        }}
      >
        <XIcon aria-hidden />
      </Button>
    </aside>
  )
}
