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

const TICKET_STATUSES = {
  BACKLOG: 'backlog',
  TODO: 'todo',
  IN_PROGRESS: 'in_progress',
  IN_REVIEW: 'in_review',
  DONE: 'done',
};

const TICKET_TYPES = {
  BUG: 'bug',
  FEATURE: 'feature',
  TASK: 'task',
  IMPROVEMENT: 'improvement',
};

const TICKET_PRIORITIES = {
  CRITICAL: 'critical',
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
};

const ACTIVITY_ACTIONS = {
  TICKET_CREATED: 'ticket_created',
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

// --- Validators ---
function validateTicket(data) {
  const errors = [];

  if (!data.title || typeof data.title !== 'string') {
    errors.push('Ticket title is required');
  } else if (data.title.trim().length < 5 || data.title.trim().length > 200) {
    errors.push('Ticket title must be between 5 and 200 characters');
  }

  if (!data.projectId || typeof data.projectId !== 'string') {
    errors.push('Project ID is required');
  } else if (!/^[a-zA-Z0-9_-]+$/.test(data.projectId)) {
    errors.push('Invalid Project ID format');
  }

  if (!data.type || !Object.values(TICKET_TYPES).includes(data.type)) {
    errors.push(`Invalid ticket type. Must be one of: ${Object.values(TICKET_TYPES).join(', ')}`);
  }

  if (!data.priority || !Object.values(TICKET_PRIORITIES).includes(data.priority)) {
    errors.push(`Invalid priority. Must be one of: ${Object.values(TICKET_PRIORITIES).join(', ')}`);
  }

  if (data.description && typeof data.description !== 'string') {
    errors.push('Description must be a string');
  } else if (data.description && data.description.length > 10000) {
    errors.push('Description must be less than 10000 characters');
  }

  if (data.labels && !Array.isArray(data.labels)) {
    errors.push('Labels must be an array');
  } else if (data.labels && data.labels.some(l => typeof l !== 'string' || l.length > 50)) {
    errors.push('Each label must be a string with max 50 characters');
  }

  if (data.dueDate && isNaN(Date.parse(data.dueDate))) {
    errors.push('Invalid due date format');
  }

  if (data.assigneeId && (typeof data.assigneeId !== 'string' || !/^[a-zA-Z0-9_-]+$/.test(data.assigneeId))) {
    errors.push('Invalid assignee ID format');
  }

  return { valid: errors.length === 0, errors };
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
  const validation = validateTicket(body);
  
  if (!validation.valid) {
    return res.json(error(validation.errors.join(', ')));
  }

  const { databases } = createAdminClient();

  try {
    // Check user's role in the project
    const role = await getUserProjectRole(databases, body.projectId, userId);
    
    if (!role) {
      return res.json(error('You are not a member of this project', 403));
    }

    if (!hasPermission(role, 'canCreateTickets')) {
      return res.json(error('You do not have permission to create tickets', 403));
    }

    // Get project to generate ticket number
    const project = await databases.getDocument(
      DATABASE_ID,
      COLLECTIONS.PROJECTS,
      body.projectId
    );

    // Get next ticket number
    const existingTickets = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.TICKETS,
      [
        Query.equal('projectId', body.projectId),
        Query.orderDesc('ticketNumber'),
        Query.limit(1),
      ]
    );

    const nextTicketNumber = existingTickets.documents.length > 0
      ? existingTickets.documents[0].ticketNumber + 1
      : 1;

    // Get max order for the initial status column
    const ticketsInStatus = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.TICKETS,
      [
        Query.equal('projectId', body.projectId),
        Query.equal('status', TICKET_STATUSES.TODO),
        Query.orderDesc('order'),
        Query.limit(1),
      ]
    );

    const nextOrder = ticketsInStatus.documents.length > 0
      ? ticketsInStatus.documents[0].order + 1
      : 0;

    // Create ticket
    const ticket = await databases.createDocument(
      DATABASE_ID,
      COLLECTIONS.TICKETS,
      generateId(),
      {
        projectId: body.projectId,
        ticketNumber: nextTicketNumber,
        title: body.title,
        description: body.description || '',
        type: body.type,
        status: TICKET_STATUSES.TODO,
        priority: body.priority,
        reporterId: userId,
        assigneeId: body.assigneeId || null,
        labels: body.labels || [],
        dueDate: body.dueDate || null,
        order: nextOrder,
      }
    );

    // Log activity (sanitize data before storing)
    await databases.createDocument(
      DATABASE_ID,
      COLLECTIONS.ACTIVITY_LOG,
      generateId(),
      {
        projectId: body.projectId,
        ticketId: ticket.$id,
        userId: userId,
        action: ACTIVITY_ACTIONS.TICKET_CREATED,
        details: JSON.stringify(sanitizeForJson({
          title: body.title,
          ticketKey: `${project.key}-${nextTicketNumber}`,
        })),
      }
    );

    log(`Ticket created: ${project.key}-${nextTicketNumber} by user ${userId}`);

    return res.json(success({
      ...ticket,
      ticketKey: `${project.key}-${nextTicketNumber}`,
    }));
  } catch (err) {
    logError(`Error creating ticket: ${err.message}`);
    return res.json(error('Failed to create ticket', 500));
  }
}
