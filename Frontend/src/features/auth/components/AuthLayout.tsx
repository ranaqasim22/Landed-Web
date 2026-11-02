import { PauseIcon, PlayIcon } from 'lucide-react'
import { Outlet } from 'react-router-dom'
import berlinLarge from '@/assets/germany/berlin-2560.webp'
import berlinSmall from '@/assets/germany/berlin-1280.webp'
import campusLarge from '@/assets/germany/campus-2560.webp'
import campusSmall from '@/assets/germany/campus-1280.webp'
import hamburgLarge from '@/assets/germany/hamburg-2560.webp'
import hamburgSmall from '@/assets/germany/hamburg-1280.webp'
import neuschwansteinLarge from '@/assets/germany/neuschwanstein-2560.webp'
import neuschwansteinSmall from '@/assets/germany/neuschwanstein-1280.webp'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useSlideshow } from '../hooks/use-slideshow'
import { ThemeToggle } from './ThemeToggle'

const SLIDE_DURATION_MS = 5000

// Photos are from Unsplash. Phones pick the small file, which saves them most of the download.
const slides = [
  // Florian Wehde: https://unsplash.com/photos/uFGi0_YciE0
  { small: berlinSmall, large: berlinLarge },
  // Daniel Seßler: https://unsplash.com/photos/nYvXQ-xl53o
  { small: neuschwansteinSmall, large: neuschwansteinLarge },
  // Henning Kesselhut: https://unsplash.com/photos/25uEmJ_ml5Q
  { small: hamburgSmall, large: hamburgLarge },
  // Denise Leisner: https://unsplash.com/photos/PuuesYxncdA
  { small: campusSmall, large: campusLarge },
]

export function AuthLayout() {
  const { index, isPlaying, togglePlaying } = useSlideshow(slides.length, SLIDE_DURATION_MS)

  return (
    <div className="relative grid min-h-dvh lg:grid-cols-2">
      {/* Fixed so the photos stay put while a long form scrolls over them. */}
      <div aria-hidden className="fixed inset-0 overflow-hidden bg-neutral-900">
        {slides.map(({ small, large }, slideIndex) => (
          <img
            key={large}
            src={large}
            srcSet={`${small} 1280w, ${large} 2560w`}
            sizes="100vw"
            alt=""
            className={cn(
              'absolute inset-0 size-full animate-slow-zoom object-cover transition-opacity duration-1000',
              slideIndex !== index && 'opacity-0',
              !isPlaying && '[animation-play-state:paused]',
            )}
          />
        ))}
        <div className="absolute inset-0 bg-linear-to-tr from-black/90 via-black/45 via-50% to-transparent" />
      </div>
      {/* Always uses the dark colours because its text sits on a darkened photo in both themes. */}
      <aside className="dark relative hidden flex-col justify-end p-16 text-foreground lg:flex">
        <div className="max-w-xl space-y-3">
          <p className="text-2xl font-semibold tracking-tight whitespace-nowrap xl:text-4xl">
            Study in Germany — together
          </p>
          <p className="text-lg">
            Everything you need, from your first search to your first day. Free to join.
          </p>
        </div>
      </aside>
      <main className="relative flex items-center justify-center px-4 pt-16 pb-8 lg:py-12">
        <div className="glass-surface absolute top-2 right-2 flex rounded-md bg-card/85 backdrop-blur-md">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-11"
            aria-label={isPlaying ? 'Pause the photos' : 'Play the photos'}
            onClick={togglePlaying}
          >
            {isPlaying ? <PauseIcon aria-hidden /> : <PlayIcon aria-hidden />}
          </Button>
          <ThemeToggle />
        </div>
        <Outlet />
      </main>
    </div>
  )
}
