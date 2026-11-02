import {
  ChevronRightIcon,
  FileCheckIcon,
  LanguagesIcon,
  PlaneIcon,
  SearchIcon,
  UsersIcon,
} from 'lucide-react'
import { Outlet } from 'react-router-dom'
import { ThemeToggle } from './ThemeToggle'

const features = [
  {
    icon: SearchIcon,
    title: 'Search on your own',
    text: 'Look up universities and courses that fit your plans.',
  },
  {
    icon: LanguagesIcon,
    title: 'Learn German',
    text: 'Build the language skills you need for study and daily life.',
  },
  {
    icon: FileCheckIcon,
    title: 'Visa guide',
    text: 'Follow clear steps from your admission to your visa.',
  },
  {
    icon: UsersIcon,
    title: 'Student community',
    text: 'Connect with students on the same path as you.',
  },
]

const journey = ['Search', 'Apply', 'Visa', 'Germany']

export function AuthLayout() {
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <aside className="hidden flex-col justify-center border-r p-16 lg:flex">
        <div className="max-w-xl space-y-8">
          <div className="space-y-3">
            <p className="text-2xl font-semibold tracking-tight whitespace-nowrap xl:text-4xl">
              Study in Germany — together
            </p>
            <p className="text-lg text-muted-foreground">
              Everything you need, from your first search to your first day. Free to join.
            </p>
          </div>
          <ul className="grid gap-3 xl:grid-cols-2">
            {features.map(({ icon: Icon, title, text }) => (
              <li key={title} className="flex gap-3 rounded-xl border bg-card p-4 xl:flex-col">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <Icon aria-hidden className="size-5 text-link" />
                </span>
                <div className="space-y-1">
                  <p className="font-semibold">{title}</p>
                  <p className="text-sm text-muted-foreground">{text}</p>
                </div>
              </li>
            ))}
          </ul>
          <div className="flex items-center gap-3 text-sm font-medium">
            <PlaneIcon aria-hidden className="size-5 shrink-0 text-link" />
            <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
              {journey.map((stop, index) => (
                <li key={stop} className="flex items-center gap-2">
                  {index > 0 && (
                    <ChevronRightIcon aria-hidden className="size-4 text-muted-foreground" />
                  )}
                  {stop}
                </li>
              ))}
            </ol>
          </div>
        </div>
      </aside>
      <main className="relative flex items-center justify-center px-4 pt-16 pb-8 lg:py-12">
        <div className="absolute top-2 right-2">
          <ThemeToggle />
        </div>
        <Outlet />
      </main>
    </div>
  )
}
