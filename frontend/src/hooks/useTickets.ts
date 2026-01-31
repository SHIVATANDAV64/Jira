import { useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { client, DATABASE_ID, COLLECTIONS } from '@/lib/appwrite';
import type {
  Ticket,
  CreateTicketForm,
  UpdateTicketForm,
  TicketStatus,
  TicketFilters,
  KanbanColumn,
} from '@/types';
import * as ticketService from '@/services/ticketService';
import { TICKET_STATUSES, TICKET_STATUS_ORDER } from '@/lib/constants';

// Query keys
export const ticketKeys = {
  all: ['tickets'] as const,
  lists: () => [...ticketKeys.all, 'list'] as const,
  list: (projectId: string, filters?: TicketFilters) => [...ticketKeys.lists(), projectId, filters] as const,
  details: () => [...ticketKeys.all, 'detail'] as const,
  detail: (id: string) => [...ticketKeys.details(), id] as const,
};

// Hook to fetch tickets for a project
export function useTickets(projectId: string | undefined, filters?: TicketFilters) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ticketKeys.list(projectId ?? '', filters),
    queryFn: async () => {
      if (!projectId) return [];
      const response = await ticketService.getTickets(projectId, filters);
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch tickets');
      }
      return response.data?.documents ?? [];
    },
    enabled: !!projectId,
  });

  // Realtime subscription
  useEffect(() => {
    if (!projectId) return;

    const unsubscribe = client.subscribe(
      `databases.${DATABASE_ID}.collections.${COLLECTIONS.TICKETS}.documents`,
      (response) => {
        const { events, payload } = response as { events: string[]; payload: Ticket };
        const eventType = events[0] || '';
        const document = payload;

        // Only process events for this project
        if (document.projectId !== projectId) return;

        queryClient.setQueryData<Ticket[]>(ticketKeys.list(projectId, filters), (old = []) => {
          if (eventType.includes('create')) {
            return [...old, document];
          } else if (eventType.includes('update')) {
            return old.map((t) => (t.$id === document.$id ? document : t));
          } else if (eventType.includes('delete')) {
            return old.filter((t) => t.$id !== document.$id);
          }
          return old;
        });

        // Also update the detail cache
        if (eventType.includes('update')) {
          queryClient.setQueryData(ticketKeys.detail(document.$id), document);
        }
      }
    );

    return () => {
      unsubscribe();
    };
  }, [projectId, filters, queryClient]);

  // Organize tickets into Kanban columns
  const columns = useMemo<KanbanColumn[]>(() => {
    const tickets = query.data ?? [];
    return TICKET_STATUS_ORDER.map((statusKey) => ({
      id: statusKey,
      title: TICKET_STATUSES[statusKey].label,
      tickets: tickets
        .filter((ticket) => ticket.status === statusKey)
        .sort((a, b) => a.order - b.order),
    }));
  }, [query.data]);

  return {
    tickets: query.data ?? [],
    columns,
    isLoading: query.isLoading,
    isPending: query.isPending,
    error: query.error?.message ?? null,
    refetch: query.refetch,
  };
}

// Hook to fetch a single ticket
export function useTicket(ticketId: string | undefined) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ticketKeys.detail(ticketId ?? ''),
    queryFn: async () => {
      if (!ticketId) return null;
      const response = await ticketService.getTicket(ticketId);
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch ticket');
      }
      return response.data ?? null;
    },
    enabled: !!ticketId,
  });

  // Realtime subscription for this specific ticket
  useEffect(() => {
    if (!ticketId) return;

    const unsubscribe = client.subscribe(
      `databases.${DATABASE_ID}.collections.${COLLECTIONS.TICKETS}.documents.${ticketId}`,
      (response) => {
        const { events, payload } = response as { events: string[]; payload: Ticket };
        const eventType = events[0] || '';
        const document = payload;

        if (eventType.includes('update')) {
          queryClient.setQueryData(ticketKeys.detail(ticketId), document);
        } else if (eventType.includes('delete')) {
          queryClient.setQueryData(ticketKeys.detail(ticketId), null);
        }
      }
    );

    return () => {
      unsubscribe();
    };
  }, [ticketId, queryClient]);

  return {
    ticket: query.data ?? null,
    isLoading: query.isLoading,
    isPending: query.isPending,
    error: query.error?.message ?? null,
    refetch: query.refetch,
  };
}

// Mutation hooks
export function useCreateTicket(projectId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateTicketForm) => {
      if (!projectId) throw new Error('Project ID is required');
      const response = await ticketService.createTicket(projectId, data);
      if (!response.success) {
        throw new Error(response.error || 'Failed to create ticket');
      }
      return response.data!;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ticketKeys.lists() });
      toast.success(`Ticket "${data.title}" created successfully`);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useUpdateTicket() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ ticketId, data }: { ticketId: string; data: UpdateTicketForm }) => {
      const response = await ticketService.updateTicket(ticketId, data);
      if (!response.success) {
        throw new Error(response.error || 'Failed to update ticket');
      }
      return response.data!;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ticketKeys.detail(data.$id) });
      queryClient.invalidateQueries({ queryKey: ticketKeys.lists() });
      toast.success('Ticket updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useDeleteTicket() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ticketId: string) => {
      const response = await ticketService.deleteTicket(ticketId);
      if (!response.success) {
        throw new Error(response.error || 'Failed to delete ticket');
      }
      return ticketId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ticketKeys.all });
      toast.success('Ticket deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useMoveTicket(projectId: string | undefined, filters?: TicketFilters) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ ticketId, newStatus, newOrder }: { ticketId: string; newStatus: TicketStatus; newOrder: number }) => {
      const response = await ticketService.moveTicket(ticketId, newStatus, newOrder);
      if (!response.success) {
        throw new Error(response.error || 'Failed to move ticket');
      }
      return { ticketId, newStatus, newOrder };
    },
    // Optimistic update
    onMutate: async ({ ticketId, newStatus, newOrder }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ticketKeys.list(projectId ?? '', filters) });

      // Snapshot the previous value
      const previousTickets = queryClient.getQueryData<Ticket[]>(ticketKeys.list(projectId ?? '', filters));

      // Optimistically update to the new value
      queryClient.setQueryData<Ticket[]>(ticketKeys.list(projectId ?? '', filters), (old = []) =>
        old.map((t) =>
          t.$id === ticketId ? { ...t, status: newStatus, order: newOrder } : t
        )
      );

      // Return a context object with the snapshotted value
      return { previousTickets };
    },
    onError: (error: Error, _variables, context) => {
      // Rollback to the previous value
      if (context?.previousTickets) {
        queryClient.setQueryData(ticketKeys.list(projectId ?? '', filters), context.previousTickets);
      }
      toast.error(error.message);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ticketKeys.lists() });
    },
  });
}

export function useAssignTicket() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ ticketId, assigneeId }: { ticketId: string; assigneeId: string | null }) => {
      const response = await ticketService.assignTicket(ticketId, assigneeId);
      if (!response.success) {
        throw new Error(response.error || 'Failed to assign ticket');
      }
      return response.data!;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ticketKeys.detail(data.$id) });
      queryClient.invalidateQueries({ queryKey: ticketKeys.lists() });
      toast.success('Ticket assigned successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
