import { useEffect, useState } from 'react';
import { addPurchase, updatePurchase } from '../services/purchaseService';
import { getRates } from '../services/rateService';
import { unitsToHundredths, hundredthsToUnits, rupeesToPaise, paiseToRupees } from '../services/money';
import { todayIso } from '../services/customerService';
import {
  AppError,
  type NewPurchaseEntry,
  type ProductType,
  type Slot,
  type RateConfig,
  type PurchaseEntry,
  type Product,
} from '../lib/types';

interface Props {
  vendorId: string;
  entry?: PurchaseEntry;
  onSaved?: () => void;
}

const TYPES: ProductType[] = ['cow', 'buffalo', 'mix'];
const SLOTS: Slot[] = ['morning', 'evening'];

const PRODUCTS: { value: Product; label: string; unit: string; typed: boolean }[] = [
  { value: 'milk', label: 'Milk', unit: 'L', typed: true },
  { value: 'ghee', label: 'Ghee', unit: 'kg', typed: true },
  { value: 'cream', label: 'Cream', unit: 'kg', typed: true },
  { value: 'paneer', label: 'Paneer', unit: 'kg', typed: false },
  { value: 'dahi', label: 'Dahi', unit: 'kg', typed: false },
];

function productMeta(p: Product) {
  return PRODUCTS.find((x) => x.value === p)!;
}

/** Record or edit a single-item purchase entry (product, slot, qty, rate). */
export default function PurchaseEntryForm({ vendorId, entry, onSaved }: Props) {
  const editing = !!entry;
  const [rates, setRates] = useState<RateConfig | null>(null);

  const [date, setDate] = useState(entry?.date ?? todayIso());
  const [slot, setSlot] = useState<Slot>(entry?.slot ?? 'morning');
  const [product, setProduct] = useState<Product>(entry?.product ?? 'milk');
  const [type, setType] = useState<ProductType>(entry?.type ?? 'cow');
  const [qty, setQty] = useState(entry ? hundredthsToUnits(entry.quantity) : '');
  const [rate, setRate] = useState(entry ? paiseToRupees(entry.rate) : '');
  const [rateTouched, setRateTouched] = useState(!!entry);

  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getRates().then(setRates).catch(() => setRates({ milk: {}, ghee: {}, cream: {} }));
  }, []);

  const meta = productMeta(product);

  const defaultPaise: number | undefined = (() => {
    if (!rates) return undefined;
    if (product === 'milk') return rates.milk[type];
    if (product === 'ghee') return rates.ghee[type];
    if (product === 'cream') return rates.cream[type];
    if (product === 'paneer' || product === 'dahi') return rates[product];
    return undefined;
  })();

  useEffect(() => {
    if (rateTouched) return;
    if (defaultPaise !== undefined) setRate(paiseToRupees(defaultPaise));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product, type, defaultPaise]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    let input: NewPurchaseEntry;
    try {
      input = {
        date,
        slot,
        product,
        quantity: unitsToHundredths(qty),
        rate: rupeesToPaise(rate),
        ...(meta.typed ? { type } : {}),
      };
    } catch (err) {
      setError(err instanceof AppError ? err.message : 'Invalid input.');
      return;
    }
    setSaving(true);
    try {
      if (editing && entry) await updatePurchase(vendorId, entry.id, input);
      else await addPurchase(vendorId, input);
      onSaved?.();
    } catch (err) {
      if (err instanceof AppError) {
        if (err.code === 'INVALID_DATE') setError('Date cannot be in the future.');
        else setError(err.message);
      } else {
        setError('Could not save. Please try again.');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-medium text-slate-700">Date</label>
          <input
            type="date"
            max={todayIso()}
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="input mt-1"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700">Slot</label>
          <select aria-label="Slot" value={slot} onChange={(e) => setSlot(e.target.value as Slot)} className="input mt-1">
            {SLOTS.map((s) => (
              <option key={s} value={s}>{s === 'morning' ? 'Morning' : 'Evening'}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700">Product</label>
          <select
            aria-label="Product"
            value={product}
            onChange={(e) => { setProduct(e.target.value as Product); setRateTouched(false); }}
            className="input mt-1"
          >
            {PRODUCTS.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
        </div>
        {meta.typed && (
          <div>
            <label className="text-sm font-medium text-slate-700">Type</label>
            <select
              aria-label="Type"
              value={type}
              onChange={(e) => { setType(e.target.value as ProductType); setRateTouched(false); }}
              className="input mt-1"
            >
              {TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
        )}
        <div>
          <label className="text-sm font-medium text-slate-700">Quantity ({meta.unit})</label>
          <input
            aria-label="Quantity"
            inputMode="decimal"
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            placeholder="0"
            className="input mt-1"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700">
            Rate (₹/{meta.unit})
            {defaultPaise !== undefined && (
              <span className="ml-1 text-xs font-normal text-slate-400">· def ₹{paiseToRupees(defaultPaise)}</span>
            )}
          </label>
          <input
            aria-label="Rate"
            inputMode="decimal"
            value={rate}
            onChange={(e) => { setRate(e.target.value); setRateTouched(true); }}
            placeholder="0.00"
            className="input mt-1"
          />
        </div>
      </div>

      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}

      <button type="submit" disabled={saving} className="btn-primary w-full">
        {saving ? 'Saving…' : editing ? 'Update entry' : 'Save entry'}
      </button>
    </form>
  );
}
