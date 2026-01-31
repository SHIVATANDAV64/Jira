import { Client, Databases, ID, Query } from 'node-appwrite';

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

const TICKET_STATUSES = {
  BACKLOG: 'backlog',
  TODO: 'todo',
  IN_PROGRESS: 'in_progress',
  IN_REVIEW: 'in_review',
  DONE: 'done',
};

const ACTIVITY_ACTIONS = {
  TICKET_MOVED: 'ticket_moved',
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

function validateTicketStatus(status) {
  return Object.values(TICKET_STATUSES).includes(status);
}

// --- Security Utilities ---
function sanitizeForJson(obj) {
  if (typeof obj === 'string') {
    return obj
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }
  if (typeof obj !== 'object' || obj === null) return obj;
  if (Array.isArray(obj)) return obj.map(sanitizeForJson);
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    result[key] = sanitizeForJson(value);
  }
  return result;
}

function validateOrder(order) {
  if (typeof order !== 'number') return false;
  if (!Number.isFinite(order)) return false;
  if (order < 0 || order > 1000000) return false;
  return true;
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
  const { ticketId, newStatus, newOrder } = body;

  if (!ticketId || typeof ticketId !== 'string') {
    return res.json(error('Valid ticket ID is required'));
  }

  if (!newStatus) {
    return res.json(error('New status is required'));
  }

  if (!validateTicketStatus(newStatus)) {
    return res.json(error('Invalid ticket status'));
  }

  // Validate newOrder if provided
  if (newOrder !== undefined && !validateOrder(newOrder)) {
    return res.json(error('Invalid order value'));
  }

  const { databases } = createAdminClient();

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

    if (!hasPermission(role, 'canMoveTickets')) {
      return res.json(error('You do not have permission to move tickets', 403));
    }

    const oldStatus = ticket.status;
    const updateData = { status: newStatus };

    // Update order if provided
    if (typeof newOrder === 'number') {
      updateData.order = newOrder;
    }

    // Update ticket
    const updated = await databases.updateDocument(
      DATABASE_ID,
      COLLECTIONS.TICKETS,
      ticketId,
      updateData
    );

    // Log activity if status changed (sanitize data)
    if (oldStatus !== newStatus) {
      await databases.createDocument(
        DATABASE_ID,
        COLLECTIONS.ACTIVITY_LOG,
        generateId(),
        {
          projectId: ticket.projectId,
          ticketId: ticketId,
          userId: userId,
          action: ACTIVITY_ACTIONS.TICKET_MOVED,
          details: JSON.stringify(sanitizeForJson({
            from: oldStatus,
            to: newStatus,
          })),
        }
      );
    }

    log(`Ticket ${ticketId} moved from ${oldStatus} to ${newStatus} by user ${userId}`);

    return res.json(success(updated));
  } catch (err) {
    logError(`Error moving ticket: ${err.message}`);
    return res.json(error('Failed to move ticket', 500));
  }
}
