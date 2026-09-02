import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AppError } from '../../lib/types';

// Mock firebase modules so rateService can be imported without a live app.
const getDocMock = vi.fn();
const setDocMock = vi.fn();

vi.mock('../../lib/firebase', () => ({ db: {}, currentUid: () => 'test-uid' }));
vi.mock('firebase/firestore', () => ({
  doc: () => ({}),
  getDoc: (...args: unknown[]) => getDocMock(...args),
  setDoc: (...args: unknown[]) => setDocMock(...args),
  serverTimestamp: () => 'ts',
}));

import { setRate } from '../../services/rateService';

describe('rateService.setRate (Requirements 3.1, 3.5)', () => {
  beforeEach(() => {
    getDocMock.mockReset();
    setDocMock.mockReset();
    getDocMock.mockResolvedValue({ exists: () => false });
    setDocMock.mockResolvedValue(undefined);
  });

  it('rejects an invalid rate without writing (retains previous rate)', async () => {
    await expect(setRate('paneer', null, 'abc')).rejects.toBeInstanceOf(AppError);
    await expect(setRate('paneer', null, '0')).rejects.toBeInstanceOf(AppError);
    await expect(setRate('paneer', null, '1.234')).rejects.toBeInstanceOf(AppError);
    expect(setDocMock).not.toHaveBeenCalled();
  });

  it('persists a valid milk rate in paise', async () => {
    await setRate('milk', 'cow', '55.50');
    expect(setDocMock).toHaveBeenCalledTimes(1);
    const [, payload] = setDocMock.mock.calls[0];
    expect(payload.milk.cow).toBe(5550);
  });

  it('persists a valid paneer rate in paise', async () => {
    await setRate('paneer', null, '400');
    const [, payload] = setDocMock.mock.calls[0];
    expect(payload.paneer).toBe(40000);
  });
});
