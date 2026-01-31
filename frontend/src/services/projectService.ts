import { functions, FUNCTIONS_IDS } from '@/lib/appwrite';
import type { Project, CreateProjectForm, ApiResponse, PaginatedResponse } from '@/types';
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
      false, // async
      '/', // path
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
 * Create a new project
 */
export async function createProject(data: CreateProjectForm): Promise<ApiResponse<Project>> {
  return executeFunction<Project>(FUNCTIONS_IDS.CREATE_PROJECT, {
    action: 'create',
    ...data,
  });
}

/**
 * Get all projects for the current user
 */
export async function getProjects(): Promise<ApiResponse<PaginatedResponse<Project>>> {
  return executeFunction<PaginatedResponse<Project>>(FUNCTIONS_IDS.GET_PROJECTS, {
    action: 'list',
  });
}

/**
 * Get a single project by ID
 */
export async function getProject(projectId: string): Promise<ApiResponse<Project>> {
  return executeFunction<Project>(FUNCTIONS_IDS.MANAGE_PROJECT, {
    action: 'get',
    projectId,
  });
}

/**
 * Update a project
 */
export async function updateProject(
  projectId: string,
  data: Partial<CreateProjectForm>
): Promise<ApiResponse<Project>> {
  return executeFunction<Project>(FUNCTIONS_IDS.MANAGE_PROJECT, {
    action: 'update',
    projectId,
    ...data,
  });
}

/**
 * Archive a project
 */
export async function archiveProject(projectId: string): Promise<ApiResponse<Project>> {
  return executeFunction<Project>(FUNCTIONS_IDS.MANAGE_PROJECT, {
    action: 'archive',
    projectId,
  });
}

/**
 * Restore an archived project
 */
export async function restoreProject(projectId: string): Promise<ApiResponse<Project>> {
  return executeFunction<Project>(FUNCTIONS_IDS.MANAGE_PROJECT, {
    action: 'restore',
    projectId,
  });
}

/**
 * Delete a project permanently
 */
export async function deleteProject(projectId: string): Promise<ApiResponse<void>> {
  return executeFunction<void>(FUNCTIONS_IDS.MANAGE_PROJECT, {
    action: 'delete',
    projectId,
  });
}
