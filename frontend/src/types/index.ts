// User types
export interface User {
  $id: string;
  email: string;
  name: string;
  avatar?: string;
  $createdAt: string;
  $updatedAt: string;
}

// Project types
export interface Project {
  $id: string;
  name: string;
  description: string;
  key: string; // e.g., "BUG", "FEAT" - used for ticket numbering
  ownerId: string;
  teamId: string;
  status: ProjectStatus;
  $createdAt: string;
  $updatedAt: string;
  userRole?: ProjectRole;
}

export type ProjectStatus = 'active' | 'archived';

// Project Member types
export interface ProjectMember {
  $id: string;
  projectId: string;
  userId: string;
  role: ProjectRole;
  user?: User;
  $createdAt: string;
  $updatedAt: string;
}

export type ProjectRole = 'admin' | 'manager' | 'developer' | 'viewer';

// Ticket types
export interface Ticket {
  $id: string;
  projectId: string;
  ticketNumber: number;
  title: string;
  description: string;
  type: TicketType;
  status: TicketStatus;
  priority: TicketPriority;
  reporterId: string;
  assigneeId?: string;
  labels: string[];
  dueDate?: string;
  order: number;
  ticketKey?: string;
  sprintId?: string;
  attachments?: string[];
  reporter?: User;
  assignee?: User;
  $createdAt: string;
  $updatedAt: string;
}

export type TicketType = 'bug' | 'feature' | 'task' | 'improvement';

export type TicketStatus = 'backlog' | 'todo' | 'in_progress' | 'in_review' | 'done';

export type TicketPriority = 'critical' | 'high' | 'medium' | 'low';

// Comment types
export interface Comment {
  $id: string;
  ticketId: string;
  userId: string;
  content: string;
  parentId?: string;
  user?: User;
  replies?: Comment[];
  $createdAt: string;
  $updatedAt: string;
}

// Activity Log types
export interface ActivityLog {
  $id: string;
  projectId: string;
  ticketId?: string;
  userId: string;
  action: ActivityAction;
  details: string | Record<string, unknown>;
  user?: User;
  $createdAt: string;
}

export type ActivityAction =
  | 'ticket_created'
  | 'ticket_updated'
  | 'ticket_deleted'
  | 'ticket_moved'
  | 'ticket_assigned'
  | 'comment_added'
  | 'comment_deleted'
  | 'member_added'
  | 'member_removed'
  | 'member_role_changed'
  | 'project_created'
  | 'project_updated'
  | 'sprint_created'
  | 'sprint_started'
  | 'sprint_completed'
  | 'sprint_deleted';

// Kanban types
export interface KanbanColumn {
  id: TicketStatus;
  title: string;
  tickets: Ticket[];
}

// Filter types
export interface TicketFilters {
  status?: TicketStatus[];
  priority?: TicketPriority[];
  type?: TicketType[];
  assigneeId?: string;
  reporterId?: string;
  labels?: string[];
  search?: string;
}

// Form types
export interface CreateProjectForm {
  name: string;
  description: string;
  key: string;
}

export interface CreateTicketForm {
  title: string;
  description: string;
  type: TicketType;
  priority: TicketPriority;
  status?: TicketStatus;
  assigneeId?: string;
  labels?: string[];
  dueDate?: string;
  attachments?: string[];
}

export interface UpdateTicketForm extends Partial<CreateTicketForm> {
  // Note: status changes go through moveTicket(), not updateTicket()
  // Assignee changes go through assignTicket(), not updateTicket()
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T> {
  documents: T[];
  total: number;
}

// Permission types
export interface RolePermissions {
  canCreateTickets: boolean;
  canEditTickets: boolean;
  canDeleteTickets: boolean;
  canAssignTickets: boolean;
  canMoveTickets: boolean;
  canManageMembers: boolean;
  canEditProject: boolean;
  canDeleteProject: boolean;
  canComment: boolean;
}

// Appwrite Realtime Response type
export interface RealtimeResponse<T = unknown> {
  events: string[];
  payload: T;
  channels: string[];
  timestamp: string | number;
}

// Sprint types
export interface Sprint {
  $id: string;
  projectId: string;
  name: string;
  goal?: string;
  startDate: string;
  endDate: string;
  status: SprintStatus;
  $createdAt: string;
  $updatedAt: string;
}

export type SprintStatus = 'planning' | 'active' | 'completed';

export interface CreateSprintForm {
  name: string;
  goal?: string;
  startDate: string;
  endDate: string;
}

export interface UpdateSprintForm extends Partial<CreateSprintForm> {
  status?: SprintStatus;
}

// Notification types
export interface Notification {
  $id: string;
  userId: string;
  projectId?: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  actionUrl?: string;
  metadata?: Record<string, unknown>;
  $createdAt: string;
}

export type NotificationType =
  | 'ticket_assigned'
  | 'ticket_updated'
  | 'ticket_mentioned'
  | 'comment_added'
  | 'comment_reply'
  | 'member_added'
  | 'sprint_started'
  | 'sprint_ended'
  | 'due_date_reminder';

export const ROLE_PERMISSIONS: Record<ProjectRole, RolePermissions> = {
  admin: {
    canCreateTickets: true,
    canEditTickets: true,
    canDeleteTickets: true,
    canAssignTickets: true,
    canMoveTickets: true,
    canManageMembers: true,
    canEditProject: true,
    canDeleteProject: true,
    canComment: true,
  },
  manager: {
    canCreateTickets: true,
    canEditTickets: true,
    canDeleteTickets: true,
    canAssignTickets: true,
    canMoveTickets: true,
    canManageMembers: true,
    canEditProject: true,
    canDeleteProject: false,
    canComment: true,
  },
  developer: {
    canCreateTickets: true,
    canEditTickets: true,
    canDeleteTickets: false,
    canAssignTickets: true,
    canMoveTickets: true,
    canManageMembers: false,
    canEditProject: false,
    canDeleteProject: false,
    canComment: true,
  },
  viewer: {
    canCreateTickets: false,
    canEditTickets: false,
    canDeleteTickets: false,
    canAssignTickets: false,
    canMoveTickets: false,
    canManageMembers: false,
    canEditProject: false,
    canDeleteProject: false,
    canComment: true,
  },
};
