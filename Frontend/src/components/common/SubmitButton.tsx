import type { ComponentProps } from 'react'
import { Loader2Icon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type SubmitButtonProps = ComponentProps<typeof Button> & {
  isPending: boolean
  pendingLabel: string
}

export function SubmitButton({
  isPending,
  pendingLabel,
  disabled,
  className,
  children,
  ...props
}: SubmitButtonProps) {
  return (
    <Button
      type="submit"
      disabled={disabled || isPending}
      className={cn('h-11 w-full', className)}
      {...props}
    >
      {isPending && <Loader2Icon aria-hidden className="animate-spin" />}
      {isPending ? pendingLabel : children}
    </Button>
  )
}
