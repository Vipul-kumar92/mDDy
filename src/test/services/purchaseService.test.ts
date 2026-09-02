import { describe, it, expect, vi } from 'vitest';

// Avoid initializing the real Firebase SDK during unit tests.
vi.mock('../../lib/firebase', () => ({ db: {}, DAIRY_NAME: 'Test Dairy' }));
vi.mock('firebase/firestore', () => ({
  addDoc: vi.fn(),
  collection: (..._a: unknown[]) => ({}),
  deleteDoc: vi.fn(),
  doc: (..._a: unknown[]) => ({}),
  getDoc: vi.fn(),
  getDocs: vi.fn(),
  onSnapshot: vi.fn(),
  orderBy: vi.fn(),
  query: vi.fn(),
  runTransaction: vi.fn(),
  serverTimestamp: vi.fn(),
  updateDoc: vi.fn(),
}));

import { buildPurchaseData } from '../../services/purchaseService';
import { AppError, type RateConfig } from '../../lib/types';

const rates: RateConfig = {
  milk: { cow: 5000, buffalo: 7000, mix: 6000 },
  ghee: { cow: 60000, buffalo: 70000, mix: 65000 },
  cream: { cow: 13000, buffalo: 15000, mix: 14000 },
  paneer: 40000,
  dahi: 8000,
};

describe('buildPurchaseData', () => {
  it('snapshots the configured rate and records product/slot', () => {
    const data = buildPurchaseData(
      { date: '2026-09-01', slot: 'morning', product: 'milk', type: 'cow', quantity: 250 },
      rates,
    ) as Record<string, unknown>;
    expect(data.product).toBe('milk');
    expect(data.slot).toBe('morning');
    expect(data.quantity).toBe(250);
    expect(data.rate).toBe(5000);
  });

  it('uses a per-entry rate override when provided', () => {
    const data = buildPurchaseData(
      { date: '2026-09-01', slot: 'evening', product: 'paneer', quantity: 100, rate: 42000 },
      rates,
    ) as Record<string, number>;
    expect(data.rate).toBe(42000);
  });

  it('rejects an out-of-range quantity', () => {
    expect(() =>
      buildPurchaseData({ date: '2026-09-01', slot: 'morning', product: 'milk', type: 'cow', quantity: 0 }, rates),
    ).toThrow(AppError);
    expect(() =>
      buildPurchaseData({ date: '2026-09-01', slot: 'morning', product: 'dahi', quantity: 1000000 }, rates),
    ).toThrow(AppError);
  });

  it('throws MISSING_RATE when the product has no configured rate', () => {
    const noPaneer: RateConfig = { milk: { cow: 5000 }, ghee: {}, cream: {} };
    expect(() =>
      buildPurchaseData({ date: '2026-09-01', slot: 'morning', product: 'paneer', quantity: 100 }, noPaneer),
    ).toThrow(AppError);
  });

  it('rejects a zero rate', () => {
    expect(() =>
      buildPurchaseData({ date: '2026-09-01', slot: 'morning', product: 'paneer', quantity: 100, rate: 0 }, rates),
    ).toThrow(AppError);
  });
});
