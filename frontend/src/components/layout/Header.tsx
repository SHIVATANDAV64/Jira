import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, LogOut, User, ChevronDown, Menu } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Avatar } from '@/components/common/Avatar';
import { NotificationBell } from '@/components/notifications/NotificationBell';

interface HeaderProps {
  onMenuToggle?: () => void;
}

export function Header({ onMenuToggle }: HeaderProps) {
  const { user, logout, sessionWarning, extendSession } = useAuth();
  const navigate = useNavigate();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);

  // NAV-02: Global search keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as Element)?.tagName)) {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if (e.key === 'Escape' && document.activeElement === searchRef.current) {
        searchRef.current?.blur();
        setSearchQuery('');
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // NAV-02: Search handler
  const handleSearch = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/projects?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  }, [searchQuery, navigate]);

  // AUTH-22: Wrap logout in try/catch
  const handleLogout = async () => {
    try {
      await logout();
    } catch {
      // Ensure navigation happens even if logout fails
    }
    navigate('/login');
  };

  return (
    <header className="fixed top-0 right-0 left-0 md:left-60 z-50 h-14 bg-[var(--color-bg-secondary)] border-b border-[var(--color-border-primary)]">
      {/* AUTH-16: Session timeout warning banner */}
      {sessionWarning && (
        <div className="absolute top-full left-0 right-0 z-50 bg-yellow-400 px-4 py-1.5 text-center text-xs font-medium text-yellow-900">
          Session expiring soon.{' '}
          <button onClick={extendSession} className="underline font-bold cursor-pointer">
            Stay signed in
          </button>
        </div>
      )}
      <div className="flex h-full items-center justify-between px-4">
        {/* Mobile menu button */}
        <button
          onClick={onMenuToggle}
          className="mr-2 rounded p-1.5 text-[var(--color-text-muted)] hover:bg-[var(--color-bg-hover)] md:hidden cursor-pointer"
        >
          <Menu className="h-5 w-5" />
        </button>
        
        {/* Search */}
        <form onSubmit={handleSearch} className="relative max-w-sm flex-1">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-muted)]" />
          <input
            ref={searchRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search (Press /)"
            className="w-full rounded-md border border-[var(--color-border-primary)] bg-[var(--color-bg-tertiary)] py-1.5 pl-8 pr-3 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary-500)] focus:border-[var(--color-primary-500)] focus:bg-[var(--color-bg-secondary)]"
          />
        </form>

        {/* Actions */}
        <div className="flex items-center gap-1">
          {/* Notifications */}
          <NotificationBell />

          {/* Profile dropdown */}
          <div className="relative ml-2">
            <button
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="flex cursor-pointer items-center gap-2 rounded-md p-1.5 hover:bg-[var(--color-bg-hover)]"
            >
              {user && (
                <>
                  <Avatar userId={user.$id} name={user.name} avatarId={user.prefs?.avatar} size="sm" />
                  <span className="hidden sm:inline text-sm font-medium text-[var(--color-text-primary)]">
                    {user.name}
                  </span>
                  <ChevronDown className="h-3.5 w-3.5 text-[var(--color-text-muted)]" />
                </>
              )}
            </button>

            {/* Dropdown menu */}
            {isProfileOpen && (
              <>
                <div
                  className="fixed inset-0 z-[998]"
                  onClick={() => setIsProfileOpen(false)}
                />
                <div className="absolute right-0 z-[999] mt-1 w-52 rounded-md border border-[var(--color-border-primary)] bg-[var(--color-bg-secondary)] py-1 shadow-lg">
                  <div className="border-b border-[var(--color-border-primary)] px-3 py-2">
                    <p className="text-sm font-medium text-[var(--color-text-primary)]">
                      {user?.name}
                    </p>
                    <p className="text-xs text-[var(--color-text-muted)]">
                      {user?.email}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setIsProfileOpen(false);
                      navigate('/settings');
                    }}
                    className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)]"
                  >
                    <User className="h-4 w-4" />
                    Settings
                  </button>
                  <button
                    onClick={handleLogout}
                    className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-[var(--color-bg-hover)]"
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
