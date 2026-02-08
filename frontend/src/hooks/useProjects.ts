import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { client, DATABASE_ID, COLLECTIONS } from '@/lib/appwrite';
import type { Project, CreateProjectForm } from '@/types';
import * as projectService from '@/services/projectService';

// Query keys
export const projectKeys = {
  all: ['projects'] as const,
  lists: () => [...projectKeys.all, 'list'] as const,
  list: (filters?: string) => [...projectKeys.lists(), filters] as const,
  details: () => [...projectKeys.all, 'detail'] as const,
  detail: (id: string) => [...projectKeys.details(), id] as const,
};

// Hook to fetch all projects
export function useProjects() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: projectKeys.lists(),
    queryFn: async () => {
      const response = await projectService.getProjects();
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch projects');
      }
      return response.data?.documents ?? [];
    },
  });

  // Realtime subscription — only invalidate if document is in cache or on delete events
  useEffect(() => {
    const unsubscribe = client.subscribe(
      `databases.${DATABASE_ID}.collections.${COLLECTIONS.PROJECTS}.documents`,
      (response) => {
        const { events, payload } = response as { events: string[]; payload: Project };
        const document = payload;

        // Only invalidate on delete events or updates to invalidate stale data
        if (events[0]?.includes('delete')) {
          queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
        } else if (events[0]?.includes('update')) {
          // For updates, only invalidate the specific project detail cache
          queryClient.invalidateQueries({ queryKey: projectKeys.detail(document.$id) });
        }
      }
    );

    return () => {
      unsubscribe();
    };
  }, [queryClient]);

  return {
    projects: query.data ?? [],
    isLoading: query.isLoading,
    isPending: query.isPending,
    error: query.error?.message ?? null,
    refetch: query.refetch,
  };
}

// Hook to fetch a single project
export function useProject(projectId: string | undefined) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: projectKeys.detail(projectId ?? ''),
    queryFn: async () => {
      if (!projectId) return null;
      const response = await projectService.getProject(projectId);
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch project');
      }
      return response.data ?? null;
    },
    enabled: !!projectId,
  });

  // Realtime subscription — invalidate to refetch
  useEffect(() => {
    if (!projectId) return;

    const unsubscribe = client.subscribe(
      `databases.${DATABASE_ID}.collections.${COLLECTIONS.PROJECTS}.documents.${projectId}`,
      () => {
        queryClient.invalidateQueries({ queryKey: projectKeys.detail(projectId) });
      }
    );

    return () => {
      unsubscribe();
    };
  }, [projectId, queryClient]);

  return {
    project: query.data ?? null,
    isLoading: query.isLoading,
    isPending: query.isPending,
    error: query.error?.message ?? null,
    refetch: query.refetch,
  };
}

// Mutation hooks
export function useCreateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateProjectForm) => {
      const response = await projectService.createProject(data);
      if (!response.success) {
        throw new Error(response.error || 'Failed to create project');
      }
      return response.data!;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
      toast.success(`Project "${data.name}" created successfully`);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useUpdateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ projectId, data }: { projectId: string; data: Partial<CreateProjectForm> }) => {
      const response = await projectService.updateProject(projectId, data);
      if (!response.success) {
        throw new Error(response.error || 'Failed to update project');
      }
      return response.data!;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: projectKeys.detail(data.$id) });
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
      toast.success('Project updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useArchiveProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (projectId: string) => {
      const response = await projectService.archiveProject(projectId);
      if (!response.success) {
        throw new Error(response.error || 'Failed to archive project');
      }
      return projectId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.all });
      toast.success('Project archived successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

// PROJ-02: Restore project hook
export function useRestoreProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (projectId: string) => {
      const response = await projectService.restoreProject(projectId);
      if (!response.success) {
        throw new Error(response.error || 'Failed to restore project');
      }
      return projectId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.all });
      toast.success('Project restored successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (projectId: string) => {
      const response = await projectService.deleteProject(projectId);
      if (!response.success) {
        throw new Error(response.error || 'Failed to delete project');
      }
      return projectId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.all });
      toast.success('Project deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
