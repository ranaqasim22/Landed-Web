import { useState, type ComponentProps } from 'react'
import { EyeIcon, EyeOffIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FormField } from '@/components/common/FormField'

export function PasswordField(
  props: Omit<ComponentProps<typeof FormField>, 'type' | 'endAdornment'>,
) {
  const [isVisible, setIsVisible] = useState(false)

  return (
    <FormField
      {...props}
      type={isVisible ? 'text' : 'password'}
      className="pr-12"
      endAdornment={
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={isVisible ? 'Hide password' : 'Show password'}
          onClick={() => setIsVisible((visible) => !visible)}
          className="absolute top-0 right-0 size-11"
        >
          {isVisible ? <EyeOffIcon aria-hidden /> : <EyeIcon aria-hidden />}
        </Button>
      }
    />
  )
}
