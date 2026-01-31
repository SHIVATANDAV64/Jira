import { functions, FUNCTIONS_IDS } from '@/lib/appwrite';
import type { ProjectMember, ProjectRole, ApiResponse, PaginatedResponse } from '@/types';
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
 * Get all members of a project
 */
export async function getProjectMembers(
  projectId: string
): Promise<ApiResponse<PaginatedResponse<ProjectMember>>> {
  return executeFunction<PaginatedResponse<ProjectMember>>(FUNCTIONS_IDS.MANAGE_MEMBER, {
    action: 'list',
    projectId,
  });
}

/**
 * Invite a user to a project by email
 */
export async function inviteMember(
  projectId: string,
  email: string,
  role: ProjectRole
): Promise<ApiResponse<ProjectMember>> {
  return executeFunction<ProjectMember>(FUNCTIONS_IDS.INVITE_MEMBER, {
    action: 'invite',
    projectId,
    email,
    role,
  });
}

/**
 * Update a member's role
 */
export async function updateMemberRole(
  projectId: string,
  memberId: string,
  role: ProjectRole
): Promise<ApiResponse<ProjectMember>> {
  return executeFunction<ProjectMember>(FUNCTIONS_IDS.MANAGE_MEMBER, {
    action: 'updateRole',
    projectId,
    memberId,
    data: { role },
  });
}

/**
 * Remove a member from a project
 */
export async function removeMember(
  projectId: string,
  memberId: string
): Promise<ApiResponse<void>> {
  return executeFunction<void>(FUNCTIONS_IDS.MANAGE_MEMBER, {
    action: 'remove',
    projectId,
    memberId,
  });
}

/**
 * Leave a project (for current user)
 */
export async function leaveProject(projectId: string): Promise<ApiResponse<void>> {
  return executeFunction<void>(FUNCTIONS_IDS.MANAGE_MEMBER, {
    action: 'leave',
    projectId,
  });
}
