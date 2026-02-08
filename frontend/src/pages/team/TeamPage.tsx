import { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  UserPlus,
  Search,
  MoreVertical,
  Mail,
  Shield,
  Trash2,
  ChevronDown,
  FolderKanban,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useProjects } from '@/hooks/useProjects';
import {
  useProjectMembers,
  useInviteMember,
  useUpdateMemberRole,
  useRemoveMember,
  useLeaveProject,
} from '@/hooks/useProjectMembers';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { Select } from '@/components/common/Select';
import { Modal } from '@/components/common/Modal';
import { Avatar } from '@/components/common/Avatar';
import { Badge } from '@/components/common/Badge';
import { PROJECT_ROLES } from '@/lib/constants';
import type { ProjectRole, ProjectMember } from '@/types';

interface InviteMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  inviterRole?: ProjectRole;
}

function InviteMemberModal({ isOpen, onClose, projectId, inviterRole = 'admin' }: InviteMemberModalProps) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<ProjectRole>('developer');
  const inviteMember = useInviteMember(projectId);

  // Role hierarchy: admin > manager > developer > viewer
  const roleHierarchy: Record<ProjectRole, number> = {
    admin: 4,
    manager: 3,
    developer: 2,
    viewer: 1,
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    try {
      await inviteMember.mutateAsync({ email: email.trim(), role });
      setEmail('');
      setRole('developer');
      onClose();
    } catch {
      // Error handled by mutation
    }
  };

  const allRoleOptions = Object.entries(PROJECT_ROLES).map(([value, config]) => ({
    value,
    label: config.label,
  }));

  // Filter roles based on inviter's role
  const roleOptions = allRoleOptions.filter(
    (option) => roleHierarchy[option.value as ProjectRole] <= roleHierarchy[inviterRole]
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Invite Team Member">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Email Address"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="colleague@example.com"
          required
        />
        <Select
          label="Role"
          value={role}
          onChange={(e) => setRole(e.target.value as ProjectRole)}
          options={roleOptions}
        />
        <p className="text-sm text-[--color-text-muted]">
          {PROJECT_ROLES[role].description}
        </p>
        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            isLoading={inviteMember.isPending}
            leftIcon={<UserPlus className="h-4 w-4" />}
          >
            Send Invite
          </Button>
        </div>
      </form>
    </Modal>
  );
}

interface MemberRowProps {
  member: ProjectMember;
  projectId: string;
  currentUserId: string;
  isAdmin: boolean;
  currentUserRole?: ProjectRole;
}

function MemberRow({ member, projectId, currentUserId, isAdmin, currentUserRole = 'viewer' }: MemberRowProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [showRoleSelect, setShowRoleSelect] = useState(false);
  const updateRole = useUpdateMemberRole(projectId);
  const removeMember = useRemoveMember(projectId);

  const isCurrentUser = member.userId === currentUserId;
  const canModify = isAdmin && !isCurrentUser;

  // Role hierarchy for filtering
  const roleHierarchy: Record<ProjectRole, number> = {
    admin: 4,
    manager: 3,
    developer: 2,
    viewer: 1,
  };

  const handleRoleChange = async (newRole: ProjectRole) => {
    try {
      await updateRole.mutateAsync({ memberId: member.$id, role: newRole });
      setShowRoleSelect(false);
    } catch {
      // Error handled by mutation
    }
  };

  const handleRemove = async () => {
    if (!confirm('Are you sure you want to remove this member?')) return;
    try {
      await removeMember.mutateAsync(member.$id);
    } catch {
      // Error handled by mutation
    }
  };

  const allRoleOptions = Object.entries(PROJECT_ROLES).map(([value, config]) => ({
    value,
    label: config.label,
  }));

  // Filter roles based on current user's role
  const roleOptions = currentUserRole
    ? allRoleOptions.filter(
        (option) => roleHierarchy[option.value as ProjectRole] <= roleHierarchy[currentUserRole]
      )
    : allRoleOptions;

  return (
    <div className="flex items-center justify-between p-4 hover:bg-[--color-bg-hover] rounded-lg transition-colors">
      <div className="flex items-center gap-3">
        <Avatar name={member.user?.name || 'User'} size="md" />
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-[--color-text-primary]">
              {member.user?.name || 'Unknown User'}
            </span>
            {isCurrentUser && (
              <Badge variant="info" size="sm">You</Badge>
            )}
          </div>
          <div className="flex items-center gap-1 text-sm text-[--color-text-muted]">
            <Mail className="h-3 w-3" />
            {member.user?.email || 'No email'}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {showRoleSelect && canModify ? (
          <Select
            value={member.role}
            onChange={(e) => handleRoleChange(e.target.value as ProjectRole)}
            options={roleOptions}
            className="w-32"
          />
        ) : (
          <button
            onClick={() => canModify && setShowRoleSelect(true)}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm ${
              canModify
                ? 'hover:bg-[--color-bg-tertiary] cursor-pointer'
                : 'cursor-default'
            }`}
          >
            <Shield className="h-4 w-4 text-[--color-text-muted]" />
            <span className="text-[--color-text-secondary]">
              {PROJECT_ROLES[member.role].label}
            </span>
            {canModify && <ChevronDown className="h-3 w-3 text-[--color-text-muted]" />}
          </button>
        )}

        {canModify && (
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 rounded-lg hover:bg-[--color-bg-tertiary] cursor-pointer"
            >
              <MoreVertical className="h-4 w-4 text-[--color-text-muted]" />
            </button>
            {showMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowMenu(false)}
                />
                <div className="absolute right-0 top-full mt-1 z-20 w-48 rounded-lg border border-[--color-border-primary] bg-[--color-bg-secondary] shadow-lg py-1">
                  <button
                    onClick={handleRemove}
                    className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-[--color-bg-hover] cursor-pointer"
                  >
                    <Trash2 className="h-4 w-4" />
                    Remove from project
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function TeamPage() {
  const { user } = useAuth();
  const { projects, isLoading: projectsLoading } = useProjects();
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showInviteModal, setShowInviteModal] = useState(false);

  const { members, isLoading: membersLoading } = useProjectMembers(
    selectedProjectId || undefined
  );

  // Set first project as default when projects load (using useEffect for side effects)
  useEffect(() => {
    if (projects.length > 0 && !selectedProjectId) {
      const firstProject = projects[0];
      if (firstProject) {
        setSelectedProjectId(firstProject.$id);
      }
    }
  }, [projects]);

  // Reset search filter when project selection changes (TEAM-10)
  const handleProjectChange = (newProjectId: string) => {
    setSelectedProjectId(newProjectId);
    setSearchQuery('');
  };

  const selectedProject = useMemo(
    () => projects.find((p) => p.$id === selectedProjectId),
    [projects, selectedProjectId]
  );

  // Check if current user is admin of selected project
  const currentUserMember = useMemo(
    () => members.find((m) => m.userId === user?.$id),
    [members, user]
  );
  const isAdmin = currentUserMember?.role === 'admin' || currentUserMember?.role === 'manager';

  // Filter members by search query
  const filteredMembers = useMemo(() => {
    if (!searchQuery.trim()) return members;
    const query = searchQuery.toLowerCase();
    return members.filter(
      (m) =>
        m.user?.name?.toLowerCase().includes(query) ||
        m.user?.email?.toLowerCase().includes(query)
    );
  }, [members, searchQuery]);

  const projectOptions = projects.map((p) => ({
    value: p.$id,
    label: `${p.key} - ${p.name}`,
  }));

  if (projectsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-[--color-primary-500]" />
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <FolderKanban className="h-16 w-16 text-[--color-text-muted] mb-4" />
        <h2 className="text-xl font-semibold text-[--color-text-primary] mb-2">
          No Projects Yet
        </h2>
        <p className="text-[--color-text-secondary] mb-4">
          Create a project first to manage team members
        </p>
        <Link to="/projects/new">
          <Button>Create Project</Button>
        </Link>
      </div>
    );
  }

  const safeProjectId = selectedProjectId || projects[0]?.$id || '';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[--color-text-primary]">Team Management</h1>
          <p className="mt-1 text-[--color-text-secondary]">
            Manage team members and their roles across projects
          </p>
        </div>
        {isAdmin && selectedProjectId && (
          <Button
            leftIcon={<UserPlus className="h-4 w-4" />}
            onClick={() => setShowInviteModal(true)}
          >
            Invite Member
          </Button>
        )}
      </div>

      {/* Project Selector and Search */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="sm:w-72">
          <Select
            value={selectedProjectId}
            onChange={(e) => handleProjectChange(e.target.value)}
            options={projectOptions}
            placeholder="Select a project"
          />
        </div>
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[--color-text-muted]" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search members..."
            className="pl-10"
          />
        </div>
      </div>

      {/* Project Info */}
      {selectedProject && (
        <div className="rounded-xl border border-[--color-border-primary] bg-[--color-bg-secondary] p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[--color-primary-100] text-[--color-primary-600] font-bold">
                {selectedProject.key}
              </div>
              <div>
                <h2 className="font-semibold text-[--color-text-primary]">
                  {selectedProject.name}
                </h2>
                <p className="text-sm text-[--color-text-muted]">
                  {members.length} member{members.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link
                to={`/projects/${selectedProject.$id}`}
                className="text-sm text-[--color-primary-600] hover:text-[--color-primary-700]"
              >
                View Project
              </Link>
              {!isAdmin && selectedProjectId && (
                <LeaveProjectButton projectId={selectedProjectId} />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Members List */}
      <div className="rounded-xl border border-[--color-border-primary] bg-[--color-bg-secondary]">
        <div className="border-b border-[--color-border-primary] px-4 py-3">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-[--color-text-muted]" />
            <h3 className="font-medium text-[--color-text-primary]">Team Members</h3>
          </div>
        </div>

        {membersLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-[--color-primary-500]" />
          </div>
        ) : filteredMembers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            {searchQuery ? (
              <>
                <AlertCircle className="h-12 w-12 text-[--color-text-muted] mb-3" />
                <p className="text-[--color-text-secondary]">No members match your search</p>
              </>
            ) : (
              <>
                <Users className="h-12 w-12 text-[--color-text-muted] mb-3" />
                <p className="text-[--color-text-secondary]">No team members yet</p>
                {isAdmin && (
                  <Button
                    variant="secondary"
                    size="sm"
                    className="mt-4"
                    onClick={() => setShowInviteModal(true)}
                  >
                    Invite your first member
                  </Button>
                )}
              </>
            )}
          </div>
        ) : (
          <div className="divide-y divide-[--color-border-primary]">
            {filteredMembers.map((member) => (
              <MemberRow
                key={member.$id}
                member={member}
                projectId={selectedProjectId}
                currentUserId={user?.$id || ''}
                isAdmin={isAdmin}
                currentUserRole={currentUserMember?.role}
              />
            ))}
          </div>
        )}
      </div>

      {/* Role Legend */}
      <div className="rounded-xl border border-[--color-border-primary] bg-[--color-bg-secondary] p-4">
        <h3 className="font-medium text-[--color-text-primary] mb-3">Role Permissions</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Object.entries(PROJECT_ROLES).map(([role, config]) => (
            <div key={role} className="p-3 rounded-lg bg-[--color-bg-tertiary]">
              <div className="flex items-center gap-2 mb-1">
                <Shield className="h-4 w-4 text-[--color-primary-600]" />
                <span className="font-medium text-[--color-text-primary]">{config.label}</span>
              </div>
              <p className="text-xs text-[--color-text-muted]">{config.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Invite Modal */}
      {safeProjectId && (
        <InviteMemberModal
          isOpen={showInviteModal}
          onClose={() => setShowInviteModal(false)}
          projectId={safeProjectId}
          inviterRole={currentUserMember?.role}
        />
      )}
    </div>
  );
}

interface LeaveProjectButtonProps {
  projectId: string;
}

function LeaveProjectButton({ projectId }: LeaveProjectButtonProps) {
  const leaveProject = useLeaveProject(projectId);

  const handleLeave = async () => {
    if (!confirm('Are you sure you want to leave this project? You will no longer have access to it.')) {
      return;
    }
    leaveProject.mutate();
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      className="text-red-600 hover:text-red-700"
      onClick={handleLeave}
      isLoading={leaveProject.isPending}
    >
      Leave Project
    </Button>
  );
}
