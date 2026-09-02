import {
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  updateProfile as fbUpdateProfile,
  updatePassword as fbUpdatePassword,
  sendPasswordResetEmail,
  type User,
  type Unsubscribe,
} from 'firebase/auth';
import { auth } from '../lib/firebase';
import { AppError } from '../lib/types';

/**
 * Log in with email and password (Requirements 1.1, 1.2, 1.3).
 * Throws AppError('REQUIRED_FIELDS') when either field is empty,
 * and AppError('INVALID_CREDENTIALS') on auth failure.
 */
export async function login(email: string, password: string): Promise<void> {
  if (!email.trim() || !password) {
    throw new AppError('REQUIRED_FIELDS', 'Email and password are required');
  }
  try {
    await signInWithEmailAndPassword(auth, email.trim(), password);
  } catch (err) {
    const code = (err as { code?: string }).code ?? '';
    // Surface the real Firebase error code to the console to aid debugging
    // (e.g. auth/operation-not-allowed, auth/network-request-failed).
    console.error('Firebase login failed:', code, err);
    if (code === 'auth/too-many-requests') {
      throw new AppError('TOO_MANY_REQUESTS', 'Too many attempts. Try again later.');
    }
    if (code === 'auth/operation-not-allowed') {
      throw new AppError(
        'INVALID_CREDENTIALS',
        'Email/Password sign-in is not enabled in Firebase.',
      );
    }
    if (code === 'auth/network-request-failed') {
      throw new AppError('INVALID_CREDENTIALS', 'Network error reaching Firebase.');
    }
    throw new AppError('INVALID_CREDENTIALS', 'Invalid email or password');
  }
}

/**
 * Sign in with Google. Tries a popup first (fast on desktop); if the popup is
 * blocked or unsupported (mobile webview / COOP), falls back to a full-page
 * redirect. The COOP "window.closed" console warning during the popup is
 * harmless and does not affect sign-in.
 */
export async function loginWithGoogle(): Promise<void> {
  const provider = new GoogleAuthProvider();
  try {
    await signInWithPopup(auth, provider);
  } catch (err) {
    const code = (err as { code?: string }).code ?? '';
    if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
      throw new AppError('CANCELLED', 'Sign-in was cancelled.');
    }
    if (code === 'auth/operation-not-allowed') {
      throw new AppError('PROVIDER_DISABLED', 'Google sign-in is not enabled in Firebase.');
    }
    // Popup blocked / not supported → redirect flow (resolves after page reload).
    if (code === 'auth/popup-blocked' || code === 'auth/operation-not-supported-in-this-environment') {
      await signInWithRedirect(auth, provider);
      return;
    }
    console.error('Google sign-in failed:', code, err);
    throw new AppError('GOOGLE_FAILED', 'Could not sign in with Google.');
  }
}

/** Log the admin out (Requirements 1.6). */
export async function logout(): Promise<void> {
  await signOut(auth);
}

/** Subscribe to auth state changes (Requirements 1.1, 1.5). */
export function onAuthChange(cb: (user: User | null) => void): Unsubscribe {
  return onAuthStateChanged(auth, cb);
}

/** Update the signed-in user's display name and/or avatar URL. */
export async function updateProfile(data: { displayName?: string; photoURL?: string }): Promise<void> {
  if (!auth.currentUser) throw new AppError('NOT_SIGNED_IN', 'Not signed in');
  await fbUpdateProfile(auth.currentUser, data);
}

/** Change the signed-in user's password (requires a recent login). */
export async function changePassword(newPassword: string): Promise<void> {
  if (!auth.currentUser) throw new AppError('NOT_SIGNED_IN', 'Not signed in');
  if (newPassword.length < 6) {
    throw new AppError('WEAK_PASSWORD', 'Password must be at least 6 characters');
  }
  try {
    await fbUpdatePassword(auth.currentUser, newPassword);
  } catch (err) {
    const code = (err as { code?: string }).code ?? '';
    if (code === 'auth/requires-recent-login') {
      throw new AppError('RECENT_LOGIN', 'Please log out and log in again, then retry.');
    }
    throw new AppError('PASSWORD_UPDATE_FAILED', 'Could not update password.');
  }
}

/** Send a password reset email to the given address. */
export async function sendResetEmail(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email.trim());
}
