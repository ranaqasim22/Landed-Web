import { cn } from '@/lib/utils'

function getInitials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean)
  const letters = words.length > 1 ? [words[0], words[words.length - 1]] : words
  return letters.map((word) => word[0].toUpperCase()).join('')
}

type UserAvatarProps = {
  name: string
  src?: string | null
  className?: string
}

export function UserAvatar({ name, src, className }: UserAvatarProps) {
  const classes = cn('size-20 shrink-0 rounded-full', className)
  if (src) return <img src={src} alt={`${name}'s photo`} className={cn(classes, 'object-cover')} />
  return (
    <div
      role="img"
      aria-label={`${name}'s initials`}
      className={cn(
        classes,
        'flex items-center justify-center bg-primary text-xl font-semibold text-primary-foreground',
      )}
    >
      {getInitials(name)}
    </div>
  )
}
