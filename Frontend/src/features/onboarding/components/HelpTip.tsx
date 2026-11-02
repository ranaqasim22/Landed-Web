import { CircleHelpIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

// A popover rather than a hover tooltip, because hover doesn't exist on phones.
export function HelpTip({ label, children }: { label: string; children: string }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={label}
          className="-my-3 size-11"
        >
          <CircleHelpIcon aria-hidden />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="text-sm">{children}</PopoverContent>
    </Popover>
  )
}
