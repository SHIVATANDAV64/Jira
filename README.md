<p align="center">
  <h1 align="center">Jerah</h1>
  <p align="center">Open-source project management for development teams</p>
</p>

## About

Jerah is a project management and issue tracking platform built for teams that want a clean, fast alternative to bloated enterprise tools. Track issues, manage sprints, and collaborate — without the complexity.

## Features

- **Issues** — Create and manage tickets with types (bug, feature, task, improvement), priorities, statuses, labels, and due dates.
- **Kanban Board** — Drag-and-drop board with real-time updates across columns.
- **Sprints** — Plan sprints, track progress with time remaining and completion metrics, and review sprint health from the dashboard.
- **Backlog** — Organize and prioritize upcoming work. Move tickets into sprints when ready.
- **Team Management** — Invite members with role-based access control (Admin, Manager, Developer, Viewer).
- **Activity & Comments** — Threaded comments on tickets. Full activity log for audit trails.
- **Search & Filters** — Filter tickets by status, priority, assignee, type, and labels.
- **Notifications** — In-app notifications for assignments, comments, and status changes.
- **Attachments** — Upload files to tickets and user avatars.
- **Authentication** — Email/password and Google OAuth support.

## Tech Stack

| Layer | Technologies |
|-------|-------------|
| Frontend | React 19, TypeScript, Vite, Tailwind CSS v4 |
| State & Data | TanStack Query, Zustand, React Router v7 |
| Backend | Appwrite (Cloud Functions, Database, Auth, Storage) |
| Libraries | dnd-kit, date-fns, Lucide Icons |

## Getting Started

### Prerequisites

- Node.js 18+
- An [Appwrite](https://cloud.appwrite.io) account (Cloud or self-hosted)

### Setup

```bash
# Clone the repository
git clone <repository-url>
cd Jira

# Install frontend dependencies
cd frontend
npm install

# Configure environment
cp .env.example .env
# Edit .env with your Appwrite project credentials (see .env.example for all required variables)

# Start development server
npm run dev
```

The app will be available at `http://localhost:5173`.

### Appwrite Setup

1. Create a project in the Appwrite Console.
2. Create the required database collections: `projects`, `tickets`, `project_members`, `comments`, `sprints`, `activity_logs`, `notifications`.
3. Create storage buckets: `attachments`, `avatars`.
4. Deploy the cloud functions from `backend/functions/`.
5. (Optional) Enable Google OAuth under Auth → Settings → OAuth2 Providers.

> Refer to `frontend/.env.example` for the full list of required environment variable IDs.

## Project Structure

```
backend/
  functions/           # Appwrite cloud functions (one per operation)
    create-project/
    create-ticket/
    get-projects/
    get-tickets/
    manage-ticket/
    move-ticket/
    invite-member/
    manage-member/
    manage-comments/
    manage-project/
    search-tickets/

frontend/
  src/
    components/        # UI components (kanban, layout, common, etc.)
    context/           # Auth context provider
    hooks/             # Data fetching hooks (React Query)
    pages/             # Route-level page components
    services/          # Appwrite SDK service wrappers
    store/             # Client-side state (Zustand)
    types/             # TypeScript type definitions
    lib/               # Appwrite client config & constants
```

## Development

```bash
# Type check
npx tsc --noEmit

# Lint
npm run lint

# Production build
npm run build
```

## Permissions

| Role | Create | Edit | Delete | Assign | Move | Manage Members | Project Settings |
|------|--------|------|--------|--------|------|----------------|------------------|
| Admin | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Manager | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Developer | ✓ | ✓ | — | — | ✓ | — | — |
| Viewer | — | — | — | — | — | — | — |

All roles can comment on tickets.

## License

[MIT](LICENSE)
