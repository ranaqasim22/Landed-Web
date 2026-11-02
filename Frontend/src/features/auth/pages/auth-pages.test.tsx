import type { ReactNode } from 'react'
import { act, fireEvent, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AxiosError, AxiosHeaders } from 'axios'
import { toast } from 'sonner'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderApp } from '@/test/render-app'
import { authApi } from '../api/auth.api'
import { useAuthStore } from '../hooks/use-auth-store'

vi.mock('../api/auth.api', () => ({
  authApi: {
    login: vi.fn(),
    signup: vi.fn(),
    google: vi.fn(),
    forgotPassword: vi.fn(),
    resetPassword: vi.fn(),
    resendVerification: vi.fn(),
  },
}))

vi.mock('@react-oauth/google', () => ({
  GoogleOAuthProvider: ({ children }: { children: ReactNode }) => children,
  GoogleLogin: ({
    onSuccess,
  }: {
    onSuccess: (response: { credential?: string }) => void
  }) => (
    <>
      <button onClick={() => onSuccess({ credential: 'google-id-token' })}>Google</button>
      <button onClick={() => onSuccess({})}>Google no credential</button>
    </>
  ),
}))

const session = {
  user: { id: '1', email: 'ana@example.com', fullName: 'Ana Silva' },
  accessToken: 'token',
}

function httpError(status: number) {
  const config = { headers: new AxiosHeaders() }
  return new AxiosError('failed', undefined, config, undefined, {
    status,
    statusText: '',
    data: {},
    headers: {},
    config,
  })
}

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((res) => {
    resolve = res
  })
  return { promise, resolve }
}

const heading = (name: string) => screen.findByRole('heading', { name })
const field = (name: RegExp) => screen.getByLabelText(name)
const button = (name: RegExp) => screen.getByRole('button', { name })

beforeEach(() => {
  vi.clearAllMocks()
  useAuthStore.setState({ user: null, accessToken: null, isNewUser: false })
})

describe('LoginPage', () => {
  async function fillLogin() {
    const user = userEvent.setup()
    renderApp('/login')
    await user.type(field(/^email/i), 'ana@example.com')
    await user.type(field(/^password/i), 'secret')
    await waitFor(() => expect(button(/^log in$/i)).toBeEnabled())
    return user
  }

  it('autofocuses email and keeps submit disabled until valid', async () => {
    const user = userEvent.setup()
    renderApp('/login')
    expect(field(/^email/i)).toHaveFocus()
    expect(button(/^log in$/i)).toBeDisabled()
    await user.type(field(/^email/i), 'ana@example.com')
    await user.type(field(/^password/i), 'secret')
    await waitFor(() => expect(button(/^log in$/i)).toBeEnabled())
  })

  it('validates on blur, links the error, and clears it live while fixing', async () => {
    const user = userEvent.setup()
    renderApp('/login')
    const email = field(/^email/i)
    await user.type(email, 'nope')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    await user.tab()
    const error = await screen.findByText(/enter a valid email/i)
    expect(email).toHaveAttribute('aria-invalid', 'true')
    expect(email).toHaveAttribute('aria-describedby', error.id)
    await user.type(email, '@example.com')
    await waitFor(() =>
      expect(screen.queryByText(/enter a valid email/i)).not.toBeInTheDocument(),
    )
  })

  it('does not flag an empty field when leaving for a link', async () => {
    const user = userEvent.setup()
    renderApp('/login')
    await user.click(screen.getByRole('link', { name: /forgot password/i }))
    expect(await heading('Forgot your password?')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('does not flag a half-typed email when leaving for a link', async () => {
    const user = userEvent.setup()
    renderApp('/login')
    await user.type(field(/^email/i), 'ana@')
    await user.click(screen.getByRole('link', { name: /forgot password/i }))
    expect(await heading('Forgot your password?')).toBeInTheDocument()
  })

  it('flags an empty field when tabbing to the next one', async () => {
    const user = userEvent.setup()
    renderApp('/login')
    await user.tab()
    expect(field(/^password/i)).toHaveFocus()
    expect(await screen.findByText(/enter a valid email/i)).toBeInTheDocument()
  })

  it('toggles password visibility with an accessible button', async () => {
    const user = userEvent.setup()
    renderApp('/login')
    const password = field(/^password/i)
    expect(password).toHaveAttribute('type', 'password')
    await user.click(button(/show password/i))
    expect(password).toHaveAttribute('type', 'text')
    expect(button(/hide password/i)).toBeInTheDocument()
  })

  it('shows the loading state, blocks double submit, then goes home', async () => {
    const pending = deferred<typeof session>()
    vi.mocked(authApi.login).mockReturnValue(pending.promise)
    const success = vi.spyOn(toast, 'success')
    const user = await fillLogin()

    await user.keyboard('{Enter}')
    const loading = await screen.findByRole('button', { name: /logging in/i })
    expect(loading).toBeDisabled()
    fireEvent.click(loading)
    expect(authApi.login).toHaveBeenCalledTimes(1)
    expect(vi.mocked(authApi.login).mock.calls[0][0]).toEqual({
      email: 'ana@example.com',
      password: 'secret',
    })

    await act(async () => pending.resolve(session))
    expect(await heading('Home')).toBeInTheDocument()
    expect(success).toHaveBeenCalledWith('Welcome back')
  })

  it.each([
    [401, 'Email or password is incorrect'],
    [429, 'Too many attempts, try again in a minute'],
  ])('explains a %i response in plain words', async (status, message) => {
    vi.mocked(authApi.login).mockRejectedValue(httpError(status))
    const user = await fillLogin()
    await user.click(button(/^log in$/i))
    expect(await screen.findByRole('alert')).toHaveTextContent(message)
    expect(button(/^log in$/i)).toBeEnabled()
  })

  it('explains being offline', async () => {
    vi.mocked(authApi.login).mockRejectedValue(new AxiosError('Network Error'))
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    const user = await fillLogin()
    await user.click(button(/^log in$/i))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No internet — check your connection and try again',
    )
  })

  it('sends unverified users to the verify page', async () => {
    vi.mocked(authApi.login).mockRejectedValue(httpError(403))
    const user = await fillLogin()
    await user.click(button(/^log in$/i))
    expect(await heading('Check your inbox')).toBeInTheDocument()
    expect(screen.getByText('ana@example.com')).toBeInTheDocument()
  })

  it.each(['/login', '/signup'])('redirects logged-in users away from %s', async (path) => {
    useAuthStore.setState({ accessToken: 'token' })
    renderApp(path)
    expect(await heading('Home')).toBeInTheDocument()
  })
})

describe('Google sign-in', () => {
  it('sends the ID token and takes new users to onboarding', async () => {
    vi.mocked(authApi.google).mockResolvedValue({ ...session, isNewUser: true })
    const user = userEvent.setup()
    renderApp('/signup')
    expect(screen.getByText('We only use your name and email.')).toBeInTheDocument()
    await user.click(button(/^google$/i))
    expect(await heading('Onboarding')).toBeInTheDocument()
    expect(vi.mocked(authApi.google).mock.calls[0][0]).toEqual({ idToken: 'google-id-token' })
  })

  it('takes existing users home', async () => {
    vi.mocked(authApi.google).mockResolvedValue({ ...session, isNewUser: false })
    const user = userEvent.setup()
    renderApp('/login')
    await user.click(button(/^google$/i))
    expect(await heading('Home')).toBeInTheDocument()
  })

  it('stays quiet when no credential comes back', async () => {
    const user = userEvent.setup()
    renderApp('/login')
    await user.click(button(/google no credential/i))
    expect(authApi.google).not.toHaveBeenCalled()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('shows a loading state while the backend responds', async () => {
    const pending = deferred<typeof session>()
    vi.mocked(authApi.google).mockReturnValue(pending.promise)
    const user = userEvent.setup()
    renderApp('/login')
    await user.click(button(/^google$/i))
    expect(
      await screen.findByRole('button', { name: /signing in with google/i }),
    ).toBeDisabled()
    await act(async () => pending.resolve(session))
  })
})

describe('SignupPage', () => {
  async function fillSignup(user: ReturnType<typeof userEvent.setup>) {
    await user.type(field(/full name/i), 'Ana Silva')
    await user.type(field(/^email/i), 'ana@example.com')
    await user.type(field(/^password/i), 'abcd1234')
    await user.type(field(/confirm password/i), 'abcd1234')
    await user.click(screen.getByRole('checkbox'))
    await waitFor(() => expect(button(/create account/i)).toBeEnabled())
  }

  it('updates the checklist and strength hint as the user types', async () => {
    const user = userEvent.setup()
    renderApp('/signup')
    const rule = screen.getByText('At least 8 characters')
    expect(rule).toHaveTextContent('Not yet:')
    await user.type(field(/^password/i), 'abcd1234')
    expect(rule).toHaveTextContent('Done:')
    expect(screen.getByText('Password strength: Good')).toBeInTheDocument()
    expect(field(/^password/i)).toHaveAttribute('aria-describedby', 'password-rules')
  })

  it('requires the terms and does not pre-check them', async () => {
    const user = userEvent.setup()
    renderApp('/signup')
    await user.type(field(/full name/i), 'Ana Silva')
    await user.type(field(/^email/i), 'ana@example.com')
    await user.type(field(/^password/i), 'abcd1234')
    await user.type(field(/confirm password/i), 'abcd1234')
    const terms = screen.getByRole('checkbox')
    expect(terms).not.toBeChecked()
    expect(button(/create account/i)).toBeDisabled()
    await user.click(terms)
    await waitFor(() => expect(button(/create account/i)).toBeEnabled())
  })

  it('opens the legal links in a new tab', () => {
    renderApp('/signup')
    for (const name of [/^terms/i, /privacy policy/i]) {
      expect(screen.getByRole('link', { name })).toHaveAttribute('target', '_blank')
    }
  })

  it('flags a mismatch and re-checks it when the first password changes', async () => {
    const user = userEvent.setup()
    renderApp('/signup')
    await user.type(field(/^password/i), 'abcd1234')
    await user.type(field(/confirm password/i), 'abcd12345')
    await user.tab()
    expect(await screen.findByText("Passwords don't match")).toBeInTheDocument()
    await user.type(field(/^password/i), '5')
    await waitFor(() =>
      expect(screen.queryByText("Passwords don't match")).not.toBeInTheDocument(),
    )
  })

  it('does not nag about confirmation before the user reaches it', async () => {
    const user = userEvent.setup()
    renderApp('/signup')
    await user.type(field(/^password/i), 'abcd1234')
    expect(screen.queryByText('Confirm your password')).not.toBeInTheDocument()
  })

  it('submits, drops client-only fields, and goes to verify email', async () => {
    const pending = deferred<void>()
    vi.mocked(authApi.signup).mockReturnValue(pending.promise)
    const user = userEvent.setup()
    renderApp('/signup')
    await fillSignup(user)
    await user.click(button(/create account/i))
    expect(await screen.findByRole('button', { name: /creating account/i })).toBeDisabled()
    expect(vi.mocked(authApi.signup).mock.calls[0][0]).toEqual({
      fullName: 'Ana Silva',
      email: 'ana@example.com',
      password: 'abcd1234',
    })
    await act(async () => pending.resolve())
    expect(await heading('Check your inbox')).toBeInTheDocument()
  })

  it('explains a duplicate email', async () => {
    vi.mocked(authApi.signup).mockRejectedValue(httpError(409))
    const user = userEvent.setup()
    renderApp('/signup')
    await fillSignup(user)
    await user.click(button(/create account/i))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'An account with this email already exists',
    )
  })
})

describe('VerifyEmailPage', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  const entry = { pathname: '/verify-email', state: { email: 'ana@example.com' } }
  const advance = (seconds: number) =>
    act(async () => {
      await vi.advanceTimersByTimeAsync(seconds * 1000)
    })

  it('holds resend for 60 seconds, then restarts the cooldown after sending', async () => {
    vi.useFakeTimers()
    vi.mocked(authApi.resendVerification).mockResolvedValue()
    const success = vi.spyOn(toast, 'success')
    renderApp(entry)

    expect(button(/resend email in 60s/i)).toBeDisabled()
    await advance(59)
    expect(button(/resend email in 1s/i)).toBeDisabled()
    await advance(1)
    expect(button(/^resend email$/i)).toBeEnabled()

    fireEvent.click(button(/^resend email$/i))
    await advance(0)
    expect(vi.mocked(authApi.resendVerification).mock.calls[0][0]).toEqual({
      email: 'ana@example.com',
    })
    expect(success).toHaveBeenCalledWith('We sent another email')
    expect(button(/resend email in 60s/i)).toBeDisabled()
  })

  it('sends visitors without an email back to signup', async () => {
    renderApp('/verify-email')
    expect(await heading('Create your account')).toBeInTheDocument()
  })
})

describe('ForgotPasswordPage', () => {
  it('shows the same neutral message on success', async () => {
    vi.mocked(authApi.forgotPassword).mockResolvedValue()
    const user = userEvent.setup()
    renderApp('/forgot-password')
    await user.type(field(/^email/i), 'ana@example.com')
    await waitFor(() => expect(button(/send reset link/i)).toBeEnabled())
    await user.click(button(/send reset link/i))
    expect(await screen.findByRole('status')).toHaveTextContent(
      'If an account exists, we sent a reset link',
    )
    expect(screen.queryByLabelText(/^email/i)).not.toBeInTheDocument()
  })
})

describe('ResetPasswordPage', () => {
  async function fillReset() {
    const user = userEvent.setup()
    renderApp('/reset-password/abc123')
    await user.type(field(/new password/i), 'abcd1234')
    await user.type(field(/confirm password/i), 'abcd1234')
    await waitFor(() => expect(button(/update password/i)).toBeEnabled())
    await user.click(button(/update password/i))
  }

  it('sends the URL token, then redirects to login with a toast', async () => {
    vi.mocked(authApi.resetPassword).mockResolvedValue()
    const success = vi.spyOn(toast, 'success')
    await fillReset()
    expect(await heading('Welcome back')).toBeInTheDocument()
    expect(vi.mocked(authApi.resetPassword).mock.calls[0][0]).toEqual({
      token: 'abc123',
      password: 'abcd1234',
    })
    expect(success).toHaveBeenCalledWith('Password updated. Log in with your new password')
  })

  it('explains an expired link', async () => {
    vi.mocked(authApi.resetPassword).mockRejectedValue(httpError(400))
    await fillReset()
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'This reset link is invalid or has expired',
    )
  })
})
