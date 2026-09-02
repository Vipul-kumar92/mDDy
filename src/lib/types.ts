import type { Timestamp } from 'firebase/firestore';

/** Product variants for Milk. Cream, Paneer, and Dahi have no variant. */
export type ProductType = 'cow' | 'buffalo' | 'mix';

/** Products supported by the system. */
export type Product = 'milk' | 'cream' | 'paneer' | 'dahi' | 'ghee';

/**
 * Rate configuration. All rates are stored in integer paise (rupees x 100).
 * Milk rates are per litre; Cream, Paneer, and Dahi rates are per kilogram.
 * An absent field means the rate is "not set".
 */
export interface RateConfig {
  milk: { cow?: number; buffalo?: number; mix?: number };
  ghee: { cow?: number; buffalo?: number; mix?: number };
  cream: { cow?: number; buffalo?: number; mix?: number };
  paneer?: number;
  dahi?: number;
  updatedAt?: Timestamp;
}

/** Payment status of a customer's current billing cycle. */
export type PaymentStatus = 'paid' | 'unpaid' | 'partial';

/** A customer record. */
export interface Customer {
  id: string;
  name: string; // 1..100 chars
  phone?: string; // 7..15 digits
  address?: string; // <=250 chars
  nameLower: string; // lowercase copy for case-insensitive search
  paymentStatus: PaymentStatus;
  paidPaise?: number; // amount already collected in the current cycle (partial payments)
  currentCycleStart: string; // 'YYYY-MM-DD'
  active?: boolean; // false = deactivated (hidden from active list, no new entries)
  createdAt?: Timestamp;
}

/** Input for creating a new customer (before persistence-managed fields). */
export interface NewCustomer {
  name: string;
  phone?: string;
  address?: string;
}

/**
 * A single product line within a delivery entry.
 * quantity is stored as integer hundredths of a unit (litre/kg x 100).
 * rate is a snapshot in paise per unit captured at entry-creation time.
 */
export interface DeliveryItem {
  quantity: number; // hundredths of a unit
  rate: number; // snapshot paise per unit
}

export type TypedDeliveryItem = DeliveryItem & { type: ProductType };

/** Delivery time slot. */
export type Slot = 'morning' | 'evening';

/**
 * A delivery entry: one product item on one date and slot.
 * Multiple items are recorded as multiple entries.
 * quantity is integer hundredths of a unit; rate is snapshot paise per unit.
 */
export interface DeliveryEntry {
  id: string;
  date: string; // 'YYYY-MM-DD'
  slot: Slot;
  product: Product;
  type?: ProductType; // for milk and ghee
  quantity: number; // hundredths of a unit
  rate: number; // snapshot paise per unit
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

/** Input for creating/updating a delivery entry (rate optional; defaults to configured rate). */
export interface NewEntry {
  date: string; // 'YYYY-MM-DD'
  slot: Slot;
  product: Product;
  type?: ProductType;
  quantity: number; // hundredths of a unit
  rate?: number; // paise per unit; falls back to configured rate
}

/** A computed line item on a bill. */
export interface LineItem {
  product: Product;
  type?: ProductType;
  slot?: Slot;
  totalQtyHundredths: number;
  ratePaise: number;
  amountPaise: number; // roundHalfUp(totalQtyHundredths * ratePaise / 100)
}

/** Reason a bill cannot be generated. */
export type BillError =
  | { code: 'NO_ENTRIES' }
  | { code: 'MISSING_RATE'; product: Product; type?: ProductType };

/** Result of computing a bill. */
export interface BillResult {
  lineItems: LineItem[];
  grandTotalPaise: number;
  startDate: string;
  endDate: string;
  error?: BillError;
}

/** An immutable historical record of a closed billing cycle. */
/** A recorded payment within a cycle (partial or final). */
export interface CyclePayment {
  id?: string;
  amountPaise: number;
  date: string; // 'YYYY-MM-DD'
  type: 'partial' | 'final';
}

export interface ClosedCycle {
  id: string;
  startDate: string;
  endDate: string;
  paymentDate: string; // 'YYYY-MM-DD'
  lineItems: LineItem[];
  totalPaise: number;
  entries: DeliveryEntry[];
  payments?: CyclePayment[]; // full payment breakdown for this cycle
  createdAt?: Timestamp;
}

/** A vendor (supplier) record — mirrors Customer, with a monthly purchase cycle. */
export interface Vendor {
  id: string;
  name: string; // 1..100 chars
  phone?: string; // 7..15 digits
  address?: string; // <=250 chars
  nameLower: string; // lowercase copy for case-insensitive search
  paymentStatus: PaymentStatus; // paid | unpaid | partial
  paidPaise?: number; // amount already paid in the current cycle
  currentCycleStart: string; // 'YYYY-MM-DD' (first of month)
  active?: boolean; // false = deactivated
  createdAt?: Timestamp;
}

/** Input for creating/updating a vendor (before persistence-managed fields). */
export interface NewVendor {
  name: string;
  phone?: string;
  address?: string;
}

/**
 * A purchase entry: one product item bought from a vendor on one date and slot.
 * Same shape as a DeliveryEntry (product/type/slot/qty/rate).
 */
export interface PurchaseEntry {
  id: string;
  date: string; // 'YYYY-MM-DD'
  slot: Slot;
  product: Product;
  type?: ProductType; // for milk and ghee
  quantity: number; // hundredths of a unit
  rate: number; // snapshot paise per unit
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

/** Input for creating/updating a purchase entry (rate optional; defaults to configured rate). */
export interface NewPurchaseEntry {
  date: string;
  slot: Slot;
  product: Product;
  type?: ProductType;
  quantity: number; // hundredths of a unit
  rate?: number; // paise per unit
}

/** A client (app tenant) record maintained for the super admin. */
export interface Client {
  id: string; // Firebase Auth uid
  email: string;
  name?: string;
  status: 'active' | 'closed';
  createdAt?: Timestamp;
}

/** Typed application error with a code the UI maps to a user message. */
export class AppError extends Error {
  code: string;
  constructor(code: string, message?: string) {
    super(message ?? code);
    this.name = 'AppError';
    this.code = code;
  }
}
