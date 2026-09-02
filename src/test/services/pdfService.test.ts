import { describe, it, expect } from 'vitest';
import { generateBillPdf } from '../../services/pdfService';
import type { BillResult, Customer, DeliveryEntry } from '../../lib/types';

const customer: Customer = {
  id: 'c1',
  name: 'Ramesh',
  nameLower: 'ramesh',
  paymentStatus: 'unpaid',
  currentCycleStart: '2026-01-01',
};

const entries: DeliveryEntry[] = [
  { id: 'e1', date: '2026-01-01', slot: 'morning', product: 'milk', type: 'cow', quantity: 250, rate: 5000 },
  { id: 'e2', date: '2026-01-01', slot: 'morning', product: 'cream', quantity: 100, rate: 13000 },
];

const validBill: BillResult = {
  lineItems: [
    { product: 'milk', type: 'cow', totalQtyHundredths: 250, ratePaise: 5000, amountPaise: 12500 },
    { product: 'cream', totalQtyHundredths: 100, ratePaise: 13000, amountPaise: 13000 },
  ],
  grandTotalPaise: 25500,
  startDate: '2026-01-01',
  endDate: '2026-01-01',
};

describe('generateBillPdf (Requirements 6.1, 6.4, 6.7)', () => {
  it('produces a non-empty PDF blob for a valid bill', () => {
    const blob = generateBillPdf(customer, validBill, entries, 'My Dairy');
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.size).toBeGreaterThan(0);
    expect(blob.type).toContain('pdf');
  });

  it('throws without side effects when the bill has an error', () => {
    const errorBill: BillResult = {
      lineItems: [],
      grandTotalPaise: 0,
      startDate: '',
      endDate: '',
      error: { code: 'NO_ENTRIES' },
    };
    expect(() => generateBillPdf(customer, errorBill, [], 'My Dairy')).toThrow();
  });
});
