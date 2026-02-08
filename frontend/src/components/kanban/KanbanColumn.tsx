import { useDroppable } from '@dnd-kit/core';
import { clsx } from 'clsx';
import type { ReactNode } from 'react';
import type { TicketStatus } from '@/types';

interface KanbanColumnProps {
  id: TicketStatus;
  title: string;
  ticketCount: number;
  children: ReactNode;
}

export function KanbanColumn({ id, title, ticketCount, children }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={clsx(
        'w-full rounded-lg bg-[var(--color-bg-tertiary)] transition-colors',
        isOver
          ? 'ring-2 ring-[var(--color-primary-500)]'
          : ''
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5">
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">{title}</h3>
          <span className="text-xs text-[var(--color-text-muted)]">
            {ticketCount}
          </span>
        </div>
      </div>

      {/* Cards */}
      <div className="px-2 pb-2 space-y-1.5 min-h-[100px] max-h-[calc(100vh-250px)] overflow-y-auto">
        {children}
        {ticketCount === 0 && (
          <div className="flex items-center justify-center h-20 text-xs text-[var(--color-text-muted)]">
            No tickets
          </div>
        )}
      </div>
    </div>
  );
}
