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
    <div className="rounded-xl border border-[--color-border-primary] bg-[--color-bg-secondary] p-6 transition-all duration-200 hover:border-[--color-border-secondary] hover:shadow-lg hover:shadow-black/10">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-[--color-text-muted]">{title}</p>
          {isLoading ? (
            <div className="mt-2">
              <div className="skeleton h-8 w-16 rounded" />
            </div>
          ) : (
            <p className="mt-1 text-3xl font-bold text-[--color-text-primary]">
              {value}
            </p>
          )}
          {trend && !isLoading && (
            <p className="mt-1 flex items-center gap-1 text-sm text-green-400">
              <TrendingUp className="h-4 w-4" />
              {trend}
            </p>
          )}
        </div>
        <div className="rounded-lg bg-gradient-to-br from-[--color-primary-500]/20 to-[--color-primary-700]/20 p-3 text-[--color-primary-400]">
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
      className="flex items-center gap-3 p-3 rounded-lg hover:bg-[--color-bg-hover] transition-all duration-200 hover:translate-x-0.5"
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-[--color-primary-500]/20 to-[--color-primary-700]/20 text-[--color-primary-400] font-bold text-sm">
        {project.key}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-[--color-text-primary] truncate">
          {project.name}
        </p>
        <p className="text-sm text-[--color-text-muted]">
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
    critical: 'bg-red-500/20 text-red-400',
    high: 'bg-orange-500/20 text-orange-400',
    medium: 'bg-yellow-500/20 text-yellow-400',
    low: 'bg-blue-500/20 text-blue-400',
  };

  return (
    <Link
      to={`/tickets/${ticket.$id}`}
      className="flex items-center gap-3 p-3 rounded-lg hover:bg-[--color-bg-hover] transition-all duration-200 hover:translate-x-0.5"
    >
      <div className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold ${priorityColors[ticket.priority] || 'bg-gray-500/20 text-gray-400'}`}>
        {ticket.priority.charAt(0).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-[--color-text-primary] truncate">
          {ticket.title}
        </p>
        <p className="text-sm text-[--color-text-muted]">
          {project?.key || 'Unknown'} - {ticket.status.replace('_', ' ')}
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
    <div className="space-y-8">
      {/* Welcome section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[--color-text-primary]">
            Welcome back, {user?.name?.split(' ')[0] || 'there'}!
          </h1>
          <p className="mt-1 text-[--color-text-secondary]">
            Here's what's happening with your projects
          </p>
        </div>
        <Link to="/projects/new">
          <Button leftIcon={<Plus className="h-4 w-4" />}>
            New Project
          </Button>
        </Link>
      </div>

      {/* Stats grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Projects"
          value={stats.totalProjects}
          icon={<FolderKanban className="h-6 w-6" />}
          isLoading={isLoading}
        />
        <StatCard
          title="Total Tickets"
          value={stats.totalTickets}
          icon={<TicketIcon className="h-6 w-6" />}
          isLoading={isLoading || stats.ticketsLoading}
        />
        <StatCard
          title="Assigned to Me"
          value={stats.myTickets}
          icon={<Users className="h-6 w-6" />}
          isLoading={isLoading || stats.ticketsLoading}
        />
        <StatCard
          title="Completed This Week"
          value={stats.completedThisWeek}
          icon={<CheckCircle className="h-6 w-6" />}
          isLoading={isLoading || stats.ticketsLoading}
        />
      </div>

      {/* Recent activity and quick actions */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Projects */}
        <div className="rounded-xl border border-[--color-border-primary] bg-[--color-bg-secondary] p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-[--color-text-primary]">
              Recent Projects
            </h2>
            <Link
              to="/projects"
              className="flex items-center gap-1 text-sm text-[--color-primary-400] hover:text-[--color-primary-300]"
            >
              View all <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {isLoading ? (
            <div className="space-y-1">
              {[1, 2, 3].map((i) => (
                <ProjectCardSkeleton key={i} />
              ))}
            </div>
          ) : recentProjects.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <FolderKanban className="h-12 w-12 text-[--color-text-muted] mb-3" />
              <p className="text-[--color-text-secondary]">No projects yet</p>
              <p className="text-sm text-[--color-text-muted] mb-4">
                Create your first project to get started
              </p>
              <Link to="/projects/new">
                <Button variant="secondary" size="sm">
                  Create Project
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-1">
              {recentProjects.map((project) => (
                <ProjectCard key={project.$id} project={project} />
              ))}
            </div>
          )}
        </div>

        {/* Assigned to Me */}
        <div className="rounded-xl border border-[--color-border-primary] bg-[--color-bg-secondary] p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-[--color-text-primary]">
              Assigned to Me
            </h2>
          </div>
          {stats.ticketsLoading ? (
            <div className="space-y-1">
              {[1, 2, 3].map((i) => (
                <TicketCardSkeleton key={i} />
              ))}
            </div>
          ) : stats.assignedTickets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <TicketIcon className="h-12 w-12 text-[--color-text-muted] mb-3" />
              <p className="text-[--color-text-secondary]">No tickets assigned</p>
              <p className="text-sm text-[--color-text-muted]">
                Tickets assigned to you will appear here
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {stats.assignedTickets.map((ticket) => (
                <AssignedTicketCard key={ticket.$id} ticket={ticket} projects={projects} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Activity Log */}
      <div className="rounded-xl border border-[--color-border-primary] bg-[--color-bg-secondary] p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-[--color-text-primary]">
            Recent Activity
          </h2>
        </div>
        <ActivityLog
          activities={activities}
          isLoading={activitiesLoading}
          emptyMessage="No recent activity"
          showProject
        />
      </div>
    </div>
  );
}
