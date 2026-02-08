import { useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { ROLE_PERMISSIONS, type ProjectRole, type RolePermissions } from '@/types';
import type { ProjectMember } from '@/types';

/**
 * Hook to get the current user's role and permissions for a project.
 * Enforces frontend permission checks to complement server-side authorization.
 */
export function usePermissions(members: ProjectMember[]) {
  const { user } = useAuth();

  const { role, permissions } = useMemo(() => {
    if (!user || !members.length) {
      return {
        role: null as ProjectRole | null,
        permissions: {
          canCreateTickets: false,
          canEditTickets: false,
          canDeleteTickets: false,
          canAssignTickets: false,
          canMoveTickets: false,
          canManageMembers: false,
          canEditProject: false,
          canDeleteProject: false,
          canComment: false,
        } as RolePermissions,
      };
    }

    const membership = members.find((m) => m.userId === user.$id);
    if (!membership) {
      return {
        role: null as ProjectRole | null,
        permissions: {
          canCreateTickets: false,
          canEditTickets: false,
          canDeleteTickets: false,
          canAssignTickets: false,
          canMoveTickets: false,
          canManageMembers: false,
          canEditProject: false,
          canDeleteProject: false,
          canComment: false,
        } as RolePermissions,
      };
    }

    return {
      role: membership.role,
      permissions: ROLE_PERMISSIONS[membership.role] ?? ROLE_PERMISSIONS.viewer,
    };
  }, [user, members]);

  return {
    role,
    permissions,
    isAdmin: role === 'admin',
    isManager: role === 'manager',
    isDeveloper: role === 'developer',
    isViewer: role === 'viewer',
    isMember: role !== null,
  };
}
