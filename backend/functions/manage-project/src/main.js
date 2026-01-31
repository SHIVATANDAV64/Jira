import { Client, Databases, Teams, ID, Query } from 'node-appwrite';

// ============================================================================
// STANDALONE FUNCTION - All utilities inline (Appwrite functions are deployed
// separately and cannot share code across functions)
// ============================================================================

// --- Constants (from environment variables) ---
const DATABASE_ID = process.env.APPWRITE_DATABASE_ID;
const COLLECTIONS = {
  PROJECTS: process.env.APPWRITE_COLLECTION_PROJECTS,
  PROJECT_MEMBERS: process.env.APPWRITE_COLLECTION_PROJECT_MEMBERS,
  TICKETS: process.env.APPWRITE_COLLECTION_TICKETS,
  COMMENTS: process.env.APPWRITE_COLLECTION_COMMENTS,
  ACTIVITY_LOG: process.env.APPWRITE_COLLECTION_ACTIVITY_LOGS,
};

const PROJECT_ROLES = {
  ADMIN: 'admin',
  MANAGER: 'manager',
  DEVELOPER: 'developer',
  VIEWER: 'viewer',
};

const ACTIVITY_ACTIONS = {
  PROJECT_CREATED: 'project_created',
  PROJECT_UPDATED: 'project_updated',
};

// --- Permissions ---
const PERMISSIONS = {
  [PROJECT_ROLES.ADMIN]: {
    canCreateTickets: true,
    canEditTickets: true,
    canDeleteTickets: true,
    canAssignTickets: true,
    canMoveTickets: true,
    canManageMembers: true,
    canEditProject: true,
    canDeleteProject: true,
    canComment: true,
  },
  [PROJECT_ROLES.MANAGER]: {
    canCreateTickets: true,
    canEditTickets: true,
    canDeleteTickets: true,
    canAssignTickets: true,
    canMoveTickets: true,
    canManageMembers: true,
    canEditProject: true,
    canDeleteProject: false,
    canComment: true,
  },
  [PROJECT_ROLES.DEVELOPER]: {
    canCreateTickets: true,
    canEditTickets: true,
    canDeleteTickets: false,
    canAssignTickets: false,
    canMoveTickets: true,
    canManageMembers: false,
    canEditProject: false,
    canDeleteProject: false,
    canComment: true,
  },
  [PROJECT_ROLES.VIEWER]: {
    canCreateTickets: false,
    canEditTickets: false,
    canDeleteTickets: false,
    canAssignTickets: false,
    canMoveTickets: false,
    canManageMembers: false,
    canEditProject: false,
    canDeleteProject: false,
    canComment: true,
  },
};

function getPermissions(role) {
  return PERMISSIONS[role] || PERMISSIONS[PROJECT_ROLES.VIEWER];
}

function hasPermission(role, permission) {
  const permissions = getPermissions(role);
  return permissions[permission] === true;
}

// --- Utilities ---
function createAdminClient() {
  const client = new Client()
    .setEndpoint(process.env.APPWRITE_FUNCTION_API_ENDPOINT)
    .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

  return {
    client,
    databases: new Databases(client),
    teams: new Teams(client),
  };
}

function success(data) {
  return { success: true, data };
}

function error(message, code = 400) {
  return { success: false, error: message, code };
}

function parseBody(req) {
  try {
    if (typeof req.body === 'string') {
      // Prevent excessively large payloads (max 1MB)
      if (req.body.length > 1024 * 1024) {
        return {};
      }
      return JSON.parse(req.body);
    }
    return req.body || {};
  } catch {
    return {};
  }
}

function getUserId(req) {
  return req.headers['x-appwrite-user-id'] || null;
}

// --- Security Utilities ---
function sanitizeString(str) {
  if (typeof str !== 'string') return str;
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

function sanitizeForJson(obj) {
  if (typeof obj === 'string') return sanitizeString(obj);
  if (Array.isArray(obj)) return obj.map(sanitizeForJson);
  if (obj && typeof obj === 'object') {
    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
      sanitized[key] = sanitizeForJson(value);
    }
    return sanitized;
  }
  return obj;
}

async function getUserProjectRole(databases, projectId, userId) {
  try {
    const members = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.PROJECT_MEMBERS,
      [
        Query.equal('projectId', projectId),
        Query.equal('userId', userId),
      ]
    );
    if (members.documents.length === 0) {
      return null;
    }
    return members.documents[0].role;
  } catch (err) {
    console.error('Error getting user project role:', err);
    return null;
  }
}

// ============================================================================
// MAIN FUNCTION
// ============================================================================

export default async function main({ req, res, log, error: logError }) {
  const userId = getUserId(req);
  
  if (!userId) {
    return res.json(error('Unauthorized', 401));
  }

  const body = parseBody(req);
  const { action, projectId, data } = body;

  if (!projectId) {
    return res.json(error('Project ID is required'));
  }

  // Validate projectId format
  if (!/^[a-zA-Z0-9_-]+$/.test(projectId)) {
    return res.json(error('Invalid project ID format'));
  }

  const { databases, teams } = createAdminClient();

  try {
    // Check user's role in the project
    const role = await getUserProjectRole(databases, projectId, userId);
    
    if (!role) {
      return res.json(error('You are not a member of this project', 403));
    }

    switch (action) {
      case 'get': {
        const project = await databases.getDocument(
          DATABASE_ID,
          COLLECTIONS.PROJECTS,
          projectId
        );
        return res.json(success({ ...project, userRole: role }));
      }

      case 'update': {
        if (!hasPermission(role, 'canEditProject')) {
          return res.json(error('You do not have permission to edit this project', 403));
        }

        // Validate update data
        const updateData = {};
        if (data.name !== undefined) {
          if (typeof data.name !== 'string' || data.name.trim().length < 3 || data.name.length > 100) {
            return res.json(error('Project name must be between 3 and 100 characters'));
          }
          updateData.name = data.name.trim();
        }
        if (data.description !== undefined) {
          if (data.description !== null && typeof data.description !== 'string') {
            return res.json(error('Invalid description format'));
          }
          if (data.description && data.description.length > 2000) {
            return res.json(error('Description must be less than 2000 characters'));
          }
          updateData.description = data.description;
        }

        if (Object.keys(updateData).length === 0) {
          return res.json(error('No valid fields to update'));
        }

        const updated = await databases.updateDocument(
          DATABASE_ID,
          COLLECTIONS.PROJECTS,
          projectId,
          updateData
        );

        // Log activity
        await databases.createDocument(
          DATABASE_ID,
          COLLECTIONS.ACTIVITY_LOG,
          ID.unique(),
          {
            projectId,
            userId,
            action: ACTIVITY_ACTIONS.PROJECT_UPDATED,
            details: JSON.stringify(sanitizeForJson(updateData)),
          }
        );

        log(`Project updated: ${projectId} by user ${userId}`);
        return res.json(success(updated));
      }

      case 'delete': {
        if (!hasPermission(role, 'canDeleteProject')) {
          return res.json(error('You do not have permission to delete this project', 403));
        }

        const project = await databases.getDocument(
          DATABASE_ID,
          COLLECTIONS.PROJECTS,
          projectId
        );

        // Delete team
        try {
          await teams.delete(project.teamId);
        } catch (e) {
          log(`Could not delete team: ${e.message}`);
        }

        // Delete all tickets in the project
        const tickets = await databases.listDocuments(
          DATABASE_ID,
          COLLECTIONS.TICKETS,
          [Query.equal('projectId', projectId)]
        );
        for (const ticket of tickets.documents) {
          await databases.deleteDocument(DATABASE_ID, COLLECTIONS.TICKETS, ticket.$id);
        }

        // Delete all project members
        const members = await databases.listDocuments(
          DATABASE_ID,
          COLLECTIONS.PROJECT_MEMBERS,
          [Query.equal('projectId', projectId)]
        );
        for (const member of members.documents) {
          await databases.deleteDocument(DATABASE_ID, COLLECTIONS.PROJECT_MEMBERS, member.$id);
        }

        // Delete the project
        await databases.deleteDocument(DATABASE_ID, COLLECTIONS.PROJECTS, projectId);

        log(`Project deleted: ${projectId} by user ${userId}`);
        return res.json(success({ deleted: true }));
      }

      case 'archive': {
        if (!hasPermission(role, 'canEditProject')) {
          return res.json(error('You do not have permission to archive this project', 403));
        }

        const archived = await databases.updateDocument(
          DATABASE_ID,
          COLLECTIONS.PROJECTS,
          projectId,
          { status: 'archived' }
        );

        log(`Project archived: ${projectId} by user ${userId}`);
        return res.json(success(archived));
      }

      default:
        return res.json(error('Invalid action'));
    }
  } catch (err) {
    logError(`Error managing project: ${err.message}`);
    return res.json(error('Failed to manage project', 500));
  }
}
