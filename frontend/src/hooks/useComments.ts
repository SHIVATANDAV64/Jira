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

// Helper to organize comments into threads (CMT-01: supports nested replies)
function organizeComments(allComments: Comment[]): Comment[] {
  const commentMap = new Map<string, Comment>();
  
  // First pass: create a map of all comments with empty replies arrays
  allComments.forEach((c) => {
    commentMap.set(c.$id, { ...c, replies: [] });
  });

  const rootComments: Comment[] = [];

  // Second pass: attach each reply to its closest ancestor that exists
  allComments.forEach((c) => {
    if (!c.parentId) {
      rootComments.push(commentMap.get(c.$id)!);
    } else {
      // Walk up the parent chain to find the nearest existing parent
      let parentId: string | undefined = c.parentId;
      let parent = commentMap.get(parentId);
      
      if (parent) {
        parent.replies = parent.replies || [];
        parent.replies.push(commentMap.get(c.$id)!);
      } else {
        // Orphaned reply — show as root comment to avoid data loss
        rootComments.push(commentMap.get(c.$id)!);
      }
    }
  });

  return rootComments;
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
export function useCreateComment(
  ticketId: string | undefined
) {
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
    onSuccess: (deletedCommentId) => {
      // CMT-02: Filter out the deleted comment and any orphaned replies (children of deleted comment)
      queryClient.setQueryData<Comment[]>(
        commentKeys.list(ticketId ?? ''),
        (oldComments = []) => {
          // First, collect all comments and replies
          const allComments = new Map<string, Comment>();
          oldComments.forEach((c) => {
            allComments.set(c.$id, { ...c });
          });

          // Remove the deleted comment
          allComments.delete(deletedCommentId);

          // If there are replies, also remove any that had the deleted comment as parent
          const toRemove: string[] = [];
          allComments.forEach((comment) => {
            if (comment.parentId === deletedCommentId) {
              toRemove.push(comment.$id);
            }
          });
          toRemove.forEach((id) => allComments.delete(id));

          // Reorganize what's left
          return organizeComments(Array.from(allComments.values()));
        }
      );
      
      toast.success('Comment deleted');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
