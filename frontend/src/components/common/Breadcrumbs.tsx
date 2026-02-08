import { Link, useLocation, useParams } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import { useProject } from '@/hooks/useProjects';
import { useTicket } from '@/hooks/useTickets';

interface Crumb {
  label: string;
  path?: string;
}

/**
 * Breadcrumbs component that auto-generates breadcrumbs from the current route.
 * Resolves dynamic params (projectId, ticketId) to their actual names.
 */
export function Breadcrumbs() {
  const location = useLocation();
  const params = useParams<{ projectId?: string; ticketId?: string }>();

  const { project } = useProject(params.projectId);
  const { ticket } = useTicket(params.ticketId);

  const crumbs = buildCrumbs(location.pathname, project, ticket);

  if (crumbs.length <= 1) return null;

  return (
    <nav aria-label="Breadcrumb" className="mb-4">
      <ol className="flex items-center gap-1.5 text-sm flex-wrap">
        {crumbs.map((crumb, index) => {
          const isLast = index === crumbs.length - 1;

          return (
            <li key={crumb.path ?? index} className="flex items-center gap-1.5">
              {index > 0 && (
                <ChevronRight className="h-3.5 w-3.5 text-[--color-text-muted] shrink-0" />
              )}
              {isLast || !crumb.path ? (
                <span className="text-[--color-text-primary] font-medium truncate max-w-[200px]">
                  {crumb.label}
                </span>
              ) : (
                <Link
                  to={crumb.path}
                  className="text-[--color-text-muted] hover:text-[--color-text-primary] transition-colors truncate max-w-[200px]"
                >
                  {index === 0 ? (
                    <span className="flex items-center gap-1">
                      <Home className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">{crumb.label}</span>
                    </span>
                  ) : (
                    crumb.label
                  )}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function buildCrumbs(
  pathname: string,
  project?: { name: string; key: string; $id: string } | null,
  ticket?: { title: string; ticketKey?: string; ticketNumber: number; $id: string } | null,
): Crumb[] {
  const crumbs: Crumb[] = [{ label: 'Dashboard', path: '/dashboard' }];

  const segments = pathname.split('/').filter(Boolean);

  if (segments[0] === 'dashboard') {
    // /dashboard — just show Dashboard (no extra crumb needed, it's the root)
    return crumbs;
  }

  if (segments[0] === 'projects') {
    crumbs.push({ label: 'Projects', path: '/projects' });

    if (segments[1] === 'new') {
      crumbs.push({ label: 'New Project' });
    } else if (segments[1]) {
      // Project detail or sub-page
      const projectLabel = project ? `${project.key} - ${project.name}` : 'Project';
      const projectPath = `/projects/${segments[1]}`;
      crumbs.push({ label: projectLabel, path: projectPath });

      if (segments[2] === 'settings') {
        crumbs.push({ label: 'Settings' });
      } else if (segments[2] === 'backlog') {
        crumbs.push({ label: 'Backlog' });
      } else if (segments[2] === 'tickets' && segments[3]) {
        // Ticket detail
        const ticketLabel = ticket
          ? (ticket.ticketKey || `TICKET-${ticket.ticketNumber}`)
          : 'Ticket';
        crumbs.push({ label: ticketLabel });
      }
    }
  } else if (segments[0] === 'team') {
    crumbs.push({ label: 'Team' });
  } else if (segments[0] === 'settings') {
    crumbs.push({ label: 'Settings' });
  } else if (segments[0] === 'notifications') {
    crumbs.push({ label: 'Notifications' });
  } else if (segments[0] === 'tickets' && segments[1]) {
    // Standalone ticket route /tickets/:ticketId
    crumbs.push({ label: 'Tickets' });
    const ticketLabel = ticket
      ? (ticket.ticketKey || `TICKET-${ticket.ticketNumber}`)
      : 'Ticket';
    crumbs.push({ label: ticketLabel });
  }

  return crumbs;
}
