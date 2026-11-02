import type { ComponentProps } from 'react'
import { Loader2Icon } from 'lucide-react'
import { Button } from '@/components/ui/button'

type SubmitButtonProps = ComponentProps<typeof Button> & {
  isPending: boolean
  pendingLabel: string
}

export function SubmitButton({
  isPending,
  pendingLabel,
  disabled,
  children,
  ...props
}: SubmitButtonProps) {
  return (
    <Button
      type="submit"
      disabled={disabled || isPending}
      className="h-11 w-full"
      {...props}
    >
      {isPending && <Loader2Icon aria-hidden className="animate-spin" />}
      {isPending ? pendingLabel : children}
    </Button>
  )
}
