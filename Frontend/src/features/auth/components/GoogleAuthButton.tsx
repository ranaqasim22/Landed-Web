import { useEffect, useRef, useState } from 'react'
import { GoogleLogin, GoogleOAuthProvider } from '@react-oauth/google'
import { Loader2Icon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getAuthErrorMessage } from '../api/auth.errors'
import { useGoogleAuth } from '../hooks/use-auth-mutations'
import { FormAlert } from '@/components/common/FormAlert'

type GoogleText = 'continue_with' | 'signup_with'

const MIN_WIDTH = 200
const MAX_WIDTH = 400

const BUTTON_LABELS: Record<GoogleText, string> = {
  continue_with: 'Continue with Google',
  signup_with: 'Sign up with Google',
}

function GoogleLogo() {
  return (
    <svg aria-hidden viewBox="0 0 48 48" className="size-5">
      <path
        fill="#EA4335"
        d="M24 9.5c3.5 0 6.7 1.2 9.2 3.6l6.9-6.9C35.9 2.4 30.5 0 24 0 14.6 0 6.5 5.4 2.6 13.2l8 6.2C12.5 13.6 17.8 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.9 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.9c-.6 3-2.2 5.5-4.7 7.2l7.7 6c4.5-4.2 7-10.3 7-17.7z"
      />
      <path
        fill="#FBBC05"
        d="M10.5 28.6c-.5-1.4-.8-3-.8-4.6s.3-3.2.8-4.6l-8-6.2C.9 16.5 0 20.1 0 24s.9 7.5 2.6 10.8l7.9-6.2z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.7-6c-2.2 1.4-4.9 2.3-8.2 2.3-6.2 0-11.5-4.2-13.4-9.9l-8 6.2C6.5 42.6 14.6 48 24 48z"
      />
    </svg>
  )
}

// Keeps the page the same when Google can't load, and explains why only if someone tries it.
function GoogleUnavailableButton({ text }: { text: GoogleText }) {
  const [showReason, setShowReason] = useState(false)

  return (
    <div className="space-y-3">
      <Button
        type="button"
        variant="outline"
        className="h-11 w-full"
        onClick={() => setShowReason(true)}
      >
        <GoogleLogo />
        {BUTTON_LABELS[text]}
      </Button>
      {showReason && (
        <FormAlert message="Google sign-in isn't available right now. You can use your email below." />
      )}
    </div>
  )
}

// Google's rendered button is the only one that returns an ID token, so it can't be restyled.
// Its width must be a number in pixels, which is why the container is measured.
function GoogleButton({ text }: { text: GoogleText }) {
  const googleAuth = useGoogleAuth()
  const containerRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(MAX_WIDTH)

  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => {
      const available = Math.round(entry.contentRect.width)
      setWidth(Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, available)))
    })
    if (containerRef.current) observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [])

  return (
    <div className="space-y-3">
      <div ref={containerRef} className="flex min-h-11 justify-center">
        {googleAuth.isPending ? (
          <Button type="button" variant="outline" disabled className="h-11 w-full">
            <Loader2Icon aria-hidden className="animate-spin" />
            Signing in with Google...
          </Button>
        ) : (
          <GoogleLogin
            text={text}
            theme="outline"
            size="large"
            shape="rectangular"
            logo_alignment="center"
            width={width}
            onSuccess={({ credential }) => {
              // Closing the popup never reaches here, so a cancelled sign-in stays silent.
              if (credential) googleAuth.mutate({ idToken: credential })
            }}
          />
        )}
      </div>
      {googleAuth.isError && (
        <FormAlert
          message={getAuthErrorMessage(googleAuth.error, {
            401: "Google couldn't confirm your account. Please try again",
          })}
        />
      )}
    </div>
  )
}

export function GoogleAuthButton({ text }: { text: GoogleText }) {
  const clientId: string | undefined = import.meta.env.VITE_GOOGLE_CLIENT_ID
  const [scriptFailed, setScriptFailed] = useState(false)

  return (
    <div className="space-y-2">
      {clientId && !scriptFailed ? (
        <GoogleOAuthProvider
          clientId={clientId}
          locale="en"
          onScriptLoadError={() => setScriptFailed(true)}
        >
          <GoogleButton text={text} />
        </GoogleOAuthProvider>
      ) : (
        <GoogleUnavailableButton text={text} />
      )}
      <p className="text-center text-xs text-muted-foreground">
        We only use your name and email.
      </p>
    </div>
  )
}
