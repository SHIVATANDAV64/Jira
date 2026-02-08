import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { client, DATABASE_ID, COLLECTIONS } from '@/lib/appwrite';
import type { Sprint, CreateSprintForm, UpdateSprintForm } from '@/types';
import * as sprintService from '@/services/sprintService';

// Query keys
export const sprintKeys = {
  all: ['sprints'] as const,
  lists: () => [...sprintKeys.all, 'list'] as const,
  list: (projectId: string) => [...sprintKeys.lists(), projectId] as const,
  active: (projectId: string) => [...sprintKeys.all, 'active', projectId] as const,
  details: () => [...sprintKeys.all, 'detail'] as const,
  detail: (id: string) => [...sprintKeys.details(), id] as const,
};

/**
 * Hook to fetch all sprints for a project
 */
export function useSprints(projectId: string | undefined) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: sprintKeys.list(projectId ?? ''),
    queryFn: async () => {
      if (!projectId) return [];
      const response = await sprintService.getSprints(projectId);
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch sprints');
      }
      return response.data?.documents ?? [];
    },
    enabled: !!projectId,
  });

  // Realtime subscription — invalidate to refetch through authorized endpoints
  useEffect(() => {
    if (!projectId) return;

    const unsubscribe = client.subscribe(
      `databases.${DATABASE_ID}.collections.${COLLECTIONS.SPRINTS}.documents`,
      (response) => {
        const { payload } = response as { payload: Sprint };
        const document = payload;

        // Only process events for this project
        if (document.projectId !== projectId) return;

        queryClient.invalidateQueries({ queryKey: sprintKeys.list(projectId) });
        queryClient.invalidateQueries({ queryKey: sprintKeys.active(projectId) });
      }
    );

    return () => {
      unsubscribe();
    };
  }, [projectId, queryClient]);

  return {
    sprints: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error?.message ?? null,
    refetch: query.refetch,
  };
}

/**
 * Hook to fetch the active sprint for a project
 */
export function useActiveSprint(projectId: string | undefined) {
  const query = useQuery({
    queryKey: sprintKeys.active(projectId ?? ''),
    queryFn: async () => {
      if (!projectId) return null;
      const response = await sprintService.getActiveSprint(projectId);
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch active sprint');
      }
      return response.data;
    },
    enabled: !!projectId,
  });

  return {
    activeSprint: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error?.message ?? null,
  };
}

/**
 * Hook to fetch a single sprint
 */
export function useSprint(sprintId: string | undefined) {
  const query = useQuery({
    queryKey: sprintKeys.detail(sprintId ?? ''),
    queryFn: async () => {
      if (!sprintId) return null;
      const response = await sprintService.getSprint(sprintId);
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch sprint');
      }
      return response.data;
    },
    enabled: !!sprintId,
  });

  return {
    sprint: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error?.message ?? null,
  };
}

/**
 * Hook to create a sprint
 */
export function useCreateSprint(projectId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateSprintForm) => {
      if (!projectId) throw new Error('Project ID is required');
      const response = await sprintService.createSprint(projectId, data);
      if (!response.success) {
        throw new Error(response.error || 'Failed to create sprint');
      }
      return response.data!;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: sprintKeys.lists() });
      toast.success(`Sprint "${data.name}" created successfully`);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

/**
 * Hook to update a sprint
 */
export function useUpdateSprint() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ sprintId, data }: { sprintId: string; data: UpdateSprintForm }) => {
      const response = await sprintService.updateSprint(sprintId, data);
      if (!response.success) {
        throw new Error(response.error || 'Failed to update sprint');
      }
      return response.data!;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: sprintKeys.detail(data.$id) });
      queryClient.invalidateQueries({ queryKey: sprintKeys.lists() });
      toast.success('Sprint updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

/**
 * Hook to start a sprint
 */
export function useStartSprint() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ sprintId, projectId }: { sprintId: string; projectId: string }) => {
      const response = await sprintService.startSprint(sprintId, projectId);
      if (!response.success) {
        throw new Error(response.error || 'Failed to start sprint');
      }
      return response.data!;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: sprintKeys.all });
      toast.success(`Sprint "${data.name}" started!`);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

/**
 * Hook to complete a sprint
 */
export function useCompleteSprint() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (sprintId: string) => {
      const response = await sprintService.completeSprint(sprintId);
      if (!response.success) {
        throw new Error(response.error || 'Failed to complete sprint');
      }
      return response.data!;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: sprintKeys.all });
      toast.success(`Sprint "${data.name}" completed!`);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

/**
 * Hook to delete a sprint
 */
export function useDeleteSprint() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ sprintId, projectId }: { sprintId: string; projectId?: string }) => {
      const response = await sprintService.deleteSprint(sprintId, projectId);
      if (!response.success) {
        throw new Error(response.error || 'Failed to delete sprint');
      }
      return sprintId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sprintKeys.all });
      toast.success('Sprint deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
