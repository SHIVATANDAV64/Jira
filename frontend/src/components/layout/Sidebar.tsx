import { NavLink } from 'react-router-dom';
import { clsx } from 'clsx';
import {
  LayoutDashboard,
  FolderKanban,
  Settings,
  Users,
  Bug,
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Projects', href: '/projects', icon: FolderKanban },
];

const secondaryNavigation = [
  { name: 'Team', href: '/team', icon: Users },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export function Sidebar() {
  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 bg-[--color-bg-secondary] border-r border-[--color-border-primary]">
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="flex h-16 items-center gap-2 px-6 border-b border-[--color-border-primary]">
          <Bug className="h-8 w-8 text-[--color-primary-500]" />
          <span className="text-xl font-bold text-[--color-text-primary]">
            BugTracker
          </span>
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
