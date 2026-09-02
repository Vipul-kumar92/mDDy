import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AppError, type RateConfig } from '../../lib/types';

const addDocMock = vi.fn();
const updateDocMock = vi.fn();
const getRatesMock = vi.fn();

// deliveryService imports firebase; stub those so we can import the pure helper.
vi.mock('../../lib/firebase', () => ({ db: {}, currentUid: () => 'test-uid' }));
vi.mock('firebase/firestore', () => ({
  addDoc: (...args: unknown[]) => addDocMock(...args),
  collection: () => ({}),
  doc: (..._args: unknown[]) => ({}),
  getDoc: async () => ({ data: () => ({ paymentStatus: 'paid' }) }),
  getDocs: vi.fn(),
  deleteDoc: vi.fn(),
  orderBy: () => ({}),
  query: () => ({}),
  serverTimestamp: () => 'ts',
  updateDoc: (...args: unknown[]) => updateDocMock(...args),
}));
vi.mock('../../services/rateService', () => ({ getRates: () => getRatesMock() }));

import { buildEntryData, addEntry } from '../../services/deliveryService';

const rates: RateConfig = {
  milk: { cow: 5000, buffalo: 7000, mix: 6000 },
  ghee: { cow: 60000, buffalo: 70000, mix: 65000 },
  cream: { cow: 13000, buffalo: 15000, mix: 14000 },
  paneer: 40000,
  dahi: 8000,
};

describe('buildEntryData', () => {
  it('records the slot, product and quantity on the entry', () => {
    const data = buildEntryData(
      { date: '2026-01-01', slot: 'evening', product: 'milk', type: 'cow', quantity: 250 },
      rates,
    ) as Record<string, unknown>;
    expect(data.slot).toBe('evening');
    expect(data.product).toBe('milk');
    expect(data.quantity).toBe(250);
  });

  it('snapshots the configured rate when no override is given (Property 3)', () => {
    const milk = buildEntryData(
      { date: '2026-01-01', slot: 'morning', product: 'milk', type: 'cow', quantity: 250 },
      rates,
    ) as Record<string, number>;
    expect(milk.rate).toBe(5000);

    const cream = buildEntryData(
      { date: '2026-01-01', slot: 'morning', product: 'cream', type: 'cow', quantity: 100 },
      rates,
    ) as Record<string, number>;
    expect(cream.rate).toBe(13000);
  });

  it('uses the per-entry rate override when provided', () => {
    const data = buildEntryData(
      { date: '2026-01-01', slot: 'morning', product: 'milk', type: 'cow', quantity: 200, rate: 6000 },
      rates,
    ) as Record<string, number>;
    expect(data.rate).toBe(6000);
  });

  it('rejects invalid quantities (Requirements 4.6)', () => {
    expect(() =>
      buildEntryData({ date: '2026-01-01', slot: 'morning', product: 'milk', type: 'cow', quantity: 0 }, rates),
    ).toThrow(AppError);
    expect(() =>
      buildEntryData({ date: '2026-01-01', slot: 'morning', product: 'dahi', quantity: 1000000 }, rates),
    ).toThrow(AppError);
  });

  it('throws MISSING_RATE when the chosen product has no configured rate', () => {
    const noPaneer: RateConfig = { milk: { cow: 5000 }, ghee: {}, cream: {} };
    expect(() =>
      buildEntryData({ date: '2026-01-01', slot: 'morning', product: 'paneer', quantity: 100 }, noPaneer),
    ).toThrow(AppError);
  });
});

describe('addEntry (multiple entries allowed per day)', () => {
  beforeEach(() => {
    addDocMock.mockReset();
    updateDocMock.mockReset();
    getRatesMock.mockReset();
    getRatesMock.mockResolvedValue(rates);
  });

  it('writes a new entry with an auto id and flips the customer to unpaid', async () => {
    addDocMock.mockResolvedValue({ id: 'auto123' });

    const id = await addEntry('c1', {
      date: '2026-01-02',
      slot: 'evening',
      product: 'milk',
      type: 'cow',
      quantity: 250,
    });

    expect(id).toBe('auto123');
    expect(addDocMock).toHaveBeenCalledTimes(1);
    expect(updateDocMock).toHaveBeenCalledWith(expect.anything(), { paymentStatus: 'unpaid' });
  });

  it('allows two entries for the same date and slot', async () => {
    addDocMock.mockResolvedValueOnce({ id: 'a1' }).mockResolvedValueOnce({ id: 'a2' });

    const id1 = await addEntry('c1', { date: '2026-01-02', slot: 'morning', product: 'milk', type: 'cow', quantity: 100 });
    const id2 = await addEntry('c1', { date: '2026-01-02', slot: 'morning', product: 'milk', type: 'cow', quantity: 200 });

    expect(id1).toBe('a1');
    expect(id2).toBe('a2');
    expect(addDocMock).toHaveBeenCalledTimes(2);
  });
});
