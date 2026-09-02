import {
  collection,
  addDoc,
  doc,
  getDoc,
  getDocs,
  deleteDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  type Unsubscribe,
} from 'firebase/firestore';
import { db, currentUid } from '../lib/firebase';
import { AppError, type Vendor, type NewVendor } from '../lib/types';
import { titleCaseName } from './text';
import { todayIso } from './customerService';

/** Collection/doc refs for the current user's vendors: users/{uid}/vendors. */
function vendorsCol() {
  return collection(db, 'users', currentUid(), 'vendors');
}
function vendorDoc(id: string) {
  return doc(db, 'users', currentUid(), 'vendors', id);
}

/** Validate vendor input, throwing AppError with a field-specific code. */
export function validateVendor(input: NewVendor): NewVendor {
  const name = titleCaseName(input.name);
  if (name.length < 1 || name.length > 100) {
    throw new AppError('INVALID_NAME', 'Name must be 1 to 100 characters');
  }
  const phone = input.phone?.trim();
  if (phone) {
    if (!/^\d{7,15}$/.test(phone)) {
      throw new AppError('INVALID_PHONE', 'Phone must be 7 to 15 digits');
    }
  }
  const address = input.address?.trim();
  if (address && address.length > 250) {
    throw new AppError('INVALID_ADDRESS', 'Address must be at most 250 characters');
  }
  return { name, phone: phone || undefined, address: address || undefined };
}

/** Create and persist a new vendor. */
export async function createVendor(input: NewVendor): Promise<string> {
  const clean = validateVendor(input);
  const docData = {
    name: clean.name,
    nameLower: clean.name.toLowerCase(),
    ...(clean.phone ? { phone: clean.phone } : {}),
    ...(clean.address ? { address: clean.address } : {}),
    paymentStatus: 'unpaid' as const,
    paidPaise: 0,
    currentCycleStart: `${todayIso().slice(0, 7)}-01`,
    active: true,
    createdAt: serverTimestamp(),
  };
  const ref = await addDoc(vendorsCol(), docData);
  return ref.id;
}

/** Update an existing vendor's details. */
export async function updateVendor(id: string, input: NewVendor): Promise<void> {
  const clean = validateVendor(input);
  await updateDoc(vendorDoc(id), {
    name: clean.name,
    nameLower: clean.name.toLowerCase(),
    phone: clean.phone ?? null,
    address: clean.address ?? null,
  });
}

/** Activate or deactivate a vendor. */
export async function setVendorActive(id: string, active: boolean): Promise<void> {
  await updateDoc(vendorDoc(id), { active });
}

/** Delete a vendor. */
export async function deleteVendor(id: string): Promise<void> {
  await deleteDoc(vendorDoc(id));
}

function mapVendor(id: string, data: Record<string, unknown>): Vendor {
  return {
    id,
    name: data.name as string,
    nameLower: (data.nameLower as string) ?? (data.name as string).toLowerCase(),
    phone: (data.phone as string | undefined) ?? undefined,
    address: (data.address as string | undefined) ?? undefined,
    paymentStatus: (data.paymentStatus as Vendor['paymentStatus']) ?? 'unpaid',
    paidPaise: (data.paidPaise as number) ?? 0,
    currentCycleStart: (data.currentCycleStart as string) ?? '',
    active: (data.active as boolean | undefined) ?? true,
  };
}

/** List all vendors ordered by name. */
export async function listVendors(): Promise<Vendor[]> {
  const snap = await getDocs(query(vendorsCol(), orderBy('nameLower')));
  return snap.docs.map((d) => mapVendor(d.id, d.data()));
}

/** Fetch a single vendor. */
export async function getVendor(id: string): Promise<Vendor | null> {
  const snap = await getDoc(vendorDoc(id));
  return snap.exists() ? mapVendor(snap.id, snap.data()) : null;
}

/** Subscribe to the vendor list in realtime. */
export function subscribeVendors(cb: (vendors: Vendor[]) => void): Unsubscribe {
  return onSnapshot(query(vendorsCol(), orderBy('nameLower')), (snap) => {
    cb(snap.docs.map((d) => mapVendor(d.id, d.data())));
  });
}

/** Case-insensitive substring filter on vendor name. */
export function filterVendors(vendors: Vendor[], term: string): Vendor[] {
  const t = term.trim().toLowerCase();
  if (!t) return vendors;
  return vendors.filter((v) => v.nameLower.includes(t));
}
