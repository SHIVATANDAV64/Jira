import { useState, useMemo, useEffect } from 'react';
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Settings, Users, Loader2, AlertCircle, List, FolderKanban, Trash2 } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { Modal } from '@/components/common/Modal';
import { KanbanBoard } from '@/components/kanban/KanbanBoard';
import { CreateTicketModal } from '@/components/tickets/CreateTicketModal';
import { FilterBar } from '@/components/kanban/FilterBar';
import { useProject, useDeleteProject } from '@/hooks/useProjects';
import { useTickets, useCreateTicket, useMoveTicket, useSearchTicketsQuery } from '@/hooks/useTickets';
import { useProjectMembers } from '@/hooks/useProjectMembers';
import { usePermissions } from '@/hooks/usePermissions';
import type { CreateTicketForm, TicketStatus, TicketFilters, Ticket } from '@/types';

export function ProjectDetail() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { project, isLoading: projectLoading, error: projectError } = useProject(projectId);
  const { tickets, isLoading: ticketsLoading, error: ticketsError } = useTickets(projectId);
  
  // Initialize filters from URL params
  const [filters, setFilters] = useState<TicketFilters>(() => {
    const search = searchParams.get('search') || undefined;
    const status = searchParams.get('status') ? searchParams.get('status')!.split(',') : undefined;
    const priority = searchParams.get('priority') ? searchParams.get('priority')!.split(',') : undefined;
    const type = searchParams.get('type') ? searchParams.get('type')!.split(',') : undefined;
    const assigneeId = searchParams.get('assigneeId') || undefined;
    const labels = searchParams.get('labels') ? searchParams.get('labels')!.split(',') : undefined;
    
    return {
      search,
      status: status as any,
      priority: priority as any,
      type: type as any,
      assigneeId,
      labels,
    };
  });

  // TKT-29: Wire up server-side search when search query is present
  const { data: searchResults = [], isLoading: searchLoading } = useSearchTicketsQuery(
    projectId,
    filters.search || '',
    filters
  );
  
  const createTicketMutation = useCreateTicket(projectId);
  const moveTicketMutation = useMoveTicket(projectId);
  const deleteProjectMutation = useDeleteProject();
  const { members } = useProjectMembers(projectId);
  const { permissions } = usePermissions(members);
  
  const [showCreateTicket, setShowCreateTicket] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Sync filters to URL params whenever they change
  useEffect(() => {
    const newParams = new URLSearchParams();
    
    if (filters.search) newParams.set('search', filters.search);
    if (filters.status && filters.status.length > 0) newParams.set('status', filters.status.join(','));
    if (filters.priority && filters.priority.length > 0) newParams.set('priority', filters.priority.join(','));
    if (filters.type && filters.type.length > 0) newParams.set('type', filters.type.join(','));
    if (filters.assigneeId) newParams.set('assigneeId', filters.assigneeId);
    if (filters.labels && filters.labels.length > 0) newParams.set('labels', filters.labels.join(','));
    
    setSearchParams(newParams, { replace: true });
  }, [filters, setSearchParams]);

  const hasActiveFilters = useMemo(() => {
    return !!(
      filters.search ||
      (filters.status && filters.status.length > 0) ||
      (filters.priority && filters.priority.length > 0) ||
      (filters.type && filters.type.length > 0) ||
      filters.assigneeId ||
      (filters.labels && filters.labels.length > 0)
    );
  }, [filters]);

  const isLoading = projectLoading || ticketsLoading || (filters.search ? searchLoading : false);

  // TKT-29: Use server-side search results when search query is present, otherwise use all tickets
  const ticketsToFilter = useMemo(() => {
    if (filters.search) {
      return searchResults;
    }
    return tickets;
  }, [filters.search, searchResults, tickets]);

  // Filter tickets based on active filters (server search already applied if search query present)
  const filteredTickets = useMemo(() => {
    return ticketsToFilter.filter((ticket: Ticket) => {
      // Status filter
      if (filters.status && filters.status.length > 0) {
        if (!filters.status.includes(ticket.status)) return false;
      }

      // Priority filter
      if (filters.priority && filters.priority.length > 0) {
        if (!filters.priority.includes(ticket.priority)) return false;
      }

      // Type filter
      if (filters.type && filters.type.length > 0) {
        if (!filters.type.includes(ticket.type)) return false;
      }

      // Assignee filter
      if (filters.assigneeId) {
        if (filters.assigneeId === 'unassigned') {
          if (ticket.assigneeId) return false;
        } else {
          if (ticket.assigneeId !== filters.assigneeId) return false;
        }
      }

      // Labels filter
      if (filters.labels && filters.labels.length > 0) {
        const ticketLabels = ticket.labels || [];
        const hasMatchingLabel = filters.labels.some((label) =>
          ticketLabels.includes(label)
        );
        if (!hasMatchingLabel) return false;
      }

      return true;
    });
  }, [ticketsToFilter, filters]);

  const handleCreateTicket = async (data: CreateTicketForm) => {
    try {
      await createTicketMutation.mutateAsync(data);
      setShowCreateTicket(false);
    } catch (error) {
      // Error handling is delegated to the mutation's onError callback
      console.error('Failed to create ticket:', error);
    }
  };

  const handleTicketMove = async (ticketId: string, newStatus: TicketStatus, newOrder: number) => {
    moveTicketMutation.mutate({ ticketId, newStatus, newOrder });
  };

  const handleDeleteProject = async () => {
    if (!projectId) return;
    try {
      await deleteProjectMutation.mutateAsync(projectId);
      setShowDeleteConfirm(false);
      // Navigate away after successful deletion
      navigate('/projects');
    } catch (error) {
      // Error is handled by the mutation's onError callback
      console.error('Failed to delete project:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-[--color-primary-500]" />
      </div>
    );
  }

  if (projectError) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
        <h2 className="text-xl font-semibold text-[--color-text-primary] mb-2">
          Failed to load project
        </h2>
        <p className="text-[--color-text-secondary]">{projectError}</p>
        <Link to="/projects">
          <Button variant="secondary" className="mt-4">
            Back to Projects
          </Button>
        </Link>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-16">
        <h2 className="text-xl font-semibold text-[--color-text-primary]">
          Project not found
        </h2>
        <p className="mt-2 text-[--color-text-secondary]">
          The project you're looking for doesn't exist or you don't have access.
        </p>
        <Link to="/projects">
          <Button variant="secondary" className="mt-4">
            Back to Projects
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[--color-primary-600]/20 text-[--color-primary-400] font-bold text-lg">
            {project.key}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[--color-text-primary]">
              {project.name}
            </h1>
            <p className="text-[--color-text-secondary]">
              {project.description}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link to={`/projects/${projectId}/backlog`}>
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<List className="h-4 w-4" />}
            >
              Backlog
            </Button>
          </Link>
          <Link to={`/team`}>
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<Users className="h-4 w-4" />}
            >
              Team ({members.length})
            </Button>
          </Link>
          {permissions.canEditProject && (
            <Link to={`/projects/${projectId}/settings`}>
              <Button
                variant="ghost"
                size="sm"
                leftIcon={<Settings className="h-4 w-4" />}
              >
                Settings
              </Button>
            </Link>
          )}
          {permissions.canDeleteProject && (
            <Button
              variant="ghost"
              size="sm"
              className="text-red-400 hover:text-red-300"
              leftIcon={<Trash2 className="h-4 w-4" />}
              onClick={() => setShowDeleteConfirm(true)}
            >
              Delete
            </Button>
          )}
        </div>
      </div>

      {/* Toolbar with FilterBar */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1">
          <FilterBar
            filters={filters}
            onFiltersChange={setFilters}
            members={members}
          />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-sm text-[--color-text-muted]">
            {filteredTickets.length} of {tickets.length} ticket{tickets.length !== 1 ? 's' : ''}
          </span>
          {permissions.canCreateTickets && (
            <Button
              size="sm"
              leftIcon={<Plus className="h-4 w-4" />}
              onClick={() => setShowCreateTicket(true)}
            >
              Create Ticket
            </Button>
          )}
        </div>
      </div>

      {/* Ticket Loading Error */}
      {ticketsError && (
        <div className="flex flex-col items-center justify-center py-12 text-center rounded-xl border border-red-500/30 bg-red-500/5 p-6">
          <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
          <h2 className="text-lg font-semibold text-[--color-text-primary] mb-2">
            Failed to load tickets
          </h2>
          <p className="text-[--color-text-secondary]">{ticketsError}</p>
        </div>
      )}

      {/* Empty State */}
      {!ticketsError && tickets.length === 0 && !ticketsLoading && (
        <div className="flex flex-col items-center justify-center py-16 text-center rounded-xl border border-[--color-border-primary] bg-[--color-bg-secondary] p-6">
          <FolderKanban className="h-16 w-16 text-[--color-text-muted] mb-4" />
          <h2 className="text-xl font-semibold text-[--color-text-primary] mb-2">
            No tickets yet
          </h2>
          <p className="text-[--color-text-secondary] mb-6 max-w-md">
            Start by creating your first ticket to begin tracking work in this project.
          </p>
          {permissions.canCreateTickets && (
            <Button
              leftIcon={<Plus className="h-4 w-4" />}
              onClick={() => setShowCreateTicket(true)}
            >
              Create First Ticket
            </Button>
          )}
        </div>
      )}

      {/* Kanban Board */}
      {tickets.length > 0 && !ticketsError && (
        <KanbanBoard
          tickets={filteredTickets}
          projectKey={project.key}
          onTicketMove={handleTicketMove}
          members={members}
          hasActiveFilters={hasActiveFilters}
        />
      )}

      {/* Create Ticket Modal */}
      {permissions.canCreateTickets && (
        <CreateTicketModal
          isOpen={showCreateTicket}
          onClose={() => setShowCreateTicket(false)}
          onSubmit={handleCreateTicket}
          members={members}
          projectKey={project.key}
          isSubmitting={createTicketMutation.isPending}
        />
      )}

      {/* Delete Project Confirmation Modal */}
      <Modal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        title="Delete Project"
      >
        <div className="space-y-4">
          <p className="text-[--color-text-secondary]">
            Are you sure you want to permanently delete this project? This action cannot be undone.
            All tickets, comments, and files will be deleted.
          </p>
          <div className="flex justify-end gap-3">
            <Button
              variant="secondary"
              onClick={() => setShowDeleteConfirm(false)}
            >
              Cancel
            </Button>
            <Button
              variant="ghost"
              className="text-red-400 hover:text-red-300"
              onClick={handleDeleteProject}
              isLoading={deleteProjectMutation.isPending}
            >
              Delete Project
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
