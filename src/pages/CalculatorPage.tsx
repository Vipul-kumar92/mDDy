import { useState } from 'react';
import { Calculator as CalcIcon, ArrowLeftRight } from 'lucide-react';


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
        const q = parseFloat(qty);
        const r = parseFloat(rate);
        if (isNaN(q) || isNaN(r) || q < 0 || r < 0) throw new Error();
        // Result is amount, so usually 2 decimals for rupees
        result = (q * r).toFixed(2);
      }
    } else {
      if (amount.trim() && rate.trim()) {
        const a = parseFloat(amount);
        const r = parseFloat(rate);
        if (isNaN(a) || isNaN(r) || a < 0 || r <= 0) throw new Error();
        // Result is quantity, show up to 3 decimals
        result = parseFloat((a / r).toFixed(3)).toString();
      }
    }
  } catch {
    error = 'Enter valid positive numbers.';
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
      <div className="animate-slide-up overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600 via-brand-600 to-brand-700 p-5 text-white shadow-sm ring-1 ring-brand-500/30">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 ring-1 ring-white/30 backdrop-blur-sm">
            <CalcIcon size={24} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-brand-100 uppercase tracking-wide">Quick Calculator</p>
            <p className="mt-0.5 text-xl font-extrabold leading-tight tracking-tight">
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
                ? 'rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-brand-700 shadow-sm ring-1 ring-slate-900/5'
                : 'rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-500 transition hover:text-slate-700'
            }
          >
            Find Amount
          </button>
          <button
            onClick={() => setMode('quantity')}
            className={
              mode === 'quantity'
                ? 'rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-brand-700 shadow-sm ring-1 ring-slate-900/5'
                : 'rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-500 transition hover:text-slate-700'
            }
          >
            Find Quantity
          </button>
        </div>
        <button
          onClick={swap}
          title="Swap mode"
          className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-500 shadow-sm transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-600 active:scale-95"
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
      <div className="card relative overflow-hidden border-brand-100 bg-gradient-to-b from-brand-50 to-white p-6 text-center shadow-inner">
        <div className="absolute -right-6 -top-6 text-brand-100/50">
          <CalcIcon size={120} strokeWidth={1} />
        </div>
        <div className="relative z-10">
          <p className="text-xs font-bold uppercase tracking-widest text-brand-600/80">
            {mode === 'amount' ? 'Total Amount' : 'Calculated Quantity'}
          </p>
          <p className="mt-2 text-5xl font-black tracking-tight text-brand-700 drop-shadow-sm">
            {result ? (mode === 'amount' ? `₹${result}` : result) : '0.00'}
          </p>
        </div>
      </div>
    </div>
  );
}
