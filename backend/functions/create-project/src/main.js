import { Client, Databases, Users, Teams, ID, Query } from 'node-appwrite';

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
  TICKET_CREATED: 'ticket_created',
  TICKET_UPDATED: 'ticket_updated',
  TICKET_DELETED: 'ticket_deleted',
  TICKET_MOVED: 'ticket_moved',
  TICKET_ASSIGNED: 'ticket_assigned',
  COMMENT_ADDED: 'comment_added',
  COMMENT_DELETED: 'comment_deleted',
  MEMBER_ADDED: 'member_added',
  MEMBER_REMOVED: 'member_removed',
  MEMBER_ROLE_CHANGED: 'member_role_changed',
};

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
        return { _parseError: true };
      }
      return JSON.parse(req.body);
    }
    return req.body || {};
  } catch {
    return { _parseError: true };
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
    .replace(/'/g, '&#x27;');
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

// --- Validators ---
function validateProject(data) {
  const errors = [];

  if (!data.name || typeof data.name !== 'string') {
    errors.push('Project name is required');
  } else if (data.name.trim().length < 3 || data.name.trim().length > 100) {
    errors.push('Project name must be between 3 and 100 characters');
  }

  if (!data.key || typeof data.key !== 'string') {
    errors.push('Project key is required');
  } else if (!/^[A-Z]{2,5}$/.test(data.key.trim())) {
    errors.push('Project key must be 2-5 uppercase letters');
  }

  if (data.description && typeof data.description !== 'string') {
    errors.push('Description must be a string');
  } else if (data.description && data.description.length > 2000) {
    errors.push('Description must be less than 2000 characters');
  }

  // PROJ-08: Note - description max-length is now consistently 2000 across create and manage

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
  if (body._parseError) {
    return res.json(error('Invalid request body', 400));
  }
  const validation = validateProject(body);
  
  if (!validation.valid) {
    return res.json(error(validation.errors.join(', ')));
  }

  const { databases, teams } = createAdminClient();

  try {
    // Check for duplicate project key
    const existingProjects = await databases.listDocuments(
      DATABASE_ID, COLLECTIONS.PROJECTS,
      [Query.equal('key', body.key), Query.limit(1)]
    );
    if (existingProjects.total > 0) {
      return res.json(error('A project with this key already exists. Please choose a different key.', 400));
    }

    // Create team for the project
    const team = await teams.create(
      generateId(),
      body.name
    );

    // Add creator to team
    await teams.createMembership(
      team.$id,
      ['admin'],
      undefined,
      userId
    );

    // Create project document
    const project = await databases.createDocument(
      DATABASE_ID,
      COLLECTIONS.PROJECTS,
      generateId(),
      {
        name: body.name,
        description: body.description || '',
        key: body.key,
        ownerId: userId,
        teamId: team.$id,
        status: 'active',
      }
    );

    // Create project member entry
    await databases.createDocument(
      DATABASE_ID,
      COLLECTIONS.PROJECT_MEMBERS,
      generateId(),
      {
        projectId: project.$id,
        userId: userId,
        role: PROJECT_ROLES.ADMIN,
      }
    );

    // Log activity (sanitize data before storing)
    await databases.createDocument(
      DATABASE_ID,
      COLLECTIONS.ACTIVITY_LOG,
      generateId(),
      {
        projectId: project.$id,
        userId: userId,
        action: ACTIVITY_ACTIONS.PROJECT_CREATED,
        details: JSON.stringify(sanitizeForJson({ name: body.name })),
      }
    );

    log(`Project created: ${project.$id} by user ${userId}`);

    return res.json(success(project));
  } catch (err) {
    logError(`Error creating project: ${err.message}`);
    return res.json(error('Failed to create project', 500));
  }
}
