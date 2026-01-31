import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { client, DATABASE_ID, COLLECTIONS } from '@/lib/appwrite';
import type { Comment } from '@/types';
import * as commentService from '@/services/commentService';

// Query keys
export const commentKeys = {
  all: ['comments'] as const,
  lists: () => [...commentKeys.all, 'list'] as const,
  list: (ticketId: string) => [...commentKeys.lists(), ticketId] as const,
};

// Helper to organize comments into threads
function organizeComments(allComments: Comment[]): Comment[] {
  const parentComments = allComments.filter((c) => !c.parentId);
  const replies = allComments.filter((c) => c.parentId);

  return parentComments.map((parent) => ({
    ...parent,
    replies: replies.filter((r) => r.parentId === parent.$id),
  }));
}

// Hook to fetch comments for a ticket
export function useComments(ticketId: string | undefined) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: commentKeys.list(ticketId ?? ''),
    queryFn: async () => {
      if (!ticketId) return [];
      const response = await commentService.getComments(ticketId);
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch comments');
      }
      return organizeComments(response.data?.documents ?? []);
    },
    enabled: !!ticketId,
  });

  // Realtime subscription
  useEffect(() => {
    if (!ticketId) return;

    const unsubscribe = client.subscribe(
      `databases.${DATABASE_ID}.collections.${COLLECTIONS.COMMENTS}.documents`,
      (response) => {
        const { events, payload } = response as { events: string[]; payload: Comment };
        const eventType = events[0] || '';
        const document = payload;

        // Only process events for this ticket
        if (document.ticketId !== ticketId) return;

        // Refetch to maintain proper threading
        if (
          eventType.includes('create') ||
          eventType.includes('update') ||
          eventType.includes('delete')
        ) {
          queryClient.invalidateQueries({ queryKey: commentKeys.list(ticketId) });
        }
      }
    );

    return () => {
      unsubscribe();
    };
  }, [ticketId, queryClient]);

  return {
    comments: query.data ?? [],
    isLoading: query.isLoading,
    isPending: query.isPending,
    error: query.error?.message ?? null,
    refetch: query.refetch,
  };
}

// Mutation hooks
export function useCreateComment(ticketId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ content, parentId }: { content: string; parentId?: string }) => {
      if (!ticketId) throw new Error('Ticket ID is required');
      const response = await commentService.createComment(ticketId, content, parentId);
      if (!response.success) {
        throw new Error(response.error || 'Failed to create comment');
      }
      return response.data!;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: commentKeys.list(ticketId ?? '') });
      toast.success('Comment added');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useUpdateComment(ticketId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ commentId, content }: { commentId: string; content: string }) => {
      const response = await commentService.updateComment(commentId, content);
      if (!response.success) {
        throw new Error(response.error || 'Failed to update comment');
      }
      return response.data!;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: commentKeys.list(ticketId ?? '') });
      toast.success('Comment updated');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useDeleteComment(ticketId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (commentId: string) => {
      const response = await commentService.deleteComment(commentId);
      if (!response.success) {
        throw new Error(response.error || 'Failed to delete comment');
      }
      return commentId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: commentKeys.list(ticketId ?? '') });
      toast.success('Comment deleted');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
