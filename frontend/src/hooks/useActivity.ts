import { useQuery } from '@tanstack/react-query';
import {
  getProjectActivity,
  getUserActivity,
  getRecentActivity,
  getTicketActivity,
} from '@/services/activityService';
import type { ActivityLog } from '@/types';

/**
 * Hook to fetch activity for a specific project
 */
export function useProjectActivity(projectId: string | undefined, limit = 20) {
  const query = useQuery({
    queryKey: ['activity', 'project', projectId, limit],
    queryFn: async () => {
      if (!projectId) throw new Error('Project ID is required');
      const response = await getProjectActivity(projectId, limit);
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch project activity');
      }
      return response.data!;
    },
    enabled: !!projectId,
  });

  return {
    activities: query.data?.documents ?? [],
    total: query.data?.total ?? 0,
    isLoading: query.isLoading,
    error: query.error?.message ?? null,
  };
}

/**
 * Hook to fetch activity for the current user
 */
export function useUserActivity(userId: string | undefined, limit = 20) {
  const query = useQuery({
    queryKey: ['activity', 'user', userId, limit],
    queryFn: async () => {
      if (!userId) throw new Error('User ID is required');
      const response = await getUserActivity(userId, limit);
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch user activity');
      }
      return response.data!;
    },
    enabled: !!userId,
  });

  return {
    activities: query.data?.documents ?? [],
    total: query.data?.total ?? 0,
    isLoading: query.isLoading,
    error: query.error?.message ?? null,
  };
}

/**
 * Hook to fetch recent activity across all projects
 */
export function useRecentActivity(limit = 10) {
  const query = useQuery({
    queryKey: ['activity', 'recent', limit],
    queryFn: async () => {
      const response = await getRecentActivity(limit);
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch recent activity');
      }
      return response.data!;
    },
  });

  return {
    activities: query.data?.documents ?? [],
    total: query.data?.total ?? 0,
    isLoading: query.isLoading,
    error: query.error?.message ?? null,
  };
}

/**
 * Hook to fetch activity for a specific ticket
 */
export function useTicketActivity(ticketId: string | undefined, limit = 50) {
  const query = useQuery({
    queryKey: ['activity', 'ticket', ticketId, limit],
    queryFn: async () => {
      if (!ticketId) throw new Error('Ticket ID is required');
      const response = await getTicketActivity(ticketId, limit);
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch ticket activity');
      }
      return response.data!;
    },
    enabled: !!ticketId,
  });

  return {
    activities: query.data?.documents ?? [],
    total: query.data?.total ?? 0,
    isLoading: query.isLoading,
    error: query.error?.message ?? null,
  };
}

/**
 * Format activity action to human-readable text
 */
export function formatActivityAction(activity: ActivityLog): string {
  const details = activity.details || {};
  
  switch (activity.action) {
    case 'ticket_created':
      return `created ticket "${details.title || 'Unknown'}"`;
    case 'ticket_updated':
      return `updated ticket "${details.title || 'Unknown'}"`;
    case 'ticket_deleted':
      return `deleted ticket "${details.title || 'Unknown'}"`;
    case 'ticket_moved':
      return `moved ticket from ${details.fromStatus || 'Unknown'} to ${details.toStatus || 'Unknown'}`;
    case 'ticket_assigned':
      return details.assigneeName
        ? `assigned ticket to ${details.assigneeName}`
        : 'unassigned ticket';
    case 'comment_added':
      return 'added a comment';
    case 'comment_deleted':
      return 'deleted a comment';
    case 'member_added':
      return `added ${details.memberName || 'a member'} to the project`;
    case 'member_removed':
      return `removed ${details.memberName || 'a member'} from the project`;
    case 'member_role_changed':
      return `changed ${details.memberName || "member's"} role to ${details.newRole || 'Unknown'}`;
    case 'project_created':
      return `created project "${details.projectName || 'Unknown'}"`;
    case 'project_updated':
      return 'updated project settings';
    default:
      return 'performed an action';
  }
}

/**
 * Get icon name for activity action
 */
export function getActivityIcon(action: ActivityLog['action']): string {
  switch (action) {
    case 'ticket_created':
      return 'plus-circle';
    case 'ticket_updated':
      return 'edit';
    case 'ticket_deleted':
      return 'trash-2';
    case 'ticket_moved':
      return 'move';
    case 'ticket_assigned':
      return 'user-plus';
    case 'comment_added':
    case 'comment_deleted':
      return 'message-circle';
    case 'member_added':
    case 'member_removed':
    case 'member_role_changed':
      return 'users';
    case 'project_created':
      return 'folder-plus';
    case 'project_updated':
      return 'settings';
    default:
      return 'activity';
  }
}
