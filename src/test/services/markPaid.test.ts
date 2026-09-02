import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AppError } from '../../lib/types';

// Controllable firestore mocks.
const getDocsMock = vi.fn();
const runTransactionMock = vi.fn();

vi.mock('../../lib/firebase', () => ({ db: {}, DAIRY_NAME: 'Test Dairy', currentUid: () => 'test-uid' }));
const getDocMock = vi.fn();

vi.mock('firebase/firestore', () => ({
  collection: (..._a: unknown[]) => ({}),
  doc: (..._a: unknown[]) => ({ id: 'cycle1' }),
  getDoc: (...a: unknown[]) => getDocMock(...a),
  getDocs: (...a: unknown[]) => getDocsMock(...a),
  addDoc: vi.fn(),
  deleteDoc: vi.fn(),
  updateDoc: vi.fn(),
  orderBy: () => ({}),
  query: () => ({}),
  runTransaction: (...a: unknown[]) => runTransactionMock(...a),
  serverTimestamp: () => 'ts',
}));
vi.mock('../../services/customerService', () => ({ todayIso: () => '2026-02-10' }));

import { markPaid } from '../../services/billingService';

function docSnap(id: string, data: Record<string, unknown>) {
  return { id, data: () => data };
}

describe('markPaid (Properties 6, 7, 8, 9; Requirements 7.2, 7.3, 7.5, 7.6)', () => {
  beforeEach(() => {
    getDocsMock.mockReset();
    getDocMock.mockReset();
    runTransactionMock.mockReset();
    // Customer doc read (for current cycle start).
    getDocMock.mockResolvedValue({ data: () => ({ currentCycleStart: '2026-02-01' }) });
  });

  it('rejects when there are no current entries (Requirements 7.6)', async () => {
    getDocsMock.mockResolvedValue({ empty: true, docs: [] });
    await expect(markPaid('c1')).rejects.toMatchObject({ code: 'NOTHING_TO_PAY' });
    expect(runTransactionMock).not.toHaveBeenCalled();
  });

  it('freezes a cycle, deletes entries, and sets status paid (Properties 7, 6)', async () => {
    const docs = [
      docSnap('e1', { date: '2026-02-01', slot: 'morning', product: 'milk', type: 'cow', quantity: 250, rate: 5000 }),
      docSnap('e2', { date: '2026-02-02', slot: 'evening', product: 'paneer', quantity: 100, rate: 40000 }),
    ];
    // First getDocs = entries; second getDocs = payments log (empty here).
    getDocsMock
      .mockResolvedValueOnce({ empty: false, docs })
      .mockResolvedValueOnce({ empty: false, docs: [] });

    const setSpy = vi.fn();
    const deleteSpy = vi.fn();
    const updateSpy = vi.fn();
    runTransactionMock.mockImplementation(async (_db, updater) => {
      const tx = {
        get: async () => ({ data: () => ({ currentCycleStart: '2026-02-01' }) }),
        set: setSpy,
        delete: deleteSpy,
        update: updateSpy,
      };
      return updater(tx);
    });

    await markPaid('c1');

    // A closed cycle is written with frozen totals (Property 7, 8).
    expect(setSpy).toHaveBeenCalledTimes(1);
    const [, closed] = setSpy.mock.calls[0];
    // milk: 2.5 * 50 = 125.00 = 12500 paise; paneer: 1 * 400 = 40000 paise
    expect(closed.totalPaise).toBe(12500 + 40000);
    expect(closed.paymentDate).toBe('2026-02-10');
    expect(closed.entries).toHaveLength(2);

    // Both current entries are deleted (Property 7).
    expect(deleteSpy).toHaveBeenCalledTimes(2);

    // Customer flipped to paid and advanced to the next cycle (Property 6, 9).
    expect(updateSpy).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ paymentStatus: 'paid', currentCycleStart: '2026-03-01' }),
    );
  });

  it('does not proceed if the frozen bill has a missing rate', async () => {
    getDocsMock.mockResolvedValue({
      empty: false,
      docs: [
        docSnap('e1', { date: '2026-02-01', slot: 'morning', product: 'milk', type: 'cow', quantity: 250, rate: 0 }),
      ],
    });
    await expect(markPaid('c1')).rejects.toBeInstanceOf(AppError);
    expect(runTransactionMock).not.toHaveBeenCalled();
  });
});
