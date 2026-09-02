import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentSingleTabManager,
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);

// Firestore with offline persistence for offline-tolerant reads.
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentSingleTabManager(undefined),
  }),
});

export const DAIRY_NAME: string = import.meta.env.VITE_DAIRY_NAME ?? 'mDDy';

/** The super admin email (from env). Only this account can manage clients. */
export const SUPER_ADMIN_EMAIL: string = (import.meta.env.VITE_SUPER_ADMIN_EMAIL ?? '').toLowerCase();

/** Whether the currently signed-in user is the super admin. */
export function isSuperAdmin(): boolean {
  const email = auth.currentUser?.email?.toLowerCase();
  return !!email && !!SUPER_ADMIN_EMAIL && email === SUPER_ADMIN_EMAIL;
}

/**
 * The current signed-in user's id. Every data path is scoped under this uid
 * so each user (client) only ever sees their own customers/vendors/rates.
 * Throws if called while signed out (all data access happens behind auth).
 */
export function currentUid(): string {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Not signed in');
  return uid;
}

/** Base path for all of the current user's data: users/{uid}. */
export function userPath(...segments: string[]): string[] {
  return ['users', currentUid(), ...segments];
}
