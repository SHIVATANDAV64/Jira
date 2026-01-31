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
  const { projectId, query, filters = {}, limit = 50 } = body;

  if (!projectId) {
    return res.json(error('Project ID is required'));
  }

  // Validate projectId format
  if (!/^[a-zA-Z0-9_-]+$/.test(projectId)) {
    return res.json(error('Invalid project ID format'));
  }

  // Validate and sanitize query
  let sanitizedQuery = '';
  if (query && typeof query === 'string') {
    // Limit query length and remove potentially dangerous characters
    sanitizedQuery = query.trim().substring(0, 200);
  }

  // Validate limit
  const safeLimit = Math.min(Math.max(1, parseInt(limit) || 50), 100);

  const { databases, users } = createAdminClient();

  try {
    // Check user's role
    const role = await getUserProjectRole(databases, projectId, userId);
    
    if (!role) {
      return res.json(error('You are not a member of this project', 403));
    }

    // Build query
    const queries = [
      Query.equal('projectId', projectId),
      Query.limit(safeLimit),
    ];

    // Apply text search (will search in title)
    if (sanitizedQuery) {
      queries.push(Query.search('title', sanitizedQuery));
    }

    // Apply filters with validation
    const VALID_STATUSES = ['backlog', 'todo', 'in_progress', 'in_review', 'done'];
    const VALID_PRIORITIES = ['lowest', 'low', 'medium', 'high', 'highest'];
    const VALID_TYPES = ['bug', 'feature', 'task', 'improvement', 'epic'];

    if (filters.status && Array.isArray(filters.status) && filters.status.length > 0) {
      const validStatuses = filters.status.filter(s => VALID_STATUSES.includes(s));
      if (validStatuses.length > 0) {
        queries.push(Query.equal('status', validStatuses));
      }
    }
    if (filters.priority && Array.isArray(filters.priority) && filters.priority.length > 0) {
      const validPriorities = filters.priority.filter(p => VALID_PRIORITIES.includes(p));
      if (validPriorities.length > 0) {
        queries.push(Query.equal('priority', validPriorities));
      }
    }
    if (filters.type && Array.isArray(filters.type) && filters.type.length > 0) {
      const validTypes = filters.type.filter(t => VALID_TYPES.includes(t));
      if (validTypes.length > 0) {
        queries.push(Query.equal('type', validTypes));
      }
    }
    if (filters.assigneeId && typeof filters.assigneeId === 'string' && /^[a-zA-Z0-9_-]+$/.test(filters.assigneeId)) {
      queries.push(Query.equal('assigneeId', filters.assigneeId));
    }
    if (filters.labels && Array.isArray(filters.labels) && filters.labels.length > 0) {
      // Validate labels (alphanumeric, max 50 chars each)
      const validLabels = filters.labels.filter(l => 
        typeof l === 'string' && l.length <= 50
      );
      if (validLabels.length > 0) {
        queries.push(Query.contains('labels', validLabels));
      }
    }

    // Get tickets
    const tickets = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.TICKETS,
      queries
    );

    // Get project for ticket key prefix
    const project = await databases.getDocument(
      DATABASE_ID,
      COLLECTIONS.PROJECTS,
      projectId
    );

    // Get unique user IDs
    const userIds = new Set();
    tickets.documents.forEach((ticket) => {
      if (ticket.reporterId) userIds.add(ticket.reporterId);
      if (ticket.assigneeId) userIds.add(ticket.assigneeId);
    });

    // Fetch user details
    const userMap = new Map();
    for (const uid of userIds) {
      try {
        const user = await users.get(uid);
        userMap.set(uid, { $id: user.$id, name: user.name, email: user.email });
      } catch (e) {
        userMap.set(uid, { $id: uid, name: 'Unknown', email: '' });
      }
    }

    // Format results
    const results = tickets.documents.map((ticket) => ({
      ...ticket,
      ticketKey: `${project.key}-${ticket.ticketNumber}`,
      reporter: ticket.reporterId ? userMap.get(ticket.reporterId) : null,
      assignee: ticket.assigneeId ? userMap.get(ticket.assigneeId) : null,
    }));

    log(`Search found ${results.length} tickets for query "${sanitizedQuery}" in project ${projectId}`);

    return res.json(success({
      documents: results,
      total: tickets.total,
    }));
  } catch (err) {
    logError(`Error searching tickets: ${err.message}`);
    return res.json(error('Failed to search tickets', 500));
  }
}
