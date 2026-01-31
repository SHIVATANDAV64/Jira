import { databases, DATABASE_ID, COLLECTIONS } from '@/lib/appwrite';
import type { ActivityLog, ApiResponse, PaginatedResponse } from '@/types';
import { Query } from 'appwrite';

/**
 * Get activity logs for a specific project
 */
export async function getProjectActivity(
  projectId: string,
  limit = 20,
  offset = 0
): Promise<ApiResponse<PaginatedResponse<ActivityLog>>> {
  try {
    const response = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.ACTIVITY_LOG,
      [
        Query.equal('projectId', projectId),
        Query.orderDesc('$createdAt'),
        Query.limit(limit),
        Query.offset(offset),
      ]
    );

    return {
      success: true,
      data: {
        documents: response.documents as unknown as ActivityLog[],
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
 */
export async function getUserActivity(
  userId: string,
  limit = 20,
  offset = 0
): Promise<ApiResponse<PaginatedResponse<ActivityLog>>> {
  try {
    const response = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.ACTIVITY_LOG,
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
        documents: response.documents as unknown as ActivityLog[],
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
 * Get recent activity across all accessible projects
 */
export async function getRecentActivity(
  limit = 10
): Promise<ApiResponse<PaginatedResponse<ActivityLog>>> {
  try {
    const response = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.ACTIVITY_LOG,
      [
        Query.orderDesc('$createdAt'),
        Query.limit(limit),
      ]
    );

    return {
      success: true,
      data: {
        documents: response.documents as unknown as ActivityLog[],
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
 */
export async function getTicketActivity(
  ticketId: string,
  limit = 50
): Promise<ApiResponse<PaginatedResponse<ActivityLog>>> {
  try {
    const response = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.ACTIVITY_LOG,
      [
        Query.equal('ticketId', ticketId),
        Query.orderDesc('$createdAt'),
        Query.limit(limit),
      ]
    );

    return {
      success: true,
      data: {
        documents: response.documents as unknown as ActivityLog[],
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
