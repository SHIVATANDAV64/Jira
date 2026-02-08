import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { Bug } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);

  const { login, loginWithGoogle, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Validate redirect target to prevent open redirect
  const rawFrom = (location.state as { from?: { pathname: string } })?.from?.pathname || '/dashboard';
  const from = rawFrom.startsWith('/') && !rawFrom.startsWith('//') && !rawFrom.includes(':') ? rawFrom : '/dashboard';

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const oauthError = params.get('error');
    if (oauthError === 'oauth_cancelled') {
      setError('Google sign-in was cancelled or failed. Please try again.');
      // Clean up the URL
      window.history.replaceState({}, '', '/login');
    }
  }, []);

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleGoogleLogin = async () => {
    setOauthLoading(true);
    try {
      await loginWithGoogle(from);
    } catch (err) {
      setOauthLoading(false);
      setError(err instanceof Error ? err.message : 'Failed to start Google login');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      if (err instanceof Error) {
        // Show rate-limit messages and specific errors to the user
        if (err.message.includes('Too many login attempts')) {
          setError(err.message);
        } else if (err.message.includes('network') || err.message.includes('fetch')) {
          setError('Network error. Please check your connection and try again.');
        } else {
          setError('Invalid email or password. Please try again.');
        }
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[--color-bg-primary] px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 flex items-center justify-center gap-2">
          <Bug className="h-10 w-10 text-[--color-primary-500]" />
          <span className="text-2xl font-bold text-[--color-text-primary]">
            BugTracker
          </span>
        </div>

        {/* Card */}
        <div className="rounded-xl border border-[--color-border-primary] bg-[--color-bg-secondary] p-8">
          <h1 className="mb-2 text-2xl font-bold text-[--color-text-primary]">
            Welcome back
          </h1>
          <p className="mb-6 text-[--color-text-secondary]">
            Sign in to your account to continue
          </p>

          {error && (
            <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />

            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
            />

            <Button
              type="submit"
              className="w-full"
              isLoading={isLoading}
            >
              Sign in
            </Button>
          </form>

          <div className="my-6 flex items-center gap-4">
            <div className="h-px flex-1 bg-[--color-border-primary]" />
            <span className="text-sm text-[--color-text-muted]">or</span>
            <div className="h-px flex-1 bg-[--color-border-primary]" />
          </div>

          <Button
            type="button"
            variant="secondary"
            className="w-full"
            onClick={handleGoogleLogin}
            disabled={oauthLoading || isLoading}
          >
            {oauthLoading ? (
              <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
            )}
            Continue with Google
          </Button>

          <p className="mt-6 text-center text-sm text-[--color-text-secondary]">
            Don't have an account?{' '}
            <Link
              to="/register"
              className="font-medium text-[--color-primary-600] hover:text-[--color-primary-700]"
            >
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
