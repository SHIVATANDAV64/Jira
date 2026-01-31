import { useState } from 'react';
import { Modal } from '@/components/common/Modal';
import { Input } from '@/components/common/Input';
import { Textarea } from '@/components/common/Textarea';
import { Select } from '@/components/common/Select';
import { Button } from '@/components/common/Button';
import type { CreateTicketForm, TicketType, TicketPriority, ProjectMember } from '@/types';
import { TICKET_TYPES, TICKET_PRIORITIES, DEFAULT_LABELS, VALIDATION } from '@/lib/constants';

interface CreateTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateTicketForm) => Promise<void>;
  members: ProjectMember[];
  projectKey: string;
  isSubmitting?: boolean;
}

export function CreateTicketModal({
  isOpen,
  onClose,
  onSubmit,
  members,
  projectKey,
  isSubmitting = false,
}: CreateTicketModalProps) {
  const [formData, setFormData] = useState<CreateTicketForm>({
    title: '',
    description: '',
    type: 'task',
    priority: 'medium',
    assigneeId: undefined,
    labels: [],
    dueDate: undefined,
  });

  const [errors, setErrors] = useState<Partial<Record<keyof CreateTicketForm, string>>>({});

  const typeOptions = Object.entries(TICKET_TYPES).map(([value, { label }]) => ({
    value,
    label,
  }));

  const priorityOptions = Object.entries(TICKET_PRIORITIES).map(([value, { label }]) => ({
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
    const newErrors: Partial<Record<keyof CreateTicketForm, string>> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    } else if (formData.title.length < VALIDATION.TICKET_TITLE_MIN) {
      newErrors.title = `Title must be at least ${VALIDATION.TICKET_TITLE_MIN} characters`;
    } else if (formData.title.length > VALIDATION.TICKET_TITLE_MAX) {
      newErrors.title = `Title must be less than ${VALIDATION.TICKET_TITLE_MAX} characters`;
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

    await onSubmit({
      ...formData,
      assigneeId: formData.assigneeId || undefined,
    });

    // Reset form
    setFormData({
      title: '',
      description: '',
      type: 'task',
      priority: 'medium',
      assigneeId: undefined,
      labels: [],
      dueDate: undefined,
    });
    setErrors({});
  };

  const handleClose = () => {
    setFormData({
      title: '',
      description: '',
      type: 'task',
      priority: 'medium',
      assigneeId: undefined,
      labels: [],
      dueDate: undefined,
    });
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
    <Modal isOpen={isOpen} onClose={handleClose} title={`Create Ticket in ${projectKey}`} size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Title"
          value={formData.title}
          onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
          error={errors.title}
          placeholder="Enter a brief title for the ticket"
          required
        />

        <Textarea
          label="Description"
          value={formData.description}
          onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
          error={errors.description}
          placeholder="Provide more details about the ticket..."
          rows={4}
        />

        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Type"
            value={formData.type}
            onChange={(e) => setFormData((prev) => ({ ...prev, type: e.target.value as TicketType }))}
            options={typeOptions}
          />

          <Select
            label="Priority"
            value={formData.priority}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, priority: e.target.value as TicketPriority }))
            }
            options={priorityOptions}
          />
        </div>

        <Select
          label="Assignee"
          value={formData.assigneeId || ''}
          onChange={(e) => setFormData((prev) => ({ ...prev, assigneeId: e.target.value || undefined }))}
          options={assigneeOptions}
        />

        <Input
          label="Due Date"
          type="date"
          value={formData.dueDate || ''}
          onChange={(e) => setFormData((prev) => ({ ...prev, dueDate: e.target.value || undefined }))}
        />

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Labels</label>
          <div className="flex flex-wrap gap-2">
            {DEFAULT_LABELS.map((label) => (
              <button
                key={label}
                type="button"
                onClick={() => handleLabelToggle(label)}
                className={`px-3 py-1 text-xs rounded-full border transition-colors cursor-pointer ${
                  formData.labels?.includes(label)
                    ? 'bg-primary-600 border-primary-600 text-white'
                    : 'border-gray-600 text-gray-400 hover:border-gray-500'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-700">
          <Button type="button" variant="ghost" onClick={handleClose} className="cursor-pointer">
            Cancel
          </Button>
          <Button type="submit" isLoading={isSubmitting} className="cursor-pointer">
            Create Ticket
          </Button>
        </div>
      </form>
    </Modal>
  );
}
