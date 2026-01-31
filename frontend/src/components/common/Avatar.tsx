import { getAvatarUrl } from '@/lib/appwrite';
import { clsx } from 'clsx';

interface AvatarProps {
  userId?: string;
  name: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showStatus?: boolean;
  status?: 'online' | 'offline' | 'busy' | 'away';
}

const sizeStyles = {
  sm: 'h-6 w-6 text-xs',
  md: 'h-8 w-8 text-sm',
  lg: 'h-10 w-10 text-base',
};

const statusColors = {
  online: 'bg-emerald-500',
  offline: 'bg-gray-400',
  busy: 'bg-red-500',
  away: 'bg-amber-500',
};

const statusSizes = {
  sm: 'h-2 w-2 border',
  md: 'h-2.5 w-2.5 border-2',
  lg: 'h-3 w-3 border-2',
};

export function Avatar({ userId, name, size = 'md', className, showStatus, status = 'offline' }: AvatarProps) {
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div
      className={clsx(
        'relative flex items-center justify-center rounded-full font-medium text-white overflow-hidden',
        'bg-gradient-to-br from-[--color-primary-500] to-[--color-primary-700]',
        'ring-2 ring-[--color-bg-primary]/50',
        'transition-transform duration-150 hover:scale-105',
        sizeStyles[size],
        className
      )}
    >
      {userId && (
        <img
          src={getAvatarUrl(userId, name)}
          alt={name}
          className="absolute inset-0 h-full w-full object-cover"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        />
      )}
      <span className="relative z-10 drop-shadow-sm">{initials}</span>
      
      {/* Status indicator */}
      {showStatus && (
        <span
          className={clsx(
            'absolute bottom-0 right-0 rounded-full border-[--color-bg-primary]',
            statusColors[status],
            statusSizes[size],
            status === 'online' && 'animate-pulse-subtle'
          )}
        />
      )}
    </div>
  );
}

interface AvatarGroupProps {
  users: Array<{ $id: string; name: string }>;
  max?: number;
  size?: 'sm' | 'md' | 'lg';
}

export function AvatarGroup({ users, max = 3, size = 'sm' }: AvatarGroupProps) {
  const displayUsers = users.slice(0, max);
  const remaining = users.length - max;

  return (
    <div className="flex -space-x-2">
      {displayUsers.map((user) => (
        <Avatar
          key={user.$id}
          userId={user.$id}
          name={user.name}
          size={size}
          className="ring-2 ring-[--color-bg-primary]"
        />
      ))}
      {remaining > 0 && (
        <div
          className={clsx(
            'flex items-center justify-center rounded-full bg-[--color-bg-tertiary] text-[--color-text-secondary] ring-2 ring-[--color-bg-primary]',
            sizeStyles[size]
          )}
        >
          +{remaining}
        </div>
      )}
    </div>
  );
}
