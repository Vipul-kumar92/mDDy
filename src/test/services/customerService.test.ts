import { describe, it, expect } from 'vitest';
import { validateCustomer, filterCustomers } from '../../services/customerService';
import { AppError, type Customer } from '../../lib/types';

describe('validateCustomer (Requirements 2.2, 2.3, 2.4)', () => {
  it('accepts a valid name and trims it', () => {
    expect(validateCustomer({ name: '  Ramesh  ' })).toEqual({
      name: 'Ramesh',
      phone: undefined,
      address: undefined,
    });
  });

  it('rejects empty or whitespace-only names', () => {
    expect(() => validateCustomer({ name: '' })).toThrow(AppError);
    expect(() => validateCustomer({ name: '   ' })).toThrow(AppError);
  });

  it('rejects names over 100 characters', () => {
    expect(() => validateCustomer({ name: 'a'.repeat(101) })).toThrow(AppError);
  });

  it('accepts a valid phone and rejects invalid ones', () => {
    expect(validateCustomer({ name: 'X', phone: '9876543210' }).phone).toBe('9876543210');
    expect(() => validateCustomer({ name: 'X', phone: '123' })).toThrow(AppError);
    expect(() => validateCustomer({ name: 'X', phone: 'abcdefg' })).toThrow(AppError);
  });

  it('rejects addresses over 250 characters', () => {
    expect(() => validateCustomer({ name: 'X', address: 'a'.repeat(251) })).toThrow(AppError);
  });
});

describe('filterCustomers (Requirements 2.8)', () => {
  const customers: Customer[] = [
    { id: '1', name: 'Ramesh', nameLower: 'ramesh', paymentStatus: 'unpaid', currentCycleStart: '' },
    { id: '2', name: 'Suresh', nameLower: 'suresh', paymentStatus: 'paid', currentCycleStart: '' },
    { id: '3', name: 'Ram Kumar', nameLower: 'ram kumar', paymentStatus: 'unpaid', currentCycleStart: '' },
  ];

  it('filters case-insensitively by substring', () => {
    expect(filterCustomers(customers, 'RAM').map((c) => c.id)).toEqual(['1', '3']);
  });

  it('returns all when the term is empty', () => {
    expect(filterCustomers(customers, '  ')).toHaveLength(3);
  });

  it('returns empty when nothing matches', () => {
    expect(filterCustomers(customers, 'xyz')).toHaveLength(0);
  });
});
