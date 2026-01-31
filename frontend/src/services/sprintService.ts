import { databases, DATABASE_ID, COLLECTIONS } from '@/lib/appwrite';
import type { Sprint, CreateSprintForm, UpdateSprintForm, ApiResponse, PaginatedResponse } from '@/types';
import { Query, ID } from 'appwrite';

/**
 * Get all sprints for a project
 */
export async function getSprints(
  projectId: string
): Promise<ApiResponse<PaginatedResponse<Sprint>>> {
  try {
    const response = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.SPRINTS,
      [
        Query.equal('projectId', projectId),
        Query.orderDesc('startDate'),
      ]
    );

    return {
      success: true,
      data: {
        documents: response.documents as unknown as Sprint[],
        total: response.total,
      },
    };
  } catch (error) {
    console.error('Error fetching sprints:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch sprints',
    };
  }
}

/**
 * Get the active sprint for a project
 */
export async function getActiveSprint(
  projectId: string
): Promise<ApiResponse<Sprint | null>> {
  try {
    const response = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.SPRINTS,
      [
        Query.equal('projectId', projectId),
        Query.equal('status', 'active'),
        Query.limit(1),
      ]
    );

    return {
      success: true,
      data: response.documents.length > 0 ? (response.documents[0] as unknown as Sprint) : null,
    };
  } catch (error) {
    console.error('Error fetching active sprint:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch active sprint',
    };
  }
}

/**
 * Get a single sprint by ID
 */
export async function getSprint(sprintId: string): Promise<ApiResponse<Sprint>> {
  try {
    const response = await databases.getDocument(
      DATABASE_ID,
      COLLECTIONS.SPRINTS,
      sprintId
    );

    return {
      success: true,
      data: response as unknown as Sprint,
    };
  } catch (error) {
    console.error('Error fetching sprint:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch sprint',
    };
  }
}

/**
 * Create a new sprint
 */
export async function createSprint(
  projectId: string,
  data: CreateSprintForm
): Promise<ApiResponse<Sprint>> {
  try {
    const response = await databases.createDocument(
      DATABASE_ID,
      COLLECTIONS.SPRINTS,
      ID.unique(),
      {
        projectId,
        ...data,
        status: 'planning',
      }
    );

    return {
      success: true,
      data: response as unknown as Sprint,
    };
  } catch (error) {
    console.error('Error creating sprint:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create sprint',
    };
  }
}

/**
 * Update a sprint
 */
export async function updateSprint(
  sprintId: string,
  data: UpdateSprintForm
): Promise<ApiResponse<Sprint>> {
  try {
    const response = await databases.updateDocument(
      DATABASE_ID,
      COLLECTIONS.SPRINTS,
      sprintId,
      data
    );

    return {
      success: true,
      data: response as unknown as Sprint,
    };
  } catch (error) {
    console.error('Error updating sprint:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update sprint',
    };
  }
}

/**
 * Start a sprint (change status to active)
 */
export async function startSprint(sprintId: string): Promise<ApiResponse<Sprint>> {
  return updateSprint(sprintId, { status: 'active' });
}

/**
 * Complete a sprint (change status to completed)
 */
export async function completeSprint(sprintId: string): Promise<ApiResponse<Sprint>> {
  return updateSprint(sprintId, { status: 'completed' });
}

/**
 * Delete a sprint
 */
export async function deleteSprint(sprintId: string): Promise<ApiResponse<void>> {
  try {
    await databases.deleteDocument(
      DATABASE_ID,
      COLLECTIONS.SPRINTS,
      sprintId
    );

    return {
      success: true,
    };
  } catch (error) {
    console.error('Error deleting sprint:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete sprint',
    };
  }
}
