import { useState, useRef, useCallback, useEffect } from 'react';
import { Upload, X, FileText, Image, Loader2, Download } from 'lucide-react';
import { Button } from '@/components/common/Button';
import {
  uploadFile,
  deleteFile,
  getFile as getFileMeta,
  getPreviewUrl,
  getDownloadUrl,
  isImageFile,
  formatFileSize,
  validateFile,
  MAX_FILE_SIZE,
} from '@/services/storageService';
import toast from 'react-hot-toast';

interface FileUploadProps {
  /** Currently attached file IDs */
  attachments: string[];
  /** Callback when attachments change */
  onChange: (attachments: string[]) => void;
  /** Max number of files allowed */
  maxFiles?: number;
  /** Whether the user can modify attachments */
  disabled?: boolean;
  /** Compact mode for inline display (e.g., in ticket detail sidebar) */
  compact?: boolean;
}

interface FileInfo {
  id: string;
  name: string;
  mimeType: string;
  sizeOriginal: number;
}

export function FileUpload({
  attachments,
  onChange,
  maxFiles = 5,
  disabled = false,
  compact = false,
}: FileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [fileInfoMap, setFileInfoMap] = useState<Record<string, FileInfo>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      const fileArray = Array.from(files);

      // Check max files limit
      if (attachments.length + fileArray.length > maxFiles) {
        toast.error(`Maximum ${maxFiles} files allowed`);
        return;
      }

      // Validate all files first
      for (const file of fileArray) {
        const error = validateFile(file);
        if (error) {
          toast.error(error);
          return;
        }
      }

      setUploading(true);
      const newIds: string[] = [];

      for (const file of fileArray) {
        const result = await uploadFile(file);
        if (result.success && result.data) {
          newIds.push(result.data.id);
          setFileInfoMap((prev) => ({
            ...prev,
            [result.data!.id]: {
              id: result.data!.id,
              name: result.data!.name,
              mimeType: result.data!.mimeType,
              sizeOriginal: result.data!.sizeOriginal,
            },
          }));
        } else {
          toast.error(result.error || `Failed to upload ${file.name}`);
        }
      }

      if (newIds.length > 0) {
        onChange([...attachments, ...newIds]);
        toast.success(
          newIds.length === 1
            ? 'File uploaded successfully'
            : `${newIds.length} files uploaded successfully`
        );
      }

      setUploading(false);

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    [attachments, maxFiles, onChange]
  );

  const handleRemove = useCallback(
    async (fileId: string) => {
      const result = await deleteFile(fileId);
      if (result.success) {
        onChange(attachments.filter((id) => id !== fileId));
        setFileInfoMap((prev) => {
          const next = { ...prev };
          delete next[fileId];
          return next;
        });
        toast.success('File removed');
      } else {
        toast.error(result.error || 'Failed to remove file');
      }
    },
    [attachments, onChange]
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (!disabled) setDragOver(true);
    },
    [disabled]
  );

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      if (disabled) return;
      if (e.dataTransfer.files.length > 0) {
        handleFiles(e.dataTransfer.files);
      }
    },
    [disabled, handleFiles]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        handleFiles(e.target.files);
      }
    },
    [handleFiles]
  );

  const canUpload = !disabled && attachments.length < maxFiles;

  return (
    <div className="space-y-3">
      {/* Upload zone */}
      {canUpload && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`
            relative flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed
            transition-colors
            ${compact ? 'p-3' : 'p-6'}
            ${
              dragOver
                ? 'border-[--color-primary-500] bg-[--color-primary-600]/10'
                : 'border-[--color-border-primary] hover:border-[--color-border-secondary] hover:bg-[--color-bg-hover]'
            }
            ${uploading ? 'pointer-events-none opacity-60' : ''}
          `}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleInputChange}
            className="hidden"
            accept={undefined}
          />
          {uploading ? (
            <>
              <Loader2 className="h-6 w-6 animate-spin text-[--color-primary-500] mb-2" />
              <span className="text-sm text-[--color-text-muted]">Uploading...</span>
            </>
          ) : (
            <>
              <Upload className={`text-[--color-text-muted] mb-2 ${compact ? 'h-5 w-5' : 'h-8 w-8'}`} />
              {compact ? (
                <span className="text-xs text-[--color-text-muted]">
                  Drop files or click to upload
                </span>
              ) : (
                <>
                  <span className="text-sm font-medium text-[--color-text-secondary]">
                    Drop files here or click to upload
                  </span>
                  <span className="text-xs text-[--color-text-muted] mt-1">
                    Max {formatFileSize(MAX_FILE_SIZE)} per file · {maxFiles - attachments.length} remaining
                  </span>
                </>
              )}
            </>
          )}
        </div>
      )}

      {/* File list */}
      {attachments.length > 0 && (
        <div className="space-y-2">
          {attachments.map((fileId) => (
            <FileItem
              key={fileId}
              fileId={fileId}
              info={fileInfoMap[fileId]}
              onRemove={disabled ? undefined : () => handleRemove(fileId)}
              compact={compact}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// --- Read-only attachment display for ticket detail ---
interface AttachmentListProps {
  attachments: string[];
}

export function AttachmentList({ attachments }: AttachmentListProps) {
  if (!attachments || attachments.length === 0) return null;

  return (
    <div className="space-y-2">
      {attachments.map((fileId) => (
        <FileItem key={fileId} fileId={fileId} compact />
      ))}
    </div>
  );
}

// --- Single file row ---
interface FileItemProps {
  fileId: string;
  info?: FileInfo;
  onRemove?: () => void;
  compact?: boolean;
}

function FileItem({ fileId, info, onRemove, compact }: FileItemProps) {
  const [meta, setMeta] = useState<FileInfo | null>(info || null);
  const [loadingMeta, setLoadingMeta] = useState(!info);
  const [previewError, setPreviewError] = useState(false);

  // Load file metadata if not provided
  useEffect(() => {
    if (!info) {
      getFileMeta(fileId).then((result) => {
        if (result.success && result.data) {
          setMeta({
            id: result.data.id,
            name: result.data.name,
            mimeType: result.data.mimeType,
            sizeOriginal: result.data.sizeOriginal,
          });
        }
        setLoadingMeta(false);
      });
    }
  }, [fileId, info]);

  const isImage = meta && isImageFile(meta.mimeType);
  const previewUrl = isImage && !previewError ? getPreviewUrl(fileId, 80, 80) : null;
  const downloadUrl = getDownloadUrl(fileId);

  if (loadingMeta) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-[--color-border-primary] bg-[--color-bg-tertiary] p-2">
        <Loader2 className="h-4 w-4 animate-spin text-[--color-text-muted]" />
        <span className="text-xs text-[--color-text-muted]">Loading...</span>
      </div>
    );
  }

  return (
    <div
      className={`group flex items-center gap-3 rounded-lg border border-[--color-border-primary] bg-[--color-bg-tertiary] ${
        compact ? 'p-2' : 'p-3'
      } hover:bg-[--color-bg-hover] transition-colors`}
    >
      {/* Thumbnail / Icon */}
      {previewUrl ? (
        <img
          src={previewUrl}
          alt={meta?.name || 'attachment'}
          className="h-10 w-10 rounded object-cover"
          onError={() => setPreviewError(true)}
        />
      ) : (
        <div className="flex h-10 w-10 items-center justify-center rounded bg-[--color-bg-primary]">
          {isImage ? (
            <Image className="h-5 w-5 text-[--color-text-muted]" />
          ) : (
            <FileText className="h-5 w-5 text-[--color-text-muted]" />
          )}
        </div>
      )}

      {/* File info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[--color-text-primary] truncate">
          {meta?.name || fileId}
        </p>
        {meta && (
          <p className="text-xs text-[--color-text-muted]">
            {formatFileSize(meta.sizeOriginal)}
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0">
        <a
          href={downloadUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded p-1.5 text-[--color-text-muted] hover:bg-[--color-bg-primary] hover:text-[--color-text-primary] transition-colors"
          title="Download"
          onClick={(e) => e.stopPropagation()}
        >
          <Download className="h-4 w-4" />
        </a>
        {onRemove && (
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            className="text-red-400 hover:text-red-300 p-1.5"
            title="Remove"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
