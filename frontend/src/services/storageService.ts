import { storage, BUCKETS } from '@/lib/appwrite';
import { ID, Permission, Role } from 'appwrite';
import type { ApiResponse } from '@/types';

// Max file size: 10MB
export const MAX_FILE_SIZE = 10 * 1024 * 1024;

// Allowed MIME types
export const ALLOWED_FILE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'application/pdf',
  'text/plain',
  'text/csv',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/zip',
  'application/json',
  'video/mp4',
  'video/quicktime',
];

export interface UploadedFile {
  id: string;
  name: string;
  mimeType: string;
  sizeOriginal: number;
}

/**
 * Validate a file before upload
 */
export function validateFile(file: File): string | null {
  if (file.size > MAX_FILE_SIZE) {
    return `File "${file.name}" exceeds the 10MB size limit`;
  }
  if (!ALLOWED_FILE_TYPES.includes(file.type)) {
    return `File type "${file.type || 'unknown'}" is not supported`;
  }
  return null;
}

/**
 * Upload a file to Appwrite Storage
 * Uses the Appwrite SDK v21+ named parameter syntax
 */
export async function uploadFile(file: File): Promise<ApiResponse<UploadedFile>> {
  try {
    const validationError = validateFile(file);
    if (validationError) {
      return { success: false, error: validationError };
    }

    const result = await storage.createFile(
      BUCKETS.ATTACHMENTS,
      ID.unique(),
      file,
      [
        Permission.read(Role.any()),
        Permission.write(Role.users()),
        Permission.delete(Role.users()),
      ]
    );

    return {
      success: true,
      data: {
        id: result.$id,
        name: result.name,
        mimeType: result.mimeType,
        sizeOriginal: result.sizeOriginal,
      },
    };
  } catch (error) {
    console.error('Error uploading file:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to upload file',
    };
  }
}

/**
 * Upload multiple files
 */
export async function uploadFiles(files: File[]): Promise<ApiResponse<UploadedFile[]>> {
  const uploaded: UploadedFile[] = [];
  const errors: string[] = [];

  for (const file of files) {
    const result = await uploadFile(file);
    if (result.success && result.data) {
      uploaded.push(result.data);
    } else {
      errors.push(result.error || `Failed to upload ${file.name}`);
    }
  }

  if (errors.length > 0 && uploaded.length === 0) {
    return { success: false, error: errors.join('; ') };
  }

  return { success: true, data: uploaded };
}

/**
 * Delete a file from Appwrite Storage
 */
export async function deleteFile(fileId: string): Promise<ApiResponse<void>> {
  try {
    await storage.deleteFile({
      bucketId: BUCKETS.ATTACHMENTS,
      fileId,
    });
    return { success: true };
  } catch (error) {
    console.error('Error deleting file:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete file',
    };
  }
}

/**
 * Get file metadata
 */
export async function getFile(fileId: string): Promise<ApiResponse<UploadedFile>> {
  try {
    const result = await storage.getFile({
      bucketId: BUCKETS.ATTACHMENTS,
      fileId,
    });

    return {
      success: true,
      data: {
        id: result.$id,
        name: result.name,
        mimeType: result.mimeType,
        sizeOriginal: result.sizeOriginal,
      },
    };
  } catch (error) {
    console.error('Error getting file:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get file',
    };
  }
}

/**
 * Get file preview URL (for images)
 */
export function getPreviewUrl(fileId: string, width = 200, height = 200): string {
  const url = storage.getFilePreview({
    bucketId: BUCKETS.ATTACHMENTS,
    fileId,
    width,
    height,
  });
  return url.toString();
}

/**
 * Get file download URL
 */
export function getDownloadUrl(fileId: string): string {
  const url = storage.getFileDownload({
    bucketId: BUCKETS.ATTACHMENTS,
    fileId,
  });
  return url.toString();
}

/**
 * Get file view URL (inline display)
 */
export function getViewUrl(fileId: string): string {
  const url = storage.getFileView({
    bucketId: BUCKETS.ATTACHMENTS,
    fileId,
  });
  return url.toString();
}

/**
 * Check if a file is an image based on MIME type
 */
export function isImageFile(mimeType: string): boolean {
  return mimeType.startsWith('image/');
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}
