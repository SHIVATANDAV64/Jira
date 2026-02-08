import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';
import { Search, LogOut, User, ChevronDown, FolderKanban, Menu } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/common/Button';
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
    <header className="fixed top-0 right-0 left-0 md:left-64 z-30 h-16 bg-[--color-bg-secondary] border-b border-[--color-border-primary]">
      {/* AUTH-16: Session timeout warning banner */}
      {sessionWarning && (
        <div className="absolute top-full left-0 right-0 z-50 bg-yellow-500/90 px-4 py-2 text-center text-sm font-medium text-black">
          Your session will expire soon due to inactivity.{' '}
          <button onClick={extendSession} className="underline font-bold cursor-pointer">
            Stay signed in
          </button>
        </div>
      )}
      <div className="flex h-full items-center justify-between px-4 md:px-6">
        {/* Mobile menu button */}
        <button
          onClick={onMenuToggle}
          className="mr-2 rounded-lg p-2 text-[--color-text-muted] hover:bg-[--color-bg-hover] md:hidden cursor-pointer"
        >
          <Menu className="h-5 w-5" />
        </button>
        
        {/* NAV-02: Functional search */}
        <form onSubmit={handleSearch} className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[--color-text-muted]" />
          <input
            ref={searchRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tickets... (Press /)"
            className="w-full rounded-lg border border-[--color-border-primary] bg-[--color-bg-primary] py-2 pl-10 pr-4 text-sm text-[--color-text-primary] placeholder:text-[--color-text-muted] focus:outline-none focus:ring-2 focus:ring-[--color-primary-500]"
          />
        </form>

        {/* Actions */}
        <div className="flex items-center gap-2 md:gap-4">
          {/* NAV-01: Fixed label from "New Ticket" to "Projects" */}
          <Button
            variant="primary"
            size="sm"
            leftIcon={<FolderKanban className="h-4 w-4" />}
            onClick={() => navigate('/projects')}
          >
            <span className="hidden sm:inline">Projects</span>
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
