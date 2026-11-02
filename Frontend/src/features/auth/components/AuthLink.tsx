import type { ComponentProps } from 'react'
import { Link } from 'react-router-dom'

export function AuthLink(props: ComponentProps<typeof Link>) {
  return <Link className="auth-link inline-flex min-h-11 items-center" {...props} />
}
