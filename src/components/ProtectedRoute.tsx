import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Guards protected routes: redirects unauthenticated users to /login
 * (Requirements 1.5). Shows a loading state while auth resolves.
 */
export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading, accountClosed, logout } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-slate-500">
        Loading…
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Account closed by the super admin: block app access.
  if (accountClosed) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 text-3xl">🚫</div>
        <h1 className="text-lg font-bold text-slate-800">Account closed</h1>
        <p className="max-w-xs text-sm text-slate-500">
          Your account has been closed by the administrator. Please contact support.
        </p>
        <button onClick={() => void logout()} className="btn-outline">
          Logout
        </button>
      </div>
    );
  }

  return <>{children}</>;
}
