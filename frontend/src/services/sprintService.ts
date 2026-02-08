import { databases, DATABASE_ID, COLLECTIONS, account } from '@/lib/appwrite';
import type { Sprint, CreateSprintForm, UpdateSprintForm, ApiResponse, PaginatedResponse, ProjectMember } from '@/types';
import { Query, ID } from 'appwrite';

// --- Sprint Validation ---
const VALID_SPRINT_STATUSES = ['planning', 'active', 'completed'];
const MAX_SPRINT_NAME_LENGTH = 100;
const MIN_SPRINT_NAME_LENGTH = 3;
const MAX_GOAL_LENGTH = 500;

function validateProjectId(projectId: string): string | null {
  if (!projectId || typeof projectId !== 'string') return 'Project ID is required';
  if (!/^[a-zA-Z0-9_-]+$/.test(projectId)) return 'Invalid project ID format';
  return null;
}

/**
 * SPR-05: Verify user is a member of the project (client-side mitigation)
 * This is a temporary measure until sprint operations move to Cloud Functions
 */
export async function verifyProjectMembership(
  projectId: string
): Promise<{ success: boolean; role?: string; error?: string }> {
  try {
    const user = await account.get();
    const response = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.PROJECT_MEMBERS,
      [Query.equal('projectId', projectId), Query.equal('userId', user.$id)]
    );

    if (response.documents.length === 0) {
      return { success: false, error: 'You are not a member of this project' };
    }

    const member = response.documents[0] as unknown as ProjectMember;
    return { success: true, role: member.role };
  } catch (error) {
    console.error('Error verifying project membership:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to verify membership',
    };
  }
}

function validateSprintData(data: CreateSprintForm | UpdateSprintForm, isCreate = false): string | null {
  if ('name' in data && data.name !== undefined) {
    if (typeof data.name !== 'string') return 'Sprint name must be a string';
    const trimmed = data.name.trim();
    if (trimmed.length < MIN_SPRINT_NAME_LENGTH || trimmed.length > MAX_SPRINT_NAME_LENGTH) {
      return `Sprint name must be between ${MIN_SPRINT_NAME_LENGTH} and ${MAX_SPRINT_NAME_LENGTH} characters`;
    }
  } else if (isCreate) {
    return 'Sprint name is required';
  }

  const startDate = 'startDate' in data ? data.startDate : undefined;
  const endDate = 'endDate' in data ? data.endDate : undefined;

  if (startDate && isNaN(Date.parse(startDate as string))) return 'Invalid start date';
  if (endDate && isNaN(Date.parse(endDate as string))) return 'Invalid end date';
  if (startDate && endDate && new Date(endDate as string) <= new Date(startDate as string)) {
    return 'End date must be after start date';
  }

  if ('goal' in data && data.goal !== undefined) {
    if (typeof data.goal !== 'string') return 'Goal must be a string';
    if (data.goal.length > MAX_GOAL_LENGTH) return `Goal must be under ${MAX_GOAL_LENGTH} characters`;
  }

  if ('status' in data && data.status !== undefined) {
    if (!VALID_SPRINT_STATUSES.includes(data.status as string)) {
      return `Invalid sprint status. Must be one of: ${VALID_SPRINT_STATUSES.join(', ')}`;
    }
  }

  return null;
}

/**
 * Get all sprints for a project
 */
export async function getSprints(
  projectId: string
): Promise<ApiResponse<PaginatedResponse<Sprint>>> {
  try {
    const projectErr = validateProjectId(projectId);
    if (projectErr) return { success: false, error: projectErr };

    const response = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.SPRINTS,
      [
        Query.equal('projectId', projectId),
        Query.orderDesc('startDate'),
        Query.limit(100),
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
    const projectErr = validateProjectId(projectId);
    if (projectErr) return { success: false, error: projectErr };

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
 * SPR-05: Verify membership before creating (client-side mitigation)
 * ARCH-02: Log sprint creation activity
 */
export async function createSprint(
  projectId: string,
  data: CreateSprintForm
): Promise<ApiResponse<Sprint>> {
  try {
    const projectErr = validateProjectId(projectId);
    if (projectErr) return { success: false, error: projectErr };

    // SPR-05: Verify user is a project member and has permission to create sprints
    const membership = await verifyProjectMembership(projectId);
    if (!membership.success) return { success: false, error: membership.error };
    if (membership.role !== 'admin' && membership.role !== 'manager') {
      return { success: false, error: 'Only project admins and managers can create sprints' };
    }

    const validationErr = validateSprintData(data, true);
    if (validationErr) return { success: false, error: validationErr };

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

    const sprint = response as unknown as Sprint;

    // ARCH-02: Log sprint creation activity
    try {
      const user = await account.get();
      await databases.createDocument(
        DATABASE_ID,
        COLLECTIONS.ACTIVITY_LOG,
        ID.unique(),
        {
          projectId,
          sprintId: sprint.$id,
          userId: user.$id,
          action: 'sprint_created',
          details: JSON.stringify({
            sprintName: sprint.name,
            sprintGoal: sprint.goal,
          }),
        }
      );
    } catch (error) {
      console.error('Error logging sprint creation activity:', error);
      // Activity logging failure should not fail the operation
    }

    return {
      success: true,
      data: sprint,
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
 * SPR-05: Verify membership before updating (client-side mitigation)
 */
export async function updateSprint(
  sprintId: string,
  data: UpdateSprintForm,
  projectId?: string
): Promise<ApiResponse<Sprint>> {
  try {
    if (!sprintId || !/^[a-zA-Z0-9_-]+$/.test(sprintId)) {
      return { success: false, error: 'Invalid sprint ID format' };
    }

    // SPR-05: If projectId provided, verify membership
    if (projectId) {
      const membership = await verifyProjectMembership(projectId);
      if (!membership.success) return { success: false, error: membership.error };
      if (membership.role !== 'admin' && membership.role !== 'manager') {
        return { success: false, error: 'Only project admins and managers can update sprints' };
      }
    }

    const validationErr = validateSprintData(data);
    if (validationErr) return { success: false, error: validationErr };

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
 * SPR-05: Verify membership before starting (client-side mitigation)
 * ARCH-02: Log sprint start activity
 */
export async function startSprint(sprintId: string, projectId: string): Promise<ApiResponse<Sprint>> {
  try {
    // SPR-05: Verify user is a project member and has permission to start sprints
    const membership = await verifyProjectMembership(projectId);
    if (!membership.success) return { success: false, error: membership.error };
    if (membership.role !== 'admin' && membership.role !== 'manager') {
      return { success: false, error: 'Only project admins and managers can start sprints' };
    }

    // Check if there's already an active sprint
    const activeCheck = await getActiveSprint(projectId);
    if (activeCheck.success && activeCheck.data) {
      return { success: false, error: 'Another sprint is already active. Complete it before starting a new one.' };
    }

    const result = await updateSprint(sprintId, { status: 'active' }, projectId);
    if (!result.success) return result;

    const sprint = result.data!;

    // ARCH-02: Log sprint start activity
    try {
      const user = await account.get();
      await databases.createDocument(
        DATABASE_ID,
        COLLECTIONS.ACTIVITY_LOG,
        ID.unique(),
        {
          projectId,
          sprintId: sprint.$id,
          userId: user.$id,
          action: 'sprint_started',
          details: JSON.stringify({
            sprintName: sprint.name,
          }),
        }
      );
    } catch (error) {
      console.error('Error logging sprint start activity:', error);
      // Activity logging failure should not fail the operation
    }

    return result;
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to start sprint' };
  }
}

/**
 * Complete a sprint (change status to completed)
 * SPR-05: Verify membership before completing (client-side mitigation)
 * ARCH-02: Log sprint completion activity
 */
export async function completeSprint(sprintId: string, projectId?: string): Promise<ApiResponse<Sprint>> {
  if (projectId) {
    const membership = await verifyProjectMembership(projectId);
    if (!membership.success) return { success: false, error: membership.error };
    if (membership.role !== 'admin' && membership.role !== 'manager') {
      return { success: false, error: 'Only project admins and managers can complete sprints' };
    }
  }

  const result = await updateSprint(sprintId, { status: 'completed' }, projectId);
  if (!result.success) return result;

  // ARCH-02: Log sprint completion activity
  if (projectId) {
    try {
      const sprint = result.data!;
      const user = await account.get();
      await databases.createDocument(
        DATABASE_ID,
        COLLECTIONS.ACTIVITY_LOG,
        ID.unique(),
        {
          projectId,
          sprintId: sprint.$id,
          userId: user.$id,
          action: 'sprint_completed',
          details: JSON.stringify({
            sprintName: sprint.name,
          }),
        }
      );
    } catch (error) {
      console.error('Error logging sprint completion activity:', error);
      // Activity logging failure should not fail the operation
    }
  }

  return result;
}

/**
 * Delete a sprint
 * SPR-04: Clean up orphan tickets and log activity
 * SPR-05: Verify membership before deleting (client-side mitigation)
 */
export async function deleteSprint(sprintId: string, projectId?: string): Promise<ApiResponse<void>> {
  try {
    if (!sprintId || !/^[a-zA-Z0-9_-]+$/.test(sprintId)) {
      return { success: false, error: 'Invalid sprint ID format' };
    }

    // SPR-04: Get sprint info before deletion for activity logging
    let sprint: Sprint | null = null;
    try {
      const sprintResponse = await getSprint(sprintId);
      if (sprintResponse.success) {
        sprint = sprintResponse.data ?? null;
      }
    } catch (error) {
      console.error('Error fetching sprint for deletion logging:', error);
    }

    // SPR-05: Verify user is a project member and has permission to delete sprints
    if (projectId) {
      const membership = await verifyProjectMembership(projectId);
      if (!membership.success) return { success: false, error: membership.error };
      if (membership.role !== 'admin' && membership.role !== 'manager') {
        return { success: false, error: 'Only project admins and managers can delete sprints' };
      }
    }

    // SPR-04: Clean up orphan tickets - set sprintId to empty string for all tickets in this sprint
    try {
      const ticketsResponse = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.TICKETS,
        [Query.equal('sprintId', sprintId)]
      );

      // Update each orphaned ticket
      for (const ticket of ticketsResponse.documents) {
        await databases.updateDocument(
          DATABASE_ID,
          COLLECTIONS.TICKETS,
          ticket.$id,
          { sprintId: '' }
        );
      }
    } catch (error) {
      console.error('Error cleaning up orphan tickets:', error);
      // Continue with sprint deletion even if cleanup fails
    }

    // Delete the sprint
    await databases.deleteDocument(
      DATABASE_ID,
      COLLECTIONS.SPRINTS,
      sprintId
    );

    // SPR-04: Log the deletion activity
    try {
      const user = await account.get();
      if (sprint && projectId) {
        await databases.createDocument(
          DATABASE_ID,
          COLLECTIONS.ACTIVITY_LOG,
          ID.unique(),
          {
            projectId,
            sprintId, // Include sprint ID for context
            userId: user.$id,
            action: 'sprint_deleted',
            details: JSON.stringify({
              sprintName: sprint.name,
              sprintStatus: sprint.status,
            }),
          }
        );
      }
    } catch (error) {
      console.error('Error logging sprint deletion activity:', error);
      // Activity logging failure should not fail the operation
    }

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
