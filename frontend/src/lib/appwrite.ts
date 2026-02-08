import { Client, Account, Databases, Storage, Teams, Functions } from 'appwrite';

// Appwrite configuration
const APPWRITE_ENDPOINT = import.meta.env.VITE_APPWRITE_ENDPOINT;
const APPWRITE_PROJECT_ID = import.meta.env.VITE_APPWRITE_PROJECT_ID;

if (!APPWRITE_ENDPOINT || !APPWRITE_PROJECT_ID) {
  throw new Error('Required application configuration is missing. Please check your setup.');
}

// Initialize Appwrite client
const client = new Client();

client
  .setEndpoint(APPWRITE_ENDPOINT)
  .setProject(APPWRITE_PROJECT_ID);

// Export Appwrite services
export const account = new Account(client);
export const databases = new Databases(client);
export const storage = new Storage(client);
export const teams = new Teams(client);
export const functions = new Functions(client);

// Export client for realtime subscriptions
export { client };

// Database IDs
export const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;

// Collection IDs
export const COLLECTIONS = {
  PROJECTS: import.meta.env.VITE_COLLECTION_PROJECTS,
  PROJECT_MEMBERS: import.meta.env.VITE_COLLECTION_PROJECT_MEMBERS,
  TICKETS: import.meta.env.VITE_COLLECTION_TICKETS,
  COMMENTS: import.meta.env.VITE_COLLECTION_COMMENTS,
  ACTIVITY_LOG: import.meta.env.VITE_COLLECTION_ACTIVITY_LOGS,
  SPRINTS: import.meta.env.VITE_COLLECTION_SPRINTS,
  NOTIFICATIONS: import.meta.env.VITE_COLLECTION_NOTIFICATIONS,
} as const;

// Storage Bucket IDs
export const BUCKETS = {
  ATTACHMENTS: import.meta.env.VITE_BUCKET_ATTACHMENTS,
  AVATARS: import.meta.env.VITE_BUCKET_AVATARS,
} as const;

// Function IDs
export const FUNCTIONS_IDS = {
  CREATE_PROJECT: import.meta.env.VITE_FUNCTION_CREATE_PROJECT,
  GET_PROJECTS: import.meta.env.VITE_FUNCTION_GET_PROJECTS,
  MANAGE_PROJECT: import.meta.env.VITE_FUNCTION_MANAGE_PROJECT,
  INVITE_MEMBER: import.meta.env.VITE_FUNCTION_INVITE_MEMBER,
  MANAGE_MEMBER: import.meta.env.VITE_FUNCTION_MANAGE_MEMBER,
  CREATE_TICKET: import.meta.env.VITE_FUNCTION_CREATE_TICKET,
  GET_TICKETS: import.meta.env.VITE_FUNCTION_GET_TICKETS,
  MANAGE_TICKET: import.meta.env.VITE_FUNCTION_MANAGE_TICKET,
  MOVE_TICKET: import.meta.env.VITE_FUNCTION_MOVE_TICKET,
  MANAGE_COMMENTS: import.meta.env.VITE_FUNCTION_MANAGE_COMMENTS,
  SEARCH_TICKETS: import.meta.env.VITE_FUNCTION_SEARCH_TICKETS,
} as const;

// Helper to get avatar URL
export function getAvatarUrl(_userId: string, name: string, avatarId?: string): string {
  if (avatarId) {
    return `${APPWRITE_ENDPOINT}/storage/buckets/${BUCKETS.AVATARS}/files/${avatarId}/preview?project=${APPWRITE_PROJECT_ID}`;
  }
  return `${APPWRITE_ENDPOINT}/avatars/initials?name=${encodeURIComponent(name)}&project=${APPWRITE_PROJECT_ID}`;
}

// Helper to get file preview URL
export function getFilePreviewUrl(bucketId: string, fileId: string): string {
  return `${APPWRITE_ENDPOINT}/storage/buckets/${encodeURIComponent(bucketId)}/files/${encodeURIComponent(fileId)}/preview?project=${encodeURIComponent(APPWRITE_PROJECT_ID)}`;
}

// Helper to get file download URL
export function getFileDownloadUrl(bucketId: string, fileId: string): string {
  return `${APPWRITE_ENDPOINT}/storage/buckets/${encodeURIComponent(bucketId)}/files/${encodeURIComponent(fileId)}/download?project=${encodeURIComponent(APPWRITE_PROJECT_ID)}`;
}
