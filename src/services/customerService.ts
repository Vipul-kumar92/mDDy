import {
  collection,
  addDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  type Unsubscribe,
} from 'firebase/firestore';
import { doc, deleteDoc, updateDoc, getDoc } from 'firebase/firestore';
import { db, currentUid } from '../lib/firebase';
import { AppError, type Customer, type NewCustomer } from '../lib/types';
import { titleCaseName } from './text';

/** Collection ref for the current user's customers: users/{uid}/customers. */
function customersCol() {
  return collection(db, 'users', currentUid(), 'customers');
}
function customerDoc(id: string) {
  return doc(db, 'users', currentUid(), 'customers', id);
}

/** Return today's date as 'YYYY-MM-DD' in local time. */
export function todayIso(): string {
  const d = new Date();
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

/** Validate customer input, throwing AppError with a field-specific code (Requirements 2.2, 2.3, 2.4). */
export function validateCustomer(input: NewCustomer): NewCustomer {
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

/** Create and persist a new customer (Requirements 2.1, 2.4, 2.6). */
export async function createCustomer(input: NewCustomer): Promise<string> {
  const clean = validateCustomer(input);
  const docData = {
    name: clean.name,
    nameLower: clean.name.toLowerCase(),
    ...(clean.phone ? { phone: clean.phone } : {}),
    ...(clean.address ? { address: clean.address } : {}),
    paymentStatus: 'unpaid' as const,
    currentCycleStart: `${todayIso().slice(0, 7)}-01`, // first day of the current month
    active: true,
    createdAt: serverTimestamp(),
  };
  const ref = await addDoc(customersCol(), docData);
  return ref.id;
}

function mapCustomer(id: string, data: Record<string, unknown>): Customer {
  return {
    id,
    name: data.name as string,
    nameLower: (data.nameLower as string) ?? (data.name as string).toLowerCase(),
    phone: data.phone as string | undefined,
    address: data.address as string | undefined,
    paymentStatus: (data.paymentStatus as Customer['paymentStatus']) ?? 'unpaid',
    paidPaise: (data.paidPaise as number) ?? 0,
    currentCycleStart: (data.currentCycleStart as string) ?? '',
    active: (data.active as boolean | undefined) ?? true,
  };
}

/** List all customers (Requirements 2.5). */
export async function listCustomers(): Promise<Customer[]> {
  const snap = await getDocs(query(customersCol(), orderBy('nameLower')));
  return snap.docs.map((d) => mapCustomer(d.id, d.data()));
}

/** Subscribe to the customer list in realtime (Requirements 2.5, 2.7). */
export function subscribeCustomers(cb: (customers: Customer[]) => void): Unsubscribe {
  return onSnapshot(query(customersCol(), orderBy('nameLower')), (snap) => {
    cb(snap.docs.map((d) => mapCustomer(d.id, d.data())));
  });
}

/** Update a customer's editable details (name/phone/address). */
export async function updateCustomer(id: string, input: NewCustomer): Promise<void> {
  const clean = validateCustomer(input);
  await updateDoc(customerDoc(id), {
    name: clean.name,
    nameLower: clean.name.toLowerCase(),
    phone: clean.phone ?? null,
    address: clean.address ?? null,
  });
}

/** Fetch a single customer (scoped to the current user). */
export async function getCustomer(id: string): Promise<Customer | null> {
  const snap = await getDoc(customerDoc(id));
  return snap.exists() ? mapCustomer(snap.id, snap.data()) : null;
}

/** Activate or deactivate a customer. */
export async function setCustomerActive(id: string, active: boolean): Promise<void> {
  await updateDoc(customerDoc(id), { active });
}

/** Delete a customer document. */
export async function deleteCustomer(id: string): Promise<void> {
  await deleteDoc(customerDoc(id));
}

/** Case-insensitive substring filter on customer name (Requirements 2.8). */
export function filterCustomers(customers: Customer[], term: string): Customer[] {
  const t = term.trim().toLowerCase();
  if (!t) return customers;
  return customers.filter((c) => c.nameLower.includes(t));
}
