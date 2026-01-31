import { useMemo } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useState } from 'react';
import { KanbanColumn } from './KanbanColumn';
import { TicketCard } from './TicketCard';
import { TICKET_STATUS_ORDER, TICKET_STATUSES } from '@/lib/constants';
import type { Ticket, TicketStatus, KanbanColumn as KanbanColumnType } from '@/types';

interface KanbanBoardProps {
  tickets: Ticket[];
  projectKey: string;
  onTicketMove: (ticketId: string, newStatus: TicketStatus, newOrder: number) => void;
}

export function KanbanBoard({ tickets, projectKey, onTicketMove }: KanbanBoardProps) {
  const [activeTicket, setActiveTicket] = useState<Ticket | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor)
  );

  const columns: KanbanColumnType[] = useMemo(() => {
    return TICKET_STATUS_ORDER.map((status) => ({
      id: status,
      title: TICKET_STATUSES[status].label,
      tickets: tickets
        .filter((ticket) => ticket.status === status)
        .sort((a, b) => a.order - b.order),
    }));
  }, [tickets]);

  const handleDragStart = (event: DragStartEvent) => {
    const ticket = tickets.find((t) => t.$id === event.active.id);
    if (ticket) {
      setActiveTicket(ticket);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTicket(null);

    if (!over) return;

    const ticketId = active.id as string;
    const overId = over.id as string;

    // Get the ticket being moved
    const movingTicket = tickets.find((t) => t.$id === ticketId);
    if (!movingTicket) return;

    // Check if dropped on a column
    if (TICKET_STATUS_ORDER.includes(overId as TicketStatus)) {
      const targetStatus = overId as TicketStatus;
      const columnTickets = tickets.filter((t) => t.status === targetStatus);
      // Place at the end of the column
      const newOrder = columnTickets.length > 0 
        ? Math.max(...columnTickets.map((t) => t.order)) + 1 
        : 0;
      onTicketMove(ticketId, targetStatus, newOrder);
      return;
    }

    // Check if dropped on another ticket
    const overTicket = tickets.find((t) => t.$id === overId);
    if (overTicket) {
      // Place after the ticket we dropped on
      onTicketMove(ticketId, overTicket.status, overTicket.order + 0.5);
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4">
        {columns.map((column) => (
          <SortableContext
            key={column.id}
            items={column.tickets.map((t) => t.$id)}
            strategy={verticalListSortingStrategy}
          >
            <KanbanColumn
              id={column.id}
              title={column.title}
              ticketCount={column.tickets.length}
            >
              {column.tickets.map((ticket) => (
                <TicketCard
                  key={ticket.$id}
                  ticket={ticket}
                  projectKey={projectKey}
                />
              ))}
            </KanbanColumn>
          </SortableContext>
        ))}
      </div>

      <DragOverlay>
        {activeTicket && (
          <TicketCard
            ticket={activeTicket}
            projectKey={projectKey}
            isDragging
          />
        )}
      </DragOverlay>
    </DndContext>
  );
}
