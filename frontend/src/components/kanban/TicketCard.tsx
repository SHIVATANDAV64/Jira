import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Link } from 'react-router-dom';
import { clsx } from 'clsx';
import { MessageSquare, Paperclip, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { PriorityBadge, TypeBadge } from '@/components/common/Badge';
import { Avatar } from '@/components/common/Avatar';
import type { Ticket } from '@/types';

interface TicketCardProps {
  ticket: Ticket;
  projectKey: string;
  isDragging?: boolean;
}

export function TicketCard({ ticket, projectKey, isDragging }: TicketCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: ticket.$id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const ticketKey = `${projectKey}-${ticket.ticketNumber}`;

  return (
    <Link
      to={`tickets/${ticket.$id}`}
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={clsx(
        'block rounded-lg border bg-[--color-bg-primary] p-3',
        'transition-all duration-200 ease-out',
        isDragging || isSortableDragging
          ? 'border-[--color-primary-500] shadow-xl shadow-[--color-primary-500]/20 opacity-95 scale-[1.02] rotate-1'
          : 'border-[--color-border-primary] hover:border-[--color-primary-500]/50 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/20'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-[--color-text-muted]">
          {ticketKey}
        </span>
        <TypeBadge type={ticket.type} />
      </div>

      {/* Title */}
      <h4 className="text-sm font-medium text-[--color-text-primary] mb-2 line-clamp-2">
        {ticket.title}
      </h4>

      {/* Labels */}
      {ticket.labels.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {ticket.labels.slice(0, 3).map((label) => (
            <span
              key={label}
              className="rounded bg-[--color-bg-tertiary] px-1.5 py-0.5 text-xs text-[--color-text-muted]"
            >
              {label}
            </span>
          ))}
          {ticket.labels.length > 3 && (
            <span className="text-xs text-[--color-text-muted]">
              +{ticket.labels.length - 3}
            </span>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-[--color-border-primary]">
        <div className="flex items-center gap-2">
          <PriorityBadge priority={ticket.priority} />
          {ticket.dueDate && (
            <span className="flex items-center gap-1 text-xs text-[--color-text-muted]">
              <Calendar className="h-3 w-3" />
              {format(new Date(ticket.dueDate), 'MMM d')}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Comment count placeholder */}
          <span className="flex items-center gap-1 text-xs text-[--color-text-muted]">
            <MessageSquare className="h-3 w-3" />
            0
          </span>

          {/* Attachments placeholder */}
          {ticket.attachments && ticket.attachments.length > 0 && (
            <span className="flex items-center gap-1 text-xs text-[--color-text-muted]">
              <Paperclip className="h-3 w-3" />
              {ticket.attachments.length}
            </span>
          )}

          {/* Assignee */}
          {ticket.assignee && (
            <Avatar
              userId={ticket.assignee.$id}
              name={ticket.assignee.name}
              size="sm"
            />
          )}
        </div>
      </div>
    </Link>
  );
}
