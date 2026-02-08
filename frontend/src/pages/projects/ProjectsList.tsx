import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, FolderKanban, Search, MoreVertical, Archive, Trash2, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { Modal } from '@/components/common/Modal';
import { useProjects, useArchiveProject, useRestoreProject, useDeleteProject, usePermissions } from '@/hooks';

export function ProjectsList() {
  const { projects, isLoading, error } = useProjects();
  const archiveMutation = useArchiveProject();
  const restoreMutation = useRestoreProject();
  const deleteMutation = useDeleteProject();
  const { permissions } = usePermissions([]);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const filteredProjects = projects.filter((project) =>
    project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    project.key.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleArchive = async (projectId: string, isArchived: boolean) => {
    if (isArchived) {
      restoreMutation.mutate(projectId);
    } else {
      archiveMutation.mutate(projectId);
    }
    setOpenMenuId(null);
  };

  const handleDelete = async (projectId: string) => {
    deleteMutation.mutate(projectId);
    setDeleteConfirmId(null);
    setOpenMenuId(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--color-primary-500)]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
        <h2 className="text-xl font-semibold text-[var(--color-text-primary)] mb-2">
          Failed to load projects
        </h2>
        <p className="text-[var(--color-text-secondary)]">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-[var(--color-text-primary)]">
          Projects
        </h1>
        <Link to="/projects/new">
          <Button size="sm" leftIcon={<Plus className="h-4 w-4" />}>
            Create project
          </Button>
        </Link>
      </div>

      {/* Search */}
      <div className="relative max-w-xs">
        <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-muted)]" />
        <Input
          type="text"
          placeholder="Search projects..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-8"
        />
      </div>

      {/* Projects grid */}
      {filteredProjects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <FolderKanban className="h-10 w-10 text-[var(--color-text-muted)] mb-3" />
          <h2 className="text-base font-medium text-[var(--color-text-primary)] mb-1">
            {searchQuery ? 'No projects found' : 'No projects yet'}
          </h2>
          <p className="text-sm text-[var(--color-text-muted)] mb-4 max-w-sm">
            {searchQuery
              ? 'Try a different search term'
              : 'Create a project to get started.'}
          </p>
          {!searchQuery && (
            <Link to="/projects/new">
              <Button size="sm" leftIcon={<Plus className="h-4 w-4" />}>
                Create project
              </Button>
            </Link>
          )}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filteredProjects.map((project) => (
            <div
              key={project.$id}
              className="group relative rounded-lg border border-[var(--color-border-primary)] bg-[var(--color-bg-secondary)] p-4 hover:border-[var(--color-border-secondary)] transition-colors"
            >
              <Link to={`/projects/${project.$id}`} className="block">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] font-semibold text-xs">
                      {project.key}
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-[var(--color-text-primary)]">
                        {project.name}
                      </h3>
                      <p className="text-xs text-[var(--color-text-muted)]">
                        {project.key}
                      </p>
                    </div>
                  </div>
                </div>
                {project.description && (
                  <p className="mt-2 text-xs text-[var(--color-text-secondary)] line-clamp-2">
                    {project.description}
                  </p>
                )}
                <div className="mt-3 text-xs text-[var(--color-text-muted)]">
                  <span className={project.status === 'archived' ? 'text-amber-600' : 'text-green-700'}>
                    {project.status === 'archived' ? 'Archived' : 'Active'}
                  </span>
                </div>
              </Link>

              {/* Menu button */}
              <div className="absolute top-4 right-4">
                <button
                  className="cursor-pointer rounded p-1 text-[var(--color-text-muted)] hover:bg-[var(--color-bg-hover)]"
                  onClick={(e) => {
                    e.preventDefault();
                    setOpenMenuId(openMenuId === project.$id ? null : project.$id);
                  }}
                >
                  <MoreVertical className="h-4 w-4" />
                </button>

                {openMenuId === project.$id && (
                  <div className="absolute right-0 top-7 z-10 w-40 rounded-md border border-[var(--color-border-primary)] bg-[var(--color-bg-secondary)] py-1 shadow-lg">
                    {permissions.canEditProject && (
                      <button
                        className="flex w-full cursor-pointer items-center gap-2 px-3 py-1.5 text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)] disabled:opacity-50"
                        onClick={() => handleArchive(project.$id, project.status === 'archived')}
                        disabled={archiveMutation.isPending || restoreMutation.isPending}
                      >
                        <Archive className="h-4 w-4" />
                        {project.status === 'archived' ? 'Restore' : 'Archive'}
                      </button>
                    )}
                    {permissions.canDeleteProject && (
                      <button
                        className="flex w-full cursor-pointer items-center gap-2 px-3 py-1.5 text-sm text-red-600 hover:bg-[var(--color-bg-hover)] disabled:opacity-50"
                        onClick={() => setDeleteConfirmId(project.$id)}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Click outside to close menu */}
      {openMenuId && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setOpenMenuId(null)}
        />
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteConfirmId}
        onClose={() => setDeleteConfirmId(null)}
        title="Delete Project"
      >
        <div className="space-y-4">
          <p className="text-[var(--color-text-secondary)]">
            Are you sure you want to permanently delete this project? This action cannot be undone.
          </p>
          <div className="flex justify-end gap-3">
            <Button
              variant="secondary"
              onClick={() => setDeleteConfirmId(null)}
            >
              Cancel
            </Button>
            <Button
              variant="ghost"
              className="text-red-400 hover:text-red-300"
              onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
              isLoading={deleteMutation.isPending}
            >
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
