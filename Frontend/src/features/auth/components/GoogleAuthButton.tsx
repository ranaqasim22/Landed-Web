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
        <p className="text-center text-sm text-muted-foreground">
          Google sign-in isn't available right now. You can use your email below.
        </p>
      )}
      <p className="text-center text-xs text-muted-foreground">
        We only use your name and email.
      </p>
    </div>
  )
}
