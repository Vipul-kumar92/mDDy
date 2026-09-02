import type {
  BillResult,
  DeliveryEntry,
  LineItem,
  Product,
  ProductType,
} from '../lib/types';
import { lineAmountPaise } from './money';

import type { Slot } from '../lib/types';

interface GroupAccumulator {
  product: Product;
  type?: ProductType;
  slot?: Slot;
  totalQtyHundredths: number;
  ratePaise: number | null; // snapshot rate; null if any contributing item lacks one
}

/**
 * Group key includes slot + rate so items of the same product/type but a
 * different slot or rate become separate line items
 * (e.g. Milk morning 2L @ ₹60 and Milk evening 1.5L @ ₹50).
 */
function groupKey(
  product: Product,
  type: ProductType | undefined,
  slot: Slot | undefined,
  rate: number | undefined,
): string {
  const base = type ? `${product}:${type}` : product;
  return `${base}:${slot ?? '-'}@${rate ?? 'none'}`;
}

/**
 * Compute a bill from the current-cycle delivery entries.
 *
 * - Groups entries by product + type, summing quantities (Requirements 5.1).
 * - Uses the snapshot rate captured on each entry item (Requirements 5.2).
 * - Returns NO_ENTRIES when there are zero entries (Requirements 5.5).
 * - Returns MISSING_RATE when a present product lacks a snapshot rate (Requirements 5.4).
 * - Rounds each line amount half-up; grand total is the sum of line amounts (Requirements 5.3, 5.6).
 *
 * Rates are read from the entries themselves (snapshots), so changing the current
 * RateConfig never alters an already-recorded bill (Property 3).
 */
export function computeBill(entries: DeliveryEntry[]): BillResult {
  const dates = entries.map((e) => e.date).sort();
  const startDate = dates[0] ?? '';
  const endDate = dates[dates.length - 1] ?? '';

  if (entries.length === 0) {
    return {
      lineItems: [],
      grandTotalPaise: 0,
      startDate,
      endDate,
      error: { code: 'NO_ENTRIES' },
    };
  }

  const groups = new Map<string, GroupAccumulator>();
  // Preserve a stable, predictable ordering of line items.
  const order: string[] = [];

  const addItem = (
    product: Product,
    type: ProductType | undefined,
    slot: Slot | undefined,
    quantity: number,
    rate: number | undefined,
  ) => {
    const key = groupKey(product, type, slot, rate);
    let acc = groups.get(key);
    if (!acc) {
      // Each distinct product/type/slot/rate combination forms its own group.
      acc = { product, type, slot, totalQtyHundredths: 0, ratePaise: rate && rate > 0 ? rate : null };
      groups.set(key, acc);
      order.push(key);
    }
    acc.totalQtyHundredths += quantity;
  };

  for (const entry of entries) {
    addItem(entry.product, entry.type, entry.slot, entry.quantity, entry.rate);
  }

  // Detect a missing rate on any grouped product.
  for (const key of order) {
    const acc = groups.get(key)!;
    if (acc.ratePaise === null) {
      return {
        lineItems: [],
        grandTotalPaise: 0,
        startDate,
        endDate,
        error: { code: 'MISSING_RATE', product: acc.product, type: acc.type },
      };
    }
  }

  const lineItems: LineItem[] = [];
  let grandTotalPaise = 0;
  for (const key of order) {
    const acc = groups.get(key)!;
    const ratePaise = acc.ratePaise as number;
    const amountPaise = lineAmountPaise(acc.totalQtyHundredths, ratePaise);
    lineItems.push({
      product: acc.product,
      type: acc.type,
      slot: acc.slot,
      totalQtyHundredths: acc.totalQtyHundredths,
      ratePaise,
      amountPaise,
    });
    grandTotalPaise += amountPaise;
  }

  return { lineItems, grandTotalPaise, startDate, endDate };
}

// --- Payment / billing-cycle lifecycle (Requirements 7) ---

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import { db, currentUid } from '../lib/firebase';
import { AppError, type ClosedCycle } from '../lib/types';
import { todayIso } from './customerService';

/** Path helpers scoped to the signed-in user (users/{uid}/customers/{id}/...). */
function custPath(customerId: string, ...rest: string[]) {
  return ['users', currentUid(), 'customers', customerId, ...rest] as const;
}

/** First day of the month for a given ISO date, e.g. '2026-09-15' -> '2026-09-01'. */
export function firstOfMonth(iso: string): string {
  return `${iso.slice(0, 7)}-01`;
}

/** First day of the month after the given ISO date's month. */
export function firstOfNextMonth(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  const year = d.getFullYear();
  const month = d.getMonth(); // 0-based
  const next = new Date(year, month + 1, 1);
  const m = `${next.getMonth() + 1}`.padStart(2, '0');
  return `${next.getFullYear()}-${m}-01`;
}

/** Last day of the month for a given ISO date, e.g. '2026-09-10' -> '2026-09-30'. */
export function lastOfMonth(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0); // day 0 of next month = last day
  const m = `${last.getMonth() + 1}`.padStart(2, '0');
  const day = `${last.getDate()}`.padStart(2, '0');
  return `${last.getFullYear()}-${m}-${day}`;
}

/**
 * Mark the customer's current bill as paid (Requirements 7.2, 7.3, 7.5, 7.6).
 * Runs atomically: freezes a ClosedCycle, deletes current entries, and updates
 * the customer status and next cycle start.
 */
export async function markPaid(customerId: string): Promise<void> {
  const customerRef = doc(db, ...custPath(customerId));
  const entriesRef = collection(db, ...custPath(customerId, 'entries'));
  const paymentDate = todayIso();

  // Read entries outside the transaction to compute the bill, then re-verify
  // inside the transaction for consistency.
  const snap = await getDocs(query(entriesRef, orderBy('date')));
  if (snap.empty) {
    throw new AppError('NOTHING_TO_PAY', 'There is nothing to mark as paid');
  }

  const entries: DeliveryEntry[] = snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      date: data.date as string,
      slot: (data.slot as DeliveryEntry['slot']) ?? 'morning',
      product: data.product as DeliveryEntry['product'],
      type: data.type as DeliveryEntry['type'],
      quantity: (data.quantity as number) ?? 0,
      rate: (data.rate as number) ?? 0,
    };
  });

  const bill = computeBill(entries);
  if (bill.error) {
    throw new AppError('BILL_ERROR', 'Cannot mark paid: bill is not billable');
  }

  // Freeze entries as plain, Firestore-safe objects (drop undefined type).
  const cleanEntries = entries.map((e) => {
    const obj: Record<string, unknown> = {
      id: e.id,
      date: e.date,
      slot: e.slot,
      product: e.product,
      quantity: e.quantity,
      rate: e.rate,
    };
    if (e.type) obj.type = e.type;
    return obj;
  });

  // Gather this cycle's payment log (to freeze into the closed cycle).
  const paymentsRef = collection(db, ...custPath(customerId, 'payments'));
  const custSnap0 = await getDoc(customerRef);
  const cycleStart = (custSnap0.data()?.currentCycleStart as string) ?? bill.startDate;
  const payDocs = (await getDocs(query(paymentsRef, orderBy('createdAt')))).docs.filter(
    (d) => ((d.data().date as string) ?? '') >= cycleStart,
  );
  const cyclePayments = payDocs.map((d) => ({
    amountPaise: (d.data().amountPaise as number) ?? 0,
    date: (d.data().date as string) ?? paymentDate,
    type: ((d.data().type as string) ?? 'partial') as 'partial' | 'final',
  }));

  const cyclesRef = collection(db, ...custPath(customerId, 'cycles'));
  const cycleRef = doc(cyclesRef);

  await runTransaction(db, async (tx) => {
    const customerDoc = await tx.get(customerRef);
    const startDate = (customerDoc.data()?.currentCycleStart as string) ?? bill.startDate;

    tx.set(cycleRef, {
      startDate,
      endDate: bill.endDate,
      paymentDate,
      lineItems: bill.lineItems,
      totalPaise: bill.grandTotalPaise,
      entries: cleanEntries,
      payments: cyclePayments,
      createdAt: serverTimestamp(),
    });

    // Delete all current entries.
    for (const d of snap.docs) {
      tx.delete(doc(entriesRef, d.id));
    }

    tx.update(customerRef, {
      paymentStatus: 'paid',
      paidPaise: 0, // reset for the new cycle
      currentCycleStart: firstOfNextMonth(paymentDate),
    });
  });

  // Clear the (now frozen) payment log so the next cycle starts fresh.
  for (const d of payDocs) {
    await deleteDoc(doc(paymentsRef, d.id));
  }
}

/**
 * Record a partial payment for the current cycle. Adds `amountPaise` to the
 * customer's collected amount without closing the cycle. If the collected
 * amount reaches or exceeds the current bill total, the cycle is closed
 * (equivalent to a full mark-paid). Otherwise the status becomes 'partial'.
 */
export async function recordPartialPayment(customerId: string, amountPaise: number): Promise<void> {
  if (!Number.isFinite(amountPaise) || amountPaise <= 0) {
    throw new AppError('INVALID_AMOUNT', 'Enter an amount greater than zero');
  }

  const entriesRef = collection(db, ...custPath(customerId, 'entries'));
  const snap = await getDocs(query(entriesRef, orderBy('date')));
  if (snap.empty) {
    throw new AppError('NOTHING_TO_PAY', 'There is nothing to pay for');
  }

  const entries: DeliveryEntry[] = snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      date: data.date as string,
      slot: (data.slot as DeliveryEntry['slot']) ?? 'morning',
      product: data.product as DeliveryEntry['product'],
      type: data.type as DeliveryEntry['type'],
      quantity: (data.quantity as number) ?? 0,
      rate: (data.rate as number) ?? 0,
    };
  });

  const bill = computeBill(entries);
  if (bill.error) {
    throw new AppError('BILL_ERROR', 'Cannot record payment: bill is not billable');
  }

  const customerRef = doc(db, ...custPath(customerId));
  const customerSnap = await getDoc(customerRef);
  const prevPaid = (customerSnap.data()?.paidPaise as number) ?? 0;
  const newPaid = prevPaid + amountPaise;

  // Log this payment so it appears in the payment history.
  await addDoc(collection(db, ...custPath(customerId, 'payments')), {
    amountPaise,
    date: todayIso(),
    type: newPaid >= bill.grandTotalPaise ? 'final' : 'partial',
    createdAt: serverTimestamp(),
  });

  // If the collected amount covers the whole bill, close the cycle.
  if (newPaid >= bill.grandTotalPaise) {
    await markPaid(customerId);
    return;
  }

  // Otherwise just record the partial amount and mark the cycle 'partial'.
  await updateDoc(customerRef, {
    paidPaise: newPaid,
    paymentStatus: 'partial',
  });
}

/** A single recorded payment (partial or final). */
export interface PaymentLog {
  id: string;
  amountPaise: number;
  date: string;
  type: 'partial' | 'final';
}

/** List all recorded payments for a customer, most recent first. */
export async function listPayments(customerId: string): Promise<PaymentLog[]> {
  const ref = collection(db, ...custPath(customerId, 'payments'));
  const snap = await getDocs(query(ref, orderBy('createdAt', 'desc')));
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      amountPaise: (data.amountPaise as number) ?? 0,
      date: (data.date as string) ?? '',
      type: (data.type as 'partial' | 'final') ?? 'partial',
    };
  });
}

/** Delete a recorded payment (e.g. added by mistake) from the current active cycle. */
export async function deletePayment(customerId: string, paymentId: string): Promise<void> {
  const paymentRef = doc(db, ...custPath(customerId, 'payments', paymentId));
  const paymentSnap = await getDoc(paymentRef);
  if (!paymentSnap.exists()) return;

  const amountPaise = (paymentSnap.data().amountPaise as number) ?? 0;

  await deleteDoc(paymentRef);

  const customerRef = doc(db, ...custPath(customerId));
  const customerSnap = await getDoc(customerRef);
  if (customerSnap.exists()) {
    const prevPaid = (customerSnap.data().paidPaise as number) ?? 0;
    const newPaid = Math.max(0, prevPaid - amountPaise);
    await updateDoc(customerRef, {
      paidPaise: newPaid,
      paymentStatus: newPaid === 0 ? 'unpaid' : 'partial',
    });
  }
}

/** List closed billing cycles, most recent first (Requirements 7.7). */
export async function listCycles(customerId: string): Promise<ClosedCycle[]> {
  const cyclesRef = collection(db, ...custPath(customerId, 'cycles'));
  const snap = await getDocs(query(cyclesRef, orderBy('paymentDate', 'desc')));
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      startDate: data.startDate as string,
      endDate: data.endDate as string,
      paymentDate: data.paymentDate as string,
      lineItems: data.lineItems ?? [],
      totalPaise: (data.totalPaise as number) ?? 0,
      entries: data.entries ?? [],
    };
  });
}
