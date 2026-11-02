import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AxiosError } from 'axios'
import { toast } from 'sonner'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AuthUser } from '@/features/auth/api/auth.api'
import { useAuthStore } from '@/features/auth/hooks/use-auth-store'
import { renderApp } from '@/test/render-app'
import { usersApi } from '../api/users.api'

vi.mock('../api/users.api', () => ({
  usersApi: { updateMe: vi.fn(), uploadAvatar: vi.fn() },
}))

const newUser: AuthUser = {
  id: '1',
  email: 'ana@example.com',
  fullName: 'Ana Silva',
  onboardingCompleted: false,
  onboardingSkipped: false,
}
const nextYear = String(new Date().getFullYear() + 1)
const withStepOne = { ...newUser, targetDegree: 'master' }
const withStepTwo = {
  ...withStepOne,
  intake: { season: 'WS' as const, year: Number(nextYear) },
}

const heading = (name: string) => screen.findByRole('heading', { name })
const button = (name: RegExp | string) => screen.getByRole('button', { name })
const radio = (name: string) => screen.getByRole('radio', { name })

function startAt(user: AuthUser | null, route = '/onboarding') {
  useAuthStore.setState({ user, accessToken: user && 'token', isSessionChecked: true })
  renderApp(route)
  return userEvent.setup()
}

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  // Mirrors the API: whatever was sent comes back merged onto the user.
  vi.mocked(usersApi.updateMe).mockImplementation(async (changes) => ({
    ...useAuthStore.getState().user!,
    ...changes,
  }))
})

describe('access', () => {
  it('sends logged-out visitors to login', async () => {
    startAt(null)
    expect(await heading('Welcome back')).toBeInTheDocument()
  })

  it('sends users who already finished to home', async () => {
    startAt({ ...withStepTwo, onboardingCompleted: true })
    expect(await heading('Home')).toBeInTheDocument()
  })
})

describe('step 1', () => {
  it('shows progress in text and needs only a degree to continue', async () => {
    const user = startAt(newUser)
    expect(await heading('What are you planning?')).toBeInTheDocument()
    expect(screen.getByText('Step 1 of 3')).toBeInTheDocument()
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-label', 'Step 1 of 3')
    expect(button('Continue')).toBeDisabled()

    await user.click(radio('Master'))
    expect(button('Continue')).toBeEnabled()
    expect(radio('Master')).toBeChecked()
  })

  it('has no back button on the first step', async () => {
    startAt(newUser)
    await heading('What are you planning?')
    expect(screen.queryByRole('button', { name: 'Back' })).not.toBeInTheDocument()
  })

  it('moves between chips with the arrow keys', async () => {
    const user = startAt(newUser)
    await heading('What are you planning?')
    await user.click(radio('Bachelor'))
    await user.keyboard('{ArrowRight>}')
    await waitFor(() => expect(radio('Master')).toBeChecked())
    expect(radio('Bachelor')).not.toBeChecked()
  })

  it('saves the answers, moves on and announces the new step', async () => {
    const user = startAt(newUser)
    await heading('What are you planning?')
    await user.click(screen.getByRole('combobox', { name: /country/i }))
    await user.click(await screen.findByRole('option', { name: 'Pakistan' }))
    await user.click(radio('PhD'))
    await user.type(screen.getByLabelText(/field of study/i), 'Physics')
    await user.click(button('Continue'))

    expect(await heading('When do you want to start?')).toBeInTheDocument()
    expect(vi.mocked(usersApi.updateMe).mock.calls[0][0]).toEqual({
      country: 'Pakistan',
      targetDegree: 'phd',
      fieldOfStudy: 'Physics',
    })
    expect(screen.getByText('Step 2 of 3: When do you want to start?')).toHaveAttribute(
      'aria-live',
      'polite',
    )
  })

  it('lists the most common countries first and can search', async () => {
    const user = startAt(newUser)
    await heading('What are you planning?')
    await user.click(screen.getByRole('combobox', { name: /country/i }))
    const options = await screen.findAllByRole('option')
    expect(options.slice(0, 4).map((option) => option.textContent)).toEqual([
      'Pakistan',
      'India',
      'Bangladesh',
      'Nigeria',
    ])
    await user.type(screen.getByPlaceholderText('Search countries'), 'german')
    await waitFor(() => expect(screen.getAllByRole('option')).toHaveLength(1))
    expect(screen.getByRole('option', { name: 'Germany' })).toBeInTheDocument()
  })

  it('continues with Enter from a chip', async () => {
    const user = startAt(newUser)
    await heading('What are you planning?')
    await user.click(radio('Master'))
    await user.keyboard('{Enter}')
    expect(await heading('When do you want to start?')).toBeInTheDocument()
  })
})

describe('step 2', () => {
  it('needs both a season and a year, and sends them as an intake', async () => {
    const user = startAt(withStepOne, '/onboarding?step=2')
    expect(await heading('When do you want to start?')).toBeInTheDocument()
    expect(screen.getByText('WS starts in October, SS starts in April')).toBeInTheDocument()
    expect(button('Continue')).toBeDisabled()

    await user.click(radio('Summer Semester (SS)'))
    expect(button('Continue')).toBeDisabled()

    await user.selectOptions(screen.getByLabelText('Year'), nextYear)
    await waitFor(() => expect(button('Continue')).toBeEnabled())
    await user.click(radio('Applied'))
    await user.click(button('Continue'))

    expect(await heading('Let others know you')).toBeInTheDocument()
    expect(vi.mocked(usersApi.updateMe).mock.calls[0][0]).toEqual({
      intake: { season: 'SS', year: Number(nextYear) },
      stage: 'applied',
    })
  })

  it('explains what an embassy is', async () => {
    const user = startAt(withStepOne, '/onboarding?step=2')
    await heading('When do you want to start?')
    await user.click(button('What is an embassy or consulate?'))
    expect(
      await screen.findByText('The German embassy where you apply for your visa'),
    ).toBeInTheDocument()
  })

  it('keeps answers when going back', async () => {
    const user = startAt(withStepOne, '/onboarding?step=2')
    await heading('When do you want to start?')
    await user.click(button('Back'))
    expect(await heading('What are you planning?')).toBeInTheDocument()
    expect(radio('Master')).toBeChecked()
  })
})

describe('a link to a later step', () => {
  it('returns to the first step with a missing required answer', async () => {
    startAt(newUser, '/onboarding?step=3')
    expect(await heading('What are you planning?')).toBeInTheDocument()
  })

  it('ignores a nonsense step', async () => {
    startAt(newUser, '/onboarding?step=99')
    expect(await heading('What are you planning?')).toBeInTheDocument()
  })
})

describe('step 3 and finishing', () => {
  it('prefills the name and counts bio characters', async () => {
    const user = startAt(withStepTwo, '/onboarding?step=3')
    await heading('Let others know you')
    expect(screen.getByLabelText('Display name')).toHaveValue('Ana Silva')
    expect(screen.getByRole('img', { name: "Ana Silva's initials" })).toHaveTextContent('AS')
    await user.type(screen.getByLabelText(/short bio/i), 'Hello')
    expect(screen.getByText('5 of 160 characters')).toBeInTheDocument()
    expect(screen.getByLabelText(/short bio/i)).toHaveAttribute('maxlength', '160')
  })

  it('needs a name to finish', async () => {
    const user = startAt(withStepTwo, '/onboarding?step=3')
    await heading('Let others know you')
    await user.clear(screen.getByLabelText('Display name'))
    await user.tab()
    expect(await screen.findByText('Enter your name')).toBeInTheDocument()
    expect(button('Finish & go to feed')).toBeDisabled()
  })

  it('finishes with a welcome toast and goes home without the banner', async () => {
    const success = vi.spyOn(toast, 'success')
    const user = startAt(withStepTwo, '/onboarding?step=3')
    await heading('Let others know you')
    await user.click(button('Finish & go to feed'))

    expect(await heading('Home')).toBeInTheDocument()
    expect(vi.mocked(usersApi.updateMe).mock.calls[0][0]).toMatchObject({
      fullName: 'Ana Silva',
      onboardingCompleted: true,
    })
    expect(success).toHaveBeenCalledWith('Welcome to Landed, Ana Silva!')
    expect(screen.queryByText(/complete your profile/i)).not.toBeInTheDocument()
  })
})

describe('skip', () => {
  it('works with nothing filled in, saves what there is, and goes home', async () => {
    const user = startAt(newUser)
    await heading('What are you planning?')
    await user.click(button('Skip for now'))

    expect(await heading('Home')).toBeInTheDocument()
    expect(vi.mocked(usersApi.updateMe).mock.calls[0][0]).toEqual({ onboardingSkipped: true })
  })

  it('keeps partly filled answers', async () => {
    const user = startAt(newUser)
    await heading('What are you planning?')
    await user.type(screen.getByLabelText(/field of study/i), 'Physics')
    await user.click(button('Skip for now'))

    await heading('Home')
    expect(vi.mocked(usersApi.updateMe).mock.calls[0][0]).toEqual({
      fieldOfStudy: 'Physics',
      onboardingSkipped: true,
    })
  })

  it('shows a banner that links back and can be dismissed for good', async () => {
    const user = startAt({ ...newUser, onboardingSkipped: true }, '/home')
    await heading('Home')
    const link = screen.getByRole('link', {
      name: 'Complete your profile to see posts from your intake',
    })
    expect(link).toHaveAttribute('href', '/onboarding')

    await user.click(button('Dismiss this message'))
    expect(screen.queryByRole('link', { name: /complete your profile/i })).not.toBeInTheDocument()
    expect(localStorage.getItem('landed:profile-banner-dismissed')).toBe('true')
  })
})

describe('saving problems', () => {
  it('stays on the step, keeps answers, and retries', async () => {
    vi.mocked(usersApi.updateMe).mockRejectedValueOnce(new AxiosError('Network Error'))
    const user = startAt(newUser)
    await heading('What are you planning?')
    await user.click(radio('Master'))
    await user.click(button('Continue'))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      "Couldn't save — check your internet and try again",
    )
    expect(radio('Master')).toBeChecked()

    await user.click(button('Retry'))
    expect(await heading('When do you want to start?')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('shows the saving state and blocks a second click', async () => {
    let finish!: (user: AuthUser) => void
    vi.mocked(usersApi.updateMe).mockReturnValueOnce(
      new Promise((resolve) => {
        finish = resolve
      }),
    )
    const user = startAt(newUser)
    await heading('What are you planning?')
    await user.click(radio('Master'))
    await user.click(button('Continue'))

    const saving = await screen.findByRole('button', { name: 'Saving...' })
    expect(saving).toBeDisabled()
    expect(button('Skip for now')).toBeDisabled()
    await user.click(saving)
    expect(usersApi.updateMe).toHaveBeenCalledTimes(1)
    finish(withStepOne)
    expect(await heading('When do you want to start?')).toBeInTheDocument()
  })
})

describe('avatar', () => {
  const choose = async (user: ReturnType<typeof userEvent.setup>, file: File) => {
    await user.upload(screen.getByLabelText('Choose a photo'), file)
  }

  it('rejects other file types', async () => {
    const user = userEvent.setup({ applyAccept: false })
    useAuthStore.setState({ user: withStepTwo, accessToken: 'token', isSessionChecked: true })
    renderApp('/onboarding?step=3')
    await heading('Let others know you')
    await choose(user, new File(['x'], 'cv.pdf', { type: 'application/pdf' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Please choose a JPG, PNG or WebP image',
    )
  })

  it('rejects files over 5 MB', async () => {
    const user = startAt(withStepTwo, '/onboarding?step=3')
    await heading('Let others know you')
    const big = new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'big.png', { type: 'image/png' })
    await choose(user, big)
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Please choose an image smaller than 5 MB',
    )
  })

  it('shows and removes a saved photo', async () => {
    const user = startAt(
      { ...withStepTwo, avatarUrl: 'http://cdn.test/a.jpg' },
      '/onboarding?step=3',
    )
    await heading('Let others know you')
    expect(screen.getByRole('img', { name: "Ana Silva's photo" })).toHaveAttribute(
      'src',
      'http://cdn.test/a.jpg',
    )
    await user.click(button('Remove'))
    expect(screen.getByRole('img', { name: "Ana Silva's initials" })).toBeInTheDocument()

    await user.click(button('Finish & go to feed'))
    await heading('Home')
    expect(vi.mocked(usersApi.updateMe).mock.calls[0][0]).toMatchObject({ avatarUrl: null })
  })
})
