import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, Check, CheckCheck, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { useAuth } from '@/context/AuthContext';
import {
  useNotifications,
  useMarkAsRead,
  useMarkAllAsRead,
  useDeleteNotification,
  formatNotificationTime,
  getNotificationIcon,
} from '@/hooks/useNotifications';
import type { Notification } from '@/types';

// Simple URL validation function
function isSafeUrl(url?: string): boolean {
  if (!url) return false;
  // Must start with '/' but not '//'
  return url.startsWith('/') && !url.startsWith('//');
}

const NOTIFICATIONS_PER_PAGE = 10;

export function NotificationsPage() {
  const { user } = useAuth();
  const { notifications, isLoading } = useNotifications(user?.$id);
  const markAsReadMutation = useMarkAsRead();
  const markAllAsReadMutation = useMarkAllAsRead();
  const deleteMutation = useDeleteNotification();
  const [page, setPage] = useState(1);

  const unreadCount = notifications.filter((n) => !n.read).length;
  const displayedNotifications = notifications.slice(0, page * NOTIFICATIONS_PER_PAGE);
  const hasMore = notifications.length > displayedNotifications.length;

  const handleMarkAllAsRead = () => {
    if (user?.$id) {
      markAllAsReadMutation.mutate(user.$id);
    }
  };

  const handleLoadMore = () => {
    setPage(prev => prev + 1);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-[--color-primary-500]" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[--color-text-primary]">
            Notifications
          </h1>
          <p className="text-[--color-text-secondary]">
            {unreadCount > 0
              ? `You have ${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}`
              : 'All caught up!'}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<CheckCheck className="h-4 w-4" />}
            onClick={handleMarkAllAsRead}
            disabled={markAllAsReadMutation.isPending}
          >
            Mark all as read
          </Button>
        )}
      </div>

      {/* Notification List */}
      <div className="rounded-xl border border-[--color-border-primary] bg-[--color-bg-secondary] overflow-hidden">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Bell className="h-16 w-16 text-[--color-text-muted] mb-4" />
            <h2 className="text-lg font-semibold text-[--color-text-primary] mb-2">
              No notifications
            </h2>
            <p className="text-[--color-text-secondary]">
              You're all caught up! Check back later for updates.
            </p>
          </div>
        ) : (
          <div>
            {displayedNotifications.map((notification) => (
              <NotificationRow
                key={notification.$id}
                notification={notification}
                onMarkRead={() => markAsReadMutation.mutate(notification.$id)}
                onDelete={() =>
                  user?.$id &&
                  deleteMutation.mutate({
                    notificationId: notification.$id,
                    userId: user.$id,
                  })
                }
              />
            ))}
          </div>
        )}
      </div>

      {/* Load More Button */}
      {hasMore && (
        <div className="flex justify-center">
          <Button
            variant="secondary"
            onClick={handleLoadMore}
            isLoading={false}
          >
            Load More
          </Button>
        </div>
      )}
    </div>
  );
}

interface NotificationRowProps {
  notification: Notification;
  onMarkRead: () => void;
  onDelete: () => void;
}

function NotificationRow({ notification, onMarkRead, onDelete }: NotificationRowProps) {
  const content = (
    <div
      className={`flex items-start gap-4 p-4 hover:bg-[--color-bg-hover] transition-colors ${
        !notification.read ? 'bg-[--color-primary-600]/5' : ''
      }`}
    >
      {/* Unread indicator */}
      <div className="relative">
        {!notification.read && (
          <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-[--color-primary-500]" />
        )}
        <span className="text-2xl">{getNotificationIcon(notification.type)}</span>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="font-medium text-[--color-text-primary]">
          {notification.title}
        </p>
        <p className="text-sm text-[--color-text-secondary] mt-1">
          {notification.message}
        </p>
        <p className="text-xs text-[--color-text-muted] mt-2">
          {formatNotificationTime(notification.$createdAt)}
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 shrink-0">
        {!notification.read && (
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onMarkRead();
            }}
            title="Mark as read"
          >
            <Check className="h-4 w-4" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onDelete();
          }}
          title="Delete"
          className="text-red-600 hover:text-red-700"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );

  if (notification.actionUrl && isSafeUrl(notification.actionUrl)) {
    return (
      <Link to={notification.actionUrl} onClick={!notification.read ? onMarkRead : undefined}>
        {content}
      </Link>
    );
  }

  return <div>{content}</div>;
}
