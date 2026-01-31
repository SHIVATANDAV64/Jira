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
        'flex-shrink-0 w-80 rounded-xl bg-[--color-bg-secondary] border transition-colors',
        isOver
          ? 'border-[--color-primary-500]'
          : 'border-[--color-border-primary]'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[--color-border-primary]">
        <div className="flex items-center gap-2">
          <h3 className="font-medium text-[--color-text-primary]">{title}</h3>
          <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[--color-bg-tertiary] px-1.5 text-xs text-[--color-text-muted]">
            {ticketCount}
          </span>
        </div>
      </div>

      {/* Cards */}
      <div className="p-2 space-y-2 min-h-[200px] max-h-[calc(100vh-300px)] overflow-y-auto">
        {children}
        {ticketCount === 0 && (
          <div className="flex items-center justify-center h-24 text-sm text-[--color-text-muted]">
            No tickets
          </div>
        )}
      </div>
    </div>
  );
}
