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
  return () => (container.firstChild as HTMLElement).style.getPropertyValue('--slide-color')
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

  it('changes the photo and the matching colour every 5 seconds, then loops', () => {
    const color = renderLayout()
    const first = color()
    wait(4999)
    expect(color()).toBe(first)
    wait(1)
    expect(color()).not.toBe(first)
    wait(15000)
    expect(color()).toBe(first)
  })

  it('stops when paused and carries on when played again', () => {
    const color = renderLayout()
    const first = color()
    fireEvent.click(screen.getByRole('button', { name: 'Pause the photos' }))
    wait(20000)
    expect(color()).toBe(first)
    fireEvent.click(screen.getByRole('button', { name: 'Play the photos' }))
    wait(5000)
    expect(color()).not.toBe(first)
  })

  it('starts still for people who prefer reduced motion', () => {
    vi.mocked(window.matchMedia).mockReturnValue({ matches: true } as MediaQueryList)
    const color = renderLayout()
    const first = color()
    wait(20000)
    expect(color()).toBe(first)
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
