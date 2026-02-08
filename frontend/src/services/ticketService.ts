import { functions, FUNCTIONS_IDS } from '@/lib/appwrite';
import { account } from '@/lib/appwrite';
import type {
  Ticket,
  CreateTicketForm,
  UpdateTicketForm,
  TicketStatus,
  TicketFilters,
  ApiResponse,
  PaginatedResponse,
} from '@/types';
import { ExecutionMethod } from 'appwrite';
import * as notificationService from './notificationService';

/**
 * Execute an Appwrite function and parse the response
 */
async function executeFunction<T>(
  functionId: string,
  data: Record<string, unknown>
): Promise<ApiResponse<T>> {
  try {
    const execution = await functions.createExecution(
      functionId,
      JSON.stringify(data),
      false,
      '/',
      ExecutionMethod.POST
    );

    const response = JSON.parse(execution.responseBody);
    return response;
  } catch (error) {
    console.error(`Error executing function ${functionId}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred',
    };
  }
}

/**
 * Create a new ticket
 */
export async function createTicket(
  projectId: string,
  data: CreateTicketForm
): Promise<ApiResponse<Ticket>> {
  return executeFunction<Ticket>(FUNCTIONS_IDS.CREATE_TICKET, {
    action: 'create',
    projectId,
    ...data,
  });
}

/**
 * Get all tickets for a project with optional filters
 */
export async function getTickets(
  projectId: string,
  filters?: TicketFilters
): Promise<ApiResponse<PaginatedResponse<Ticket>>> {
  return executeFunction<PaginatedResponse<Ticket>>(FUNCTIONS_IDS.GET_TICKETS, {
    action: 'list',
    projectId,
    filters: filters || {},
    limit: 500,
  });
}

/**
 * Get a single ticket by ID
 */
export async function getTicket(ticketId: string): Promise<ApiResponse<Ticket>> {
  return executeFunction<Ticket>(FUNCTIONS_IDS.MANAGE_TICKET, {
    action: 'get',
    ticketId,
  });
}

/**
 * Update a ticket
 */
export async function updateTicket(
  ticketId: string,
  data: UpdateTicketForm
): Promise<ApiResponse<Ticket>> {
  return executeFunction<Ticket>(FUNCTIONS_IDS.MANAGE_TICKET, {
    action: 'update',
    ticketId,
    data,
  });
}

/**
 * Assign a ticket to a user
 * NTF-01b: Creates a notification for the assignee if they are not the current user
 */
export async function assignTicket(
  ticketId: string,
  assigneeId: string | null
): Promise<ApiResponse<Ticket>> {
  const result = await executeFunction<Ticket>(FUNCTIONS_IDS.MANAGE_TICKET, {
    action: 'assign',
    ticketId,
    data: { assigneeId },
  });

  // NTF-01b: Notify the assignee (but not if they're assigning to themselves)
  if (result.success && result.data && assigneeId) {
    try {
      const currentUser = await account.get();
      if (assigneeId !== currentUser.$id) {
        const ticket = result.data;
        await notificationService.notifyTicketAssigned(
          assigneeId,
          ticket.projectId,
          ticket.ticketKey || `${ticket.$id}-${ticket.ticketNumber}`,
          ticket.title,
          ticket.$id
        );
      }
    } catch (error) {
      console.error('Error creating assignment notification:', error);
      // Don't fail the assignment if notification fails
    }
  }

  return result;
}

/**
 * Delete a ticket
 */
export async function deleteTicket(ticketId: string): Promise<ApiResponse<void>> {
  return executeFunction<void>(FUNCTIONS_IDS.MANAGE_TICKET, {
    action: 'delete',
    ticketId,
  });
}

/**
 * Move a ticket to a new status (for Kanban board)
 */
export async function moveTicket(
  ticketId: string,
  newStatus: TicketStatus,
  newOrder: number
): Promise<ApiResponse<Ticket>> {
  return executeFunction<Ticket>(FUNCTIONS_IDS.MOVE_TICKET, {
    action: 'move',
    ticketId,
    newStatus,
    newOrder,
  });
}

/**
 * Reorder tickets within a column
 */
export async function reorderTickets(
  projectId: string,
  status: TicketStatus,
  ticketIds: string[]
): Promise<ApiResponse<void>> {
  return executeFunction<void>(FUNCTIONS_IDS.MOVE_TICKET, {
    action: 'reorder',
    projectId,
    status,
    ticketIds,
  });
}

/**
 * Search tickets across all projects or within a specific project
 */
export async function searchTickets(
  query: string,
  projectId: string,
  filters?: TicketFilters
): Promise<ApiResponse<PaginatedResponse<Ticket>>> {
  return executeFunction<PaginatedResponse<Ticket>>(FUNCTIONS_IDS.SEARCH_TICKETS, {
    action: 'search',
    query,
    projectId,
    filters: filters || {},
  });
}
