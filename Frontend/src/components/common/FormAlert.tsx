import type { ReactNode } from 'react'
import { CircleAlertIcon } from 'lucide-react'

export function FormAlert({ message, action }: { message: string; action?: ReactNode }) {
  return (
    <div
      role="alert"
      className="flex flex-wrap items-center gap-2 rounded-lg border border-destructive p-3 text-sm text-destructive"
    >
      <CircleAlertIcon aria-hidden className="size-4 shrink-0" />
      <span className="min-w-0 flex-1">{message}</span>
      {action}
    </div>
  )
}
