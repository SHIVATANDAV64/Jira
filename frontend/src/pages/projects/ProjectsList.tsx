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
        <Loader2 className="h-8 w-8 animate-spin text-[--color-primary-500]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
        <h2 className="text-xl font-semibold text-[--color-text-primary] mb-2">
          Failed to load projects
        </h2>
        <p className="text-[--color-text-secondary]">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[--color-text-primary]">
            Projects
          </h1>
          <p className="mt-1 text-[--color-text-secondary]">
            Manage and track all your projects
          </p>
        </div>
        <Link to="/projects/new">
          <Button leftIcon={<Plus className="h-4 w-4" />}>
            New Project
          </Button>
        </Link>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[--color-text-muted]" />
        <Input
          type="text"
          placeholder="Search projects..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Projects grid */}
      {filteredProjects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <FolderKanban className="h-16 w-16 text-[--color-text-muted] mb-4" />
          <h2 className="text-xl font-semibold text-[--color-text-primary] mb-2">
            {searchQuery ? 'No projects found' : 'No projects yet'}
          </h2>
          <p className="text-[--color-text-secondary] mb-6 max-w-md">
            {searchQuery
              ? 'Try a different search term'
              : 'Create your first project to start tracking bugs and issues with your team.'}
          </p>
          {!searchQuery && (
            <Link to="/projects/new">
              <Button leftIcon={<Plus className="h-4 w-4" />}>
                Create your first project
              </Button>
            </Link>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredProjects.map((project) => (
            <div
              key={project.$id}
              className="group relative cursor-pointer rounded-xl border border-[--color-border-primary] bg-[--color-bg-secondary] p-6 transition-colors hover:border-[--color-primary-500]"
            >
              <Link to={`/projects/${project.$id}`} className="block">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[--color-primary-100] text-[--color-primary-600] font-bold text-sm">
                      {project.key}
                    </div>
                    <div>
                      <h3 className="font-semibold text-[--color-text-primary] group-hover:text-[--color-primary-600]">
                        {project.name}
                      </h3>
                      <p className="text-sm text-[--color-text-muted]">
                        {project.key}
                      </p>
                    </div>
                  </div>
                </div>
                {project.description && (
                  <p className="mt-3 text-sm text-[--color-text-secondary] line-clamp-2">
                    {project.description}
                  </p>
                )}
                <div className="mt-4 flex items-center gap-4 text-sm text-[--color-text-muted]">
                  <span className={project.status === 'archived' ? 'text-yellow-500' : ''}>
                    {project.status === 'archived' ? 'Archived' : 'Active'}
                  </span>
                </div>
              </Link>

              {/* Menu button */}
              <div className="absolute top-6 right-6">
                <button
                  className="cursor-pointer rounded p-1 text-[--color-text-muted] hover:bg-[--color-bg-hover]"
                  onClick={(e) => {
                    e.preventDefault();
                    setOpenMenuId(openMenuId === project.$id ? null : project.$id);
                  }}
                >
                  <MoreVertical className="h-4 w-4" />
                </button>

                {/* Dropdown menu */}
                {openMenuId === project.$id && (
                  <div className="absolute right-0 top-8 z-10 w-48 rounded-lg border border-[--color-border-primary] bg-[--color-bg-secondary] py-1 shadow-lg">
                    {permissions.canEditProject && (
                      <button
                        className="flex w-full cursor-pointer items-center gap-2 px-4 py-2 text-sm text-[--color-text-secondary] hover:bg-[--color-bg-hover] disabled:opacity-50"
                        onClick={() => handleArchive(project.$id, project.status === 'archived')}
                        disabled={archiveMutation.isPending || restoreMutation.isPending}
                      >
                        <Archive className="h-4 w-4" />
                        {project.status === 'archived' ? 'Restore' : 'Archive'}
                      </button>
                    )}
                    {permissions.canDeleteProject && (
                      <button
                        className="flex w-full cursor-pointer items-center gap-2 px-4 py-2 text-sm text-red-400 hover:bg-[--color-bg-hover] disabled:opacity-50"
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
          <p className="text-[--color-text-secondary]">
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
