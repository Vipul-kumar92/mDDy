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
import {
  AppError,
  type BillResult,
  type ClosedCycle,
  type NewPurchaseEntry,
  type Product,
  type ProductType,
  type PurchaseEntry,
  type RateConfig,
  type Slot,
} from '../lib/types';
import { computeBill } from './billingService';
import { getRates } from './rateService';
import { todayIso } from './customerService';
import { firstOfNextMonth } from './billingService';

const MIN = 1;
const MAX = 999999;

function vendPath(vendorId: string, ...rest: string[]) {
  return ['users', currentUid(), 'vendors', vendorId, ...rest] as const;
}
function entriesCol(vendorId: string) {
  return collection(db, ...vendPath(vendorId, 'entries'));
}

function rateFor(rates: RateConfig, product: Product, type?: ProductType): number | undefined {
  if (product === 'milk') return type ? rates.milk[type] : undefined;
  if (product === 'ghee') return type ? rates.ghee[type] : undefined;
  if (product === 'cream') return type ? rates.cream[type] : undefined;
  if (product === 'paneer' || product === 'dahi') return rates[product];
  return undefined;
}

/** Build a purchase entry payload, snapshotting the rate (override or configured). */
export function buildPurchaseData(input: NewPurchaseEntry, rates: RateConfig): Record<string, unknown> {
  if (!Number.isInteger(input.quantity) || input.quantity < MIN || input.quantity > MAX) {
    throw new AppError('INVALID_QUANTITY', 'Quantity must be between 0.01 and 9999.99');
  }
  const rate = input.rate ?? rateFor(rates, input.product, input.type);
  if (rate === undefined) {
    throw new AppError('MISSING_RATE', `No rate set for ${input.product}`);
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

/** Add a purchase entry (one item; multiple entries per day allowed). */
export async function addPurchase(vendorId: string, input: NewPurchaseEntry): Promise<string> {
  if (input.date > todayIso()) {
    throw new AppError('INVALID_DATE', 'Date cannot be in the future');
  }
  const rates = await getRates();
  const data = buildPurchaseData(input, rates);
  const ref = await addDoc(entriesCol(vendorId), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  const vRef = doc(db, ...vendPath(vendorId));
  const v = await getDoc(vRef);
  if ((v.data()?.paymentStatus as string) === 'paid') {
    await updateDoc(vRef, { paymentStatus: 'unpaid' });
  }
  return ref.id;
}

/** Update a purchase entry. */
export async function updatePurchase(
  vendorId: string,
  entryId: string,
  input: NewPurchaseEntry,
): Promise<void> {
  const rates = await getRates();
  const data = buildPurchaseData(input, rates);
  await updateDoc(doc(db, ...vendPath(vendorId, 'entries', entryId)), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

/** Delete a purchase entry. */
export async function deletePurchase(vendorId: string, entryId: string): Promise<void> {
  await deleteDoc(doc(db, ...vendPath(vendorId, 'entries', entryId)));
}

function mapEntry(id: string, data: Record<string, unknown>): PurchaseEntry {
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

/** List current-cycle purchase entries ordered by date. */
export async function listPurchases(vendorId: string): Promise<PurchaseEntry[]> {
  const snap = await getDocs(query(entriesCol(vendorId), orderBy('date')));
  return snap.docs.map((d) => mapEntry(d.id, d.data()));
}

export async function getPurchase(vendorId: string, entryId: string): Promise<PurchaseEntry | null> {
  const snap = await getDoc(doc(db, ...vendPath(vendorId, 'entries', entryId)));
  return snap.exists() ? mapEntry(snap.id, snap.data()) : null;
}

/** Compute the vendor's current purchase bill (reuses the customer billing engine). */
export function computePurchaseBill(entries: PurchaseEntry[]): BillResult {
  // PurchaseEntry has the same shape a DeliveryEntry needs for computeBill.
  return computeBill(entries as unknown as Parameters<typeof computeBill>[0]);
}

function nextDayIso(iso: string): string {
  return firstOfNextMonth(iso);
}

/** Mark the vendor's current bill fully paid: freeze a closed cycle, clear entries. */
export async function markPurchasePaid(vendorId: string): Promise<void> {
  const vendorRef = doc(db, ...vendPath(vendorId));
  const eRef = entriesCol(vendorId);
  const paymentDate = todayIso();

  const snap = await getDocs(query(eRef, orderBy('date')));
  if (snap.empty) throw new AppError('NOTHING_TO_PAY', 'There is nothing to mark as paid');

  const entries: PurchaseEntry[] = snap.docs.map((d) => mapEntry(d.id, d.data()));
  const bill = computePurchaseBill(entries);
  if (bill.error) throw new AppError('BILL_ERROR', 'Cannot mark paid: bill is not billable');

  const cleanEntries = entries.map((e) => {
    const obj: Record<string, unknown> = {
      id: e.id, date: e.date, slot: e.slot, product: e.product, quantity: e.quantity, rate: e.rate,
    };
    if (e.type) obj.type = e.type;
    return obj;
  });

  const paymentsRef = collection(db, ...vendPath(vendorId, 'payments'));
  const custSnap = await getDoc(vendorRef);
  const cycleStart = (custSnap.data()?.currentCycleStart as string) ?? bill.startDate;
  const payDocs = (await getDocs(query(paymentsRef, orderBy('createdAt')))).docs.filter(
    (d) => ((d.data().date as string) ?? '') >= cycleStart,
  );
  const cyclePayments = payDocs.map((d) => ({
    amountPaise: (d.data().amountPaise as number) ?? 0,
    date: (d.data().date as string) ?? paymentDate,
    type: ((d.data().type as string) ?? 'partial') as 'partial' | 'final',
  }));

  const cycleRef = doc(collection(db, ...vendPath(vendorId, 'cycles')));
  await runTransaction(db, async (tx) => {
    const vDoc = await tx.get(vendorRef);
    const startDate = (vDoc.data()?.currentCycleStart as string) ?? bill.startDate;
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
    for (const d of snap.docs) tx.delete(doc(eRef, d.id));
    tx.update(vendorRef, {
      paymentStatus: 'paid',
      paidPaise: 0,
      currentCycleStart: nextDayIso(paymentDate),
    });
  });

  for (const d of payDocs) await deleteDoc(doc(paymentsRef, d.id));
}

/** Record a partial payment to the vendor; closes the cycle when fully covered. */
export async function recordVendorPayment(vendorId: string, amountPaise: number): Promise<void> {
  if (!Number.isFinite(amountPaise) || amountPaise <= 0) {
    throw new AppError('INVALID_AMOUNT', 'Enter an amount greater than zero');
  }
  const eRef = entriesCol(vendorId);
  const snap = await getDocs(query(eRef, orderBy('date')));
  if (snap.empty) throw new AppError('NOTHING_TO_PAY', 'There is nothing to pay for');

  const entries: PurchaseEntry[] = snap.docs.map((d) => mapEntry(d.id, d.data()));
  const bill = computePurchaseBill(entries);
  if (bill.error) throw new AppError('BILL_ERROR', 'Cannot record payment: bill is not billable');

  const vendorRef = doc(db, ...vendPath(vendorId));
  const vSnap = await getDoc(vendorRef);
  const prevPaid = (vSnap.data()?.paidPaise as number) ?? 0;
  const newPaid = prevPaid + amountPaise;

  await addDoc(collection(db, ...vendPath(vendorId, 'payments')), {
    amountPaise,
    date: todayIso(),
    type: newPaid >= bill.grandTotalPaise ? 'final' : 'partial',
    createdAt: serverTimestamp(),
  });

  if (newPaid >= bill.grandTotalPaise) {
    await markPurchasePaid(vendorId);
    return;
  }
  await updateDoc(vendorRef, { paidPaise: newPaid, paymentStatus: 'partial' });
}

/** A recorded vendor payment. */
export interface PaymentLog {
  id: string;
  amountPaise: number;
  date: string;
  type: 'partial' | 'final';
}

/** List all recorded payments for a vendor, most recent first. */
export async function listVendorPayments(vendorId: string): Promise<PaymentLog[]> {
  const ref = collection(db, ...vendPath(vendorId, 'payments'));
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

/** List closed purchase cycles, most recent first. */
export async function listVendorCycles(vendorId: string): Promise<ClosedCycle[]> {
  const ref = collection(db, ...vendPath(vendorId, 'cycles'));
  const snap = await getDocs(query(ref, orderBy('paymentDate', 'desc')));
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
      payments: data.payments ?? [],
    };
  });
}
