import { describe, it, expect } from 'vitest';
import { computeBill } from '../../services/billingService';
import type { DeliveryEntry, Product, ProductType, Slot } from '../../lib/types';

let counter = 0;
function entry(
  date: string,
  product: Product,
  quantity: number,
  rate: number,
  opts: { type?: ProductType; slot?: Slot } = {},
): DeliveryEntry {
  return {
    id: `e${counter++}`,
    date,
    slot: opts.slot ?? 'morning',
    product,
    quantity,
    rate,
    ...(opts.type ? { type: opts.type } : {}),
  };
}

describe('computeBill - guarded outcomes (Property 5)', () => {
  it('returns NO_ENTRIES for an empty list', () => {
    const result = computeBill([]);
    expect(result.error).toEqual({ code: 'NO_ENTRIES' });
    expect(result.lineItems).toHaveLength(0);
    expect(result.grandTotalPaise).toBe(0);
  });

  it('returns MISSING_RATE when an entry lacks a snapshot rate', () => {
    const result = computeBill([entry('2026-01-01', 'milk', 100, 0, { type: 'cow' })]);
    expect(result.error).toMatchObject({ code: 'MISSING_RATE', product: 'milk', type: 'cow' });
  });
});

describe('computeBill - grouping and totals (Property 1, 4)', () => {
  it('groups by product/type/slot/rate, summing quantities', () => {
    const entries: DeliveryEntry[] = [
      entry('2026-01-01', 'milk', 100, 5000, { type: 'cow' }),
      entry('2026-01-02', 'milk', 200, 5000, { type: 'cow' }),
      entry('2026-01-03', 'milk', 150, 7000, { type: 'buffalo' }),
    ];
    const result = computeBill(entries);
    expect(result.error).toBeUndefined();
    const cow = result.lineItems.find((l) => l.product === 'milk' && l.type === 'cow');
    expect(cow?.totalQtyHundredths).toBe(300); // 100 + 200
    expect(cow?.amountPaise).toBe(15000); // 3 L * 50.00
    const buffalo = result.lineItems.find((l) => l.product === 'milk' && l.type === 'buffalo');
    expect(buffalo?.totalQtyHundredths).toBe(150);
    expect(buffalo?.amountPaise).toBe(10500); // 1.5 * 70
    expect(result.grandTotalPaise).toBe(15000 + 10500);
  });

  it('separates the same product with a different rate into two line items', () => {
    const entries: DeliveryEntry[] = [
      entry('2026-01-01', 'milk', 200, 6000, { type: 'cow' }),
      entry('2026-01-02', 'milk', 170, 5000, { type: 'cow' }),
    ];
    const result = computeBill(entries);
    expect(result.lineItems).toHaveLength(2);
    // 2 L * 60 = 12000; 1.7 L * 50 = 8500
    expect(result.grandTotalPaise).toBe(12000 + 8500);
  });

  it('each distinct product appears as its own line item (Property 4)', () => {
    const entries: DeliveryEntry[] = [
      entry('2026-01-01', 'milk', 100, 5000, { type: 'mix' }),
      entry('2026-01-01', 'cream', 50, 13000),
      entry('2026-01-01', 'paneer', 25, 40000),
      entry('2026-01-01', 'dahi', 30, 8000),
    ];
    const result = computeBill(entries);
    expect(result.lineItems).toHaveLength(4);
  });

  it('rounds each line item half-up, then sums (Property 1)', () => {
    // 0.15 kg paneer * 33.33 = 15 * 3333 / 100 = 499.95 -> 500 paise
    const result = computeBill([entry('2026-01-01', 'paneer', 15, 3333)]);
    expect(result.lineItems[0].amountPaise).toBe(500);
    expect(result.grandTotalPaise).toBe(500);
  });
});

describe('computeBill - boundaries and snapshot use (Property 3)', () => {
  it('handles boundary quantities', () => {
    const result = computeBill([
      entry('2026-01-01', 'milk', 1, 5000, { type: 'cow' }),
      entry('2026-01-02', 'dahi', 999999, 100),
    ]);
    expect(result.error).toBeUndefined();
    const milk = result.lineItems.find((l) => l.product === 'milk');
    expect(milk?.amountPaise).toBe(50); // 0.01 * 50 = 0.50
  });

  it('uses the snapshot rate on the entry (Property 3)', () => {
    const result = computeBill([entry('2026-01-01', 'paneer', 100, 40000)]);
    expect(result.lineItems[0].ratePaise).toBe(40000);
    expect(result.lineItems[0].amountPaise).toBe(40000);
  });

  it('sets start and end dates from the entry range', () => {
    const result = computeBill([
      entry('2026-01-05', 'milk', 100, 5000, { type: 'cow' }),
      entry('2026-01-01', 'milk', 100, 5000, { type: 'cow' }),
    ]);
    expect(result.startDate).toBe('2026-01-01');
    expect(result.endDate).toBe('2026-01-05');
  });
});
