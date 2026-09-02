import { AppError } from '../lib/types';

/** Minimum and maximum for rates (in paise) and quantities (in hundredths). */
export const MIN_UNITS = 1; // 0.01 in hundredths / paise
export const MAX_UNITS = 999999; // 9999.99 in hundredths / paise

/**
 * Parse a rupee string (e.g. "55.50") into integer paise.
 * Validates: numeric, > 0, <= 9999.99, at most 2 decimal places.
 * Throws AppError('INVALID_RATE') on failure.
 */
export function rupeesToPaise(input: string): number {
  const trimmed = input.trim();
  if (trimmed === '') {
    throw new AppError('INVALID_RATE', 'Rate is required');
  }
  // Allow digits with an optional 1-2 decimal places only.
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) {
    throw new AppError(
      'INVALID_RATE',
      'Enter a positive number with up to 2 decimals',
    );
  }
  const [whole, frac = ''] = trimmed.split('.');
  const fracPadded = (frac + '00').slice(0, 2);
  const paise = Number(whole) * 100 + Number(fracPadded);
  if (paise < MIN_UNITS || paise > MAX_UNITS) {
    throw new AppError(
      'INVALID_RATE',
      'Rate must be between 0.01 and 9999.99',
    );
  }
  return paise;
}

/**
 * Parse a unit string (litres/kg, e.g. "2.5") into integer hundredths.
 * Validates: numeric, > 0, <= 9999.99, at most 2 decimal places.
 * Throws AppError('INVALID_QUANTITY') on failure.
 */
export function unitsToHundredths(input: string): number {
  const trimmed = input.trim();
  if (trimmed === '') {
    throw new AppError('INVALID_QUANTITY', 'Quantity is required');
  }
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) {
    throw new AppError(
      'INVALID_QUANTITY',
      'Enter a positive number with up to 2 decimals',
    );
  }
  const [whole, frac = ''] = trimmed.split('.');
  const fracPadded = (frac + '00').slice(0, 2);
  const hundredths = Number(whole) * 100 + Number(fracPadded);
  if (hundredths < MIN_UNITS || hundredths > MAX_UNITS) {
    throw new AppError(
      'INVALID_QUANTITY',
      'Quantity must be between 0.01 and 9999.99',
    );
  }
  return hundredths;
}

/** Format integer paise as a rupee string with two decimals, e.g. 5550 -> "55.50". */
export function paiseToRupees(paise: number): string {
  const sign = paise < 0 ? '-' : '';
  const abs = Math.abs(paise);
  const whole = Math.floor(abs / 100);
  const frac = (abs % 100).toString().padStart(2, '0');
  return `${sign}${whole}.${frac}`;
}

/** Format integer hundredths as a unit string with up to two decimals, e.g. 250 -> "2.5". */
export function hundredthsToUnits(hundredths: number): string {
  const whole = Math.floor(hundredths / 100);
  const frac = hundredths % 100;
  if (frac === 0) return `${whole}`;
  const fracStr = frac.toString().padStart(2, '0').replace(/0$/, '');
  return `${whole}.${fracStr}`;
}

/**
 * Round a non-negative rational to the nearest integer using half-up rounding.
 * Given numerator and denominator (both positive integers), returns
 * round_half_up(numerator / denominator) as an integer.
 * Uses integer arithmetic to avoid floating-point drift.
 */
export function roundHalfUp(numerator: number, denominator: number): number {
  if (denominator <= 0) {
    throw new AppError('INVALID_ARG', 'denominator must be positive');
  }
  const quotient = Math.floor(numerator / denominator);
  const remainder = numerator - quotient * denominator;
  // Half-up: if 2*remainder >= denominator, round up.
  return remainder * 2 >= denominator ? quotient + 1 : quotient;
}

/**
 * Compute a line amount in paise from a quantity (hundredths) and rate (paise/unit).
 * amount = round_half_up(qtyHundredths * ratePaise / 100).
 */
export function lineAmountPaise(qtyHundredths: number, ratePaise: number): number {
  return roundHalfUp(qtyHundredths * ratePaise, 100);
}

/**
 * Derive quantity (hundredths) from an amount (paise) and rate (paise/unit).
 * quantity = round_half_up(amountPaise * 100 / ratePaise).
 * Returns 0 when rate is not positive.
 */
export function qtyFromAmount(amountPaise: number, ratePaise: number): number {
  if (ratePaise <= 0) return 0;
  return roundHalfUp(amountPaise * 100, ratePaise);
}
