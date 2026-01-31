import { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Plus, Settings, Users, Loader2, AlertCircle, List } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { KanbanBoard } from '@/components/kanban/KanbanBoard';
import { CreateTicketModal } from '@/components/tickets/CreateTicketModal';
import { FilterBar } from '@/components/kanban/FilterBar';
import { useProject } from '@/hooks/useProjects';
import { useTickets, useCreateTicket, useMoveTicket } from '@/hooks/useTickets';
import { useProjectMembers } from '@/hooks/useProjectMembers';
import type { CreateTicketForm, TicketStatus, TicketFilters, Ticket } from '@/types';

export function ProjectDetail() {
  const { projectId } = useParams<{ projectId: string }>();
  const { project, isLoading: projectLoading, error: projectError } = useProject(projectId);
  const { tickets, isLoading: ticketsLoading } = useTickets(projectId);
  const createTicketMutation = useCreateTicket(projectId);
  const moveTicketMutation = useMoveTicket(projectId);
  const { members } = useProjectMembers(projectId);
  
  const [showCreateTicket, setShowCreateTicket] = useState(false);
  const [filters, setFilters] = useState<TicketFilters>({});

  const isLoading = projectLoading || ticketsLoading;

  // Filter tickets based on active filters
  const filteredTickets = useMemo(() => {
    return tickets.filter((ticket: Ticket) => {
      // Search filter - check title and description
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matchesSearch =
          ticket.title.toLowerCase().includes(searchLower) ||
          ticket.description.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }

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
  }, [tickets, filters]);

  const handleCreateTicket = async (data: CreateTicketForm) => {
    createTicketMutation.mutate(data, {
      onSuccess: () => {
        setShowCreateTicket(false);
      },
    });
  };

  const handleTicketMove = async (ticketId: string, newStatus: TicketStatus, newOrder: number) => {
    moveTicketMutation.mutate({ ticketId, newStatus, newOrder });
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
          <Button
            variant="ghost"
            size="sm"
            leftIcon={<Users className="h-4 w-4" />}
          >
            Team ({members.length})
          </Button>
          <Link to={`/projects/${projectId}/settings`}>
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<Settings className="h-4 w-4" />}
            >
              Settings
            </Button>
          </Link>
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
          <Button
            size="sm"
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={() => setShowCreateTicket(true)}
          >
            Create Ticket
          </Button>
        </div>
      </div>

      {/* Kanban Board */}
      <KanbanBoard
        tickets={filteredTickets}
        projectKey={project.key}
        onTicketMove={handleTicketMove}
      />

      {/* Create Ticket Modal */}
      <CreateTicketModal
        isOpen={showCreateTicket}
        onClose={() => setShowCreateTicket(false)}
        onSubmit={handleCreateTicket}
        members={members}
        projectKey={project.key}
        isSubmitting={createTicketMutation.isPending}
      />
    </div>
  );
}
