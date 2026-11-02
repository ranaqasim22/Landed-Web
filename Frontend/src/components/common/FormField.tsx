import type { ComponentProps, FocusEvent, ReactNode } from 'react'
import { CircleAlertIcon } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

export function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null
  return (
    <p id={id} role="alert" className="flex items-start gap-1.5 text-sm text-destructive">
      <CircleAlertIcon aria-hidden className="mt-0.5 size-4 shrink-0" />
      {message}
    </p>
  )
}

// Skips blur validation when the user is leaving rather than finishing the field. A new error
// would also shift the layout mid-click and make the click on a link miss.
function isLeavingField({ target, relatedTarget }: FocusEvent<HTMLInputElement>) {
  const next = relatedTarget as HTMLElement | null
  if (next?.tagName === 'A') return true
  return !target.value && (!next || !target.form?.contains(next))
}

type FormFieldProps = ComponentProps<typeof Input> & {
  id: string
  label: string
  error?: string
  describedBy?: string
  endAdornment?: ReactNode
}

export function FormField({
  id,
  label,
  error,
  describedBy,
  endAdornment,
  className,
  onBlur,
  ...inputProps
}: FormFieldProps) {
  const errorId = `${id}-error`

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          id={id}
          required
          aria-invalid={Boolean(error)}
          aria-describedby={cn(error && errorId, describedBy) || undefined}
          className={cn('h-11', className)}
          onBlur={(event) => {
            if (!isLeavingField(event)) onBlur?.(event)
          }}
          {...inputProps}
        />
        {endAdornment}
      </div>
      <FieldError id={errorId} message={error} />
    </div>
  )
}
