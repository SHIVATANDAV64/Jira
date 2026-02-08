import { useState, useEffect } from 'react';
import {
  Settings,
  User,
  Bell,
  Palette,
  Shield,
  LogOut,
  Save,
  Moon,
  Sun,
  Monitor,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { account } from '@/lib/appwrite';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { Avatar } from '@/components/common/Avatar';
import toast from 'react-hot-toast';

type SettingsTab = 'profile' | 'notifications' | 'appearance' | 'security';
type ThemeMode = 'dark' | 'light' | 'system';

interface TabConfig {
  id: SettingsTab;
  label: string;
  icon: React.ReactNode;
}

const tabs: TabConfig[] = [
  { id: 'profile', label: 'Profile', icon: <User className="h-4 w-4" /> },
  { id: 'notifications', label: 'Notifications', icon: <Bell className="h-4 w-4" /> },
  { id: 'appearance', label: 'Appearance', icon: <Palette className="h-4 w-4" /> },
  { id: 'security', label: 'Security', icon: <Shield className="h-4 w-4" /> },
];

export function SettingsPage() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
  const [isSaving, setIsSaving] = useState(false);

  // Profile state
  const [name, setName] = useState(user?.name || '');
  const [email] = useState(user?.email || '');

  // Notification settings - SET-03: persist to localStorage
  const [emailNotifications, setEmailNotifications] = useState(() => {
    const saved = localStorage.getItem('notif_email');
    return saved !== null ? JSON.parse(saved) : true;
  });
  const [pushNotifications, setPushNotifications] = useState(() => {
    const saved = localStorage.getItem('notif_push');
    return saved !== null ? JSON.parse(saved) : true;
  });
  const [mentionNotifications, setMentionNotifications] = useState(() => {
    const saved = localStorage.getItem('notif_mention');
    return saved !== null ? JSON.parse(saved) : true;
  });
  const [assignmentNotifications, setAssignmentNotifications] = useState(() => {
    const saved = localStorage.getItem('notif_assignment');
    return saved !== null ? JSON.parse(saved) : true;
  });

  // Appearance settings - SET-04: persist theme to localStorage
  const [theme, setTheme] = useState<ThemeMode>(() => {
    return (localStorage.getItem('theme') as ThemeMode) || 'dark';
  });

  // SET-04: Apply theme to document when it changes
  useEffect(() => {
    localStorage.setItem('theme', theme);
    document.documentElement.setAttribute('data-theme', theme === 'system'
      ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : theme);
  }, [theme]);

  // SET-01: Implement actual profile save via Appwrite
  const handleSaveProfile = async () => {
    if (!name.trim()) {
      toast.error('Name cannot be empty');
      return;
    }
    setIsSaving(true);
    try {
      await account.updateName(name.trim());
      toast.success('Profile updated successfully');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to update profile';
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  // SET-03: Save notification preferences to localStorage
  const handleSaveNotifications = () => {
    localStorage.setItem('notif_email', JSON.stringify(emailNotifications));
    localStorage.setItem('notif_push', JSON.stringify(pushNotifications));
    localStorage.setItem('notif_mention', JSON.stringify(mentionNotifications));
    localStorage.setItem('notif_assignment', JSON.stringify(assignmentNotifications));
    toast.success('Notification preferences saved');
  };

  const handleLogout = async () => {
    if (confirm('Are you sure you want to log out?')) {
      await logout();
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'profile':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-[--color-text-primary] mb-4">
                Profile Information
              </h3>
              <div className="flex items-start gap-6">
                <div className="flex flex-col items-center gap-2">
                  <Avatar userId={user?.$id} name={name || 'User'} size="lg" className="h-20 w-20 text-2xl" />
                  <button className="text-sm text-[--color-primary-600] hover:text-[--color-primary-700] cursor-pointer">
                    Change avatar
                  </button>
                </div>
                <div className="flex-1 space-y-4">
                  <Input
                    label="Full Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name"
                  />
                  <Input
                    label="Email Address"
                    value={email}
                    disabled
                    className="opacity-60"
                  />
                  <p className="text-sm text-[--color-text-muted]">
                    Email cannot be changed. Contact support if you need assistance.
                  </p>
                </div>
              </div>
            </div>

            <div className="border-t border-[--color-border-primary] pt-6">
              <Button
                onClick={handleSaveProfile}
                isLoading={isSaving}
                leftIcon={<Save className="h-4 w-4" />}
              >
                Save Changes
              </Button>
            </div>
          </div>
        );

      case 'notifications':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-[--color-text-primary] mb-4">
                Notification Preferences
              </h3>
              <div className="space-y-4">
                <NotificationToggle
                  label="Email Notifications"
                  description="Receive notifications via email"
                  checked={emailNotifications}
                  onChange={setEmailNotifications}
                />
                <NotificationToggle
                  label="Push Notifications"
                  description="Receive push notifications in browser"
                  checked={pushNotifications}
                  onChange={setPushNotifications}
                />
                <NotificationToggle
                  label="Mention Notifications"
                  description="Get notified when someone mentions you"
                  checked={mentionNotifications}
                  onChange={setMentionNotifications}
                />
                <NotificationToggle
                  label="Assignment Notifications"
                  description="Get notified when a ticket is assigned to you"
                  checked={assignmentNotifications}
                  onChange={setAssignmentNotifications}
                />
              </div>
            </div>

            <div className="border-t border-[--color-border-primary] pt-6">
              <Button
                onClick={handleSaveNotifications}
                leftIcon={<Save className="h-4 w-4" />}
              >
                Save Preferences
              </Button>
            </div>
          </div>
        );

      case 'appearance':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-[--color-text-primary] mb-4">
                Theme Settings
              </h3>
              <div className="grid gap-4 sm:grid-cols-3">
                <ThemeOption
                  mode="dark"
                  label="Dark"
                  icon={<Moon className="h-5 w-5" />}
                  selected={theme === 'dark'}
                  onSelect={setTheme}
                />
                <ThemeOption
                  mode="light"
                  label="Light"
                  icon={<Sun className="h-5 w-5" />}
                  selected={theme === 'light'}
                  onSelect={setTheme}
                />
                <ThemeOption
                  mode="system"
                  label="System"
                  icon={<Monitor className="h-5 w-5" />}
                  selected={theme === 'system'}
                  onSelect={setTheme}
                />
              </div>
              {theme === 'light' && (
                <p className="mt-4 text-sm text-yellow-700 bg-yellow-50 px-3 py-2 rounded-lg">
                  Theme preference will be applied on next page load.
                </p>
              )}
            </div>

            <div className="border-t border-[--color-border-primary] pt-6">
              <h3 className="text-lg font-semibold text-[--color-text-primary] mb-4">
                Display Settings
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-lg bg-[--color-bg-tertiary]">
                  <div>
                    <p className="font-medium text-[--color-text-primary]">Compact Mode</p>
                    <p className="text-sm text-[--color-text-muted]">
                      Show more content with smaller spacing
                    </p>
                  </div>
                  <Toggle checked={false} onChange={() => toast('Coming soon')} />
                </div>
                <div className="flex items-center justify-between p-4 rounded-lg bg-[--color-bg-tertiary]">
                  <div>
                    <p className="font-medium text-[--color-text-primary]">Show Avatars</p>
                    <p className="text-sm text-[--color-text-muted]">
                      Display user avatars in lists and cards
                    </p>
                  </div>
                  <Toggle checked={true} onChange={() => toast('Coming soon')} />
                </div>
              </div>
            </div>
          </div>
        );

      case 'security':
        return <SecurityTab onLogout={handleLogout} />;
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[--color-text-primary] flex items-center gap-2">
          <Settings className="h-6 w-6" />
          Settings
        </h1>
        <p className="mt-1 text-[--color-text-secondary]">
          Manage your account settings and preferences
        </p>
      </div>

      {/* Tabs and Content */}
      <div className="flex flex-col sm:flex-row gap-6">
        {/* Sidebar Tabs */}
        <nav className="sm:w-48 flex-shrink-0">
          <ul className="space-y-1">
            {tabs.map((tab) => (
              <li key={tab.id}>
                <button
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                    activeTab === tab.id
                      ? 'bg-[--color-primary-600] text-white'
                      : 'text-[--color-text-secondary] hover:bg-[--color-bg-hover] hover:text-[--color-text-primary]'
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {/* Content */}
        <div className="flex-1 rounded-xl border border-[--color-border-primary] bg-[--color-bg-secondary] p-6">
          {renderTabContent()}
        </div>
      </div>
    </div>
  );
}

// Helper Components

interface NotificationToggleProps {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

function NotificationToggle({ label, description, checked, onChange }: NotificationToggleProps) {
  return (
    <div className="flex items-center justify-between p-4 rounded-lg bg-[--color-bg-tertiary]">
      <div>
        <p className="font-medium text-[--color-text-primary]">{label}</p>
        <p className="text-sm text-[--color-text-muted]">{description}</p>
      </div>
      <Toggle checked={checked} onChange={onChange} />
    </div>
  );
}

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
}

function Toggle({ checked, onChange }: ToggleProps) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
        checked ? 'bg-[--color-primary-600]' : 'bg-[--color-bg-tertiary] border border-[--color-border-primary]'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );
}

interface ThemeOptionProps {
  mode: ThemeMode;
  label: string;
  icon: React.ReactNode;
  selected: boolean;
  onSelect: (mode: ThemeMode) => void;
}

function ThemeOption({ mode, label, icon, selected, onSelect }: ThemeOptionProps) {
  return (
    <button
      onClick={() => onSelect(mode)}
      className={`p-4 rounded-lg border-2 transition-all cursor-pointer ${
        selected
          ? 'border-[--color-primary-500] bg-[--color-primary-600]/10'
          : 'border-[--color-border-primary] hover:border-[--color-border-secondary]'
      }`}
    >
      <div className="flex flex-col items-center gap-2">
        <div className={`${selected ? 'text-[--color-primary-600]' : 'text-[--color-text-muted]'}`}>
          {icon}
        </div>
        <span className={`text-sm font-medium ${selected ? 'text-[--color-primary-600]' : 'text-[--color-text-secondary]'}`}>
          {label}
        </span>
      </div>
    </button>
  );
}

// SET-02: Security Tab with actual password change
function SecurityTab({ onLogout }: { onLogout: () => void }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChanging, setIsChanging] = useState(false);

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error('Please fill in all password fields');
      return;
    }
    if (newPassword.length < 8) {
      toast.error('New password must be at least 8 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    setIsChanging(true);
    try {
      await account.updatePassword(newPassword, currentPassword);
      toast.success('Password updated successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to update password';
      if (message.includes('Invalid credentials') || message.includes('password')) {
        toast.error('Current password is incorrect');
      } else {
        toast.error(message);
      }
    } finally {
      setIsChanging(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-[--color-text-primary] mb-4">
          Password
        </h3>
        <div className="space-y-4 max-w-md">
          <Input
            label="Current Password"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="Enter current password"
          />
          <Input
            label="New Password"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Enter new password"
          />
          <Input
            label="Confirm New Password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm new password"
          />
          <Button
            onClick={handleChangePassword}
            isLoading={isChanging}
            leftIcon={<Shield className="h-4 w-4" />}
          >
            Update Password
          </Button>
        </div>
      </div>

      <div className="border-t border-[--color-border-primary] pt-6">
        <h3 className="text-lg font-semibold text-[--color-text-primary] mb-4">
          Sessions
        </h3>
        <div className="p-4 rounded-lg bg-[--color-bg-tertiary]">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-[--color-text-primary]">Current Session</p>
              <p className="text-sm text-[--color-text-muted]">
                {navigator.userAgent.includes('Chrome') ? 'Chrome' : 
                 navigator.userAgent.includes('Firefox') ? 'Firefox' :
                 navigator.userAgent.includes('Safari') ? 'Safari' : 'Browser'} on {
                 navigator.userAgent.includes('Windows') ? 'Windows' :
                 navigator.userAgent.includes('Mac') ? 'macOS' :
                 navigator.userAgent.includes('Linux') ? 'Linux' : 'Unknown OS'}
              </p>
            </div>
            <span className="text-xs text-green-700 bg-green-50 px-2 py-1 rounded">
              Active
            </span>
          </div>
        </div>
      </div>

      <div className="border-t border-[--color-border-primary] pt-6">
        <h3 className="text-lg font-semibold text-red-400 mb-4">
          Danger Zone
        </h3>
        <div className="p-4 rounded-lg border border-red-500/30 bg-red-500/5">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-[--color-text-primary]">Log Out</p>
              <p className="text-sm text-[--color-text-muted]">
                Sign out of your account on this device
              </p>
            </div>
            <Button
              variant="danger"
              size="sm"
              onClick={onLogout}
              leftIcon={<LogOut className="h-4 w-4" />}
            >
              Log Out
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
