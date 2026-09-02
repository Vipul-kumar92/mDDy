import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { AppError } from '../lib/types';

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const LOCK_MS = 15 * 60 * 1000; // 15 minutes
const STORAGE_KEY = 'login-attempts';

interface AttemptState {
  count: number;
  windowStart: number;
  lockedUntil: number;
}

function readState(): AttemptState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as AttemptState;
  } catch {
    // ignore
  }
  return { count: 0, windowStart: Date.now(), lockedUntil: 0 };
}

function writeState(s: AttemptState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}

/**
 * Admin login form with client-side lockout (Requirements 1.2, 1.3, 1.4).
 * 5 failed attempts within 15 minutes locks the form for 15 minutes.
 */
export default function LoginPage() {
  const { login, loginWithGoogle, user, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [lockedUntil, setLockedUntil] = useState(() => readState().lockedUntil);

  const isLocked = lockedUntil > Date.now();

  useEffect(() => {
    if (!isLocked) return;
    const t = setTimeout(() => setLockedUntil(0), lockedUntil - Date.now());
    return () => clearTimeout(t);
  }, [isLocked, lockedUntil]);

  // Once authenticated, leave the login page and go to the home (customers) page.
  // Placed after all hooks so hook order stays consistent across renders.
  if (!loading && user) {
    return <Navigate to="/" replace />;
  }

  const recordFailure = () => {
    const now = Date.now();
    const s = readState();
    // Reset the window if it has expired.
    if (now - s.windowStart > WINDOW_MS) {
      s.count = 0;
      s.windowStart = now;
    }
    s.count += 1;
    if (s.count >= MAX_ATTEMPTS) {
      s.lockedUntil = now + LOCK_MS;
      s.count = 0;
      s.windowStart = now;
      setLockedUntil(s.lockedUntil);
    }
    writeState(s);
  };

  const clearAttempts = () => writeState({ count: 0, windowStart: Date.now(), lockedUntil: 0 });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (isLocked) return;

    setSubmitting(true);
    try {
      await login(email, password);
      clearAttempts();
    } catch (err) {
      const code = err instanceof AppError ? err.code : 'INVALID_CREDENTIALS';
      if (code === 'REQUIRED_FIELDS') {
        setError('Email and password are both required.');
      } else if (code === 'TOO_MANY_REQUESTS') {
        setError('Too many attempts. Please try again later.');
      } else {
        recordFailure();
        setError('Invalid email or password.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-600 via-brand-500 to-brand-400 p-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm space-y-4 rounded-2xl bg-white p-7 shadow-xl"
      >
        <div className="flex flex-col items-center gap-2">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-600 text-2xl font-bold text-white shadow-lg">
            mD
          </div>
          <h1 className="text-2xl font-bold text-slate-800">mDDy</h1>
          <p className="text-sm text-slate-500">Sign in to continue</p>
        </div>

        <div className="space-y-1">
          <label htmlFor="email" className="text-sm font-medium text-slate-700">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-slate-500"
            autoComplete="username"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="password" className="text-sm font-medium text-slate-700">
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 pr-16 outline-none focus:border-slate-500"
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              className="absolute inset-y-0 right-0 px-3 text-sm font-medium text-slate-500 hover:text-slate-700"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>
        </div>

        {error && (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        )}
        {isLocked && (
          <p role="alert" className="text-sm text-red-600">
            Account temporarily locked. Try again in a few minutes.
          </p>
        )}

        <button
          type="submit"
          disabled={submitting || isLocked}
          className="w-full rounded-lg bg-brand-600 px-4 py-2.5 font-medium text-white shadow-sm transition hover:bg-brand-700 disabled:opacity-50"
        >
          {submitting ? 'Signing in…' : 'Sign in'}
        </button>

        <div className="flex items-center gap-3">
          <span className="h-px flex-1 bg-slate-200" />
          <span className="text-xs font-medium text-slate-400">or</span>
          <span className="h-px flex-1 bg-slate-200" />
        </div>

        <button
          type="button"
          disabled={submitting || isLocked}
          onClick={async () => {
            setError('');
            setSubmitting(true);
            try {
              await loginWithGoogle();
            } catch (err) {
              const code = err instanceof AppError ? err.code : '';
              if (code === 'CANCELLED') {
                // user closed the popup; no message needed
              } else if (code === 'PROVIDER_DISABLED') {
                setError('Google sign-in is not enabled in Firebase.');
              } else {
                setError('Could not sign in with Google.');
              }
            } finally {
              setSubmitting(false);
            }
          }}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
        >
          <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
            <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.3-.4-3.5z"/>
            <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
            <path fill="#4CAF50" d="M24 44c5.5 0 10.5-2.1 14.3-5.5l-6.6-5.6C29.6 34.6 26.9 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.6 39.6 16.2 44 24 44z"/>
            <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.2-4.3 5.5l6.6 5.6C41.4 36.3 44 30.6 44 24c0-1.3-.1-2.3-.4-3.5z"/>
          </svg>
          Continue with Google
        </button>
      </form>
    </div>
  );
}
