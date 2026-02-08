import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import type { Notification } from '@/types';
import * as notificationService from '@/services/notificationService';

// Query keys
export const notificationKeys = {
  all: ['notifications'] as const,
  list: (userId: string) => [...notificationKeys.all, 'list', userId] as const,
  unreadCount: (userId: string) => [...notificationKeys.all, 'unread', userId] as const,
};

/**
 * Hook to fetch notifications for the current user
 */
export function useNotifications(userId: string | undefined) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: notificationKeys.list(userId ?? ''),
    queryFn: async () => {
      if (!userId) return [];
      const response = await notificationService.getNotifications(userId);
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch notifications');
      }
      return response.data?.documents ?? [];
    },
    enabled: !!userId,
  });

  // Realtime subscription for new notifications
  useEffect(() => {
    if (!userId) return;

    const unsubscribe = notificationService.subscribeToNotifications(
      userId,
      (notification) => {
        // Add new notification to the list
        queryClient.setQueryData<Notification[]>(
          notificationKeys.list(userId),
          (old = []) => [notification, ...old]
        );
        
        // Increment unread count
        queryClient.setQueryData<number>(
          notificationKeys.unreadCount(userId),
          (old = 0) => old + 1
        );

        // Show toast notification
        toast(notification.title, {
          icon: '🔔',
          duration: 4000,
        });
      }
    );

    return () => {
      unsubscribe();
    };
  }, [userId, queryClient]);

  return {
    notifications: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error?.message ?? null,
    refetch: query.refetch,
  };
}

/**
 * Hook to get unread notification count
 */
export function useUnreadCount(userId: string | undefined) {
  const query = useQuery({
    queryKey: notificationKeys.unreadCount(userId ?? ''),
    queryFn: async () => {
      if (!userId) return 0;
      const response = await notificationService.getUnreadCount(userId);
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch unread count');
      }
      return response.data ?? 0;
    },
    enabled: !!userId,
    refetchInterval: 60000, // Refetch every minute as fallback
  });

  return {
    unreadCount: query.data ?? 0,
    isLoading: query.isLoading,
  };
}

/**
 * Hook to mark a notification as read
 */
export function useMarkAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      const response = await notificationService.markAsRead(notificationId);
      if (!response.success) {
        throw new Error(response.error || 'Failed to mark notification as read');
      }
      return response.data!;
    },
    onSuccess: (data) => {
      // Update notification in list
      queryClient.setQueryData<Notification[]>(
        notificationKeys.list(data.userId),
        (old = []) => old.map((n) => (n.$id === data.$id ? data : n))
      );
      
      // Decrement unread count
      queryClient.setQueryData<number>(
        notificationKeys.unreadCount(data.userId),
        (old = 0) => Math.max(0, old - 1)
      );
    },
  });
}

/**
 * Hook to mark all notifications as read
 */
export function useMarkAllAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      const response = await notificationService.markAllAsRead(userId);
      if (!response.success) {
        throw new Error(response.error || 'Failed to mark all notifications as read');
      }
      return userId;
    },
    onSuccess: (userId) => {
      // Update all notifications in list
      queryClient.setQueryData<Notification[]>(
        notificationKeys.list(userId),
        (old = []) => old.map((n) => ({ ...n, read: true }))
      );
      
      // Reset unread count
      queryClient.setQueryData<number>(
        notificationKeys.unreadCount(userId),
        0
      );
      
      toast.success('All notifications marked as read');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

/**
 * Hook to delete a notification
 */
export function useDeleteNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ notificationId, userId }: { notificationId: string; userId: string }) => {
      const response = await notificationService.deleteNotification(notificationId);
      if (!response.success) {
        throw new Error(response.error || 'Failed to delete notification');
      }
      return { notificationId, userId };
    },
    onSuccess: ({ notificationId, userId }) => {
      // Remove notification from list and update unread count (NTF-04)
      const notifications = queryClient.getQueryData<Notification[]>(
        notificationKeys.list(userId)
      ) ?? [];
      const deleted = notifications.find((n) => n.$id === notificationId);
      
      queryClient.setQueryData<Notification[]>(
        notificationKeys.list(userId),
        (old = []) => old.filter((n) => n.$id !== notificationId)
      );

      // If the deleted notification was unread, decrement count
      if (deleted && !deleted.read) {
        queryClient.setQueryData<number>(
          notificationKeys.unreadCount(userId),
          (old = 0) => Math.max(0, old - 1)
        );
      }
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

/**
 * Format notification for display
 */
export function formatNotificationTime(createdAt: string): string {
  const date = new Date(createdAt);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
  
  return date.toLocaleDateString();
}

/**
 * Get icon for notification type
 */
export function getNotificationIcon(type: Notification['type']): string {
  switch (type) {
    case 'ticket_assigned':
      return '📋';
    case 'ticket_updated':
      return '✏️';
    case 'ticket_mentioned':
      return '@';
    case 'comment_added':
    case 'comment_reply':
      return '💬';
    case 'member_added':
      return '👋';
    case 'sprint_started':
      return '🏃';
    case 'sprint_ended':
      return '🏁';
    case 'due_date_reminder':
      return '⏰';
    default:
      return '🔔';
  }
}
