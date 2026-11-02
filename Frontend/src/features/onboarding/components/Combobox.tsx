import { useId, useState, type ReactNode } from 'react'
import { CheckIcon, ChevronsUpDownIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

type ComboboxProps = {
  label: ReactNode
  labelAction?: ReactNode
  options: string[]
  value: string
  onChange: (value: string) => void
  placeholder: string
  searchPlaceholder: string
}

export function Combobox({
  label,
  labelAction,
  options,
  value,
  onChange,
  placeholder,
  searchPlaceholder,
}: ComboboxProps) {
  const [isOpen, setIsOpen] = useState(false)
  const labelId = useId()
  const valueId = useId()

  return (
    <div className="space-y-2">
      <div className="flex min-h-5 items-center gap-1">
        <span id={labelId} className="text-sm leading-none font-medium">
          {label}
        </span>
        {labelAction}
      </div>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={isOpen}
            aria-labelledby={`${labelId} ${valueId}`}
            className="h-11 w-full justify-between border-input font-normal"
          >
            <span id={valueId} className={cn('truncate', !value && 'text-muted-foreground')}>
              {value || placeholder}
            </span>
            <ChevronsUpDownIcon aria-hidden className="text-muted-foreground" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-(--radix-popover-trigger-width) p-0" align="start">
          <Command>
            <CommandInput placeholder={searchPlaceholder} />
            <CommandList>
              <CommandEmpty>No match. Try another spelling.</CommandEmpty>
              <CommandGroup>
                {options.map((option) => (
                  <CommandItem
                    key={option}
                    value={option}
                    className="min-h-11"
                    onSelect={() => {
                      onChange(option)
                      setIsOpen(false)
                    }}
                  >
                    {option}
                    {option === value && <CheckIcon aria-hidden className="ml-auto" />}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )
}
