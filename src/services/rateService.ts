import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { Product, ProductType, RateConfig } from '../lib/types';
import { rupeesToPaise } from './money';
import { currentUid } from '../lib/firebase';

/** Rates doc for the current user: users/{uid}/config/rates. */
function ratesDoc() {
  return doc(db, 'users', currentUid(), 'config', 'rates');
}

/** Read the current rate configuration (Requirements 3.6). */
export async function getRates(): Promise<RateConfig> {
  const snap = await getDoc(ratesDoc());
  if (!snap.exists()) return { milk: {}, ghee: {}, cream: {} };
  const data = snap.data() as Partial<RateConfig>;
  return {
    milk: data.milk ?? {},
    ghee: data.ghee ?? {},
    cream: data.cream ?? {},
    paneer: data.paneer,
    dahi: data.dahi,
  };
}

/**
 * Set a rate for a product (and type where applicable). The rupee string is
 * parsed and validated by rupeesToPaise, which throws AppError('INVALID_RATE')
 * on invalid input, leaving the stored rate unchanged.
 * Milk and Ghee are type-based (cow/buffalo/mix); the others are single-rate.
 */
export async function setRate(
  product: Product,
  type: ProductType | null,
  rupees: string,
): Promise<void> {
  const paise = rupeesToPaise(rupees); // throws on invalid input

  const current = await getRates();
  let next: RateConfig;
  if (product === 'milk') {
    if (!type) throw new Error('type is required for milk');
    next = { ...current, milk: { ...current.milk, [type]: paise } };
  } else if (product === 'ghee') {
    if (!type) throw new Error('type is required for ghee');
    next = { ...current, ghee: { ...current.ghee, [type]: paise } };
  } else if (product === 'cream') {
    if (!type) throw new Error('type is required for cream');
    next = { ...current, cream: { ...current.cream, [type]: paise } };
  } else {
    next = { ...current, [product]: paise };
  }

  // Firestore does not accept undefined values. Strip them before writing.
  const clean: Record<string, unknown> = {
    milk: next.milk,
    ghee: next.ghee,
    cream: next.cream,
    updatedAt: serverTimestamp(),
  };
  if (next.paneer !== undefined) clean.paneer = next.paneer;
  if (next.dahi !== undefined) clean.dahi = next.dahi;

  await setDoc(ratesDoc(), clean, { merge: true });
}
