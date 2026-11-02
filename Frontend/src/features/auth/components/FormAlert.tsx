import { CircleAlertIcon } from 'lucide-react'

export function FormAlert({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="flex items-start gap-2 rounded-lg border border-destructive p-3 text-sm text-destructive"
    >
      <CircleAlertIcon aria-hidden className="mt-0.5 size-4 shrink-0" />
      {message}
    </div>
  )
}
