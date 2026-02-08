import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Bell, Check, CheckCheck, Trash2, Loader2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import {
  useNotifications,
  useUnreadCount,
  useMarkAsRead,
  useMarkAllAsRead,
  useDeleteNotification,
  formatNotificationTime,
  getNotificationIcon,
} from '@/hooks/useNotifications';
import type { Notification } from '@/types';

export function NotificationBell() {
  const { user } = useAuth();
  const { unreadCount } = useUnreadCount(user?.$id);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg hover:bg-[var(--color-bg-hover)] transition-colors"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5 text-[var(--color-text-secondary)]" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-medium text-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <NotificationDropdown
          onClose={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}

interface NotificationDropdownProps {
  onClose: () => void;
}

function NotificationDropdown({ onClose }: NotificationDropdownProps) {
  const { user } = useAuth();
  const { notifications, isLoading } = useNotifications(user?.$id);
  const markAllAsReadMutation = useMarkAllAsRead();

  const handleMarkAllAsRead = () => {
    if (user?.$id) {
      markAllAsReadMutation.mutate(user.$id);
    }
  };

  const unreadNotifications = notifications.filter((n) => !n.read);
  const hasUnread = unreadNotifications.length > 0;

  return (
    <div className="absolute right-0 top-full mt-1 w-80 sm:w-96 rounded-md border border-[var(--color-border-primary)] bg-[var(--color-bg-secondary)] shadow-lg z-50">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-[var(--color-border-primary)]">
        <h3 className="font-semibold text-[var(--color-text-primary)]">
          Notifications
        </h3>
        {hasUnread && (
          <button
            onClick={handleMarkAllAsRead}
            disabled={markAllAsReadMutation.isPending}
            className="flex items-center gap-1 text-sm text-[var(--color-primary-600)] hover:text-[var(--color-primary-700)] disabled:opacity-50"
          >
            <CheckCheck className="h-4 w-4" />
            Mark all read
          </button>
        )}
      </div>

      {/* Notification List */}
      <div className="max-h-96 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-[var(--color-text-muted)]" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Bell className="h-10 w-10 text-[var(--color-text-muted)] mb-2" />
            <p className="text-[var(--color-text-secondary)]">No notifications</p>
            <p className="text-sm text-[var(--color-text-muted)]">
              You're all caught up!
            </p>
          </div>
        ) : (
          <div>
            {notifications.map((notification) => (
              <NotificationItem
                key={notification.$id}
                notification={notification}
                onClose={onClose}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      {notifications.length > 0 && (
        <div className="p-3 border-t border-[var(--color-border-primary)]">
          <Link
            to="/notifications"
            onClick={onClose}
            className="block text-center text-sm text-[var(--color-primary-600)] hover:text-[var(--color-primary-700)]"
          >
            View all notifications
          </Link>
        </div>
      )}
    </div>
  );
}

interface NotificationItemProps {
  notification: Notification;
  onClose: () => void;
}

function NotificationItem({ notification, onClose }: NotificationItemProps) {
  const { user } = useAuth();
  const markAsReadMutation = useMarkAsRead();
  const deleteMutation = useDeleteNotification();
  const [showActions, setShowActions] = useState(false);

  const handleClick = () => {
    if (!notification.read) {
      markAsReadMutation.mutate(notification.$id);
    }
    if (notification.actionUrl) {
      onClose();
    }
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (user?.$id) {
      deleteMutation.mutate({
        notificationId: notification.$id,
        userId: user.$id,
      });
    }
  };

  const handleMarkRead = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    markAsReadMutation.mutate(notification.$id);
  };

  const content = (
    <div
      className={`relative flex items-start gap-3 p-4 hover:bg-[var(--color-bg-hover)] transition-colors ${
        !notification.read ? 'bg-[var(--color-primary-600)]/5' : ''
      }`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Unread indicator */}
      {!notification.read && (
        <div className="absolute left-1 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-[var(--color-primary-500)]" />
      )}

      {/* Icon */}
      <span className="text-xl shrink-0">
        {getNotificationIcon(notification.type)}
      </span>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="font-medium text-[var(--color-text-primary)] text-sm">
          {notification.title}
        </p>
        <p className="text-sm text-[var(--color-text-secondary)] line-clamp-2">
          {notification.message}
        </p>
        <p className="text-xs text-[var(--color-text-muted)] mt-1">
          {formatNotificationTime(notification.$createdAt)}
        </p>
      </div>

      {/* Actions */}
      {showActions && (
        <div className="flex items-center gap-1 shrink-0">
          {!notification.read && (
            <button
              onClick={handleMarkRead}
              className="p-1 rounded hover:bg-[var(--color-bg-tertiary)]"
              title="Mark as read"
            >
              <Check className="h-4 w-4 text-[var(--color-text-muted)]" />
            </button>
          )}
          <button
            onClick={handleDelete}
            className="p-1 rounded hover:bg-[var(--color-bg-tertiary)]"
            title="Delete"
          >
            <Trash2 className="h-4 w-4 text-[var(--color-text-muted)]" />
          </button>
        </div>
      )}
    </div>
  );

  const isSafeUrl = (url: string): boolean => {
    return url.startsWith('/') && !url.startsWith('//') && !url.includes(':');
  };

  if (notification.actionUrl && isSafeUrl(notification.actionUrl)) {
    return (
      <Link to={notification.actionUrl} onClick={handleClick}>
        {content}
      </Link>
    );
  }

  return (
    <button onClick={handleClick} className="w-full text-left">
      {content}
    </button>
  );
}
