import { useState } from 'react';
import { Link, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { Bug } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';

export function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { register, loginWithGoogle, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string })?.from || '/dashboard';

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const errors: string[] = [];
    
    if (name.trim().length < 2 || name.trim().length > 100) {
      errors.push('Name must be between 2 and 100 characters');
    }
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      errors.push('Please enter a valid email address');
    }
    
    if (password !== confirmPassword) {
      errors.push('Passwords do not match');
    }
    if (password.length < 8 || password.length > 128) {
      errors.push('Password must be between 8 and 128 characters');
    }
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    if (!/[0-9]/.test(password)) {
      errors.push('Password must contain at least one number');
    }
    
    if (errors.length > 0) {
      setError(errors.join('. '));
      return;
    }

    setIsLoading(true);

    try {
      await register(email, password, name);
      navigate(from, { replace: true });
    } catch (err) {
      // AUTH-04: Differentiate account creation vs login failure
      if (err instanceof Error) {
        if (err.message.includes('Account created successfully')) {
          // Account exists but auto-login failed
          setError(err.message);
        } else if (err.message.includes('already') || err.message.includes('unique')) {
          setError('An account with this email already exists. Please sign in instead.');
        } else {
          setError(err.message || 'Failed to create account. Please try again.');
        }
      } else {
        setError('Failed to create account. Please try again.');
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
            Create an account
          </h1>
          <p className="mb-6 text-[--color-text-secondary]">
            Get started with BugTracker today
          </p>

          {error && (
            <div className="mb-4 rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Full name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="John Doe"
              required
            />

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
              placeholder="Min 8 chars, uppercase, lowercase, number"
              required
            />

            <div className="text-xs space-y-1 text-[--color-text-tertiary]">
              <p className={password.length >= 8 ? 'text-green-500' : ''}>
                {password.length >= 8 ? '✓' : '○'} At least 8 characters
              </p>
              <p className={/[A-Z]/.test(password) ? 'text-green-500' : ''}>
                {/[A-Z]/.test(password) ? '✓' : '○'} One uppercase letter
              </p>
              <p className={/[a-z]/.test(password) ? 'text-green-500' : ''}>
                {/[a-z]/.test(password) ? '✓' : '○'} One lowercase letter
              </p>
              <p className={/[0-9]/.test(password) ? 'text-green-500' : ''}>
                {/[0-9]/.test(password) ? '✓' : '○'} One number
              </p>
            </div>

            <Input
              label="Confirm password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm your password"
              required
            />

            <Button
              type="submit"
              className="w-full"
              isLoading={isLoading}
            >
              Create account
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
            onClick={() => loginWithGoogle()}
          >
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
            Continue with Google
          </Button>

          <p className="mt-6 text-center text-sm text-[--color-text-secondary]">
            Already have an account?{' '}
            <Link
              to="/login"
              className="font-medium text-[--color-primary-500] hover:text-[--color-primary-400]"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
