import { Client, Databases, Query } from 'node-appwrite';

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
  };
}

function success(data) {
  return { success: true, data };
}

function error(message, code = 400) {
  return { success: false, error: message, code };
}

function getUserId(req) {
  return req.headers['x-appwrite-user-id'] || null;
}

// ============================================================================
// MAIN FUNCTION
// ============================================================================

export default async function main({ req, res, log, error: logError }) {
  const userId = getUserId(req);
  
  if (!userId) {
    return res.json(error('Unauthorized', 401));
  }

  const { databases } = createAdminClient();

  try {
    // Get all project memberships for the user
    const memberships = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.PROJECT_MEMBERS,
      [Query.equal('userId', userId)]
    );

    if (memberships.documents.length === 0) {
      return res.json(success({ documents: [], total: 0 }));
    }

    // Get project IDs
    const projectIds = memberships.documents.map((m) => m.projectId);

    // Get projects
    const projects = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.PROJECTS,
      [
        Query.equal('$id', projectIds),
        Query.equal('status', 'active'),
        Query.orderDesc('$createdAt'),
      ]
    );

    // Add user's role to each project
    const projectsWithRole = projects.documents.map((project) => {
      const membership = memberships.documents.find(
        (m) => m.projectId === project.$id
      );
      return {
        ...project,
        userRole: membership?.role || null,
      };
    });

    log(`Fetched ${projectsWithRole.length} projects for user ${userId}`);

    return res.json(success({
      documents: projectsWithRole,
      total: projectsWithRole.length,
    }));
  } catch (err) {
    logError(`Error fetching projects: ${err.message}`);
    return res.json(error('Failed to fetch projects', 500));
  }
}
