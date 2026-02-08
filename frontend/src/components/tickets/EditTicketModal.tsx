import { useState, useEffect } from 'react';
import { Modal } from '@/components/common/Modal';
import { Input } from '@/components/common/Input';
import { Textarea } from '@/components/common/Textarea';
import { Select } from '@/components/common/Select';
import { Button } from '@/components/common/Button';
import { FileUpload } from '@/components/common/FileUpload';
import type { Ticket, UpdateTicketForm, TicketType, TicketPriority, TicketStatus, ProjectMember } from '@/types';
import {
  TICKET_TYPES,
  TICKET_PRIORITIES,
  TICKET_STATUSES,
  DEFAULT_LABELS,
  VALIDATION,
} from '@/lib/constants';

const VALID_TYPES = ['bug', 'feature', 'task', 'improvement'] as const;
const VALID_PRIORITIES = ['critical', 'high', 'medium', 'low'] as const;

interface EditTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: UpdateTicketForm) => Promise<void>;
  ticket: Ticket;
  members: ProjectMember[];
  isSubmitting?: boolean;
}

export function EditTicketModal({
  isOpen,
  onClose,
  onSubmit,
  ticket,
  members,
  isSubmitting = false,
}: EditTicketModalProps) {
  const [formData, setFormData] = useState<UpdateTicketForm>({
    title: ticket.title,
    description: ticket.description,
    type: ticket.type,
    priority: ticket.priority,
    status: ticket.status,
    assigneeId: ticket.assigneeId,
    labels: ticket.labels,
    dueDate: ticket.dueDate,
  });
  const [attachmentIds, setAttachmentIds] = useState<string[]>(ticket.attachments || []);

  const [errors, setErrors] = useState<Partial<Record<keyof UpdateTicketForm, string>>>({});

  // Update form when ticket changes
  useEffect(() => {
    setFormData({
      title: ticket.title,
      description: ticket.description,
      type: ticket.type,
      priority: ticket.priority,
      status: ticket.status,
      assigneeId: ticket.assigneeId,
      labels: ticket.labels,
      dueDate: ticket.dueDate,
    });
    setAttachmentIds(ticket.attachments || []);
  }, [ticket]);

  const typeOptions = Object.entries(TICKET_TYPES).map(([value, { label }]) => ({
    value,
    label,
  }));

  const priorityOptions = Object.entries(TICKET_PRIORITIES).map(([value, { label }]) => ({
    value,
    label,
  }));

  const statusOptions = Object.entries(TICKET_STATUSES).map(([value, { label }]) => ({
    value,
    label,
  }));

  const assigneeOptions = [
    { value: '', label: 'Unassigned' },
    ...members.map((member) => ({
      value: member.userId,
      label: member.user?.name || member.userId,
    })),
  ];

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof UpdateTicketForm, string>> = {};

    if (formData.title !== undefined) {
      if (!formData.title.trim()) {
        newErrors.title = 'Title is required';
      } else if (formData.title.length < VALIDATION.TICKET_TITLE_MIN) {
        newErrors.title = `Title must be at least ${VALIDATION.TICKET_TITLE_MIN} characters`;
      } else if (formData.title.length > VALIDATION.TICKET_TITLE_MAX) {
        newErrors.title = `Title must be less than ${VALIDATION.TICKET_TITLE_MAX} characters`;
      }
    }

    if (formData.description && formData.description.length > VALIDATION.TICKET_DESCRIPTION_MAX) {
      newErrors.description = `Description must be less than ${VALIDATION.TICKET_DESCRIPTION_MAX} characters`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    // Only include changed fields
    const changes: UpdateTicketForm = {};
    
    if (formData.title !== ticket.title) changes.title = formData.title;
    if (formData.description !== ticket.description) changes.description = formData.description;
    if (formData.type !== ticket.type) changes.type = formData.type;
    if (formData.priority !== ticket.priority) changes.priority = formData.priority;
    if (formData.status !== ticket.status) changes.status = formData.status;
    if (formData.assigneeId !== ticket.assigneeId) changes.assigneeId = formData.assigneeId || undefined;
    if (JSON.stringify(formData.labels) !== JSON.stringify(ticket.labels)) changes.labels = formData.labels;
    if (formData.dueDate !== ticket.dueDate) changes.dueDate = formData.dueDate || undefined;
    if (JSON.stringify(attachmentIds) !== JSON.stringify(ticket.attachments || [])) {
      (changes as Record<string, unknown>).attachments = attachmentIds;
    }

    // Only submit if there are changes
    if (Object.keys(changes).length === 0) {
      onClose();
      return;
    }

    await onSubmit(changes);
    setErrors({});
  };

  const handleClose = () => {
    // Reset to original ticket values
    setFormData({
      title: ticket.title,
      description: ticket.description,
      type: ticket.type,
      priority: ticket.priority,
      status: ticket.status,
      assigneeId: ticket.assigneeId,
      labels: ticket.labels,
      dueDate: ticket.dueDate,
    });
    setAttachmentIds(ticket.attachments || []);
    setErrors({});
    onClose();
  };

  const handleLabelToggle = (label: string) => {
    setFormData((prev) => ({
      ...prev,
      labels: prev.labels?.includes(label)
        ? prev.labels.filter((l) => l !== label)
        : [...(prev.labels || []), label],
    }));
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Edit Ticket" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Title"
          value={formData.title || ''}
          onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
          error={errors.title}
          placeholder="Enter a brief title for the ticket"
          required
        />

        <Textarea
          label="Description"
          value={formData.description || ''}
          onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
          error={errors.description}
          placeholder="Provide more details about the ticket..."
          rows={4}
        />

        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Type"
            value={formData.type || 'task'}
            onChange={(e) => {
              const val = e.target.value;
              if ((VALID_TYPES as readonly string[]).includes(val)) {
                setFormData((prev) => ({ ...prev, type: val as TicketType }));
              }
            }}
            options={typeOptions}
          />

          <Select
            label="Priority"
            value={formData.priority || 'medium'}
            onChange={(e) => {
              const val = e.target.value;
              if ((VALID_PRIORITIES as readonly string[]).includes(val)) {
                setFormData((prev) => ({ ...prev, priority: val as TicketPriority }));
              }
            }}
            options={priorityOptions}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Status"
            value={formData.status || 'todo'}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, status: e.target.value as TicketStatus }))
            }
            options={statusOptions}
          />

          <Select
            label="Assignee"
            value={formData.assigneeId || ''}
            onChange={(e) => setFormData((prev) => ({ ...prev, assigneeId: e.target.value || undefined }))}
            options={assigneeOptions}
          />
        </div>

        <Input
          label="Due Date"
          type="date"
          value={formData.dueDate || ''}
          onChange={(e) => setFormData((prev) => ({ ...prev, dueDate: e.target.value || undefined }))}
        />

        <div>
          <label className="block text-sm font-medium text-[--color-text-secondary] mb-2">Labels</label>
          <div className="flex flex-wrap gap-2">
            {DEFAULT_LABELS.map((label) => (
              <button
                key={label}
                type="button"
                onClick={() => handleLabelToggle(label)}
                className={`px-3 py-1 text-xs rounded-full border transition-colors cursor-pointer ${
                  formData.labels?.includes(label)
                    ? 'bg-[--color-primary-600] border-[--color-primary-600] text-white'
                    : 'border-[--color-border-primary] text-[--color-text-muted] hover:border-[--color-border-secondary]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Attachments */}
        <div>
          <label className="block text-sm font-medium text-[--color-text-secondary] mb-2">Attachments</label>
          <FileUpload
            attachments={attachmentIds}
            onChange={setAttachmentIds}
            maxFiles={5}
          />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-[--color-border-primary]">
          <Button type="button" variant="ghost" onClick={handleClose} className="cursor-pointer">
            Cancel
          </Button>
          <Button type="submit" isLoading={isSubmitting} className="cursor-pointer">
            Save Changes
          </Button>
        </div>
      </form>
    </Modal>
  );
}
