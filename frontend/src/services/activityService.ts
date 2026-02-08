import { databases, DATABASE_ID, COLLECTIONS, account } from '@/lib/appwrite';
import type { ActivityLog, ApiResponse, PaginatedResponse } from '@/types';
import { Query } from 'appwrite';

async function enrichActivities(activities: ActivityLog[]): Promise<ActivityLog[]> {
  const userIds = [...new Set(activities.map(a => a.userId))];
  if (userIds.length === 0) return activities;

  try {
    // Determine unique users from Project Members to resolve names
    const members = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.PROJECT_MEMBERS,
      [
        Query.equal('userId', userIds),
        Query.limit(100),
      ]
    );

    const userMap = new Map();
    for (const doc of members.documents) {
      if (!userMap.has(doc.userId)) {
        userMap.set(doc.userId, {
          $id: doc.userId,
          name: doc.userName,
          email: doc.userEmail,
          $createdAt: doc.$createdAt,
          $updatedAt: doc.$updatedAt,
        });
      }
    }

    activities.forEach(activity => {
      if (userMap.has(activity.userId)) {
        activity.user = userMap.get(activity.userId) as any;
      }
    });
  } catch (e) {
    console.error('Failed to enrich user details', e);
  }
  return activities;
}

/**
 * Parse activity log details from JSON string if needed
 */
function parseActivityDetails(activities: ActivityLog[]): ActivityLog[] {
  return activities.map(activity => ({
    ...activity,
    details: typeof activity.details === 'string' 
      ? (() => { try { return JSON.parse(activity.details); } catch { return {}; } })()
      : activity.details || {},
  }));
}

function validateId(id: string, label: string): string | null {
  if (!id || typeof id !== 'string') return `${label} is required`;
  if (!/^[a-zA-Z0-9_-]+$/.test(id)) return `Invalid ${label} format`;
  return null;
}

/**
 * ACT-04: Verify user is a member of the project before accessing activity
 */
async function verifyProjectMembership(projectId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await account.get();
    const response = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.PROJECT_MEMBERS,
      [Query.equal('projectId', projectId), Query.equal('userId', user.$id)]
    );

    if (response.documents.length === 0) {
      return { success: false, error: 'You do not have access to this project activity' };
    }

    return { success: true };
  } catch (error) {
    console.error('Error verifying project membership:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to verify access',
    };
  }
}

/**
 * Get activity logs for a specific project
 * ACT-04: Verifies user is a project member before returning activity
 */
export async function getProjectActivity(
  projectId: string,
  limit = 20,
  offset = 0
): Promise<ApiResponse<PaginatedResponse<ActivityLog>>> {
  try {
    const idErr = validateId(projectId, 'Project ID');
    if (idErr) return { success: false, error: idErr };

    // ACT-04: Verify user has access to this project
    const membershipCheck = await verifyProjectMembership(projectId);
    if (!membershipCheck.success) {
      return { success: false, error: membershipCheck.error };
    }

    const response = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.ACTIVITY_LOG,
      [
        Query.equal('projectId', projectId),
        Query.orderDesc('$createdAt'),
        Query.limit(Math.min(limit, 100)),
        Query.offset(Math.max(0, offset)),
      ]
    );

    const activities = parseActivityDetails(response.documents as unknown as ActivityLog[]);
    await enrichActivities(activities);

    return {
      success: true,
      data: {
        documents: activities,
        total: response.total,
      },
    };
  } catch (error) {
    console.error('Error fetching project activity:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch activity',
    };
  }
}

/**
 * Get activity logs for the current user (across all projects)
 * Uses server-derived userId to prevent IDOR
 */
export async function getUserActivity(
  _userId: string,
  limit = 20,
  offset = 0
): Promise<ApiResponse<PaginatedResponse<ActivityLog>>> {
  try {
    const user = await account.get();
    const currentUserId = user.$id;

    const response = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.ACTIVITY_LOG,
      [
        Query.equal('userId', currentUserId),
        Query.orderDesc('$createdAt'),
        Query.limit(Math.min(limit, 100)),
        Query.offset(Math.max(0, offset)),
      ]
    );

    const activities = parseActivityDetails(response.documents as unknown as ActivityLog[]);
    // Populate with known user to avoid Unknown User
    activities.forEach(a => a.user = user as any);

    return {
      success: true,
      data: {
        documents: activities,
        total: response.total,
      },
    };
  } catch (error) {
    console.error('Error fetching user activity:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch activity',
    };
  }
}

/**
 * Get recent activity across all projects the user is a member of
 * ACT-03: Added offset parameter for pagination support
 */
export async function getRecentActivity(
  limit = 10,
  offset = 0
): Promise<ApiResponse<PaginatedResponse<ActivityLog>>> {
  try {
    // Get recent activity across all projects (not just the user's own actions)
    const response = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.ACTIVITY_LOG,
      [
        Query.orderDesc('$createdAt'),
        Query.limit(Math.min(limit, 50)),
        Query.offset(Math.max(0, offset)),
      ]
    );

    const activities = parseActivityDetails(response.documents as unknown as ActivityLog[]);
    await enrichActivities(activities);

    return {
      success: true,
      data: {
        documents: activities,
        total: response.total,
      },
    };
  } catch (error) {
    console.error('Error fetching recent activity:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch activity',
    };
  }
}

/**
 * Get activity logs for a specific ticket
 * ACT-07: Verifies user has access to the ticket's project before returning activity
 * ACT-03: Added offset parameter for pagination support
 */
export async function getTicketActivity(
  ticketId: string,
  limit = 50,
  offset = 0
): Promise<ApiResponse<PaginatedResponse<ActivityLog>>> {
  try {
    const idErr = validateId(ticketId, 'Ticket ID');
    if (idErr) return { success: false, error: idErr };

    // ACT-07: Get ticket to find projectId, then verify membership
    let projectId: string;
    try {
      const ticket = await databases.getDocument(
        DATABASE_ID,
        COLLECTIONS.TICKETS,
        ticketId
      );
      projectId = (ticket as any).projectId;
    } catch (error) {
      return { success: false, error: 'Ticket not found' };
    }

    // ACT-07: Verify user has access to this project
    const membershipCheck = await verifyProjectMembership(projectId);
    if (!membershipCheck.success) {
      return { success: false, error: membershipCheck.error };
    }

    const response = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.ACTIVITY_LOG,
      [
        Query.equal('ticketId', ticketId),
        Query.orderDesc('$createdAt'),
        Query.limit(Math.min(limit, 100)),
        Query.offset(Math.max(0, offset)),
      ]
    );

    const activities = parseActivityDetails(response.documents as unknown as ActivityLog[]);
    await enrichActivities(activities);

    return {
      success: true,
      data: {
        documents: activities,
        total: response.total,
      },
    };
  } catch (error) {
    console.error('Error fetching ticket activity:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch activity',
    };
  }
}
