import { useState } from 'react';
import { Calculator as CalcIcon, ArrowLeftRight } from 'lucide-react';
import {
  unitsToHundredths,
  rupeesToPaise,
  paiseToRupees,
  hundredthsToUnits,
  lineAmountPaise,
  qtyFromAmount,
} from '../services/money';

type Mode = 'amount' | 'quantity';

/**
 * Quick calculator. Enter any two of quantity / rate / amount and the third
 * is derived. Two modes: solve for Amount (qty × rate) or for Quantity
 * (amount ÷ rate).
 */
export default function CalculatorPage() {
  const [mode, setMode] = useState<Mode>('amount');
  const [qty, setQty] = useState('');
  const [rate, setRate] = useState('');
  const [amount, setAmount] = useState('');

  let result = '';
  let error = '';

  try {
    if (mode === 'amount') {
      if (qty.trim() && rate.trim()) {
        const paise = lineAmountPaise(unitsToHundredths(qty), rupeesToPaise(rate));
        result = paiseToRupees(paise);
      }
    } else {
      if (amount.trim() && rate.trim()) {
        const q = qtyFromAmount(rupeesToPaise(amount), rupeesToPaise(rate));
        result = hundredthsToUnits(q);
      }
    }
  } catch {
    error = 'Enter valid numbers (up to 2 decimals).';
  }

  const swap = () => {
    setMode((m) => (m === 'amount' ? 'quantity' : 'amount'));
    setQty('');
    setAmount('');
    // keep rate
  };

  const handleInput = (val: string, setter: React.Dispatch<React.SetStateAction<string>>) => {
    setter(val.startsWith('.') ? '0' + val : val);
  };

  return (
    <div className="mx-auto max-w-2xl animate-fade-in space-y-4 p-4">
      {/* Hero */}
      <div className="animate-slide-up overflow-hidden rounded-3xl bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900 p-5 text-white shadow-lift">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/25">
            <CalcIcon size={22} />
          </div>
          <div>
            <p className="text-sm font-medium text-white/70">Quick calculator</p>
            <p className="text-lg font-extrabold leading-tight">
              {mode === 'amount' ? 'Qty × Rate = Amount' : 'Amount ÷ Rate = Qty'}
            </p>
          </div>
        </div>
      </div>

      {/* Mode toggle */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1 rounded-2xl bg-slate-100/80 p-1 shadow-soft">
          <button
            onClick={() => setMode('amount')}
            className={
              mode === 'amount'
                ? 'rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-soft'
                : 'rounded-xl px-4 py-2 text-sm font-medium text-slate-500'
            }
          >
            Find Amount
          </button>
          <button
            onClick={() => setMode('quantity')}
            className={
              mode === 'quantity'
                ? 'rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-soft'
                : 'rounded-xl px-4 py-2 text-sm font-medium text-slate-500'
            }
          >
            Find Quantity
          </button>
        </div>
        <button
          onClick={swap}
          title="Swap mode"
          className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-500 shadow-soft transition hover:bg-slate-50"
        >
          <ArrowLeftRight size={18} />
        </button>
      </div>

      {/* Inputs */}
      <div className="card space-y-3 p-5">
        {mode === 'amount' ? (
          <>
            <div>
              <label className="text-sm font-medium text-slate-700">Quantity</label>
              <input
                inputMode="decimal"
                value={qty}
                onChange={(e) => handleInput(e.target.value, setQty)}
                placeholder="e.g. 2.5"
                className="input mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Rate (₹)</label>
              <input
                inputMode="decimal"
                value={rate}
                onChange={(e) => handleInput(e.target.value, setRate)}
                placeholder="e.g. 60"
                className="input mt-1"
              />
            </div>
          </>
        ) : (
          <>
            <div>
              <label className="text-sm font-medium text-slate-700">Amount (₹)</label>
              <input
                inputMode="decimal"
                value={amount}
                onChange={(e) => handleInput(e.target.value, setAmount)}
                placeholder="e.g. 150"
                className="input mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Rate (₹)</label>
              <input
                inputMode="decimal"
                value={rate}
                onChange={(e) => handleInput(e.target.value, setRate)}
                placeholder="e.g. 60"
                className="input mt-1"
              />
            </div>
          </>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>

      {/* Result */}
      <div className="rounded-3xl bg-gradient-to-br from-brand-600 to-brand-800 p-6 text-center text-white shadow-lift">
        <p className="text-sm font-medium text-white/70">
          {mode === 'amount' ? 'Amount' : 'Quantity'}
        </p>
        <p className="mt-1 text-4xl font-extrabold tracking-tight">
          {result ? (mode === 'amount' ? `₹${result}` : result) : '—'}
        </p>
      </div>
    </div>
  );
}
