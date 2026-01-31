import type { TicketStatus, TicketPriority, TicketType, ProjectRole } from '@/types';

// Icon names that map to Lucide icons
export type PriorityIconName = 'AlertOctagon' | 'ChevronUp' | 'Minus' | 'ChevronDown';
export type TypeIconName = 'Bug' | 'Sparkles' | 'ClipboardList' | 'Lightbulb';

// Ticket Status Configuration
export const TICKET_STATUSES: Record<TicketStatus, { label: string; color: string }> = {
  backlog: { label: 'Backlog', color: 'bg-gray-500' },
  todo: { label: 'To Do', color: 'bg-blue-500' },
  in_progress: { label: 'In Progress', color: 'bg-yellow-500' },
  in_review: { label: 'In Review', color: 'bg-purple-500' },
  done: { label: 'Done', color: 'bg-green-500' },
};

export const TICKET_STATUS_ORDER: TicketStatus[] = [
  'backlog',
  'todo',
  'in_progress',
  'in_review',
  'done',
];

// Ticket Priority Configuration
export const TICKET_PRIORITIES: Record<TicketPriority, { label: string; color: string; iconName: PriorityIconName }> = {
  critical: { label: 'Critical', color: 'text-red-500 bg-red-500/10', iconName: 'AlertOctagon' },
  high: { label: 'High', color: 'text-orange-500 bg-orange-500/10', iconName: 'ChevronUp' },
  medium: { label: 'Medium', color: 'text-yellow-500 bg-yellow-500/10', iconName: 'Minus' },
  low: { label: 'Low', color: 'text-green-500 bg-green-500/10', iconName: 'ChevronDown' },
};

// Ticket Type Configuration
export const TICKET_TYPES: Record<TicketType, { label: string; color: string; iconName: TypeIconName }> = {
  bug: { label: 'Bug', color: 'text-red-400 bg-red-400/10', iconName: 'Bug' },
  feature: { label: 'Feature', color: 'text-purple-400 bg-purple-400/10', iconName: 'Sparkles' },
  task: { label: 'Task', color: 'text-blue-400 bg-blue-400/10', iconName: 'ClipboardList' },
  improvement: { label: 'Improvement', color: 'text-cyan-400 bg-cyan-400/10', iconName: 'Lightbulb' },
};

// Project Role Configuration
export const PROJECT_ROLES: Record<ProjectRole, { label: string; description: string }> = {
  admin: { 
    label: 'Admin', 
    description: 'Full access to project settings, members, and all tickets' 
  },
  manager: { 
    label: 'Manager', 
    description: 'Can manage members and all tickets, but cannot delete project' 
  },
  developer: { 
    label: 'Developer', 
    description: 'Can create, edit, and move tickets assigned to them' 
  },
  viewer: { 
    label: 'Viewer', 
    description: 'Read-only access, can only add comments' 
  },
};

// Default Labels
export const DEFAULT_LABELS = [
  'frontend',
  'backend',
  'api',
  'database',
  'ui/ux',
  'documentation',
  'testing',
  'performance',
  'security',
  'refactor',
];

// Pagination
export const DEFAULT_PAGE_SIZE = 25;
export const MAX_PAGE_SIZE = 100;

// Validation
export const VALIDATION = {
  PROJECT_NAME_MIN: 3,
  PROJECT_NAME_MAX: 100,
  PROJECT_KEY_MIN: 2,
  PROJECT_KEY_MAX: 10,
  TICKET_TITLE_MIN: 5,
  TICKET_TITLE_MAX: 200,
  TICKET_DESCRIPTION_MAX: 10000,
  COMMENT_MIN: 1,
  COMMENT_MAX: 5000,
};

// Date formats
export const DATE_FORMAT = {
  DISPLAY: 'MMM d, yyyy',
  DISPLAY_WITH_TIME: 'MMM d, yyyy h:mm a',
  INPUT: 'yyyy-MM-dd',
};

// Keyboard shortcuts
export const SHORTCUTS = {
  CREATE_TICKET: 'c',
  SEARCH: '/',
  ESCAPE: 'Escape',
};
