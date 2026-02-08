import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { SprintBoard } from '@/components/sprints/SprintBoard';
import { useProject } from '@/hooks/useProjects';
import { useTickets } from '@/hooks/useTickets';

export function BacklogPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { project, isLoading: projectLoading, error: projectError } = useProject(projectId);
  const { tickets, isLoading: ticketsLoading } = useTickets(projectId);

  const isLoading = projectLoading || ticketsLoading;

  const handleTicketClick = (ticketId: string) => {
    navigate(`/projects/${projectId}/tickets/${ticketId}`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--color-primary-500)]" />
      </div>
    );
  }

  if (projectError) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
        <h2 className="text-xl font-semibold text-[var(--color-text-primary)] mb-2">
          Failed to load project
        </h2>
        <p className="text-[var(--color-text-secondary)]">{projectError}</p>
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
        <h2 className="text-xl font-semibold text-[var(--color-text-primary)]">
          Project not found
        </h2>
        <p className="mt-2 text-[var(--color-text-secondary)]">
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
      <div className="flex items-center gap-4">
        <Link to={`/projects/${projectId}`}>
          <Button variant="ghost" size="sm" leftIcon={<ArrowLeft className="h-4 w-4" />}>
            Back to Board
          </Button>
        </Link>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--color-primary-100)] text-[var(--color-primary-600)] font-bold text-sm">
            {project.key}
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--color-text-primary)]">
              {project.name} - Backlog
            </h1>
            <p className="text-sm text-[var(--color-text-secondary)]">
              Manage sprints and backlog items
            </p>
          </div>
        </div>
      </div>

      {/* Sprint Board */}
      <SprintBoard
        projectId={projectId!}
        tickets={tickets}
        onTicketClick={handleTicketClick}
      />
    </div>
  );
}
