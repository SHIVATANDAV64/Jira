import { getAvatarUrl } from '@/lib/appwrite';
import { clsx } from 'clsx';

interface AvatarProps {
  userId?: string;
  name: string;
  avatarId?: string;
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

export function Avatar({ userId, name, avatarId, size = 'md', className, showStatus, status = 'offline' }: AvatarProps) {
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div
      className={clsx(
        'relative flex items-center justify-center rounded-full font-medium text-white shrink-0 overflow-hidden',
        'bg-[var(--color-primary-600)]',
        sizeStyles[size],
        className
      )}
    >
      <span className="drop-shadow-sm font-medium">{initials}</span>
      {avatarId && (
        <img
          src={getAvatarUrl(userId || '', name, avatarId)}
          alt={name}
          className="absolute inset-0 h-full w-full object-cover"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        />
      )}
      
      {/* Status indicator */}
      {showStatus && (
        <span
          className={clsx(
            'absolute bottom-0 right-0 rounded-full border-[var(--color-bg-primary)]',
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
  users: Array<{ $id: string; name: string; avatar?: string; prefs?: { avatar?: string } }>;
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
          avatarId={user.avatar || user.prefs?.avatar}
          size={size}
          className="ring-2 ring-[var(--color-bg-primary)]"
        />
      ))}
      {remaining > 0 && (
        <div
          className={clsx(
            'flex items-center justify-center rounded-full bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] ring-2 ring-[var(--color-bg-primary)]',
            sizeStyles[size]
          )}
        >
          +{remaining}
        </div>
      )}
    </div>
  );
}
