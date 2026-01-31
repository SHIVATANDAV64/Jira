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
  COMMENT_ADDED: 'comment_added',
  COMMENT_DELETED: 'comment_deleted',
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
function validateComment(data) {
  const errors = [];

  if (!data.ticketId || typeof data.ticketId !== 'string') {
    errors.push('Ticket ID is required');
  } else if (!/^[a-zA-Z0-9_-]+$/.test(data.ticketId)) {
    errors.push('Invalid ticket ID format');
  }

  if (!data.content || typeof data.content !== 'string') {
    errors.push('Comment content is required');
  } else if (data.content.trim().length < 1 || data.content.length > 5000) {
    errors.push('Comment must be between 1 and 5000 characters');
  }

  return { valid: errors.length === 0, errors };
}

function validateUpdateContent(content) {
  if (!content || typeof content !== 'string') {
    return { valid: false, error: 'Comment content is required' };
  }
  if (content.trim().length < 1 || content.length > 5000) {
    return { valid: false, error: 'Comment must be between 1 and 5000 characters' };
  }
  return { valid: true };
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
  const { action, ticketId, commentId, data } = body;

  const { databases, users } = createAdminClient();

  try {
    switch (action) {
      case 'list': {
        if (!ticketId) {
          return res.json(error('Ticket ID is required'));
        }

        // Validate ticketId format
        if (!/^[a-zA-Z0-9_-]+$/.test(ticketId)) {
          return res.json(error('Invalid ticket ID format'));
        }

        // Get the ticket to check project membership
        const ticket = await databases.getDocument(
          DATABASE_ID,
          COLLECTIONS.TICKETS,
          ticketId
        );

        const role = await getUserProjectRole(databases, ticket.projectId, userId);
        if (!role) {
          return res.json(error('You are not a member of this project', 403));
        }

        // Get comments
        const comments = await databases.listDocuments(
          DATABASE_ID,
          COLLECTIONS.COMMENTS,
          [
            Query.equal('ticketId', ticketId),
            Query.orderAsc('$createdAt'),
          ]
        );

        // Get user info for each comment
        const userIds = new Set(comments.documents.map((c) => c.userId));
        const userMap = new Map();
        for (const uid of userIds) {
          try {
            const user = await users.get(uid);
            userMap.set(uid, { $id: user.$id, name: user.name, email: user.email });
          } catch (e) {
            userMap.set(uid, { $id: uid, name: 'Unknown', email: '' });
          }
        }

        const commentsWithUsers = comments.documents.map((comment) => ({
          ...comment,
          user: userMap.get(comment.userId),
        }));

        return res.json(success({ documents: commentsWithUsers, total: comments.total }));
      }

      case 'create': {
        const validation = validateComment({ ticketId, content: data?.content });
        if (!validation.valid) {
          return res.json(error(validation.errors.join(', ')));
        }

        // Get the ticket to check project membership
        const ticket = await databases.getDocument(
          DATABASE_ID,
          COLLECTIONS.TICKETS,
          ticketId
        );

        const role = await getUserProjectRole(databases, ticket.projectId, userId);
        if (!role) {
          return res.json(error('You are not a member of this project', 403));
        }

        if (!hasPermission(role, 'canComment')) {
          return res.json(error('You do not have permission to comment', 403));
        }

        const comment = await databases.createDocument(
          DATABASE_ID,
          COLLECTIONS.COMMENTS,
          generateId(),
          {
            ticketId,
            userId,
            content: data.content,
            parentId: data.parentId || null,
          }
        );

        // Log activity
        await databases.createDocument(
          DATABASE_ID,
          COLLECTIONS.ACTIVITY_LOG,
          generateId(),
          {
            projectId: ticket.projectId,
            ticketId,
            userId,
            action: ACTIVITY_ACTIONS.COMMENT_ADDED,
            details: JSON.stringify(sanitizeForJson({ commentId: comment.$id })),
          }
        );

        // Get user info
        let user = null;
        try {
          const userDoc = await users.get(userId);
          user = { $id: userDoc.$id, name: userDoc.name, email: userDoc.email };
        } catch (e) {
          user = { $id: userId, name: 'Unknown', email: '' };
        }

        log(`Comment added to ticket ${ticketId} by user ${userId}`);
        return res.json(success({ ...comment, user }));
      }

      case 'update': {
        if (!commentId) {
          return res.json(error('Comment ID is required'));
        }

        // Validate commentId format
        if (!/^[a-zA-Z0-9_-]+$/.test(commentId)) {
          return res.json(error('Invalid comment ID format'));
        }

        // Validate update content
        const contentValidation = validateUpdateContent(data?.content);
        if (!contentValidation.valid) {
          return res.json(error(contentValidation.error));
        }

        const comment = await databases.getDocument(
          DATABASE_ID,
          COLLECTIONS.COMMENTS,
          commentId
        );

        // Only the author can edit their comment
        if (comment.userId !== userId) {
          return res.json(error('You can only edit your own comments', 403));
        }

        const updated = await databases.updateDocument(
          DATABASE_ID,
          COLLECTIONS.COMMENTS,
          commentId,
          { content: data.content }
        );

        log(`Comment ${commentId} updated by user ${userId}`);
        return res.json(success(updated));
      }

      case 'delete': {
        if (!commentId) {
          return res.json(error('Comment ID is required'));
        }

        // Validate commentId format
        if (!/^[a-zA-Z0-9_-]+$/.test(commentId)) {
          return res.json(error('Invalid comment ID format'));
        }

        const comment = await databases.getDocument(
          DATABASE_ID,
          COLLECTIONS.COMMENTS,
          commentId
        );

        const ticket = await databases.getDocument(
          DATABASE_ID,
          COLLECTIONS.TICKETS,
          comment.ticketId
        );

        const role = await getUserProjectRole(databases, ticket.projectId, userId);

        // Allow deletion if user is author or has delete ticket permission
        if (comment.userId !== userId && !hasPermission(role, 'canDeleteTickets')) {
          return res.json(error('You do not have permission to delete this comment', 403));
        }

        await databases.deleteDocument(DATABASE_ID, COLLECTIONS.COMMENTS, commentId);

        await databases.createDocument(
          DATABASE_ID,
          COLLECTIONS.ACTIVITY_LOG,
          generateId(),
          {
            projectId: ticket.projectId,
            ticketId: comment.ticketId,
            userId,
            action: ACTIVITY_ACTIONS.COMMENT_DELETED,
            details: JSON.stringify(sanitizeForJson({ commentId })),
          }
        );

        log(`Comment ${commentId} deleted by user ${userId}`);
        return res.json(success({ deleted: true }));
      }

      default:
        return res.json(error('Invalid action'));
    }
  } catch (err) {
    logError(`Error managing comments: ${err.message}`);
    return res.json(error('Failed to manage comments', 500));
  }
}
