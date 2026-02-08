import { useState, useEffect } from 'react';
import { format, differenceInDays } from 'date-fns';
import {
  Plus,
  Play,
  CheckCircle,
  Calendar,
  Target,
  Loader2,
  MoreVertical,
  Edit,
  Trash2,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/common/Button';
import { Modal } from '@/components/common/Modal';
import { Input } from '@/components/common/Input';
import { Textarea } from '@/components/common/Textarea';
import { Badge } from '@/components/common/Badge';
import type { Sprint, CreateSprintForm, UpdateSprintForm, Ticket } from '@/types';
import {
  useSprints,
  useCreateSprint,
  useStartSprint,
  useCompleteSprint,
  useDeleteSprint,
  useUpdateSprint,
} from '@/hooks/useSprints';
import { useProjectMembers } from '@/hooks/useProjectMembers';
import { usePermissions } from '@/hooks/usePermissions';

interface SprintBoardProps {
  projectId: string;
  tickets: Ticket[];
  onTicketClick?: (ticketId: string) => void;
}

export function SprintBoard({ projectId, tickets, onTicketClick }: SprintBoardProps) {
  const { sprints, isLoading } = useSprints(projectId);
  const { members } = useProjectMembers(projectId);
  const { permissions } = usePermissions(members);
  const deleteSprintMutation = useDeleteSprint();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editingSprint, setEditingSprint] = useState<Sprint | null>(null);
  const [expandedSprints, setExpandedSprints] = useState<Set<string>>(new Set());
  const [showMoreCompleted, setShowMoreCompleted] = useState(false);

  const toggleSprintExpanded = (sprintId: string) => {
    setExpandedSprints((prev) => {
      const next = new Set(prev);
      if (next.has(sprintId)) {
        next.delete(sprintId);
      } else {
        next.add(sprintId);
      }
      return next;
    });
  };

  // Group sprints by status
  const activeSprint = sprints.find((s) => s.status === 'active');
  const planningSprints = sprints.filter((s) => s.status === 'planning');
  const completedSprints = sprints.filter((s) => s.status === 'completed');

  // Get backlog tickets (not in any sprint - for now all tickets with status 'backlog')
  const backlogTickets = tickets.filter((t) => t.status === 'backlog');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-[--color-primary-500]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-[--color-text-primary]">
          Sprints & Backlog
        </h2>
        {permissions.canEditProject && (
          <Button
            size="sm"
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={() => setShowCreateModal(true)}
          >
            Create Sprint
          </Button>
        )}
      </div>

      {/* Active Sprint */}
      {activeSprint && (
        <SprintCard
          sprint={activeSprint}
          tickets={tickets.filter((t) => t.status !== 'backlog' && t.status !== 'done')}
          isExpanded={expandedSprints.has(activeSprint.$id)}
          onToggle={() => toggleSprintExpanded(activeSprint.$id)}
          onTicketClick={onTicketClick}
          onEdit={() => {
            setEditingSprint(activeSprint);
            setShowEditModal(true);
          }}
          onDelete={() => {
            setEditingSprint(activeSprint);
            setShowDeleteConfirm(true);
          }}
          canManage={permissions.canEditProject}
        />
      )}

      {/* Planning Sprints */}
      {planningSprints.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-[--color-text-secondary]">
            Upcoming Sprints
          </h3>
          {planningSprints.map((sprint) => (
            <SprintCard
              key={sprint.$id}
              sprint={sprint}
              tickets={[]}
              isExpanded={expandedSprints.has(sprint.$id)}
              onToggle={() => toggleSprintExpanded(sprint.$id)}
              onTicketClick={onTicketClick}
              onEdit={() => {
                setEditingSprint(sprint);
                setShowEditModal(true);
              }}
              onDelete={() => {
                setEditingSprint(sprint);
                setShowDeleteConfirm(true);
              }}
              canManage={permissions.canEditProject}
            />
          ))}
        </div>
      )}

      {/* Backlog */}
      <div className="rounded-xl border border-[--color-border-primary] bg-[--color-bg-secondary]">
        <div className="flex items-center justify-between p-4 border-b border-[--color-border-primary]">
          <div className="flex items-center gap-3">
            <h3 className="font-medium text-[--color-text-primary]">Backlog</h3>
            <Badge variant="default">{backlogTickets.length} items</Badge>
          </div>
        </div>
        <div className="p-4">
          {backlogTickets.length === 0 ? (
            <p className="text-sm text-[--color-text-muted] text-center py-4">
              No items in backlog
            </p>
          ) : (
            <div className="space-y-2">
              {backlogTickets.map((ticket) => (
                <BacklogItem
                  key={ticket.$id}
                  ticket={ticket}
                  onClick={() => onTicketClick?.(ticket.$id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Completed Sprints */}
      {completedSprints.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-[--color-text-secondary]">
            Completed Sprints
          </h3>
          {completedSprints.slice(0, showMoreCompleted ? undefined : 3).map((sprint) => (
            <SprintCard
              key={sprint.$id}
              sprint={sprint}
              tickets={[]}
              isExpanded={expandedSprints.has(sprint.$id)}
              onToggle={() => toggleSprintExpanded(sprint.$id)}
              onTicketClick={onTicketClick}
              onEdit={() => {
                setEditingSprint(sprint);
                setShowEditModal(true);
              }}
              onDelete={() => {
                setEditingSprint(sprint);
                setShowDeleteConfirm(true);
              }}
              isCompleted
              canManage={permissions.canEditProject}
            />
          ))}
          {completedSprints.length > 3 && !showMoreCompleted && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowMoreCompleted(true)}
              className="w-full cursor-pointer"
            >
              Show more ({completedSprints.length - 3} more)
            </Button>
          )}
        </div>
      )}

      {/* Create Sprint Modal */}
      <CreateSprintModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        projectId={projectId}
      />

      {/* Edit Sprint Modal */}
      {editingSprint && (
        <EditSprintModal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setEditingSprint(null);
          }}
          projectId={projectId}
          sprint={editingSprint}
        />
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setEditingSprint(null);
        }}
        title="Delete Sprint"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-[--color-text-secondary]">
            Are you sure you want to delete this sprint? This action cannot be undone.
          </p>
          <div className="flex justify-end gap-3">
            <Button
              variant="secondary"
              onClick={() => {
                setShowDeleteConfirm(false);
                setEditingSprint(null);
              }}
              className="cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                if (editingSprint) {
                  deleteSprintMutation.mutate(
                    { sprintId: editingSprint.$id, projectId },
                    {
                      onSuccess: () => {
                        setShowDeleteConfirm(false);
                        setEditingSprint(null);
                      },
                    }
                  );
                }
              }}
              className="cursor-pointer bg-red-600 hover:bg-red-700"
            >
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// Sprint Card Component
interface SprintCardProps {
  sprint: Sprint;
  tickets: Ticket[];
  isExpanded: boolean;
  onToggle: () => void;
  onTicketClick?: (ticketId: string) => void;
  isCompleted?: boolean;
  canManage?: boolean;
}

function SprintCard({
  sprint,
  tickets,
  isExpanded,
  onToggle,
  onTicketClick,
  isCompleted,
  canManage = false,
  onEdit,
  onDelete,
}: SprintCardProps & { onEdit?: () => void; onDelete?: () => void }) {
  const startSprintMutation = useStartSprint();
  const completeSprintMutation = useCompleteSprint();
  const [showMenu, setShowMenu] = useState(false);

  const daysRemaining = differenceInDays(new Date(sprint.endDate), new Date());
  const isActive = sprint.status === 'active';
  const isPlanning = sprint.status === 'planning';

  const statusColors = {
    planning: 'bg-blue-50 text-blue-700',
    active: 'bg-green-50 text-green-700',
    completed: 'bg-gray-100 text-gray-700',
  };

  return (
    <div className="rounded-xl border border-[--color-border-primary] bg-[--color-bg-secondary]">
      {/* Sprint Header */}
      <div className="flex items-center justify-between p-4 border-b border-[--color-border-primary]">
        <div className="flex items-center gap-3">
          <button
            onClick={onToggle}
            className="text-[--color-text-muted] hover:text-[--color-text-primary]"
          >
            {isExpanded ? (
              <ChevronDown className="h-5 w-5" />
            ) : (
              <ChevronRight className="h-5 w-5" />
            )}
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-medium text-[--color-text-primary]">
                {sprint.name}
              </h3>
              <Badge className={statusColors[sprint.status]}>
                {sprint.status}
              </Badge>
            </div>
            <div className="flex items-center gap-4 mt-1 text-sm text-[--color-text-muted]">
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {format(new Date(sprint.startDate), 'MMM d')} -{' '}
                {format(new Date(sprint.endDate), 'MMM d')}
              </span>
              {isActive && (
                <span className={daysRemaining < 0 ? 'text-red-600' : ''}>
                  {daysRemaining < 0
                    ? `${Math.abs(daysRemaining)} days overdue`
                    : `${daysRemaining} days remaining`}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isPlanning && canManage && (
            <Button
              size="sm"
              variant="secondary"
              leftIcon={<Play className="h-4 w-4" />}
              onClick={() => startSprintMutation.mutate({ sprintId: sprint.$id, projectId: sprint.projectId })}
              disabled={startSprintMutation.isPending}
            >
              Start Sprint
            </Button>
          )}
          {isActive && canManage && (
            <Button
              size="sm"
              variant="secondary"
              leftIcon={<CheckCircle className="h-4 w-4" />}
              onClick={() => completeSprintMutation.mutate(sprint.$id)}
              disabled={completeSprintMutation.isPending}
            >
              Complete Sprint
            </Button>
          )}
          {canManage && <div className="relative">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowMenu(!showMenu)}
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
            {showMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowMenu(false)}
                />
                <div className="absolute right-0 top-full mt-1 w-36 rounded-lg border border-[--color-border-primary] bg-[--color-bg-secondary] shadow-lg z-20">
                  <button
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[--color-text-primary] hover:bg-[--color-bg-hover]"
                    onClick={() => {
                      setShowMenu(false);
                      onEdit?.();
                    }}
                  >
                    <Edit className="h-4 w-4" />
                    Edit
                  </button>
                  <button
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-[--color-bg-hover]"
                    onClick={() => {
                      setShowMenu(false);
                      onDelete?.();
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </button>
                </div>
              </>
            )}
          </div>}
        </div>
      </div>

      {/* Sprint Goal */}
      {sprint.goal && isExpanded && (
        <div className="px-4 py-3 border-b border-[--color-border-primary] bg-[--color-bg-tertiary]">
          <div className="flex items-start gap-2 text-sm">
            <Target className="h-4 w-4 text-[--color-text-muted] mt-0.5" />
            <p className="text-[--color-text-secondary]">{sprint.goal}</p>
          </div>
        </div>
      )}

      {/* Sprint Tickets */}
      {isExpanded && (
        <div className="p-4">
          {tickets.length === 0 ? (
            <p className="text-sm text-[--color-text-muted] text-center py-4">
              {isCompleted ? 'Sprint completed' : 'No tickets in this sprint'}
            </p>
          ) : (
            <div className="space-y-2">
              {tickets.map((ticket) => (
                <BacklogItem
                  key={ticket.$id}
                  ticket={ticket}
                  onClick={() => onTicketClick?.(ticket.$id)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Backlog Item Component
interface BacklogItemProps {
  ticket: Ticket;
  onClick?: () => void;
}

function BacklogItem({ ticket, onClick }: BacklogItemProps) {
  const priorityColors: Record<string, string> = {
    critical: 'bg-red-500',
    high: 'bg-orange-500',
    medium: 'bg-yellow-500',
    low: 'bg-blue-500',
  };

  const typeIcons: Record<string, string> = {
    bug: '🐛',
    feature: '✨',
    task: '📋',
    improvement: '⚡',
  };

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 p-3 rounded-lg border border-[--color-border-primary] bg-[--color-bg-primary] hover:border-[--color-border-secondary] transition-colors text-left"
    >
      <div
        className={`w-1 h-8 rounded-full ${priorityColors[ticket.priority] || 'bg-gray-500'}`}
      />
      <span className="text-lg">{typeIcons[ticket.type] || '📋'}</span>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-[--color-text-primary] truncate">
          {ticket.title}
        </p>
        <p className="text-xs text-[--color-text-muted]">
          {ticket.status.replace('_', ' ')}
        </p>
      </div>
    </button>
  );
}

// Create Sprint Modal
interface CreateSprintModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
}

function CreateSprintModal({ isOpen, onClose, projectId }: CreateSprintModalProps) {
  const createSprintMutation = useCreateSprint(projectId);
  const [formData, setFormData] = useState<CreateSprintForm>({
    name: '',
    goal: '',
    startDate: format(new Date(), 'yyyy-MM-dd'),
    endDate: format(new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // SPR-06: Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setFormData({
        name: '',
        goal: '',
        startDate: format(new Date(), 'yyyy-MM-dd'),
        endDate: format(new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
      });
      setErrors({});
    }
  }, [isOpen]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim() || formData.name.trim().length < 3) {
      newErrors.name = 'Sprint name must be at least 3 characters';
    } else if (formData.name.trim().length > 100) {
      newErrors.name = 'Sprint name must be 100 characters or less';
    }

    if (formData.startDate && formData.endDate && formData.endDate <= formData.startDate) {
      newErrors.endDate = 'End date must be after start date';
    }

    if (formData.goal && formData.goal.length > 500) {
      newErrors.goal = 'Sprint goal must be 500 characters or less';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    createSprintMutation.mutate(formData, {
      onSuccess: () => {
        onClose();
        setFormData({
          name: '',
          goal: '',
          startDate: format(new Date(), 'yyyy-MM-dd'),
          endDate: format(new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
        });
        setErrors({});
      },
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create Sprint">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Sprint Name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="e.g., Sprint 1"
          error={errors.name}
          required
        />

        <Textarea
          label="Sprint Goal (optional)"
          value={formData.goal || ''}
          onChange={(e) => setFormData({ ...formData, goal: e.target.value })}
          placeholder="What do you want to achieve in this sprint?"
          rows={3}
          error={errors.goal}
        />

        <div className="grid grid-cols-2 gap-4">
          <Input
            type="date"
            label="Start Date"
            value={formData.startDate}
            onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
            required
          />
          <Input
            type="date"
            label="End Date"
            value={formData.endDate}
            onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
            error={errors.endDate}
            required
          />
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={createSprintMutation.isPending}>
            {createSprintMutation.isPending ? 'Creating...' : 'Create Sprint'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// Edit Sprint Modal
interface EditSprintModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  sprint: Sprint;
}

function EditSprintModal({ isOpen, onClose, sprint }: EditSprintModalProps) {
  const updateSprintMutation = useUpdateSprint();
  const [formData, setFormData] = useState<UpdateSprintForm>({
    name: sprint.name,
    goal: sprint.goal || '',
    startDate: sprint.startDate,
    endDate: sprint.endDate,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setFormData({
        name: sprint.name,
        goal: sprint.goal || '',
        startDate: sprint.startDate,
        endDate: sprint.endDate,
      });
      setErrors({});
    }
  }, [isOpen, sprint]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name?.trim() || formData.name.trim().length < 3) {
      newErrors.name = 'Sprint name must be at least 3 characters';
    } else if (formData.name!.trim().length > 100) {
      newErrors.name = 'Sprint name must be 100 characters or less';
    }

    if (formData.startDate && formData.endDate && formData.endDate <= formData.startDate) {
      newErrors.endDate = 'End date must be after start date';
    }

    if (formData.goal && formData.goal.length > 500) {
      newErrors.goal = 'Sprint goal must be 500 characters or less';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    updateSprintMutation.mutate(
      { sprintId: sprint.$id, data: formData },
      {
        onSuccess: () => {
          onClose();
          setErrors({});
        },
      }
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Sprint">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Sprint Name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="e.g., Sprint 1"
          error={errors.name}
          required
        />

        <Textarea
          label="Sprint Goal (optional)"
          value={formData.goal || ''}
          onChange={(e) => setFormData({ ...formData, goal: e.target.value })}
          placeholder="What do you want to achieve in this sprint?"
          rows={3}
          error={errors.goal}
        />

        <div className="grid grid-cols-2 gap-4">
          <Input
            type="date"
            label="Start Date"
            value={formData.startDate}
            onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
            required
          />
          <Input
            type="date"
            label="End Date"
            value={formData.endDate}
            onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
            error={errors.endDate}
            required
          />
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={updateSprintMutation.isPending}>
            {updateSprintMutation.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
