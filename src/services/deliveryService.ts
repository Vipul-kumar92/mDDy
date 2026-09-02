import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  deleteDoc,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import { db, currentUid } from '../lib/firebase';
import {
  AppError,
  type DeliveryEntry,
  type NewEntry,
  type Product,
  type ProductType,
  type RateConfig,
  type Slot,
} from '../lib/types';

/** Base ref helpers scoped to the signed-in user (users/{uid}/customers/...). */
function custDoc(customerId: string) {
  return doc(db, 'users', currentUid(), 'customers', customerId);
}
function entryDoc(customerId: string, entryId: string) {
  return doc(db, 'users', currentUid(), 'customers', customerId, 'entries', entryId);
}
import { getRates } from './rateService';
import { todayIso } from './customerService';

const MIN_QTY = 1;
const MAX_QTY = 999999;

function entriesCol(customerId: string) {
  return collection(db, 'users', currentUid(), 'customers', customerId, 'entries');
}

function rateFor(rates: RateConfig, product: Product, type?: ProductType): number | undefined {
  if (product === 'milk') return type ? rates.milk[type] : undefined;
  if (product === 'ghee') return type ? rates.ghee[type] : undefined;
  if (product === 'cream') return type ? rates.cream[type] : undefined;
  if (product === 'paneer' || product === 'dahi') return rates[product];
  return undefined;
}

function assertQty(qty: number, product: string) {
  if (!Number.isInteger(qty) || qty < MIN_QTY || qty > MAX_QTY) {
    throw new AppError('INVALID_QUANTITY', `Invalid quantity for ${product}`);
  }
}

/**
 * Build the persisted entry payload from input, snapshotting the rate.
 * Uses the per-entry rate override if provided, else the configured rate.
 * Throws INVALID_QUANTITY on bad qty and MISSING_RATE if no rate is available.
 */
export function buildEntryData(input: NewEntry, rates: RateConfig): Record<string, unknown> {
  assertQty(input.quantity, input.product);
  const rate = input.rate ?? rateFor(rates, input.product, input.type);
  if (rate === undefined) {
    throw new AppError(
      'MISSING_RATE',
      `No rate set for ${input.product}${input.type ? ` (${input.type})` : ''}`,
    );
  }
  if (!Number.isInteger(rate) || rate <= 0) {
    throw new AppError('INVALID_RATE', 'Rate must be greater than 0');
  }
  return {
    date: input.date,
    slot: input.slot,
    product: input.product,
    quantity: input.quantity,
    rate,
    ...(input.type ? { type: input.type } : {}),
  };
}

/** Add a delivery entry (one item; multiple entries per day allowed). */
export async function addEntry(customerId: string, input: NewEntry): Promise<string> {
  if (input.date > todayIso()) {
    throw new AppError('INVALID_DATE', 'Date cannot be in the future');
  }
  const rates = await getRates();
  const data = buildEntryData(input, rates);

  const ref = await addDoc(entriesCol(customerId), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  // Only flip a fully-paid customer back to unpaid; keep 'partial' as-is so a
  // partial payment status is not lost when a new entry is added.
  const custRef = custDoc(customerId);
  const cust = await getDoc(custRef);
  if ((cust.data()?.paymentStatus as string) === 'paid') {
    await updateDoc(custRef, { paymentStatus: 'unpaid' });
  }
  return ref.id;
}

/** Update an existing delivery entry, re-snapshotting the rate. */
export async function updateEntry(
  customerId: string,
  entryDocId: string,
  input: NewEntry,
): Promise<void> {
  const rates = await getRates();
  const data = buildEntryData(input, rates);
  await updateDoc(entryDoc(customerId, entryDocId), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

/** Delete a delivery entry from the current cycle. */
export async function deleteEntry(customerId: string, entryDocId: string): Promise<void> {
  await deleteDoc(entryDoc(customerId, entryDocId));
}

function mapEntry(id: string, data: Record<string, unknown>): DeliveryEntry {
  return {
    id,
    date: data.date as string,
    slot: (data.slot as Slot) ?? 'morning',
    product: data.product as Product,
    type: data.type as ProductType | undefined,
    quantity: (data.quantity as number) ?? 0,
    rate: (data.rate as number) ?? 0,
  };
}

/** List current-cycle delivery entries ordered by date. */
export async function listCurrentEntries(customerId: string): Promise<DeliveryEntry[]> {
  const snap = await getDocs(query(entriesCol(customerId), orderBy('date')));
  return snap.docs.map((d) => mapEntry(d.id, d.data()));
}

/** Fetch a single entry (used for editing). */
export async function getEntry(
  customerId: string,
  entryDocId: string,
): Promise<DeliveryEntry | null> {
  const snap = await getDoc(entryDoc(customerId, entryDocId));
  return snap.exists() ? mapEntry(snap.id, snap.data()) : null;
}
