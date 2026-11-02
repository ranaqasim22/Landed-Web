import { useId, type ReactNode } from 'react'
import { CheckIcon } from 'lucide-react'
import { RadioGroup } from 'radix-ui'

type ChipGroupProps = {
  label: ReactNode
  options: { value: string; label: string }[]
  value: string
  onChange: (value: string) => void
  required?: boolean
}

export function ChipGroup({ label, options, value, onChange, required }: ChipGroupProps) {
  const labelId = useId()

  return (
    <div className="space-y-2">
      <p id={labelId} className="text-sm leading-none font-medium">
        {label}
      </p>
      <RadioGroup.Root
        aria-labelledby={labelId}
        aria-required={required}
        value={value}
        onValueChange={onChange}
        className="flex flex-wrap gap-2"
      >
        {options.map((option) => (
          <RadioGroup.Item
            key={option.value}
            value={option.value}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-input px-4 py-2 text-left text-sm font-medium ring-offset-background outline-none hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:ring-offset-2 data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
          >
            <RadioGroup.Indicator>
              <CheckIcon aria-hidden className="size-4" />
            </RadioGroup.Indicator>
            {option.label}
          </RadioGroup.Item>
        ))}
      </RadioGroup.Root>
    </div>
  )
}
