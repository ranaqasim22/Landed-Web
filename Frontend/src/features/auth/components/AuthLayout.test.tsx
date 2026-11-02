import { act, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthLayout } from './AuthLayout'

function renderLayout() {
  const { container } = render(
    <MemoryRouter>
      <Routes>
        <Route element={<AuthLayout />}>
          <Route index element={<input aria-label="Email" />} />
        </Route>
      </Routes>
    </MemoryRouter>,
  )
  return () => container.querySelector('img:not(.opacity-0)')?.getAttribute('src')
}

const wait = (ms: number) => act(() => vi.advanceTimersByTime(ms))

describe('AuthLayout slideshow', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.mocked(window.matchMedia).mockClear()
    vi.mocked(window.matchMedia).mockReturnValue({ matches: false } as MediaQueryList)
  })

  it('changes the photo every 5 seconds, then loops', () => {
    const photo = renderLayout()
    const first = photo()
    wait(4999)
    expect(photo()).toBe(first)
    wait(1)
    expect(photo()).not.toBe(first)
    wait(15000)
    expect(photo()).toBe(first)
  })

  it('stops when paused and carries on when played again', () => {
    const photo = renderLayout()
    const first = photo()
    fireEvent.click(screen.getByRole('button', { name: 'Pause the photos' }))
    wait(20000)
    expect(photo()).toBe(first)
    fireEvent.click(screen.getByRole('button', { name: 'Play the photos' }))
    wait(5000)
    expect(photo()).not.toBe(first)
  })

  it('starts still for people who prefer reduced motion', () => {
    vi.mocked(window.matchMedia).mockReturnValue({ matches: true } as MediaQueryList)
    const photo = renderLayout()
    const first = photo()
    wait(20000)
    expect(photo()).toBe(first)
    expect(screen.getByRole('button', { name: 'Play the photos' })).toBeInTheDocument()
  })

  it('keeps what the person typed when the photo changes', () => {
    renderLayout()
    const email = screen.getByRole('textbox', { name: 'Email' })
    fireEvent.change(email, { target: { value: 'ana@example.com' } })
    email.focus()
    wait(5000)
    expect(email).toHaveValue('ana@example.com')
    expect(email).toHaveFocus()
  })
})
