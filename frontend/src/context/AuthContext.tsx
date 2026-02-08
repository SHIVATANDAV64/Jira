import { createContext, useContext, useEffect, useState, useCallback, useRef, type ReactNode } from 'react';
import { account } from '@/lib/appwrite';
import type { Models, OAuthProvider } from 'appwrite';
import { useQueryClient } from '@tanstack/react-query';

// Session timeout: 30 minutes of inactivity
const SESSION_TIMEOUT_MS = 30 * 60 * 1000;
// Warning before timeout (5 minutes before)
const SESSION_WARNING_MS = 25 * 60 * 1000;
// Login rate limiting
const MAX_LOGIN_ATTEMPTS = 5;
const LOGIN_LOCKOUT_MS = 5 * 60 * 1000; // 5 minutes
// BroadcastChannel for cross-tab session sync
const SESSION_CHANNEL_NAME = 'bugtracker_session';

export interface UserPreferences extends Models.Preferences {
  avatar?: string;
}

interface AuthContextType {
  user: Models.User<UserPreferences> | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  loginWithGoogle: (returnUrl?: string) => Promise<void>;
  sessionWarning: boolean;
  extendSession: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Models.User<UserPreferences> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionWarning, setSessionWarning] = useState(false);
  const loginAttemptsRef = useRef(0);
  const lockoutUntilRef = useRef(0);
  const sessionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionWarningRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);
  const queryClient = useQueryClient();

  const resetSessionTimeout = useCallback(() => {
    if (sessionTimeoutRef.current) {
      clearTimeout(sessionTimeoutRef.current);
    }
    if (sessionWarningRef.current) {
      clearTimeout(sessionWarningRef.current);
    }
    setSessionWarning(false);

    // AUTH-16: Show warning 5 minutes before timeout
    sessionWarningRef.current = setTimeout(() => {
      setSessionWarning(true);
    }, SESSION_WARNING_MS);

    sessionTimeoutRef.current = setTimeout(async () => {
      try {
        await account.deleteSession('current');
      } catch { /* Session may already be expired */ }
      setUser(null);
      setSessionWarning(false);
      queryClient.clear();
      // AUTH-17: Notify other tabs
      broadcastChannelRef.current?.postMessage({ type: 'logout' });
    }, SESSION_TIMEOUT_MS);
  }, [queryClient]);

  const extendSession = useCallback(() => {
    setSessionWarning(false);
    resetSessionTimeout();
    // AUTH-20: Refresh server session TTL
    account.getSession('current').catch(() => {});
  }, [resetSessionTimeout]);

  // AUTH-17: Cross-tab session sync via BroadcastChannel
  useEffect(() => {
    try {
      const channel = new BroadcastChannel(SESSION_CHANNEL_NAME);
      broadcastChannelRef.current = channel;

      channel.onmessage = (event) => {
        if (event.data?.type === 'logout') {
          setUser(null);
          setSessionWarning(false);
          queryClient.clear();
        } else if (event.data?.type === 'login') {
          checkAuth();
        }
      };

      return () => {
        channel.close();
        broadcastChannelRef.current = null;
      };
    } catch {
      // BroadcastChannel not supported — fallback to localStorage events
      const handleStorage = (e: StorageEvent) => {
        if (e.key === 'bugtracker_logout') {
          setUser(null);
          setSessionWarning(false);
          queryClient.clear();
        }
      };
      window.addEventListener('storage', handleStorage);
      return () => window.removeEventListener('storage', handleStorage);
    }
  }, [queryClient]);

  // Reset timeout on user activity
  useEffect(() => {
    if (!user) return;

    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    const handleActivity = () => {
      if (debounceTimer) return;
      debounceTimer = setTimeout(() => {
        debounceTimer = null;
        resetSessionTimeout();
      }, 30000); // Debounce to at most once per 30 seconds
    };
    
    // Exclude 'scroll' to prevent programmatic scroll resets
    const events = ['mousedown', 'keydown', 'touchstart'];
    events.forEach((e) => window.addEventListener(e, handleActivity, { passive: true }));
    resetSessionTimeout();

    // Handle background tab detection — check elapsed time on visibility change
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Verify session is still valid after returning from background
        account.getSession('current').then(() => {
          resetSessionTimeout();
        }).catch(() => {
          setUser(null);
          setSessionWarning(false);
          queryClient.clear();
        });
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      events.forEach((e) => window.removeEventListener(e, handleActivity));
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (debounceTimer) clearTimeout(debounceTimer);
      if (sessionTimeoutRef.current) clearTimeout(sessionTimeoutRef.current);
      if (sessionWarningRef.current) clearTimeout(sessionWarningRef.current);
    };
  }, [user, resetSessionTimeout, queryClient]);

  const checkAuth = useCallback(async () => {
    try {
      // Cast the response to match our extended UserPreferences type
      const currentUser = await account.get<UserPreferences>();
      setUser(currentUser);
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = async (email: string, password: string) => {
    // NOTE: Client-side rate limiting only — resets on page refresh. Server-side rate limiting should be configured in Appwrite's security settings for real brute-force protection.
    // Rate limiting check
    const now = Date.now();
    if (now < lockoutUntilRef.current) {
      const remainingSec = Math.ceil((lockoutUntilRef.current - now) / 1000);
      throw new Error(`Too many login attempts. Please try again in ${remainingSec} seconds.`);
    }

    try {
      await account.createEmailPasswordSession(email, password);
      loginAttemptsRef.current = 0; // Reset on success
      await checkAuth();
    } catch (err) {
      loginAttemptsRef.current += 1;
      if (loginAttemptsRef.current >= MAX_LOGIN_ATTEMPTS) {
        lockoutUntilRef.current = Date.now() + LOGIN_LOCKOUT_MS;
        loginAttemptsRef.current = 0;
      }
      throw err;
    }
  };

  const register = async (email: string, password: string, name: string) => {
    try {
      await account.create('unique()', email, password, name);
    } catch (err) {
      throw err; // Account creation failed — propagate as-is
    }
    
    // Account created successfully, now try to log in
    try {
      await login(email, password);
    } catch {
      // Account was created but auto-login failed
      throw new Error('Account created successfully! Please go to the login page to sign in.');
    }
  };

  const logout = async () => {
    if (sessionTimeoutRef.current) clearTimeout(sessionTimeoutRef.current);
    if (sessionWarningRef.current) clearTimeout(sessionWarningRef.current);
    try {
      await account.deleteSession('current');
    } catch {
      // Session may already be expired — continue with local cleanup
    }
    setUser(null);
    setSessionWarning(false);
    // AUTH-21: Clear React Query cache
    queryClient.clear();
    // AUTH-23: Clear all local/session storage
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch { /* ignore in incognito/restricted environments */ }
    // AUTH-17: Notify other tabs about logout
    try {
      broadcastChannelRef.current?.postMessage({ type: 'logout' });
      // Fallback for environments without BroadcastChannel
      localStorage.setItem('bugtracker_logout', Date.now().toString());
    } catch { /* ignore */ }
  };

  const loginWithGoogle = async (returnUrl?: string) => {
    const origin = window.location.origin;
    // Validate origin (supports http/https with hostnames containing letters, numbers, dots, underscores, and hyphens)
    try {
      const url = new URL(origin);
      if (!['http:', 'https:'].includes(url.protocol)) {
        throw new Error('Invalid protocol');
      }
    } catch {
      throw new Error('Unable to start Google login from this origin. Please use a valid HTTP/HTTPS URL.');
    }
    
    const successUrl = `${origin}${returnUrl || '/dashboard'}`;
    try {
      account.createOAuth2Session(
        'google' as OAuthProvider,
        successUrl,
        `${origin}/login?error=oauth_cancelled`
      );
    } catch (err) {
      throw new Error('Failed to initiate Google login. Please try again.');
    }
  };

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    loginWithGoogle,
    sessionWarning,
    extendSession,
    refreshUser: checkAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
