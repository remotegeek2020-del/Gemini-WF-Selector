import { clsx } from 'clsx'
import type { LeadStatus } from '@/types'

interface BadgeProps {
  children: React.ReactNode
  className?: string
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'gray'
}

export function Badge({ children, className, variant = 'default' }: BadgeProps) {
  const variants = {
    default: 'bg-indigo-100 text-indigo-800',
    success: 'bg-green-100 text-green-800',
    warning: 'bg-yellow-100 text-yellow-800',
    danger: 'bg-red-100 text-red-800',
    info: 'bg-blue-100 text-blue-800',
    gray: 'bg-gray-100 text-gray-700',
  }

  return (
    <span
      className={clsx(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  )
}

export function StatusBadge({ status }: { status: LeadStatus }) {
  const config: Record<LeadStatus, { label: string; variant: BadgeProps['variant'] }> = {
    pending: { label: 'Pending', variant: 'warning' },
    enriching: { label: 'Enriching', variant: 'info' },
    assigned: { label: 'Assigned', variant: 'success' },
    failed: { label: 'Failed', variant: 'danger' },
    no_persona: { label: 'No Persona', variant: 'gray' },
  }

  const { label, variant } = config[status] || { label: status, variant: 'gray' }
  return <Badge variant={variant}>{label}</Badge>
}
