import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';
import { Search, Plus, LogOut, User, ChevronDown } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/common/Button';
import { Avatar } from '@/components/common/Avatar';
import { NotificationBell } from '@/components/notifications/NotificationBell';

export function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header className="fixed top-0 right-0 left-64 z-30 h-16 bg-[--color-bg-secondary] border-b border-[--color-border-primary]">
      <div className="flex h-full items-center justify-between px-6">
        {/* Search */}
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[--color-text-muted]" />
          <input
            type="text"
            placeholder="Search tickets... (Press /)"
            className="w-full rounded-lg border border-[--color-border-primary] bg-[--color-bg-primary] py-2 pl-10 pr-4 text-sm text-[--color-text-primary] placeholder:text-[--color-text-muted] focus:outline-none focus:ring-2 focus:ring-[--color-primary-500]"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-4">
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={() => navigate('/projects')}
          >
            New Ticket
          </Button>

          {/* Notifications */}
          <NotificationBell />

          {/* Profile dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="flex cursor-pointer items-center gap-2 rounded-lg p-1.5 hover:bg-[--color-bg-hover]"
            >
              {user && (
                <>
                  <Avatar userId={user.$id} name={user.name} size="sm" />
                  <span className="text-sm font-medium text-[--color-text-primary]">
                    {user.name}
                  </span>
                  <ChevronDown className="h-4 w-4 text-[--color-text-muted]" />
                </>
              )}
            </button>

            {/* Dropdown menu */}
            {isProfileOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setIsProfileOpen(false)}
                />
                <div className="absolute right-0 z-20 mt-2 w-56 rounded-lg border border-[--color-border-primary] bg-[--color-bg-secondary] py-1 shadow-lg">
                  <div className="border-b border-[--color-border-primary] px-4 py-3">
                    <p className="text-sm font-medium text-[--color-text-primary]">
                      {user?.name}
                    </p>
                    <p className="text-xs text-[--color-text-muted]">
                      {user?.email}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setIsProfileOpen(false);
                      navigate('/settings');
                    }}
                    className={clsx(
                      'flex w-full cursor-pointer items-center gap-2 px-4 py-2 text-sm',
                      'text-[--color-text-secondary] hover:bg-[--color-bg-hover]'
                    )}
                  >
                    <User className="h-4 w-4" />
                    Profile Settings
                  </button>
                  <button
                    onClick={handleLogout}
                    className={clsx(
                      'flex w-full cursor-pointer items-center gap-2 px-4 py-2 text-sm',
                      'text-red-400 hover:bg-[--color-bg-hover]'
                    )}
                  >
                    <LogOut className="h-4 w-4" />
                    Sign out
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
