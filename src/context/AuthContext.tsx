import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { User } from 'firebase/auth';
import {
  login as doLogin,
  logout as doLogout,
  loginWithGoogle as doGoogle,
  onAuthChange,
  updateProfile as doUpdateProfile,
} from '../services/authService';
import { registerCurrentClient, getMyClient } from '../services/clientService';
import { isSuperAdmin } from '../lib/firebase';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  accountClosed: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (data: { displayName?: string; photoURL?: string }) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [accountClosed, setAccountClosed] = useState(false);

  useEffect(() => {
    const unsub = onAuthChange(async (u) => {
      setUser(u);
      if (u) {
        // The super admin is not a client; skip registry + closed checks for them.
        if (isSuperAdmin()) {
          setAccountClosed(false);
        } else {
          try {
            await registerCurrentClient();
            const me = await getMyClient();
            setAccountClosed(me?.status === 'closed');
          } catch (err) {
            console.error('Client registry failed (check Firestore rules):', err);
            setAccountClosed(false);
          }
        }
      } else {
        setAccountClosed(false);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      accountClosed,
      login: doLogin,
      loginWithGoogle: doGoogle,
      logout: doLogout,
      updateProfile: async (data) => {
        await doUpdateProfile(data);
        // Reflect the change immediately by cloning the current user object.
        setUser((u) => (u ? ({ ...u, ...data } as User) : u));
      },
    }),
    [user, loading, accountClosed],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
