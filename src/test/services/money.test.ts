import { describe, it, expect } from 'vitest';
import {
  rupeesToPaise,
  unitsToHundredths,
  paiseToRupees,
  hundredthsToUnits,
  roundHalfUp,
  lineAmountPaise,
  MIN_UNITS,
  MAX_UNITS,
} from '../../services/money';
import { AppError } from '../../lib/types';

describe('rupeesToPaise (Property 2, Property 10)', () => {
  it('converts valid rupee strings to integer paise', () => {
    expect(rupeesToPaise('55.50')).toBe(5550);
    expect(rupeesToPaise('55.5')).toBe(5550);
    expect(rupeesToPaise('1')).toBe(100);
    expect(rupeesToPaise('0.01')).toBe(1);
    expect(rupeesToPaise('9999.99')).toBe(999999);
  });

  it('always returns integers (no floating-point money)', () => {
    for (const s of ['0.01', '0.10', '99.99', '1234.56', '9999.99']) {
      expect(Number.isInteger(rupeesToPaise(s))).toBe(true);
    }
  });

  it('rejects out-of-bounds and malformed values', () => {
    expect(() => rupeesToPaise('')).toThrow(AppError);
    expect(() => rupeesToPaise('0')).toThrow(AppError);
    expect(() => rupeesToPaise('0.00')).toThrow(AppError);
    expect(() => rupeesToPaise('10000')).toThrow(AppError);
    expect(() => rupeesToPaise('1.234')).toThrow(AppError);
    expect(() => rupeesToPaise('abc')).toThrow(AppError);
    expect(() => rupeesToPaise('-5')).toThrow(AppError);
  });
});

describe('unitsToHundredths (Property 10)', () => {
  it('converts valid unit strings to integer hundredths', () => {
    expect(unitsToHundredths('2.5')).toBe(250);
    expect(unitsToHundredths('0.01')).toBe(1);
    expect(unitsToHundredths('9999.99')).toBe(999999);
  });

  it('enforces the [MIN, MAX] bounds', () => {
    expect(unitsToHundredths('0.01')).toBe(MIN_UNITS);
    expect(unitsToHundredths('9999.99')).toBe(MAX_UNITS);
    expect(() => unitsToHundredths('0')).toThrow(AppError);
    expect(() => unitsToHundredths('10000')).toThrow(AppError);
  });
});

describe('formatters round-trip', () => {
  it('paiseToRupees', () => {
    expect(paiseToRupees(5550)).toBe('55.50');
    expect(paiseToRupees(1)).toBe('0.01');
    expect(paiseToRupees(100)).toBe('1.00');
  });

  it('hundredthsToUnits', () => {
    expect(hundredthsToUnits(250)).toBe('2.5');
    expect(hundredthsToUnits(100)).toBe('1');
    expect(hundredthsToUnits(1)).toBe('0.01');
  });
});

describe('roundHalfUp (Property 1)', () => {
  it('rounds half up using integer math', () => {
    expect(roundHalfUp(5, 2)).toBe(3); // 2.5 -> 3
    expect(roundHalfUp(4, 2)).toBe(2); // 2.0 -> 2
    expect(roundHalfUp(3, 2)).toBe(2); // 1.5 -> 2
    expect(roundHalfUp(2, 2)).toBe(1); // 1.0 -> 1
    expect(roundHalfUp(149, 100)).toBe(1); // 1.49 -> 1
    expect(roundHalfUp(150, 100)).toBe(2); // 1.50 -> 2
  });
});

describe('lineAmountPaise (Property 1)', () => {
  it('computes qty(hundredths) * rate(paise) / 100 with half-up rounding', () => {
    // 2.5 litre * 5000 paise = 250 * 5000 / 100 = 12500 paise
    expect(lineAmountPaise(250, 5000)).toBe(12500);
    // 0.01 * 1 paise = 1 * 1 / 100 = 0.01 -> rounds to 0
    expect(lineAmountPaise(1, 1)).toBe(0);
    // 1.5 litre * 55.50 = 150 * 5550 / 100 = 8325 paise
    expect(lineAmountPaise(150, 5550)).toBe(8325);
  });
});
