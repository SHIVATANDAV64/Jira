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

  // Realtime subscription
  useEffect(() => {
    const unsubscribe = client.subscribe(
      `databases.${DATABASE_ID}.collections.${COLLECTIONS.PROJECTS}.documents`,
      (response) => {
        const { events, payload } = response as { events: string[]; payload: Project };
        const eventType = events[0] || '';
        const document = payload;

        queryClient.setQueryData<Project[]>(projectKeys.lists(), (old = []) => {
          if (eventType.includes('create')) {
            return [document, ...old];
          } else if (eventType.includes('update')) {
            return old.map((p) => (p.$id === document.$id ? document : p));
          } else if (eventType.includes('delete')) {
            return old.filter((p) => p.$id !== document.$id);
          }
          return old;
        });

        // Also update the detail cache if it exists
        if (eventType.includes('update')) {
          queryClient.setQueryData(projectKeys.detail(document.$id), document);
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

  // Realtime subscription for this specific project
  useEffect(() => {
    if (!projectId) return;

    const unsubscribe = client.subscribe(
      `databases.${DATABASE_ID}.collections.${COLLECTIONS.PROJECTS}.documents.${projectId}`,
      (response) => {
        const { events, payload } = response as { events: string[]; payload: Project };
        const eventType = events[0] || '';
        const document = payload;

        if (eventType.includes('update')) {
          queryClient.setQueryData(projectKeys.detail(projectId), document);
        } else if (eventType.includes('delete')) {
          queryClient.setQueryData(projectKeys.detail(projectId), null);
        }
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
