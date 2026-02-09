import { Link } from 'react-router-dom';
import {
  FolderKanban,
  Ticket as TicketIcon,
  Users,
  TrendingUp,
  Plus,
  ArrowRight,
  CheckCircle,
  Timer,
  Target,
  Calendar,
  AlertTriangle,
  Zap,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/common/Button';
import { useProjects } from '@/hooks/useProjects';
import { useRecentActivity } from '@/hooks/useActivity';
import { ActivityLog } from '@/components/activity/ActivityLog';
import type { Project, Sprint, Ticket } from '@/types';
import { useMemo } from 'react';
import { useQueries } from '@tanstack/react-query';
import * as ticketService from '@/services/ticketService';
import * as sprintService from '@/services/sprintService';
import { differenceInDays, differenceInHours, format } from 'date-fns';

// Skeleton components for loading states
function ProjectCardSkeleton() {
  return (
    <div className="flex items-center gap-3 p-3">
      <div className="skeleton h-10 w-10 rounded-lg" />
      <div className="flex-1 space-y-2">
        <div className="skeleton h-4 w-32 rounded" />
        <div className="skeleton h-3 w-16 rounded" />
      </div>
    </div>
  );
}

function TicketCardSkeleton() {
  return (
    <div className="flex items-center gap-3 p-3">
      <div className="skeleton h-8 w-8 rounded-lg" />
      <div className="flex-1 space-y-2">
        <div className="skeleton h-4 w-48 rounded" />
        <div className="skeleton h-3 w-24 rounded" />
      </div>
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: string;
  isLoading?: boolean;
}

function StatCard({ title, value, icon, trend, isLoading }: StatCardProps) {
  return (
    <div className="rounded-lg border border-[var(--color-border-primary)] bg-[var(--color-bg-secondary)] p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)]">{title}</p>
          {isLoading ? (
            <div className="mt-1.5">
              <div className="skeleton h-7 w-12 rounded" />
            </div>
          ) : (
            <p className="mt-1 text-2xl font-semibold text-[var(--color-text-primary)]">
              {value}
            </p>
          )}
          {trend && !isLoading && (
            <p className="mt-1 flex items-center gap-1 text-xs text-green-700">
              <TrendingUp className="h-3 w-3" />
              {trend}
            </p>
          )}
        </div>
        <div className="rounded-md bg-[var(--color-bg-tertiary)] p-2.5 text-[var(--color-text-muted)]">
          {icon}
        </div>
      </div>
    </div>
  );
}

interface ProjectCardProps {
  project: Project;
}

function ProjectCard({ project }: ProjectCardProps) {
  return (
    <Link
      to={`/projects/${project.$id}`}
      className="flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-[var(--color-bg-hover)] transition-colors"
    >
      <div className="flex h-8 w-8 items-center justify-center rounded bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] font-semibold text-xs">
        {project.key}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">
          {project.name}
        </p>
        <p className="text-xs text-[var(--color-text-muted)]">
          {project.status === 'archived' ? 'Archived' : 'Active'}
        </p>
      </div>
    </Link>
  );
}

interface AssignedTicketCardProps {
  ticket: {
    $id: string;
    title: string;
    projectId: string;
    priority: string;
    status: string;
  };
  projects: Project[];
}

function AssignedTicketCard({ ticket, projects }: AssignedTicketCardProps) {
  const project = projects.find((p) => p.$id === ticket.projectId);
  
  const priorityColors: Record<string, string> = {
    critical: 'bg-red-100 text-red-800',
    high: 'bg-orange-100 text-orange-800',
    medium: 'bg-amber-100 text-amber-800',
    low: 'bg-blue-100 text-blue-800',
  };

  return (
    <Link
      to={`/tickets/${ticket.$id}`}
      className="flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-[var(--color-bg-hover)] transition-colors"
    >
      <div className={`flex h-6 w-6 items-center justify-center rounded text-[10px] font-bold ${priorityColors[ticket.priority] || 'bg-gray-100 text-gray-600'}`}>
        {ticket.priority.charAt(0).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">
          {ticket.title}
        </p>
        <p className="text-xs text-[var(--color-text-muted)]">
          {project?.key || 'Unknown'} · {ticket.status.replace('_', ' ')}
        </p>
      </div>
    </Link>
  );
}

// Sprint Health Card Component
interface ActiveSprintInfo {
  sprint: Sprint;
  project: Project;
  tickets: Ticket[];
}

function SprintHealthCard({ sprint, project, tickets }: ActiveSprintInfo) {
  const now = new Date();
  const startDate = new Date(sprint.startDate);
  const endDate = new Date(sprint.endDate);
  
  const totalDays = Math.max(differenceInDays(endDate, startDate), 1);
  const daysElapsed = differenceInDays(now, startDate);
  const daysRemaining = differenceInDays(endDate, now);
  const hoursRemaining = differenceInHours(endDate, now);
  const timeProgress = Math.min(Math.max((daysElapsed / totalDays) * 100, 0), 100);
  const isOverdue = daysRemaining < 0;
  
  // Ticket stats for this sprint - count tickets that belong to this sprint
  const sprintTickets = tickets.filter(t => t.sprintId === sprint.$id);
  const totalTickets = sprintTickets.length;
  const doneTickets = sprintTickets.filter(t => t.status === 'done').length;
  const inProgressTickets = sprintTickets.filter(t => t.status === 'in_progress' || t.status === 'in_review').length;
  const todoTickets = sprintTickets.filter(t => t.status === 'todo' || t.status === 'backlog').length;
  const completionPercent = totalTickets > 0 ? Math.round((doneTickets / totalTickets) * 100) : 0;
  
  // Is the sprint at risk? (more than half the time gone, less than half tickets done)
  const isAtRisk = timeProgress > 50 && completionPercent < (timeProgress * 0.6);
  
  // Format the remaining time
  let timeLabel: string;
  if (isOverdue) {
    timeLabel = `${Math.abs(daysRemaining)}d overdue`;
  } else if (daysRemaining === 0) {
    timeLabel = hoursRemaining > 0 ? `${hoursRemaining}h left` : 'Ends today';
  } else if (daysRemaining === 1) {
    timeLabel = '1 day left';
  } else {
    timeLabel = `${daysRemaining} days left`;
  }

  return (
    <Link
      to={`/projects/${project.$id}/backlog`}
      className="block rounded-lg border border-[var(--color-border-primary)] bg-[var(--color-bg-secondary)] p-4 hover:border-[var(--color-border-secondary)] transition-colors"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex h-8 w-8 items-center justify-center rounded bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] font-semibold text-xs shrink-0">
            {project.key}
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-[var(--color-text-primary)] truncate">
              {sprint.name}
            </h3>
            <p className="text-xs text-[var(--color-text-muted)] truncate">{project.name}</p>
          </div>
        </div>
        <div className={`flex items-center gap-1 text-xs font-medium shrink-0 px-2 py-0.5 rounded-full ${
          isOverdue
            ? 'bg-red-100 text-red-700'
            : isAtRisk
            ? 'bg-amber-100 text-amber-700'
            : 'bg-green-100 text-green-700'
        }`}>
          {isOverdue ? (
            <AlertTriangle className="h-3 w-3" />
          ) : isAtRisk ? (
            <AlertTriangle className="h-3 w-3" />
          ) : (
            <Timer className="h-3 w-3" />
          )}
          {timeLabel}
        </div>
      </div>

      {/* Sprint Goal */}
      {sprint.goal && (
        <div className="flex items-start gap-1.5 mb-3 text-xs text-[var(--color-text-secondary)]">
          <Target className="h-3 w-3 mt-0.5 shrink-0" />
          <p className="line-clamp-1">{sprint.goal}</p>
        </div>
      )}

      {/* Time Progress Bar */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] text-[var(--color-text-muted)] flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {format(startDate, 'MMM d')} – {format(endDate, 'MMM d')}
          </span>
          <span className="text-[10px] text-[var(--color-text-muted)]">
            {Math.round(timeProgress)}% elapsed
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-[var(--color-bg-tertiary)] overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              isOverdue ? 'bg-red-500' : isAtRisk ? 'bg-amber-500' : 'bg-blue-500'
            }`}
            style={{ width: `${timeProgress}%` }}
          />
        </div>
      </div>

      {/* Ticket Completion Progress */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] text-[var(--color-text-muted)]">
            Ticket Progress
          </span>
          <span className="text-[10px] font-medium text-[var(--color-text-primary)]">
            {doneTickets}/{totalTickets} done ({completionPercent}%)
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-[var(--color-bg-tertiary)] overflow-hidden">
          <div
            className="h-full rounded-full bg-green-500 transition-all"
            style={{ width: `${completionPercent}%` }}
          />
        </div>
      </div>

      {/* Ticket Status Breakdown */}
      <div className="flex items-center gap-3 text-[11px]">
        <div className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-gray-400" />
          <span className="text-[var(--color-text-muted)]">To Do {todoTickets}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-blue-500" />
          <span className="text-[var(--color-text-muted)]">In Progress {inProgressTickets}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-green-500" />
          <span className="text-[var(--color-text-muted)]">Done {doneTickets}</span>
        </div>
      </div>
    </Link>
  );
}

function SprintSkeleton() {
  return (
    <div className="rounded-lg border border-[var(--color-border-primary)] bg-[var(--color-bg-secondary)] p-4">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className="skeleton h-8 w-8 rounded" />
          <div className="space-y-1.5">
            <div className="skeleton h-4 w-28 rounded" />
            <div className="skeleton h-3 w-20 rounded" />
          </div>
        </div>
        <div className="skeleton h-5 w-16 rounded-full" />
      </div>
      <div className="skeleton h-1.5 w-full rounded-full mb-3" />
      <div className="skeleton h-1.5 w-full rounded-full mb-3" />
      <div className="flex gap-3">
        <div className="skeleton h-3 w-14 rounded" />
        <div className="skeleton h-3 w-20 rounded" />
        <div className="skeleton h-3 w-14 rounded" />
      </div>
    </div>
  );
}

export function Dashboard() {
  const { user } = useAuth();
  const { projects, isLoading } = useProjects();
  const { activities, isLoading: activitiesLoading } = useRecentActivity(10);

  // Fetch tickets for each project to get statistics
  const ticketQueries = useQueries({
    queries: projects.map((project) => ({
      queryKey: ['tickets', 'list', project.$id],
      queryFn: async () => {
        const response = await ticketService.getTickets(project.$id);
        if (!response.success) {
          throw new Error(response.error || 'Failed to fetch tickets');
        }
        return response.data?.documents ?? [];
      },
      enabled: !!project.$id,
    })),
  });

  // Fetch active sprints for each project
  const sprintQueries = useQueries({
    queries: projects.map((project) => ({
      queryKey: ['sprints', 'active', project.$id],
      queryFn: async () => {
        const response = await sprintService.getActiveSprint(project.$id);
        if (!response.success) {
          throw new Error(response.error || 'Failed to fetch active sprint');
        }
        return response.data ?? null;
      },
      enabled: !!project.$id,
    })),
  });

  // Combine active sprints with their project and ticket data
  const activeSprints = useMemo(() => {
    const result: ActiveSprintInfo[] = [];
    sprintQueries.forEach((query, index) => {
      if (query.data && projects[index]) {
        const project = projects[index];
        const projectTickets = ticketQueries[index]?.data ?? [];
        result.push({
          sprint: query.data,
          project: project!,
          tickets: projectTickets,
        });
      }
    });
    // Sort by end date (most urgent first)
    return result.sort((a, b) => 
      new Date(a.sprint.endDate).getTime() - new Date(b.sprint.endDate).getTime()
    );
  }, [sprintQueries, projects, ticketQueries]);

  const sprintsLoading = sprintQueries.some((q) => q.isLoading);

  // Calculate stats from all tickets
  const stats = useMemo(() => {
    const activeProjects = projects.filter((p) => p.status === 'active');
    const allTickets = ticketQueries.flatMap((q) => q.data ?? []);
    const ticketsLoading = ticketQueries.some((q) => q.isLoading);
    
    // Get tickets assigned to current user
    const myTickets = allTickets.filter((t) => t.assigneeId === user?.$id);
    
    // Count completed tickets this week
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const completedThisWeek = allTickets.filter(
      (t) => t.status === 'done' && new Date(t.$updatedAt) >= oneWeekAgo
    ).length;
    
    // Count team members across all projects (unique users)
    const uniqueMembers = new Set<string>();
    if (user?.$id) uniqueMembers.add(user.$id);
    
    return {
      totalProjects: projects.length,
      activeProjects: activeProjects.length,
      totalTickets: allTickets.length,
      myTickets: myTickets.length,
      completedThisWeek,
      teamMembers: uniqueMembers.size,
      ticketsLoading,
      assignedTickets: myTickets.filter((t) => t.status !== 'done').slice(0, 5),
    };
  }, [projects, ticketQueries, user]);

  // Get recent projects (last 5)
  const recentProjects = useMemo(() => {
    return [...projects]
      .sort((a, b) => new Date(b.$updatedAt).getTime() - new Date(a.$updatedAt).getTime())
      .slice(0, 5);
  }, [projects]);

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-[var(--color-text-primary)]">
          Dashboard
        </h1>
        <Link to="/projects/new">
          <Button size="sm" leftIcon={<Plus className="h-4 w-4" />}>
            New Project
          </Button>
        </Link>
      </div>

      {/* Stats grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Projects"
          value={stats.totalProjects}
          icon={<FolderKanban className="h-5 w-5" />}
          isLoading={isLoading}
        />
        <StatCard
          title="Tickets"
          value={stats.totalTickets}
          icon={<TicketIcon className="h-5 w-5" />}
          isLoading={isLoading || stats.ticketsLoading}
        />
        <StatCard
          title="Assigned to Me"
          value={stats.myTickets}
          icon={<Users className="h-5 w-5" />}
          isLoading={isLoading || stats.ticketsLoading}
        />
        <StatCard
          title="Done This Week"
          value={stats.completedThisWeek}
          icon={<CheckCircle className="h-5 w-5" />}
          isLoading={isLoading || stats.ticketsLoading}
        />
      </div>

      {/* Active Sprints Section */}
      <div className="rounded-lg border border-[var(--color-border-primary)] bg-[var(--color-bg-secondary)]">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border-primary)]">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-[var(--color-primary-600)]" />
            <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">
              Active Sprints
            </h2>
            {!sprintsLoading && activeSprints.length > 0 && (
              <span className="text-xs text-[var(--color-text-muted)] bg-[var(--color-bg-tertiary)] px-1.5 py-0.5 rounded-full">
                {activeSprints.length}
              </span>
            )}
          </div>
        </div>
        <div className="p-4">
          {sprintsLoading || isLoading ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <SprintSkeleton />
              <SprintSkeleton />
            </div>
          ) : activeSprints.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <Timer className="h-8 w-8 text-[var(--color-text-muted)] mb-2" />
              <p className="text-sm text-[var(--color-text-secondary)]">No active sprints</p>
              <p className="text-xs text-[var(--color-text-muted)] mt-1">
                Start a sprint from a project's Backlog page
              </p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {activeSprints.map((info) => (
                <SprintHealthCard
                  key={info.sprint.$id}
                  sprint={info.sprint}
                  project={info.project}
                  tickets={info.tickets}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Lists */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Recent Projects */}
        <div className="rounded-lg border border-[var(--color-border-primary)] bg-[var(--color-bg-secondary)]">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border-primary)]">
            <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">
              Recent Projects
            </h2>
            <Link
              to="/projects"
              className="flex items-center gap-1 text-xs font-medium text-[var(--color-primary-600)] hover:text-[var(--color-primary-700)]"
            >
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="p-2">
            {isLoading ? (
              <div className="space-y-1">
                {[1, 2, 3].map((i) => (
                  <ProjectCardSkeleton key={i} />
                ))}
              </div>
            ) : recentProjects.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <FolderKanban className="h-8 w-8 text-[var(--color-text-muted)] mb-2" />
                <p className="text-sm text-[var(--color-text-secondary)]">No projects yet</p>
                <Link to="/projects/new" className="mt-3">
                  <Button variant="secondary" size="sm">
                    Create Project
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-0.5">
                {recentProjects.map((project) => (
                  <ProjectCard key={project.$id} project={project} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Assigned to Me */}
        <div className="rounded-lg border border-[var(--color-border-primary)] bg-[var(--color-bg-secondary)]">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border-primary)]">
            <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">
              Assigned to Me
            </h2>
          </div>
          <div className="p-2">
            {stats.ticketsLoading ? (
              <div className="space-y-1">
                {[1, 2, 3].map((i) => (
                  <TicketCardSkeleton key={i} />
                ))}
              </div>
            ) : stats.assignedTickets.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <TicketIcon className="h-8 w-8 text-[var(--color-text-muted)] mb-2" />
                <p className="text-sm text-[var(--color-text-secondary)]">No tickets assigned</p>
              </div>
            ) : (
              <div className="space-y-0.5">
                {stats.assignedTickets.map((ticket) => (
                  <AssignedTicketCard key={ticket.$id} ticket={ticket} projects={projects} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Activity Log */}
      <div className="rounded-lg border border-[var(--color-border-primary)] bg-[var(--color-bg-secondary)]">
        <div className="px-4 py-3 border-b border-[var(--color-border-primary)]">
          <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">
            Activity
          </h2>
        </div>
        <div className="p-4">
          <ActivityLog
            activities={activities}
            isLoading={activitiesLoading}
            emptyMessage="No recent activity"
            showProject
          />
        </div>
      </div>
    </div>
  );
}
