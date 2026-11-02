import { GraduationCapIcon, ListChecksIcon, UsersIcon } from 'lucide-react'
import { Outlet } from 'react-router-dom'
import logo from '@/assets/logo.png'
import { ThemeToggle } from './ThemeToggle'

const benefits = [
  { icon: ListChecksIcon, text: 'Clear steps from admission to visa' },
  { icon: UsersIcon, text: 'Connect with students on the same path' },
  { icon: GraduationCapIcon, text: 'Free to join' },
]

export function AuthLayout() {
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <aside className="hidden flex-col justify-center gap-10 border-r p-16 lg:flex">
        <img src={logo} alt="" className="size-20" />
        <p className="max-w-md text-4xl font-semibold tracking-tight">
          Study in Germany — together
        </p>
        <ul className="space-y-5 text-lg">
          {benefits.map(({ icon: Icon, text }) => (
            <li key={text} className="flex items-center gap-3">
              <Icon aria-hidden className="size-6 shrink-0 text-link" />
              {text}
            </li>
          ))}
        </ul>
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
