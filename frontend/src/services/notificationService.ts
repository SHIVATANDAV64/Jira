import { databases, DATABASE_ID, COLLECTIONS, client, account } from '@/lib/appwrite';
import type { Notification, ApiResponse, PaginatedResponse } from '@/types';
import { Query } from 'appwrite';

/**
 * Get the current authenticated user ID (server-derived, not client-supplied)
 */
async function getCurrentUserId(): Promise<string> {
  const user = await account.get();
  return user.$id;
}

/**
 * Verify the current user owns the notification before modifying it
 */
async function verifyNotificationOwnership(notificationId: string): Promise<void> {
  const currentUserId = await getCurrentUserId();
  const doc = await databases.getDocument(DATABASE_ID, COLLECTIONS.NOTIFICATIONS, notificationId);
  if (doc.userId !== currentUserId) {
    throw new Error('Unauthorized: You can only modify your own notifications');
  }
}

/**
 * Get all notifications for the current user
 * Uses server-derived userId to prevent IDOR
 */
export async function getNotifications(
  _userId: string,
  limit = 50,
  offset = 0
): Promise<ApiResponse<PaginatedResponse<Notification>>> {
  try {
    const currentUserId = await getCurrentUserId();
    const response = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.NOTIFICATIONS,
      [
        Query.equal('userId', currentUserId),
        Query.orderDesc('$createdAt'),
        Query.limit(Math.min(limit, 100)),
        Query.offset(Math.max(0, offset)),
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
 * Uses server-derived userId to prevent IDOR
 */
export async function getUnreadCount(_userId: string): Promise<ApiResponse<number>> {
  try {
    const currentUserId = await getCurrentUserId();
    const response = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.NOTIFICATIONS,
      [
        Query.equal('userId', currentUserId),
        Query.equal('read', false),
        Query.limit(100),
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
 * Mark a notification as read (with ownership verification)
 */
export async function markAsRead(notificationId: string): Promise<ApiResponse<Notification>> {
  try {
    await verifyNotificationOwnership(notificationId);
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
 * Mark all notifications as read (with ownership verification)
 */
export async function markAllAsRead(_userId: string): Promise<ApiResponse<void>> {
  try {
    const currentUserId = await getCurrentUserId();
    
    // Paginate through all unread notifications
    while (true) {
      const unreadResponse = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.NOTIFICATIONS,
        [
          Query.equal('userId', currentUserId),
          Query.equal('read', false),
          Query.limit(100),
        ]
      );

      if (unreadResponse.documents.length === 0) break;

      // Process in batches of 10 to avoid rate limits
      for (let i = 0; i < unreadResponse.documents.length; i += 10) {
        const batch = unreadResponse.documents.slice(i, i + 10);
        await Promise.all(
          batch.map((doc) =>
            databases.updateDocument(
              DATABASE_ID,
              COLLECTIONS.NOTIFICATIONS,
              doc.$id,
              { read: true }
            )
          )
        );
      }

      if (unreadResponse.documents.length < 100) break;
    }

    return { success: true };
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to mark all notifications as read',
    };
  }
}

/**
 * Delete a notification (with ownership verification)
 */
export async function deleteNotification(notificationId: string): Promise<ApiResponse<void>> {
  try {
    await verifyNotificationOwnership(notificationId);
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
 * Create a notification (used by other services when needed)
 */
export async function createNotification(
  userId: string,
  data: {
    projectId?: string;
    type: string;
    title: string;
    message: string;
    actionUrl?: string;
  }
): Promise<ApiResponse<Notification>> {
  try {
    const response = await databases.createDocument(
      DATABASE_ID,
      COLLECTIONS.NOTIFICATIONS,
      'unique()',
      {
        userId,
        projectId: data.projectId || '',
        type: data.type,
        title: data.title,
        message: data.message,
        read: false,
        actionUrl: data.actionUrl || '',
      }
    );

    return {
      success: true,
      data: response as unknown as Notification,
    };
  } catch (error) {
    console.error('Error creating notification:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create notification',
    };
  }
}

/**
 * Subscribe to real-time notification updates
 */
export function subscribeToNotifications(
  userId: string,
  callback: (notification: Notification, eventType: 'create' | 'update' | 'delete') => void
) {
  return client.subscribe(
    `databases.${DATABASE_ID}.collections.${COLLECTIONS.NOTIFICATIONS}.documents`,
    (response) => {
      const { events, payload } = response as { events: string[]; payload: Notification };
      const eventType = events[0] || '';
      
      // Only process notifications for this user
      if (payload.userId !== userId) return;

      if (eventType.includes('create')) {
        callback(payload, 'create');
      } else if (eventType.includes('update')) {
        callback(payload, 'update');
      } else if (eventType.includes('delete')) {
        callback(payload, 'delete');
      }
    }
  );
}

/**
 * Notify a user that a ticket has been assigned to them
 */
export async function notifyTicketAssigned(
  assigneeId: string,
  projectId: string,
  ticketKey: string,
  ticketTitle: string,
  ticketId: string
): Promise<ApiResponse<Notification>> {
  return createNotification(assigneeId, {
    projectId,
    type: 'ticket_assigned',
    title: `Ticket assigned: ${ticketKey}`,
    message: `You have been assigned to "${ticketTitle}"`,
    actionUrl: `/projects/${projectId}/tickets/${ticketId}`,
  });
}

/**
 * Notify relevant users that a comment has been added to a ticket
 */
export async function notifyCommentAdded(
  ticketReporterId: string,
  projectId: string,
  ticketKey: string,
  commenterName: string,
  ticketId: string
): Promise<ApiResponse<Notification>> {
  return createNotification(ticketReporterId, {
    projectId,
    type: 'comment_added',
    title: `New comment on ${ticketKey}`,
    message: `${commenterName} commented on your ticket: "${ticketKey}"`,
    actionUrl: `/projects/${projectId}/tickets/${ticketId}`,
  });
}

/**
 * Notify a user that they have been added to a project
 */
export async function notifyMemberAdded(
  userId: string,
  projectId: string,
  projectName: string
): Promise<ApiResponse<Notification>> {
  return createNotification(userId, {
    projectId,
    type: 'member_added',
    title: 'Added to project',
    message: `You have been added to the project "${projectName}"`,
    actionUrl: `/projects/${projectId}`,
  });
}

/**
 * Notify team members that a sprint has started
 */
export async function notifySprintStarted(
  memberIds: string[],
  projectId: string,
  sprintName: string
): Promise<void> {
  // Send notifications to all members
  await Promise.allSettled(
    memberIds.map((memberId) =>
      createNotification(memberId, {
        projectId,
        type: 'sprint_started',
        title: 'Sprint started',
        message: `Sprint "${sprintName}" has started`,
        actionUrl: `/projects/${projectId}`,
      })
    )
  );
}
