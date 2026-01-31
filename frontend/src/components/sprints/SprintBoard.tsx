import { useState } from 'react';
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
import type { Sprint, CreateSprintForm, Ticket } from '@/types';
import {
  useSprints,
  useCreateSprint,
  useStartSprint,
  useCompleteSprint,
  useDeleteSprint,
} from '@/hooks/useSprints';

interface SprintBoardProps {
  projectId: string;
  tickets: Ticket[];
  onTicketClick?: (ticketId: string) => void;
}

export function SprintBoard({ projectId, tickets, onTicketClick }: SprintBoardProps) {
  const { sprints, isLoading } = useSprints(projectId);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [expandedSprints, setExpandedSprints] = useState<Set<string>>(new Set());

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
        <Button
          size="sm"
          leftIcon={<Plus className="h-4 w-4" />}
          onClick={() => setShowCreateModal(true)}
        >
          Create Sprint
        </Button>
      </div>

      {/* Active Sprint */}
      {activeSprint && (
        <SprintCard
          sprint={activeSprint}
          tickets={tickets.filter((t) => t.status !== 'backlog' && t.status !== 'done')}
          isExpanded={expandedSprints.has(activeSprint.$id)}
          onToggle={() => toggleSprintExpanded(activeSprint.$id)}
          onTicketClick={onTicketClick}
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
          {completedSprints.slice(0, 3).map((sprint) => (
            <SprintCard
              key={sprint.$id}
              sprint={sprint}
              tickets={[]}
              isExpanded={expandedSprints.has(sprint.$id)}
              onToggle={() => toggleSprintExpanded(sprint.$id)}
              onTicketClick={onTicketClick}
              isCompleted
            />
          ))}
        </div>
      )}

      {/* Create Sprint Modal */}
      <CreateSprintModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        projectId={projectId}
      />
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
}

function SprintCard({
  sprint,
  tickets,
  isExpanded,
  onToggle,
  onTicketClick,
  isCompleted,
}: SprintCardProps) {
  const startSprintMutation = useStartSprint();
  const completeSprintMutation = useCompleteSprint();
  const deleteSprintMutation = useDeleteSprint();
  const [showMenu, setShowMenu] = useState(false);

  const daysRemaining = differenceInDays(new Date(sprint.endDate), new Date());
  const isActive = sprint.status === 'active';
  const isPlanning = sprint.status === 'planning';

  const statusColors = {
    planning: 'bg-blue-500/20 text-blue-400',
    active: 'bg-green-500/20 text-green-400',
    completed: 'bg-gray-500/20 text-gray-400',
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
                <span className={daysRemaining < 0 ? 'text-red-400' : ''}>
                  {daysRemaining < 0
                    ? `${Math.abs(daysRemaining)} days overdue`
                    : `${daysRemaining} days remaining`}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isPlanning && (
            <Button
              size="sm"
              variant="secondary"
              leftIcon={<Play className="h-4 w-4" />}
              onClick={() => startSprintMutation.mutate(sprint.$id)}
              disabled={startSprintMutation.isPending}
            >
              Start Sprint
            </Button>
          )}
          {isActive && (
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
          <div className="relative">
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
                      // TODO: Open edit modal
                    }}
                  >
                    <Edit className="h-4 w-4" />
                    Edit
                  </button>
                  <button
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-[--color-bg-hover]"
                    onClick={() => {
                      setShowMenu(false);
                      deleteSprintMutation.mutate(sprint.$id);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </button>
                </div>
              </>
            )}
          </div>
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createSprintMutation.mutate(formData, {
      onSuccess: () => {
        onClose();
        setFormData({
          name: '',
          goal: '',
          startDate: format(new Date(), 'yyyy-MM-dd'),
          endDate: format(new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
        });
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
          required
        />

        <Textarea
          label="Sprint Goal (optional)"
          value={formData.goal || ''}
          onChange={(e) => setFormData({ ...formData, goal: e.target.value })}
          placeholder="What do you want to achieve in this sprint?"
          rows={3}
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
