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
    <Card className="glass-surface w-full max-w-[420px] border bg-card/85 py-6 shadow-lg backdrop-blur-md lg:py-8 [&_input]:bg-background">
      <title>{`${title} · Landed`}</title>
      <CardHeader className="justify-items-center px-6 text-center lg:px-8">
        <img src={logo} alt="Landed" className="mb-2 size-16" />
        <CardTitle>
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        </CardTitle>
        <CardDescription className="text-base">{subtitle}</CardDescription>
      </CardHeader>
      {children && (
        <CardContent className="space-y-6 px-6 lg:px-8">{children}</CardContent>
      )}
      {footer && (
        <CardFooter className="flex-wrap justify-center gap-x-1 px-6 text-sm lg:px-8">
          {footer}
        </CardFooter>
      )}
    </Card>
  )
}
