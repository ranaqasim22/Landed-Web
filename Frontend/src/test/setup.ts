import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

vi.stubGlobal(
  'ResizeObserver',
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
)

vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false })))

// Popovers and the searchable list rely on browser features jsdom doesn't have.
Element.prototype.scrollIntoView = () => {}
Element.prototype.hasPointerCapture = () => false

afterEach(cleanup)
