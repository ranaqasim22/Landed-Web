import type { ReactNode } from 'react'
import logo from '@/assets/logo.png'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

type AuthCardProps = {
  title: string
  subtitle: ReactNode
  footer?: ReactNode
  children?: ReactNode
}

export function AuthCard({ title, subtitle, footer, children }: AuthCardProps) {
  return (
    <Card className="w-full max-w-[420px] border-0 bg-transparent py-0 shadow-none lg:border lg:bg-card lg:py-8 lg:shadow-sm">
      <title>{`${title} · Landed`}</title>
      <CardHeader className="px-0 lg:px-8">
        <img src={logo} alt="Landed" className="mb-2 size-14 lg:hidden" />
        <CardTitle>
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        </CardTitle>
        <CardDescription className="text-base">{subtitle}</CardDescription>
      </CardHeader>
      {children && (
        <CardContent className="space-y-6 px-0 lg:px-8">{children}</CardContent>
      )}
      {footer && (
        <CardFooter className="flex-wrap justify-center gap-x-1 px-0 text-sm lg:px-8">
          {footer}
        </CardFooter>
      )}
    </Card>
  )
}
