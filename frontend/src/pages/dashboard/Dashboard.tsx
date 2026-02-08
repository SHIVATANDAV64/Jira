import { Link } from 'react-router-dom';
import {
  FolderKanban,
  Ticket as TicketIcon,
  Users,
  TrendingUp,
  Plus,
  ArrowRight,
  CheckCircle,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/common/Button';
import { useProjects } from '@/hooks/useProjects';
import { useRecentActivity } from '@/hooks/useActivity';
import { ActivityLog } from '@/components/activity/ActivityLog';
import type { Project } from '@/types';
import { useMemo } from 'react';
import { useQueries } from '@tanstack/react-query';
import * as ticketService from '@/services/ticketService';

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
