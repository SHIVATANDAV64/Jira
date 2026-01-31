import { Client, Databases, Users, ID, Query } from 'node-appwrite';

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
  TICKET_UPDATED: 'ticket_updated',
  TICKET_DELETED: 'ticket_deleted',
  TICKET_ASSIGNED: 'ticket_assigned',
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
    users: new Users(client),
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

function generateId() {
  return ID.unique();
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
  if (typeof obj !== 'object' || obj === null) return obj;
  if (Array.isArray(obj)) return obj.map(sanitizeForJson);
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    result[sanitizeString(key)] = sanitizeForJson(value);
  }
  return result;
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
  const { action, ticketId, data } = body;

  if (!ticketId || typeof ticketId !== 'string') {
    return res.json(error('Valid ticket ID is required'));
  }

  // Validate ticketId format (alphanumeric with underscores and hyphens)
  if (!/^[a-zA-Z0-9_-]+$/.test(ticketId)) {
    return res.json(error('Invalid ticket ID format'));
  }

  const { databases, users } = createAdminClient();

  try {
    // Get the ticket
    const ticket = await databases.getDocument(
      DATABASE_ID,
      COLLECTIONS.TICKETS,
      ticketId
    );

    // Check user's role in the project
    const role = await getUserProjectRole(databases, ticket.projectId, userId);
    
    if (!role) {
      return res.json(error('You are not a member of this project', 403));
    }

    switch (action) {
      case 'get': {
        // Get reporter and assignee info
        let reporter = null;
        let assignee = null;

        if (ticket.reporterId) {
          try {
            const user = await users.get(ticket.reporterId);
            reporter = { $id: user.$id, name: user.name, email: user.email };
          } catch (e) {
            reporter = { $id: ticket.reporterId, name: 'Unknown', email: '' };
          }
        }

        if (ticket.assigneeId) {
          try {
            const user = await users.get(ticket.assigneeId);
            assignee = { $id: user.$id, name: user.name, email: user.email };
          } catch (e) {
            assignee = { $id: ticket.assigneeId, name: 'Unknown', email: '' };
          }
        }

        return res.json(success({ ...ticket, reporter, assignee }));
      }

      case 'update': {
        if (!hasPermission(role, 'canEditTickets')) {
          return res.json(error('You do not have permission to edit tickets', 403));
        }

        const updateData = {};
        if (data?.title && typeof data.title === 'string') {
          if (data.title.trim().length < 5 || data.title.trim().length > 200) {
            return res.json(error('Title must be between 5 and 200 characters'));
          }
          updateData.title = data.title.trim();
        }
        if (data?.description !== undefined) {
          if (data.description && typeof data.description !== 'string') {
            return res.json(error('Description must be a string'));
          }
          if (data.description && data.description.length > 10000) {
            return res.json(error('Description must be less than 10000 characters'));
          }
          updateData.description = data.description || '';
        }
        if (data?.type) {
          const validTypes = ['bug', 'feature', 'task', 'improvement'];
          if (!validTypes.includes(data.type)) {
            return res.json(error('Invalid ticket type'));
          }
          updateData.type = data.type;
        }
        if (data?.priority) {
          const validPriorities = ['critical', 'high', 'medium', 'low'];
          if (!validPriorities.includes(data.priority)) {
            return res.json(error('Invalid priority'));
          }
          updateData.priority = data.priority;
        }
        if (data?.labels) {
          if (!Array.isArray(data.labels)) {
            return res.json(error('Labels must be an array'));
          }
          if (data.labels.some(l => typeof l !== 'string' || l.length > 50)) {
            return res.json(error('Each label must be a string with max 50 characters'));
          }
          updateData.labels = data.labels;
        }
        if (data?.dueDate !== undefined) {
          if (data.dueDate && isNaN(Date.parse(data.dueDate))) {
            return res.json(error('Invalid due date format'));
          }
          updateData.dueDate = data.dueDate || null;
        }

        if (Object.keys(updateData).length === 0) {
          return res.json(error('No valid update data provided'));
        }

        const updated = await databases.updateDocument(
          DATABASE_ID,
          COLLECTIONS.TICKETS,
          ticketId,
          updateData
        );

        await databases.createDocument(
          DATABASE_ID,
          COLLECTIONS.ACTIVITY_LOG,
          generateId(),
          {
            projectId: ticket.projectId,
            ticketId,
            userId,
            action: ACTIVITY_ACTIONS.TICKET_UPDATED,
            details: JSON.stringify(sanitizeForJson(updateData)),
          }
        );

        log(`Ticket ${ticketId} updated by user ${userId}`);
        return res.json(success(updated));
      }

      case 'assign': {
        if (!hasPermission(role, 'canAssignTickets')) {
          return res.json(error('You do not have permission to assign tickets', 403));
        }

        // Validate assigneeId format if provided
        if (data?.assigneeId && (typeof data.assigneeId !== 'string' || !/^[a-zA-Z0-9_-]+$/.test(data.assigneeId))) {
          return res.json(error('Invalid assignee ID format'));
        }

        const updated = await databases.updateDocument(
          DATABASE_ID,
          COLLECTIONS.TICKETS,
          ticketId,
          { assigneeId: data?.assigneeId || null }
        );

        await databases.createDocument(
          DATABASE_ID,
          COLLECTIONS.ACTIVITY_LOG,
          generateId(),
          {
            projectId: ticket.projectId,
            ticketId,
            userId,
            action: ACTIVITY_ACTIONS.TICKET_ASSIGNED,
            details: JSON.stringify(sanitizeForJson({ assigneeId: data?.assigneeId || null })),
          }
        );

        log(`Ticket ${ticketId} assigned to ${data?.assigneeId || 'none'} by user ${userId}`);
        return res.json(success(updated));
      }

      case 'delete': {
        if (!hasPermission(role, 'canDeleteTickets')) {
          return res.json(error('You do not have permission to delete tickets', 403));
        }

        await databases.deleteDocument(DATABASE_ID, COLLECTIONS.TICKETS, ticketId);

        await databases.createDocument(
          DATABASE_ID,
          COLLECTIONS.ACTIVITY_LOG,
          generateId(),
          {
            projectId: ticket.projectId,
            userId,
            action: ACTIVITY_ACTIONS.TICKET_DELETED,
            details: JSON.stringify({ ticketNumber: ticket.ticketNumber }),
          }
        );

        log(`Ticket ${ticketId} deleted by user ${userId}`);
        return res.json(success({ deleted: true }));
      }

      default:
        return res.json(error('Invalid action'));
    }
  } catch (err) {
    logError(`Error managing ticket: ${err.message}`);
    return res.json(error('Failed to manage ticket', 500));
  }
}
