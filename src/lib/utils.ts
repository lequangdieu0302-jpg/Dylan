import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { formatDistanceToNow, format, isPast, isFuture, differenceInSeconds } from 'date-fns'
import { vi } from 'date-fns/locale'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatMatchTime(dateStr: string): string {
  const date = new Date(dateStr)
  return format(date, 'HH:mm - dd/MM/yyyy')
}

export function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr)
  return formatDistanceToNow(date, { addSuffix: true, locale: vi })
}

export function isMatchLocked(matchTime: string): boolean {
  return isPast(new Date(matchTime))
}

export function isMatchUpcoming(matchTime: string): boolean {
  return isFuture(new Date(matchTime))
}

export function getCountdownParts(matchTime: string): {
  days: number
  hours: number
  minutes: number
  seconds: number
  isPast: boolean
} {
  const now = new Date()
  const target = new Date(matchTime)
  const diff = differenceInSeconds(target, now)

  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, isPast: true }
  }

  const days = Math.floor(diff / 86400)
  const hours = Math.floor((diff % 86400) / 3600)
  const minutes = Math.floor((diff % 3600) / 60)
  const seconds = diff % 60

  return { days, hours, minutes, seconds, isPast: false }
}

export function formatMoney(amount: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    minimumFractionDigits: 0,
  }).format(amount)
}

export function formatAccuracy(correct: number, wrong: number): string {
  const total = correct + wrong
  if (total === 0) return '0%'
  return `${Math.round((correct / total) * 100)}%`
}

export function getAccuracyNumber(correct: number, wrong: number): number {
  const total = correct + wrong
  if (total === 0) return 0
  return Math.round((correct / total) * 100)
}

export function getResultLabel(result: string | null): string {
  if (result === 'home') return 'Đội nhà thắng'
  if (result === 'draw') return 'Hòa'
  if (result === 'away') return 'Đội khách thắng'
  return 'Chưa có kết quả'
}

export function getPredictionLabel(prediction: string): string {
  if (prediction === 'home') return 'Đội nhà thắng'
  if (prediction === 'draw') return 'Hòa'
  if (prediction === 'away') return 'Đội khách thắng'
  if (prediction === 'none') return 'Không dự đoán'
  return ''
}

export function getRankBadge(rank: number): string {
  if (rank === 1) return '🥇'
  if (rank === 2) return '🥈'
  if (rank === 3) return '🥉'
  return `#${rank}`
}

export function getAvatarFallback(username: string): string {
  return username.slice(0, 2).toUpperCase()
}

export function truncate(str: string, maxLen: number): string {
  return str.length > maxLen ? str.slice(0, maxLen) + '…' : str
}
