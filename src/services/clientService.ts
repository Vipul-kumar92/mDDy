import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  orderBy,
  query,
  serverTimestamp,
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { sendResetEmail } from './authService';
import type { Client } from '../lib/types';

const COL = 'clients';

/**
 * Ensure a registry record exists for the signed-in user so the super admin
 * can see and manage them. Called once after login. Never downgrades status.
 */
export async function registerCurrentClient(): Promise<void> {
  const u = auth.currentUser;
  if (!u) return;
  const ref = doc(db, COL, u.uid);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    // Keep email/name fresh; do not touch status.
    await updateDoc(ref, {
      email: u.email ?? '',
      ...(u.displayName ? { name: u.displayName } : {}),
    });
  } else {
    await setDoc(ref, {
      email: u.email ?? '',
      ...(u.displayName ? { name: u.displayName } : {}),
      status: 'active',
      createdAt: serverTimestamp(),
    });
  }
}

/** Read the signed-in user's own client record (used to enforce closed accounts). */
export async function getMyClient(): Promise<Client | null> {
  const u = auth.currentUser;
  if (!u) return null;
  const snap = await getDoc(doc(db, COL, u.uid));
  if (!snap.exists()) return null;
  const d = snap.data();
  return {
    id: snap.id,
    email: (d.email as string) ?? '',
    name: d.name as string | undefined,
    status: (d.status as Client['status']) ?? 'active',
  };
}

/** List all clients (super admin only). */
export async function listClients(): Promise<Client[]> {
  const snap = await getDocs(query(collection(db, COL), orderBy('email')));
  return snap.docs.map((s) => {
    const d = s.data();
    return {
      id: s.id,
      email: (d.email as string) ?? '',
      name: d.name as string | undefined,
      status: (d.status as Client['status']) ?? 'active',
    };
  });
}

/** Close or resume a client's account (app-level access flag). */
export async function setClientStatus(id: string, status: Client['status']): Promise<void> {
  await updateDoc(doc(db, COL, id), { status });
}

/** Send a password reset email to a client. */
export async function resetClientPassword(email: string): Promise<void> {
  await sendResetEmail(email);
}
