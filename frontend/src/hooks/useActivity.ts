import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { client, DATABASE_ID, COLLECTIONS } from '@/lib/appwrite';
import {
  getProjectActivity,
  getUserActivity,
  getRecentActivity,
  getTicketActivity,
} from '@/services/activityService';
import type { ActivityLog } from '@/types';

/**
 * Hook to fetch activity for a specific project
 * ACT-02: Includes realtime subscription to detect new activities
 */
export function useProjectActivity(projectId: string | undefined, limit = 20, offset = 0) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['activity', 'project', projectId, limit, offset],
    queryFn: async () => {
      if (!projectId) throw new Error('Project ID is required');
      const response = await getProjectActivity(projectId, limit, offset);
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch project activity');
      }
      return response.data!;
    },
    enabled: !!projectId,
  });

  // ACT-02: Realtime subscription for new activities in this project
  useEffect(() => {
    if (!projectId) return;

    const unsubscribe = client.subscribe(
      `databases.${DATABASE_ID}.collections.${COLLECTIONS.ACTIVITY_LOG}.documents`,
      (response) => {
        const { events, payload } = response as { events: string[]; payload: ActivityLog };
        const eventType = events[0] || '';

        // Only process events for this project
        if (payload.projectId !== projectId) return;

        // Invalidate queries to refetch
        if (eventType.includes('create')) {
          queryClient.invalidateQueries({
            queryKey: ['activity', 'project', projectId],
          });
        }
      }
    );

    return () => {
      unsubscribe();
    };
  }, [projectId, queryClient]);

  return {
    activities: query.data?.documents ?? [],
    total: query.data?.total ?? 0,
    isLoading: query.isLoading,
    error: query.error?.message ?? null,
  };
}

/**
 * Hook to fetch activity for the current user
 * ACT-02: Includes realtime subscription
 */
export function useUserActivity(userId: string | undefined, limit = 20, offset = 0) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['activity', 'user', userId, limit, offset],
    queryFn: async () => {
      if (!userId) throw new Error('User ID is required');
      const response = await getUserActivity(userId, limit, offset);
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch user activity');
      }
      return response.data!;
    },
    enabled: !!userId,
  });

  // ACT-02: Realtime subscription for new activities by this user
  useEffect(() => {
    if (!userId) return;

    const unsubscribe = client.subscribe(
      `databases.${DATABASE_ID}.collections.${COLLECTIONS.ACTIVITY_LOG}.documents`,
      (response) => {
        const { events, payload } = response as { events: string[]; payload: ActivityLog };
        const eventType = events[0] || '';

        // Only process events by this user
        if (payload.userId !== userId) return;

        // Invalidate queries to refetch
        if (eventType.includes('create')) {
          queryClient.invalidateQueries({
            queryKey: ['activity', 'user', userId],
          });
        }
      }
    );

    return () => {
      unsubscribe();
    };
  }, [userId, queryClient]);

  return {
    activities: query.data?.documents ?? [],
    total: query.data?.total ?? 0,
    isLoading: query.isLoading,
    error: query.error?.message ?? null,
  };
}

/**
 * Hook to fetch recent activity across all projects
 * ACT-02: Includes realtime subscription
 */
export function useRecentActivity(limit = 10, offset = 0) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['activity', 'recent', limit, offset],
    queryFn: async () => {
      const response = await getRecentActivity(limit, offset);
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch recent activity');
      }
      return response.data!;
    },
  });

  // ACT-02: Realtime subscription for all new activities
  useEffect(() => {
    const unsubscribe = client.subscribe(
      `databases.${DATABASE_ID}.collections.${COLLECTIONS.ACTIVITY_LOG}.documents`,
      (response) => {
        const { events } = response as { events: string[] };
        const eventType = events[0] || '';

        // Invalidate queries when new activities are created
        if (eventType.includes('create')) {
          queryClient.invalidateQueries({
            queryKey: ['activity', 'recent'],
          });
        }
      }
    );

    return () => {
      unsubscribe();
    };
  }, [queryClient]);

  return {
    activities: query.data?.documents ?? [],
    total: query.data?.total ?? 0,
    isLoading: query.isLoading,
    error: query.error?.message ?? null,
  };
}

/**
 * Hook to fetch activity for a specific ticket
 * ACT-02: Includes realtime subscription
 */
export function useTicketActivity(ticketId: string | undefined, limit = 50, offset = 0) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['activity', 'ticket', ticketId, limit, offset],
    queryFn: async () => {
      if (!ticketId) throw new Error('Ticket ID is required');
      const response = await getTicketActivity(ticketId, limit, offset);
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch ticket activity');
      }
      return response.data!;
    },
    enabled: !!ticketId,
  });

  // ACT-02: Realtime subscription for new activities on this ticket
  useEffect(() => {
    if (!ticketId) return;

    const unsubscribe = client.subscribe(
      `databases.${DATABASE_ID}.collections.${COLLECTIONS.ACTIVITY_LOG}.documents`,
      (response) => {
        const { events, payload } = response as { events: string[]; payload: ActivityLog };
        const eventType = events[0] || '';

        // Only process events for this ticket
        if (payload.ticketId !== ticketId) return;

        // Invalidate queries to refetch
        if (eventType.includes('create')) {
          queryClient.invalidateQueries({
            queryKey: ['activity', 'ticket', ticketId],
          });
        }
      }
    );

    return () => {
      unsubscribe();
    };
  }, [ticketId, queryClient]);

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
  const details = (typeof activity.details === 'object' && activity.details !== null ? activity.details : {}) as Record<string, unknown>;
  
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
      return `created project "${details.projectName || details.name || 'Unknown'}"`;
    case 'project_updated':
      return 'updated project settings';
    case 'sprint_created':
      return `created sprint "${details.sprintName || 'Unknown'}"` ;
    case 'sprint_started':
      return `started sprint "${details.sprintName || 'Unknown'}"`;
    case 'sprint_completed':
      return `completed sprint "${details.sprintName || 'Unknown'}"`;
    case 'sprint_deleted':
      return `deleted sprint "${details.sprintName || 'Unknown'}"`;
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
    case 'sprint_created':
    case 'sprint_started':
    case 'sprint_completed':
    case 'sprint_deleted':
      return 'zap';
    default:
      return 'activity';
  }
}
