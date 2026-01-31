import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { client, DATABASE_ID, COLLECTIONS } from '@/lib/appwrite';
import type { ProjectMember, ProjectRole } from '@/types';
import * as memberService from '@/services/memberService';

// Query keys
export const memberKeys = {
  all: ['members'] as const,
  lists: () => [...memberKeys.all, 'list'] as const,
  list: (projectId: string) => [...memberKeys.lists(), projectId] as const,
};

// Hook to fetch project members
export function useProjectMembers(projectId: string | undefined) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: memberKeys.list(projectId ?? ''),
    queryFn: async () => {
      if (!projectId) return [];
      const response = await memberService.getProjectMembers(projectId);
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch members');
      }
      return response.data?.documents ?? [];
    },
    enabled: !!projectId,
  });

  // Realtime subscription
  useEffect(() => {
    if (!projectId) return;

    const unsubscribe = client.subscribe(
      `databases.${DATABASE_ID}.collections.${COLLECTIONS.PROJECT_MEMBERS}.documents`,
      (response) => {
        const { events, payload } = response as { events: string[]; payload: ProjectMember };
        const eventType = events[0] || '';
        const document = payload;

        // Only process events for this project
        if (document.projectId !== projectId) return;

        queryClient.setQueryData<ProjectMember[]>(memberKeys.list(projectId), (old = []) => {
          if (eventType.includes('create')) {
            return [...old, document];
          } else if (eventType.includes('update')) {
            return old.map((m) => (m.$id === document.$id ? document : m));
          } else if (eventType.includes('delete')) {
            return old.filter((m) => m.$id !== document.$id);
          }
          return old;
        });
      }
    );

    return () => {
      unsubscribe();
    };
  }, [projectId, queryClient]);

  return {
    members: query.data ?? [],
    isLoading: query.isLoading,
    isPending: query.isPending,
    error: query.error?.message ?? null,
    refetch: query.refetch,
  };
}

// Mutation hooks
export function useInviteMember(projectId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ email, role }: { email: string; role: ProjectRole }) => {
      if (!projectId) throw new Error('Project ID is required');
      const response = await memberService.inviteMember(projectId, email, role);
      if (!response.success) {
        throw new Error(response.error || 'Failed to invite member');
      }
      return response.data!;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: memberKeys.list(projectId ?? '') });
      toast.success('Member invited successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useUpdateMemberRole(projectId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ memberId, role }: { memberId: string; role: ProjectRole }) => {
      if (!projectId) throw new Error('Project ID is required');
      const response = await memberService.updateMemberRole(projectId, memberId, role);
      if (!response.success) {
        throw new Error(response.error || 'Failed to update member role');
      }
      return response.data!;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: memberKeys.list(projectId ?? '') });
      toast.success('Member role updated');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useRemoveMember(projectId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (memberId: string) => {
      if (!projectId) throw new Error('Project ID is required');
      const response = await memberService.removeMember(projectId, memberId);
      if (!response.success) {
        throw new Error(response.error || 'Failed to remove member');
      }
      return memberId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: memberKeys.list(projectId ?? '') });
      toast.success('Member removed');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useLeaveProject(projectId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!projectId) throw new Error('Project ID is required');
      const response = await memberService.leaveProject(projectId);
      if (!response.success) {
        throw new Error(response.error || 'Failed to leave project');
      }
      return projectId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: memberKeys.all });
      toast.success('Left project successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
