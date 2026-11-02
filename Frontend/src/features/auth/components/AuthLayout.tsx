import type { CSSProperties } from 'react'
import { PauseIcon, PlayIcon } from 'lucide-react'
import { Outlet } from 'react-router-dom'
import berlin from '@/assets/germany/berlin.webp'
import campus from '@/assets/germany/campus.webp'
import hamburg from '@/assets/germany/hamburg.webp'
import neuschwanstein from '@/assets/germany/neuschwanstein.webp'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useSlideshow } from '../hooks/use-slideshow'
import { ThemeToggle } from './ThemeToggle'

const SLIDE_DURATION_MS = 5000

// Photos are from Unsplash. Each colour comes from its photo and tints the login side to match.
const slides = [
  // Florian Wehde: https://unsplash.com/photos/uFGi0_YciE0
  { photo: berlin, color: '#1d4ed8' },
  // Daniel Seßler: https://unsplash.com/photos/nYvXQ-xl53o
  { photo: neuschwanstein, color: '#2f7d4f' },
  // Henning Kesselhut: https://unsplash.com/photos/25uEmJ_ml5Q
  { photo: hamburg, color: '#d97706' },
  // Denise Leisner: https://unsplash.com/photos/PuuesYxncdA
  { photo: campus, color: '#0e7490' },
]

export function AuthLayout() {
  const { index, isPlaying, togglePlaying } = useSlideshow(slides.length, SLIDE_DURATION_MS)

  return (
    <div
      className="grid min-h-dvh lg:grid-cols-2"
      style={{ '--slide-color': slides[index].color } as CSSProperties}
    >
      {/* Always uses the dark colours because its text sits on a darkened photo in both themes. */}
      <aside className="dark relative hidden flex-col justify-end overflow-hidden bg-background p-16 text-foreground lg:flex">
        {/* Background images, so phones that hide this panel never download them. */}
        {slides.map(({ photo }, slideIndex) => (
          <div
            key={photo}
            aria-hidden
            className={cn(
              'absolute inset-0 animate-slow-zoom bg-cover bg-center transition-opacity duration-1000',
              slideIndex !== index && 'opacity-0',
              !isPlaying && '[animation-play-state:paused]',
            )}
            style={{ backgroundImage: `url(${photo})` }}
          />
        ))}
        <div
          aria-hidden
          className="absolute inset-0 bg-linear-to-t from-black/85 via-black/45 via-40% to-black/10"
        />
        <div className="relative max-w-xl space-y-3">
          <p className="text-2xl font-semibold tracking-tight whitespace-nowrap xl:text-4xl">
            Study in Germany — together
          </p>
          <p className="text-lg">
            Everything you need, from your first search to your first day. Free to join.
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute right-3 bottom-3 size-11 bg-black/40"
          aria-label={isPlaying ? 'Pause the photos' : 'Play the photos'}
          onClick={togglePlaying}
        >
          {isPlaying ? <PauseIcon aria-hidden /> : <PlayIcon aria-hidden />}
        </Button>
      </aside>
      <main className="relative flex items-center justify-center px-4 pt-16 pb-8 transition-colors duration-1000 lg:bg-[color-mix(in_oklab,var(--slide-color)_15%,var(--background))] lg:py-12">
        <div className="absolute top-2 right-2">
          <ThemeToggle />
        </div>
        <Outlet />
      </main>
    </div>
  )
}
