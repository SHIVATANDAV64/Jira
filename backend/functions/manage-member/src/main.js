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
  MEMBER_REMOVED: 'member_removed',
  MEMBER_ROLE_CHANGED: 'member_role_changed',
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

async function isProjectOwner(databases, projectId, userId) {
  try {
    const project = await databases.getDocument(
      DATABASE_ID,
      COLLECTIONS.PROJECTS,
      projectId
    );
    return project.ownerId === userId;
  } catch (err) {
    console.error('Error checking project owner:', err);
    return false;
  }
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
  const { action, projectId, memberId, data } = body;

  if (!projectId) {
    return res.json(error('Project ID is required'));
  }

  // Validate projectId format
  if (!/^[a-zA-Z0-9_-]+$/.test(projectId)) {
    return res.json(error('Invalid project ID format'));
  }

  const { databases, users, teams } = createAdminClient();

  try {
    // Check user's role
    const role = await getUserProjectRole(databases, projectId, userId);
    
    if (!role) {
      return res.json(error('You are not a member of this project', 403));
    }

    switch (action) {
      case 'list': {
        // TEAM-06: Add Query.limit(500) and pagination loop for large teams
        const allMembers = [];
        let offset = 0;
        let hasMore = true;

        while (hasMore) {
          const batch = await databases.listDocuments(
            DATABASE_ID,
            COLLECTIONS.PROJECT_MEMBERS,
            [Query.equal('projectId', projectId), Query.limit(500), Query.offset(offset)]
          );
          allMembers.push(...batch.documents);
          hasMore = batch.documents.length === 500;
          offset += 500;
        }

        const members = { documents: allMembers, total: allMembers.length };

        // Get user info for each member
        const membersWithUsers = await Promise.all(
          members.documents.map(async (member) => {
            let user = null;
            try {
              const userDoc = await users.get(member.userId);
              user = { 
                $id: userDoc.$id, 
                name: userDoc.name, 
                email: userDoc.email,
                prefs: userDoc.prefs 
              };
            } catch (e) {
              user = { $id: member.userId, name: 'Unknown', email: '', prefs: {} };
            }
            return { ...member, user };
          })
        );

        return res.json(success({ documents: membersWithUsers, total: members.total }));
      }

      case 'updateRole': {
        if (!memberId) {
          return res.json(error('Member ID is required'));
        }

        // Validate memberId format
        if (!/^[a-zA-Z0-9_-]+$/.test(memberId)) {
          return res.json(error('Invalid member ID format'));
        }

        if (!hasPermission(role, 'canManageMembers')) {
          return res.json(error('You do not have permission to manage members', 403));
        }

        if (!data?.role || !validateProjectRole(data.role)) {
          return res.json(error('Valid role is required'));
        }

        // Get member
        const member = await databases.getDocument(
          DATABASE_ID,
          COLLECTIONS.PROJECT_MEMBERS,
          memberId
        );

        // Prevent self-role-change
        if (member.userId === userId) {
          return res.json(error('You cannot change your own role', 400));
        }

        // Can't change owner's role
        const ownerCheck = await isProjectOwner(databases, projectId, member.userId);
        if (ownerCheck) {
          return res.json(error('Cannot change project owner\'s role', 403));
        }

        // Can't promote to higher role than yourself (except admin)
        const roleHierarchy = [PROJECT_ROLES.VIEWER, PROJECT_ROLES.DEVELOPER, PROJECT_ROLES.MANAGER, PROJECT_ROLES.ADMIN];
        const currentRoleIndex = roleHierarchy.indexOf(role);
        const newRoleIndex = roleHierarchy.indexOf(data.role);

        // Prevent demoting/changing role of members with same or higher rank
        const targetCurrentRoleIndex = roleHierarchy.indexOf(member.role);
        if (targetCurrentRoleIndex >= currentRoleIndex) {
          return res.json(error('You cannot change the role of a member with equal or higher rank', 403));
        }

        if (newRoleIndex > currentRoleIndex && role !== PROJECT_ROLES.ADMIN) {
          return res.json(error('You cannot promote someone to a higher role than yours', 403));
        }

        const updated = await databases.updateDocument(
          DATABASE_ID,
          COLLECTIONS.PROJECT_MEMBERS,
          memberId,
          { role: data.role }
        );

        await databases.createDocument(
          DATABASE_ID,
          COLLECTIONS.ACTIVITY_LOG,
          generateId(),
          {
            projectId,
            userId,
            action: ACTIVITY_ACTIONS.MEMBER_ROLE_CHANGED,
            details: JSON.stringify(sanitizeForJson({ memberId, newRole: data.role })),
          }
        );

        log(`Member ${memberId} role changed to ${data.role} by user ${userId}`);
        return res.json(success(updated));
      }

      case 'remove': {
        if (!memberId) {
          return res.json(error('Member ID is required'));
        }

        // Validate memberId format
        if (!/^[a-zA-Z0-9_-]+$/.test(memberId)) {
          return res.json(error('Invalid member ID format'));
        }

        if (!hasPermission(role, 'canManageMembers')) {
          return res.json(error('You do not have permission to manage members', 403));
        }

        // Get member
        const member = await databases.getDocument(
          DATABASE_ID,
          COLLECTIONS.PROJECT_MEMBERS,
          memberId
        );

        // Can't remove owner
        const ownerCheck = await isProjectOwner(databases, projectId, member.userId);
        if (ownerCheck) {
          return res.json(error('Cannot remove project owner', 403));
        }

        // TEAM-04: Add rank hierarchy check - only allow removal if caller's rank is higher than target's rank
        const roleHierarchy = [PROJECT_ROLES.VIEWER, PROJECT_ROLES.DEVELOPER, PROJECT_ROLES.MANAGER, PROJECT_ROLES.ADMIN];
        const callerRankForRemove = roleHierarchy.indexOf(role);
        const targetRankForRemove = roleHierarchy.indexOf(member.role);
        if (callerRankForRemove <= targetRankForRemove) {
          return res.json(error('You cannot remove a member with equal or higher rank', 403));
        }

        // Get project
        const project = await databases.getDocument(
          DATABASE_ID,
          COLLECTIONS.PROJECTS,
          projectId
        );

        // Remove from team
        try {
          const memberships = await teams.listMemberships(project.teamId);
          const membership = memberships.memberships.find((m) => m.userId === member.userId);
          if (membership) {
            await teams.deleteMembership(project.teamId, membership.$id);
          }
        } catch (e) {
          log(`Could not remove from team: ${e.message}`);
        }

        // Delete member document
        await databases.deleteDocument(DATABASE_ID, COLLECTIONS.PROJECT_MEMBERS, memberId);

        await databases.createDocument(
          DATABASE_ID,
          COLLECTIONS.ACTIVITY_LOG,
          generateId(),
          {
            projectId,
            userId,
            action: ACTIVITY_ACTIONS.MEMBER_REMOVED,
            details: JSON.stringify(sanitizeForJson({ removedUserId: member.userId })),
          }
        );

        log(`Member ${memberId} removed from project ${projectId} by user ${userId}`);
        return res.json(success({ deleted: true }));
      }

      case 'leave': {
        // User leaving the project themselves
        const ownMembership = await databases.listDocuments(
          DATABASE_ID,
          COLLECTIONS.PROJECT_MEMBERS,
          [
            Query.equal('projectId', projectId),
            Query.equal('userId', userId),
          ]
        );

        if (ownMembership.documents.length === 0) {
          return res.json(error('You are not a member of this project', 403));
        }

        // Owner can't leave without transferring ownership
        const ownerCheck = await isProjectOwner(databases, projectId, userId);
        if (ownerCheck) {
          return res.json(error('Project owner cannot leave. Transfer ownership first or delete the project.', 403));
        }

        const memberDoc = ownMembership.documents[0];

        // Get project
        const project = await databases.getDocument(
          DATABASE_ID,
          COLLECTIONS.PROJECTS,
          projectId
        );

        // Remove from team
        try {
          const memberships = await teams.listMemberships(project.teamId);
          const membership = memberships.memberships.find((m) => m.userId === userId);
          if (membership) {
            await teams.deleteMembership(project.teamId, membership.$id);
          }
        } catch (e) {
          log(`Could not remove from team: ${e.message}`);
        }

        // Delete member document
        await databases.deleteDocument(DATABASE_ID, COLLECTIONS.PROJECT_MEMBERS, memberDoc.$id);

        log(`User ${userId} left project ${projectId}`);
        return res.json(success({ deleted: true }));
      }

      default:
        return res.json(error('Invalid action'));
    }
  } catch (err) {
    logError(`Error managing member: ${err.message}`);
    return res.json(error('Failed to manage member', 500));
  }
}
