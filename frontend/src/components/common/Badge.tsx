import { clsx } from 'clsx';
import {
  AlertOctagon,
  ChevronUp,
  Minus,
  ChevronDown,
  Bug,
  Sparkles,
  ClipboardList,
  Lightbulb,
  type LucideIcon,
} from 'lucide-react';
import type { TicketPriority, TicketType, TicketStatus } from '@/types';
import { TICKET_PRIORITIES, TICKET_TYPES, TICKET_STATUSES } from '@/lib/constants';
import type { PriorityIconName, TypeIconName } from '@/lib/constants';

// Icon mappings
const PRIORITY_ICONS: Record<PriorityIconName, LucideIcon> = {
  AlertOctagon,
  ChevronUp,
  Minus,
  ChevronDown,
};

const TYPE_ICONS: Record<TypeIconName, LucideIcon> = {
  Bug,
  Sparkles,
  ClipboardList,
  Lightbulb,
};

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'outline' | 'info' | 'success' | 'warning' | 'error';
  size?: 'sm' | 'md';
  className?: string;
}

const variantStyles = {
  default: 'bg-[--color-bg-tertiary] text-[--color-text-secondary]',
  outline: 'border border-[--color-border-primary] text-[--color-text-secondary]',
  info: 'bg-blue-500/20 text-blue-400',
  success: 'bg-green-500/20 text-green-400',
  warning: 'bg-yellow-500/20 text-yellow-400',
  error: 'bg-red-500/20 text-red-400',
};

const sizeStyles = {
  sm: 'px-1.5 py-0.5 text-[10px]',
  md: 'px-2 py-0.5 text-xs',
};

export function Badge({ children, variant = 'default', size = 'md', className }: BadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 rounded-full font-medium',
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
    >
      {children}
    </span>
  );
}

interface PriorityBadgeProps {
  priority: TicketPriority;
}

export function PriorityBadge({ priority }: PriorityBadgeProps) {
  const config = TICKET_PRIORITIES[priority];
  const Icon = PRIORITY_ICONS[config.iconName];
  
  return (
    <Badge className={config.color}>
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
}

interface TypeBadgeProps {
  type: TicketType;
}

export function TypeBadge({ type }: TypeBadgeProps) {
  const config = TICKET_TYPES[type];
  const Icon = TYPE_ICONS[config.iconName];
  
  return (
    <Badge className={config.color}>
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
}

interface StatusBadgeProps {
  status: TicketStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = TICKET_STATUSES[status];
  return (
    <Badge className={clsx('text-white', config.color)}>
      {config.label}
    </Badge>
  );
}
