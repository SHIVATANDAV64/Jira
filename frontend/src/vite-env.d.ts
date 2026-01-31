/// <reference types="vite/client" />

interface ImportMetaEnv {
  // Appwrite Core Configuration
  readonly VITE_APPWRITE_ENDPOINT: string;
  readonly VITE_APPWRITE_PROJECT_ID: string;
  readonly VITE_APPWRITE_DATABASE_ID: string;

  // Collection IDs
  readonly VITE_COLLECTION_PROJECTS: string;
  readonly VITE_COLLECTION_PROJECT_MEMBERS: string;
  readonly VITE_COLLECTION_TICKETS: string;
  readonly VITE_COLLECTION_COMMENTS: string;
  readonly VITE_COLLECTION_ACTIVITY_LOGS: string;
  readonly VITE_COLLECTION_SPRINTS: string;
  readonly VITE_COLLECTION_NOTIFICATIONS: string;

  // Storage Bucket IDs
  readonly VITE_BUCKET_ATTACHMENTS: string;
  readonly VITE_BUCKET_AVATARS: string;

  // Function IDs
  readonly VITE_FUNCTION_CREATE_PROJECT: string;
  readonly VITE_FUNCTION_GET_PROJECTS: string;
  readonly VITE_FUNCTION_MANAGE_PROJECT: string;
  readonly VITE_FUNCTION_INVITE_MEMBER: string;
  readonly VITE_FUNCTION_MANAGE_MEMBER: string;
  readonly VITE_FUNCTION_CREATE_TICKET: string;
  readonly VITE_FUNCTION_GET_TICKETS: string;
  readonly VITE_FUNCTION_MANAGE_TICKET: string;
  readonly VITE_FUNCTION_MOVE_TICKET: string;
  readonly VITE_FUNCTION_MANAGE_COMMENTS: string;
  readonly VITE_FUNCTION_SEARCH_TICKETS: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
