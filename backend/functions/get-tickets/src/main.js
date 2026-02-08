import { Client, Databases, Users, Query } from 'node-appwrite';

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
  if (body._parseError) {
    return res.json(error('Invalid request body', 400));
  }
  const { projectId, filters = {} } = body;

  if (!projectId) {
    return res.json(error('Project ID is required'));
  }

  // Validate projectId format
  if (!/^[a-zA-Z0-9_-]+$/.test(projectId)) {
    return res.json(error('Invalid project ID format'));
  }

  // Validate limit and offset
  const safeLimit = Math.min(Math.max(1, parseInt(limit) || 100), 500);
  const safeOffset = Math.max(0, parseInt(offset) || 0);

  const { databases, users } = createAdminClient();

  try {
    // Check user's role in the project
    const role = await getUserProjectRole(databases, projectId, userId);
    
    if (!role) {
      return res.json(error('You are not a member of this project', 403));
    }



    // TKT-01: Get ALL tickets with pagination loop (not just first 100)
    const allTickets = [];
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
      const paginatedQueries = [
        Query.equal('projectId', projectId),
        Query.limit(500),
        Query.offset(offset),
        Query.orderAsc('order'),
      ];

      // Apply the same filters
      const VALID_STATUSES = ['backlog', 'todo', 'in_progress', 'in_review', 'done'];
      const VALID_PRIORITIES = ['critical', 'high', 'medium', 'low'];
      const VALID_TYPES = ['bug', 'feature', 'task', 'improvement'];

      if (filters.status && Array.isArray(filters.status) && filters.status.length > 0) {
        const validStatuses = filters.status.filter(s => VALID_STATUSES.includes(s));
        if (validStatuses.length > 0) {
          paginatedQueries.push(Query.equal('status', validStatuses));
        }
      }
      if (filters.priority && Array.isArray(filters.priority) && filters.priority.length > 0) {
        const validPriorities = filters.priority.filter(p => VALID_PRIORITIES.includes(p));
        if (validPriorities.length > 0) {
          paginatedQueries.push(Query.equal('priority', validPriorities));
        }
      }
      if (filters.type && Array.isArray(filters.type) && filters.type.length > 0) {
        const validTypes = filters.type.filter(t => VALID_TYPES.includes(t));
        if (validTypes.length > 0) {
          paginatedQueries.push(Query.equal('type', validTypes));
        }
      }
      if (filters.assigneeId && typeof filters.assigneeId === 'string' && /^[a-zA-Z0-9_-]+$/.test(filters.assigneeId)) {
        paginatedQueries.push(Query.equal('assigneeId', filters.assigneeId));
      }
      if (filters.reporterId && typeof filters.reporterId === 'string' && /^[a-zA-Z0-9_-]+$/.test(filters.reporterId)) {
        paginatedQueries.push(Query.equal('reporterId', filters.reporterId));
      }

      const batch = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.TICKETS,
        paginatedQueries
      );

      allTickets.push(...batch.documents);
      hasMore = batch.documents.length === 500;
      offset += 500;
    }

    const tickets = { documents: allTickets, total: allTickets.length };

    // Get unique user IDs from tickets
    const userIds = new Set();
    tickets.documents.forEach((ticket) => {
      if (ticket.reporterId) userIds.add(ticket.reporterId);
      if (ticket.assigneeId) userIds.add(ticket.assigneeId);
    });

    // Fetch user details in parallel
    const userMap = new Map();
    const uniqueUserIds = [...userIds];
    const userResults = await Promise.all(
      uniqueUserIds.map(uid => users.get(uid).catch(() => null))
    );
    uniqueUserIds.forEach((uid, i) => {
      if (userResults[i]) {
        userMap.set(uid, {
          $id: userResults[i].$id,
          name: userResults[i].name,
          email: userResults[i].email,
        });
      } else {
        userMap.set(uid, { $id: uid, name: 'Unknown', email: '' });
      }
    });

    // Attach user data to tickets
    const ticketsWithUsers = tickets.documents.map((ticket) => ({
      ...ticket,
      reporter: ticket.reporterId ? userMap.get(ticket.reporterId) : null,
      assignee: ticket.assigneeId ? userMap.get(ticket.assigneeId) : null,
    }));

    log(`Fetched ${ticketsWithUsers.length} tickets for project ${projectId}`);

    return res.json(success({
      documents: ticketsWithUsers,
      total: tickets.total,
    }));
  } catch (err) {
    logError(`Error fetching tickets: ${err.message}`);
    return res.json(error('Failed to fetch tickets', 500));
  }
}
