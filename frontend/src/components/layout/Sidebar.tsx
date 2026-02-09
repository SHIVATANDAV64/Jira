import { NavLink } from 'react-router-dom';
import { clsx } from 'clsx';
import {
  LayoutDashboard,
  FolderKanban,
  Settings,
  Users,
  Bug,
  X,
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Projects', href: '/projects', icon: FolderKanban },
  { name: 'Team', href: '/team', icon: Users },
];

const secondaryNavigation = [
  { name: 'Settings', href: '/settings', icon: Settings },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  return (
    <aside
      className={clsx(
        'fixed left-0 top-0 z-50 h-screen w-60 bg-[var(--color-bg-secondary)] border-r border-[var(--color-border-primary)]',
        isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
      )}
    >
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="flex h-14 items-center justify-between px-4 border-b border-[var(--color-border-primary)]">
          <div className="flex items-center gap-2">
            <Bug className="h-6 w-6 text-[var(--color-primary-600)]" />
            <span className="text-sm font-bold text-[var(--color-text-primary)] tracking-tight">
              Jerah
            </span>
          </div>
          <button
            onClick={onClose}
            className="md:hidden rounded p-1 text-[var(--color-text-muted)] hover:bg-[var(--color-bg-hover)] cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-2 py-3 space-y-0.5">
          {navigation.map((item) => (
            <NavLink
              key={item.name}
              to={item.href}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-[var(--color-primary-50)] text-[var(--color-primary-700)]'
                    : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text-primary)]'
                )
              }
            >
              <item.icon className="h-4 w-4" />
              {item.name}
            </NavLink>
          ))}
        </nav>

        {/* Secondary navigation */}
        <div className="border-t border-[var(--color-border-primary)] px-2 py-3 space-y-0.5">
          {secondaryNavigation.map((item) => (
            <NavLink
              key={item.name}
              to={item.href}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-[var(--color-primary-50)] text-[var(--color-primary-700)]'
                    : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text-primary)]'
                )
              }
            >
              <item.icon className="h-4 w-4" />
              {item.name}
            </NavLink>
          ))}
        </div>
      </div>
    </aside>
  );
}
