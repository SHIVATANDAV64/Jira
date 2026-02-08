import { useMemo, useState } from 'react';
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
import { KanbanColumn } from './KanbanColumn';
import { TicketCard } from './TicketCard';
import { TICKET_STATUS_ORDER, TICKET_STATUSES } from '@/lib/constants';
import { usePermissions } from '@/hooks/usePermissions';
import type { Ticket, TicketStatus, KanbanColumn as KanbanColumnType, ProjectMember } from '@/types';

interface KanbanBoardProps {
  tickets: Ticket[];
  projectKey: string;
  onTicketMove: (ticketId: string, newStatus: TicketStatus, newOrder: number) => void;
  onTicketEdit?: (ticket: Ticket) => void;
  onTicketDelete?: (ticketId: string) => void;
  onTicketAssign?: (ticketId: string) => void;
  members?: ProjectMember[];
  hasActiveFilters?: boolean;
}

export function KanbanBoard({ tickets, projectKey, onTicketMove, onTicketEdit, onTicketDelete, onTicketAssign, members = [], hasActiveFilters = false }: KanbanBoardProps) {
  const [activeTicket, setActiveTicket] = useState<Ticket | null>(null);
  const { permissions } = usePermissions(members);

  // Normalize orders when they get too many decimal places
  const normalizedTickets = useMemo(() => {
    const allOrders = tickets.map((t) => t.order);
    const maxDecimals = Math.max(
      ...allOrders.map((order) => {
        const decimalPart = order.toString().split('.')[1];
        return decimalPart ? decimalPart.length : 0;
      })
    );

    // If more than 4 decimal places, normalize all orders
    if (maxDecimals > 4) {
      return tickets.map((ticket, index) => ({
        ...ticket,
        order: index,
      }));
    }

    return tickets;
  }, [tickets]);

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
      tickets: normalizedTickets
        .filter((ticket) => ticket.status === status)
        .sort((a, b) => a.order - b.order),
    }));
  }, [normalizedTickets]);

  const handleDragStart = (event: DragStartEvent) => {
    if (!permissions.canMoveTickets) return;
    const ticket = normalizedTickets.find((t) => t.$id === event.active.id);
    if (ticket) {
      setActiveTicket(ticket);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTicket(null);

    if (!over || !permissions.canMoveTickets) return;

    const ticketId = active.id as string;
    const overId = over.id as string;

    // Get the ticket being moved
    const movingTicket = normalizedTickets.find((t) => t.$id === ticketId);
    if (!movingTicket) return;

    // Check if dropped on a column
    if (TICKET_STATUS_ORDER.includes(overId as TicketStatus)) {
      const targetStatus = overId as TicketStatus;
      const columnTickets = normalizedTickets.filter((t) => t.status === targetStatus);
      // Place at the beginning of the column
      const newOrder = columnTickets.length > 0 ? Math.min(...columnTickets.map((t) => t.order)) - 1 : 0;
      onTicketMove(ticketId, targetStatus, newOrder);
      return;
    }

    // Check if dropped on another ticket
    const overTicket = normalizedTickets.find((t) => t.$id === overId);
    if (overTicket) {
      // Don't move if same ticket and same status (dropped on itself at same position)
      if (movingTicket.$id === overTicket.$id || (movingTicket.status === overTicket.status && movingTicket.order === overTicket.order)) {
        return;
      }
      // Place after the ticket we dropped on
      const newOrder = overTicket.order + 0.5;
      onTicketMove(ticketId, overTicket.status, newOrder);
    }
  };

  const allColumnsEmpty = columns.every((col) => col.tickets.length === 0);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      {/* TKT-30: Show message when filters result in no tickets */}
      {allColumnsEmpty && hasActiveFilters && (
        <div className="text-center py-12 mb-4 rounded-lg border border-dashed border-[var(--color-border-primary)] bg-[var(--color-bg-secondary)]">
          <p className="text-[var(--color-text-muted)] text-sm">No tickets match your current filters.</p>
          <p className="text-[var(--color-text-muted)] text-xs mt-1">Try adjusting or clearing your filters.</p>
        </div>
      )}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {columns.map((column) => {
          const hasTickets = column.tickets.length > 0;
          return (
            <SortableContext
              key={column.id}
              items={column.tickets.map((t) => t.$id)}
              strategy={verticalListSortingStrategy}
              disabled={!permissions.canMoveTickets}
            >
              <KanbanColumn
                id={column.id}
                title={column.title}
                ticketCount={column.tickets.length}
              >
                {hasTickets ? (
                  column.tickets.map((ticket) => (
                    <TicketCard
                      key={ticket.$id}
                      ticket={ticket}
                      projectKey={projectKey}
                      onEdit={onTicketEdit}
                      onDelete={onTicketDelete}
                      onStatusChange={(ticketId, newStatus) => onTicketMove(ticketId, newStatus, 0)}
                      onAssign={onTicketAssign}
                    />
                  ))
                ) : (
                  <div className="text-center py-8 text-[var(--color-text-muted)]">
                    <p className="text-sm">No tickets to display</p>
                  </div>
                )}
              </KanbanColumn>
            </SortableContext>
          );
        })}
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
