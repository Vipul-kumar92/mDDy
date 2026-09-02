import { describe, it, expect } from 'vitest';
import { validateVendor, filterVendors } from '../../services/vendorService';
import { AppError, type Vendor } from '../../lib/types';

describe('validateVendor', () => {
  it('accepts a valid name and trims it', () => {
    expect(validateVendor({ name: '  Amul Supplier  ' })).toEqual({
      name: 'Amul Supplier',
      phone: undefined,
      address: undefined,
    });
  });

  it('rejects empty or whitespace-only names', () => {
    expect(() => validateVendor({ name: '' })).toThrow(AppError);
    expect(() => validateVendor({ name: '   ' })).toThrow(AppError);
  });

  it('rejects names over 100 characters', () => {
    expect(() => validateVendor({ name: 'a'.repeat(101) })).toThrow(AppError);
  });

  it('accepts a valid phone and rejects invalid ones', () => {
    expect(validateVendor({ name: 'X', phone: '9876543210' }).phone).toBe('9876543210');
    expect(() => validateVendor({ name: 'X', phone: '12' })).toThrow(AppError);
    expect(() => validateVendor({ name: 'X', phone: 'abcdefg' })).toThrow(AppError);
  });

  it('rejects addresses over 250 characters', () => {
    expect(() => validateVendor({ name: 'X', address: 'a'.repeat(251) })).toThrow(AppError);
  });
});

describe('filterVendors', () => {
  const base = { paymentStatus: 'unpaid' as const, currentCycleStart: '2026-09-01' };
  const vendors: Vendor[] = [
    { id: '1', name: 'Amul', nameLower: 'amul', ...base },
    { id: '2', name: 'Mother Dairy', nameLower: 'mother dairy', ...base },
    { id: '3', name: 'Amrit Feed', nameLower: 'amrit feed', ...base },
  ];

  it('filters case-insensitively by substring', () => {
    expect(filterVendors(vendors, 'AM').map((v) => v.id)).toEqual(['1', '3']);
  });

  it('returns all when the term is empty', () => {
    expect(filterVendors(vendors, '  ')).toHaveLength(3);
  });

  it('returns empty when nothing matches', () => {
    expect(filterVendors(vendors, 'xyz')).toHaveLength(0);
  });
});
