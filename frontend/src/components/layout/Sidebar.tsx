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
];

const secondaryNavigation = [
  { name: 'Team', href: '/team', icon: Users },
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
        'fixed left-0 top-0 z-50 h-screen w-64 bg-[--color-bg-secondary] border-r border-[--color-border-primary] transition-transform duration-300 ease-in-out',
        // NAV-03: Mobile responsive — hidden by default on small screens
        isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
      )}
    >
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="flex h-16 items-center justify-between px-6 border-b border-[--color-border-primary]">
          <div className="flex items-center gap-2">
            <Bug className="h-8 w-8 text-[--color-primary-500]" />
            <span className="text-xl font-bold text-[--color-text-primary]">
              BugTracker
            </span>
          </div>
          {/* Mobile close button */}
          <button
            onClick={onClose}
            className="md:hidden rounded-lg p-1.5 text-[--color-text-muted] hover:bg-[--color-bg-hover] cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navigation.map((item) => (
            <NavLink
              key={item.name}
              to={item.href}
              className={({ isActive }) =>
                clsx(
                  'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium',
                  'transition-all duration-200 ease-out',
                  isActive
                    ? 'bg-gradient-to-r from-[--color-primary-600] to-[--color-primary-700] text-white shadow-md shadow-[--color-primary-900]/30'
                    : 'text-[--color-text-secondary] hover:bg-[--color-bg-hover] hover:text-[--color-text-primary] hover:translate-x-0.5'
                )
              }
            >
              <item.icon className="h-5 w-5 transition-transform duration-200 group-hover:scale-110" />
              {item.name}
            </NavLink>
          ))}
        </nav>

        {/* Secondary navigation */}
        <div className="border-t border-[--color-border-primary] px-3 py-4 space-y-1">
          {secondaryNavigation.map((item) => (
            <NavLink
              key={item.name}
              to={item.href}
              className={({ isActive }) =>
                clsx(
                  'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium',
                  'transition-all duration-200 ease-out',
                  isActive
                    ? 'bg-gradient-to-r from-[--color-primary-600] to-[--color-primary-700] text-white shadow-md shadow-[--color-primary-900]/30'
                    : 'text-[--color-text-secondary] hover:bg-[--color-bg-hover] hover:text-[--color-text-primary] hover:translate-x-0.5'
                )
              }
            >
              <item.icon className="h-5 w-5 transition-transform duration-200 group-hover:scale-110" />
              {item.name}
            </NavLink>
          ))}
        </div>
      </div>
    </aside>
  );
}
