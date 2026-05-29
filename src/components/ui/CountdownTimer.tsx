import { useEffect, useState } from 'react'
import { getCountdownParts } from '@/lib/utils'

interface CountdownTimerProps {
  matchTime: string
  className?: string
  compact?: boolean
}

export function CountdownTimer({ matchTime, className = '', compact = false }: CountdownTimerProps) {
  const [parts, setParts] = useState(getCountdownParts(matchTime))

  useEffect(() => {
    const interval = setInterval(() => {
      setParts(getCountdownParts(matchTime))
    }, 1000)
    return () => clearInterval(interval)
  }, [matchTime])

  if (parts.isPast) {
    return <span className={`text-xs text-muted-foreground ${className}`}>Đã bắt đầu</span>
  }

  if (compact) {
    const { days, hours, minutes, seconds } = parts
    if (days > 0) return <span className={`text-xs text-primary font-mono ${className}`}>{days}d {hours}h</span>
    if (hours > 0) return <span className={`text-xs text-primary font-mono ${className}`}>{hours}h {minutes}m</span>
    return <span className={`text-xs text-orange-400 font-mono animate-pulse ${className}`}>{minutes}m {seconds}s</span>
  }

  const { days, hours, minutes, seconds } = parts

  const blocks = [
    { value: days, label: 'Ngày' },
    { value: hours, label: 'Giờ' },
    { value: minutes, label: 'Phút' },
    { value: seconds, label: 'Giây' },
  ]

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {blocks.map(({ value, label }, i) => (
        <div key={label} className="flex items-center gap-2">
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 glass-card flex items-center justify-center rounded-xl border border-primary/20">
              <span className="text-xl font-bold font-mono text-primary tabular-nums">
                {String(value).padStart(2, '0')}
              </span>
            </div>
            <span className="text-[10px] text-muted-foreground mt-0.5">{label}</span>
          </div>
          {i < 3 && <span className="text-primary font-bold text-xl mb-3">:</span>}
        </div>
      ))}
    </div>
  )
}
