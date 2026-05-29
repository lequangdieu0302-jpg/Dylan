import { Star } from 'lucide-react'
import { cn } from '@/lib/utils'

interface HopeStarsProps {
  count: number
  max?: number
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function HopeStars({ count, max = 5, size = 'md', className }: HopeStarsProps) {
  const sizes = { sm: 'h-3 w-3', md: 'h-4 w-4', lg: 'h-5 w-5' }

  return (
    <div className={cn('flex items-center gap-0.5', className)}>
      {Array.from({ length: max }).map((_, i) => (
        <Star
          key={i}
          className={cn(
            sizes[size],
            'transition-all duration-200',
            i < count
              ? 'text-gold-400 fill-gold-400 drop-shadow-[0_0_4px_rgba(251,191,36,0.8)]'
              : 'text-muted-foreground/30'
          )}
        />
      ))}
    </div>
  )
}
