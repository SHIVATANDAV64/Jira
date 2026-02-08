import { functions, FUNCTIONS_IDS } from '@/lib/appwrite';
import type { Comment, ApiResponse, PaginatedResponse } from '@/types';
import { ExecutionMethod } from 'appwrite';

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
 * Get all comments for a ticket
 */
export async function getComments(
  ticketId: string
): Promise<ApiResponse<PaginatedResponse<Comment>>> {
  return executeFunction<PaginatedResponse<Comment>>(FUNCTIONS_IDS.MANAGE_COMMENTS, {
    action: 'list',
    ticketId,
  });
}

/**
 * Create a new comment
 * NTF-01c: Optionally creates notifications for ticket reporter when given ticket context
 */
export async function createComment(
  ticketId: string,
  content: string,
  parentId?: string
): Promise<ApiResponse<Comment>> {
  const result = await executeFunction<Comment>(FUNCTIONS_IDS.MANAGE_COMMENTS, {
    action: 'create',
    ticketId,
    data: {
      content,
      parentId,
    },
  });

  return result;
}

/**
 * Update a comment
 */
export async function updateComment(
  commentId: string,
  content: string
): Promise<ApiResponse<Comment>> {
  return executeFunction<Comment>(FUNCTIONS_IDS.MANAGE_COMMENTS, {
    action: 'update',
    commentId,
    data: {
      content,
    },
  });
}

/**
 * Delete a comment
 */
export async function deleteComment(commentId: string): Promise<ApiResponse<void>> {
  return executeFunction<void>(FUNCTIONS_IDS.MANAGE_COMMENTS, {
    action: 'delete',
    commentId,
  });
}
