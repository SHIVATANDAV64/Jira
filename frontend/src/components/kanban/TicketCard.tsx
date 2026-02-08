import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Link, useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';
import {
  Paperclip,
  Calendar,
  MoreHorizontal,
  Edit2,
  Trash2,
  ArrowRight,
  UserPlus,
  ExternalLink,
  Copy,
} from 'lucide-react';
import { format } from 'date-fns';
import { PriorityBadge, TypeBadge, StatusBadge } from '@/components/common/Badge';
import { Avatar } from '@/components/common/Avatar';
import { TICKET_STATUS_ORDER } from '@/lib/constants';
import type { Ticket, TicketStatus } from '@/types';

interface TicketCardProps {
  ticket: Ticket;
  projectKey: string;
  isDragging?: boolean;
  onEdit?: (ticket: Ticket) => void;
  onDelete?: (ticketId: string) => void;
  onStatusChange?: (ticketId: string, status: TicketStatus) => void;
  onAssign?: (ticketId: string) => void;
  showContextMenu?: boolean;
}

export function TicketCard({
  ticket,
  projectKey,
  isDragging,
  onEdit,
  onDelete,
  onStatusChange,
  onAssign,
  showContextMenu = true,
}: TicketCardProps) {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const [statusSubmenuOpen, setStatusSubmenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
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

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (
        menuRef.current && 
        !menuRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        setMenuOpen(false);
        setStatusSubmenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    // Also update position on scroll to prevent detachment (simple close is better for performance)
    const handleScroll = () => {
        if(menuOpen) setMenuOpen(false);
    };
    window.addEventListener('scroll', handleScroll, true); 
    
    return () => {
        document.removeEventListener('mousedown', handleClick);
        window.removeEventListener('scroll', handleScroll, true);
    };
  }, [menuOpen]);

  const handleMenuClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (menuOpen) {
        setMenuOpen(false);
        return;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    // Position: Bottom-Right aligned to the trigger
    // 192px is w-48
    setMenuPosition({
        top: rect.bottom + window.scrollY + 4,
        left: rect.right + window.scrollX - 192 + (rect.width > 20 ? 0 : 0) // Align right edge
    });
    setMenuOpen(true);
    setStatusSubmenuOpen(false);
  };

  const handleAction = (e: React.MouseEvent, action: () => void) => {
    e.preventDefault();
    e.stopPropagation();
    action();
    setMenuOpen(false);
    setStatusSubmenuOpen(false);
  };

  const handleCopyKey = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(ticketKey);
    setMenuOpen(false);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={clsx(
        'group relative block rounded-md border bg-[var(--color-bg-secondary)] p-3',
        'transition-shadow',
        isDragging || isSortableDragging
          ? 'border-[var(--color-primary-500)] shadow-lg opacity-90'
          : 'border-[var(--color-border-primary)] hover:shadow-md'
      )}
    >
      {/* Click handler for the card body */}
      <Link
        to={`tickets/${ticket.$id}`}
        className="absolute inset-0 z-0 rounded-lg"
        aria-label={`Open ticket ${ticketKey}`}
      />

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-[var(--color-text-muted)]">
          {ticketKey}
        </span>
        <div className="flex items-center gap-1">
          <TypeBadge type={ticket.type} />
          {/* 3-dot context menu */}
          {showContextMenu && (
            <div className="relative">
              <button
                ref={triggerRef}
                onClick={handleMenuClick}
                className={clsx(
                  'p-1 rounded-md transition-all cursor-pointer',
                  menuOpen
                    ? 'bg-[var(--color-bg-hover)] text-[var(--color-text-primary)]'
                    : 'opacity-0 group-hover:opacity-100 hover:bg-[var(--color-bg-hover)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
                )}
                aria-label="Ticket actions"
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>

              {menuOpen && menuPosition && createPortal(
                <div 
                    ref={menuRef}
                    style={{ 
                        position: 'absolute',
                        top: menuPosition.top,
                        left: menuPosition.left,
                        zIndex: 9999
                    }}
                    className="w-48 rounded-md border border-[var(--color-border-primary)] bg-[var(--color-bg-secondary)] shadow-lg py-1"
                >
                  {/* Open in new view */}
                  <button
                    onClick={(e) => handleAction(e, () => navigate(`tickets/${ticket.$id}`))}
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text-primary)] cursor-pointer"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Open ticket
                  </button>

                  {/* Copy ticket key */}
                  <button
                    onClick={handleCopyKey}
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text-primary)] cursor-pointer"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    Copy ticket key
                  </button>

                  <div className="my-1 border-t border-[var(--color-border-primary)]" />

                  {/* Change status */}
                  <div className="relative">
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setStatusSubmenuOpen(!statusSubmenuOpen);
                      }}
                      className="flex w-full items-center justify-between px-3 py-2 text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text-primary)] cursor-pointer"
                    >
                      <span className="flex items-center gap-2">
                        <ArrowRight className="h-3.5 w-3.5" />
                        Move to
                      </span>
                      <ArrowRight className="h-3 w-3" />
                    </button>
                    {statusSubmenuOpen && (
                      <div className="absolute left-full top-0 ml-1 w-36 rounded-md border border-[var(--color-border-primary)] bg-[var(--color-bg-secondary)] shadow-lg py-1">
                        {TICKET_STATUS_ORDER.filter((s) => s !== ticket.status).map((status) => (
                          <button
                            key={status}
                            onClick={(e) =>
                              handleAction(e, () => {
                                if (onStatusChange) onStatusChange(ticket.$id, status);
                              })
                            }
                            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text-primary)] cursor-pointer"
                          >
                            <StatusBadge status={status} />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Assign */}
                  {onAssign && (
                    <button
                      onClick={(e) => handleAction(e, () => onAssign(ticket.$id))}
                      className="flex w-full items-center gap-2 px-3 py-2 text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text-primary)] cursor-pointer"
                    >
                      <UserPlus className="h-3.5 w-3.5" />
                      {ticket.assigneeId ? 'Reassign' : 'Assign'}
                    </button>
                  )}

                  {/* Edit */}
                  {onEdit && (
                    <>
                      <div className="my-1 border-t border-[var(--color-border-primary)]" />
                      <button
                        onClick={(e) => handleAction(e, () => onEdit(ticket))}
                        className="flex w-full items-center gap-2 px-3 py-2 text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text-primary)] cursor-pointer"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                        Edit ticket
                      </button>
                    </>
                  )}

                  {/* Delete */}
                  {onDelete && (
                    <button
                      onClick={(e) => handleAction(e, () => {
                        if (confirm('Are you sure you want to delete this ticket?')) {
                          onDelete(ticket.$id);
                        }
                      })}
                      className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete ticket
                    </button>
                  )}
                </div>,
                document.body
              )}
            </div>
          )}
        </div>
      </div>

      {/* Title */}
      <h4 className="relative z-10 text-sm font-medium text-[var(--color-text-primary)] mb-2 line-clamp-2">
        {ticket.title}
      </h4>

      {/* Labels */}
      {ticket.labels.length > 0 && (
        <div className="relative z-10 flex flex-wrap gap-1 mb-2">
          {ticket.labels.slice(0, 3).map((label) => (
            <span
              key={label}
              className="rounded bg-[var(--color-bg-tertiary)] px-1.5 py-0.5 text-xs text-[var(--color-text-muted)]"
            >
              {label}
            </span>
          ))}
          {ticket.labels.length > 3 && (
            <span className="text-xs text-[var(--color-text-muted)]">
              +{ticket.labels.length - 3}
            </span>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="relative z-10 flex items-center justify-between pt-2 border-t border-[var(--color-border-primary)]">
        <div className="flex items-center gap-2">
          <PriorityBadge priority={ticket.priority} />
          {ticket.dueDate && (
            <span className="flex items-center gap-1 text-xs text-[var(--color-text-muted)]">
              <Calendar className="h-3 w-3" />
              {format(new Date(ticket.dueDate), 'MMM d')}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Attachments placeholder */}
          {ticket.attachments && ticket.attachments.length > 0 && (
            <span className="flex items-center gap-1 text-xs text-[var(--color-text-muted)]">
              <Paperclip className="h-3 w-3" />
              {ticket.attachments.length}
            </span>
          )}

          {/* Assignee */}
          {ticket.assignee && (
            <Avatar
              userId={ticket.assignee.$id}
              name={ticket.assignee.name}
              avatarId={ticket.assignee.avatar || ticket.assignee.prefs?.avatar}
              size="sm"
            />
          )}
        </div>
      </div>
    </div>
  );
}
