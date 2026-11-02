import { Loader2Icon } from 'lucide-react'

export function PageLoader() {
  return (
    <div role="status" className="flex min-h-dvh items-center justify-center">
      <Loader2Icon aria-hidden className="size-6 animate-spin text-muted-foreground" />
      <span className="sr-only">Loading</span>
    </div>
  )
}
