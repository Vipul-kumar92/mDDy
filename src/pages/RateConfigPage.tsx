import { useEffect, useState } from 'react';
import { getRates, setRate } from '../services/rateService';
import { paiseToRupees } from '../services/money';
import { AppError, type Product, type ProductType, type RateConfig } from '../lib/types';

interface RowDef {
  product: Product;
  type: ProductType | null;
  label: string;
  unit: string;
}

const ROWS: RowDef[] = [
  { product: 'milk', type: 'cow', label: 'Cow Milk', unit: '/ litre' },
  { product: 'milk', type: 'buffalo', label: 'Buffalo Milk', unit: '/ litre' },
  { product: 'milk', type: 'mix', label: 'Mix Milk', unit: '/ litre' },
  { product: 'ghee', type: 'cow', label: 'Cow Ghee', unit: '/ kg' },
  { product: 'ghee', type: 'buffalo', label: 'Buffalo Ghee', unit: '/ kg' },
  { product: 'ghee', type: 'mix', label: 'Mix Ghee', unit: '/ kg' },
  { product: 'cream', type: 'cow', label: 'Cow Cream', unit: '/ kg' },
  { product: 'cream', type: 'buffalo', label: 'Buffalo Cream', unit: '/ kg' },
  { product: 'cream', type: 'mix', label: 'Mix Cream', unit: '/ kg' },
  { product: 'paneer', type: null, label: 'Paneer', unit: '/ kg' },
  { product: 'dahi', type: null, label: 'Dahi', unit: '/ kg' },
];

function rowKey(r: RowDef) {
  return `${r.product}:${r.type ?? ''}`;
}

function currentPaise(rates: RateConfig, row: RowDef): number | undefined {
  if (row.product === 'milk') return (rates.milk ?? {})[row.type as ProductType];
  if (row.product === 'ghee') return (rates.ghee ?? {})[row.type as ProductType];
  if (row.product === 'cream') return (rates.cream ?? {})[row.type as ProductType];
  if (row.product === 'paneer' || row.product === 'dahi') return rates[row.product];
  return undefined;
}

/** Rate configuration screen with a single Save that persists all changed rates. */
export default function RateConfigPage() {
  const [rates, setRates] = useState<RateConfig | null>(null);
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getRates().then(setRates).catch(() => setRates({ milk: {}, ghee: {}, cream: {} }));
  }, []);

  const handleSaveAll = async () => {
    setError('');
    setSaved(false);
    setSaving(true);
    try {
      // Save every row that has a non-empty input value.
      const toSave = ROWS.filter((r) => (inputs[rowKey(r)] ?? '').trim() !== '');
      if (toSave.length === 0) {
        setError('Enter at least one rate to save.');
        setSaving(false);
        return;
      }
      for (const row of toSave) {
        await setRate(row.product, row.type, inputs[rowKey(row)]);
      }
      const fresh = await getRates();
      setRates(fresh);
      setInputs({});
      setSaved(true);
    } catch (err) {
      // Surface the real error to the console for debugging (e.g. Firestore permission).
      console.error('Rate save failed:', err);
      if (err instanceof AppError) {
        setError(err.message);
      } else {
        const msg = (err as { message?: string })?.message ?? '';
        setError(msg ? `Could not save: ${msg}` : 'Could not save. Please try again.');
      }
    } finally {
      setSaving(false);
    }
  };

  if (!rates) {
    return <div className="p-4 text-slate-500">Loading rates…</div>;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800">Rates</h1>
        <button
          onClick={handleSaveAll}
          disabled={saving}
          className="rounded-lg bg-brand-600 px-5 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-brand-700 disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save all'}
        </button>
      </div>

      {error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
          {error}
        </p>
      )}
      {saved && (
        <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">Rates saved.</p>
      )}

      <div className="divide-y divide-slate-200 rounded-xl bg-white shadow">
        {ROWS.map((row) => {
          const key = rowKey(row);
          const paise = currentPaise(rates, row);
          return (
            <div key={key} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className="font-medium text-slate-800">{row.label}</p>
                <p className="text-sm text-slate-500">
                  {paise !== undefined ? (
                    <>
                      ₹{paiseToRupees(paise)} {row.unit}
                    </>
                  ) : (
                    <span className="text-amber-600">Not set</span>
                  )}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <span className="text-slate-400">₹</span>
                <input
                  aria-label={`${row.label} rate`}
                  inputMode="decimal"
                  value={inputs[key] ?? ''}
                  onChange={(e) => setInputs((i) => ({ ...i, [key]: e.target.value }))}
                  placeholder={paise !== undefined ? paiseToRupees(paise) : '0.00'}
                  className="w-24 rounded-lg border border-slate-300 px-2 py-1.5 text-right outline-none focus:border-brand-500"
                />
              </div>
            </div>
          );
        })}
      </div>
      <p className="text-xs text-slate-400">
        Enter new rates in the boxes and press “Save all”. Blank boxes keep their current rate.
      </p>
    </div>
  );
}
