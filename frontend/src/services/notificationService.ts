import { databases, DATABASE_ID, COLLECTIONS, client } from '@/lib/appwrite';
import type { Notification, ApiResponse, PaginatedResponse } from '@/types';
import { Query } from 'appwrite';

/**
 * Get all notifications for the current user
 */
export async function getNotifications(
  userId: string,
  limit = 50,
  offset = 0
): Promise<ApiResponse<PaginatedResponse<Notification>>> {
  try {
    const response = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.NOTIFICATIONS,
      [
        Query.equal('userId', userId),
        Query.orderDesc('$createdAt'),
        Query.limit(limit),
        Query.offset(offset),
      ]
    );

    return {
      success: true,
      data: {
        documents: response.documents as unknown as Notification[],
        total: response.total,
      },
    };
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch notifications',
    };
  }
}

/**
 * Get unread notification count
 */
export async function getUnreadCount(userId: string): Promise<ApiResponse<number>> {
  try {
    const response = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.NOTIFICATIONS,
      [
        Query.equal('userId', userId),
        Query.equal('read', false),
        Query.limit(100), // Count up to 100 unread
      ]
    );

    return {
      success: true,
      data: response.total,
    };
  } catch (error) {
    console.error('Error fetching unread count:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch unread count',
    };
  }
}

/**
 * Mark a notification as read
 */
export async function markAsRead(notificationId: string): Promise<ApiResponse<Notification>> {
  try {
    const response = await databases.updateDocument(
      DATABASE_ID,
      COLLECTIONS.NOTIFICATIONS,
      notificationId,
      { read: true }
    );

    return {
      success: true,
      data: response as unknown as Notification,
    };
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to mark notification as read',
    };
  }
}

/**
 * Mark all notifications as read
 */
export async function markAllAsRead(userId: string): Promise<ApiResponse<void>> {
  try {
    // Get all unread notifications
    const unreadResponse = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.NOTIFICATIONS,
      [
        Query.equal('userId', userId),
        Query.equal('read', false),
        Query.limit(100),
      ]
    );

    // Mark each as read
    await Promise.all(
      unreadResponse.documents.map((doc) =>
        databases.updateDocument(
          DATABASE_ID,
          COLLECTIONS.NOTIFICATIONS,
          doc.$id,
          { read: true }
        )
      )
    );

    return {
      success: true,
    };
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to mark all notifications as read',
    };
  }
}

/**
 * Delete a notification
 */
export async function deleteNotification(notificationId: string): Promise<ApiResponse<void>> {
  try {
    await databases.deleteDocument(
      DATABASE_ID,
      COLLECTIONS.NOTIFICATIONS,
      notificationId
    );

    return {
      success: true,
    };
  } catch (error) {
    console.error('Error deleting notification:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete notification',
    };
  }
}

/**
 * Subscribe to real-time notification updates
 */
export function subscribeToNotifications(
  userId: string,
  callback: (notification: Notification) => void
) {
  return client.subscribe(
    `databases.${DATABASE_ID}.collections.${COLLECTIONS.NOTIFICATIONS}.documents`,
    (response) => {
      const { events, payload } = response as { events: string[]; payload: Notification };
      const eventType = events[0] || '';
      
      // Only process notifications for this user
      if (payload.userId !== userId) return;

      if (eventType.includes('create')) {
        callback(payload);
      }
    }
  );
}
