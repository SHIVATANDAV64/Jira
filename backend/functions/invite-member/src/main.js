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
  MEMBER_ADDED: 'member_added',
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
function sanitizeForJson(obj) {
  const sanitizeString = (str) => {
    if (typeof str !== 'string') return str;
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');
  };

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

// --- Validators ---
function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function validateProjectRole(role) {
  return Object.values(PROJECT_ROLES).includes(role);
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
  const { projectId, email, role } = body;

  if (!projectId) {
    return res.json(error('Project ID is required'));
  }

  // Validate projectId format
  if (!/^[a-zA-Z0-9_-]+$/.test(projectId)) {
    return res.json(error('Invalid project ID format'));
  }

  if (!email || !validateEmail(email)) {
    return res.json(error('Valid email is required'));
  }

  if (!role || !validateProjectRole(role)) {
    return res.json(error('Valid role is required'));
  }

  const { databases, users, teams } = createAdminClient();

  try {
    // Check inviter's role
    const inviterRole = await getUserProjectRole(databases, projectId, userId);
    
    if (!inviterRole) {
      return res.json(error('You are not a member of this project', 403));
    }

    if (!hasPermission(inviterRole, 'canManageMembers')) {
      return res.json(error('You do not have permission to invite members', 403));
    }

    // Can't invite with a higher role than yourself (except admin)
    const roleHierarchy = [PROJECT_ROLES.VIEWER, PROJECT_ROLES.DEVELOPER, PROJECT_ROLES.MANAGER, PROJECT_ROLES.ADMIN];
    const inviterRoleIndex = roleHierarchy.indexOf(inviterRole);
    const inviteeRoleIndex = roleHierarchy.indexOf(role);

    if (inviteeRoleIndex > inviterRoleIndex && inviterRole !== PROJECT_ROLES.ADMIN) {
      return res.json(error('You cannot invite someone with a higher role than yours', 403));
    }

    // Find user by email
    let inviteeId = null;
    let invitee = null;
    try {
      const usersList = await users.list([Query.equal('email', email)]);
      if (usersList.users.length > 0) {
        invitee = usersList.users[0];
        inviteeId = invitee.$id;
      }
    } catch (e) {
      log(`Could not find user by email: ${e.message}`);
    }

    if (!inviteeId) {
      return res.json(error('User not found. They must register first.', 404));
    }

    // TEAM-02: Check for self-invite BEFORE the membership lookup
    if (inviteeId === userId) {
      return res.json(error('You cannot invite yourself to the project', 400));
    }

    // Check if already a member
    const existingMember = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.PROJECT_MEMBERS,
      [
        Query.equal('projectId', projectId),
        Query.equal('userId', inviteeId),
      ]
    );

    if (existingMember.documents.length > 0) {
      return res.json(error('User is already a member of this project'));
    }

    // Get project
    const project = await databases.getDocument(
      DATABASE_ID,
      COLLECTIONS.PROJECTS,
      projectId
    );

    // Add to team
    try {
      await teams.createMembership(
        project.teamId,
        [role],
        undefined,
        inviteeId
      );
    } catch (e) {
      log(`Could not add to team: ${e.message}`);
    }

    // Create project member entry
    const member = await databases.createDocument(
      DATABASE_ID,
      COLLECTIONS.PROJECT_MEMBERS,
      generateId(),
      {
        projectId,
        userId: inviteeId,
        userEmail: email,
        userName: invitee.name || email,
        joinedAt: new Date().toISOString(),
        role,
      }
    );

    // Log activity
    await databases.createDocument(
      DATABASE_ID,
      COLLECTIONS.ACTIVITY_LOG,
      generateId(),
      {
        projectId,
        userId,
        action: ACTIVITY_ACTIONS.MEMBER_ADDED,
        details: JSON.stringify(sanitizeForJson({ inviteeId, role })),
      }
    );

    log(`User ${inviteeId} invited to project ${projectId} with role ${role} by user ${userId}`);

    return res.json(success(member));
  } catch (err) {
    logError(`Error inviting member: ${err.message}`);
    return res.json(error('Failed to invite member', 500));
  }
}
