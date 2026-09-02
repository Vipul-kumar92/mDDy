import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlusCircle, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';
import { subscribeCustomers } from '../services/customerService';
import { subscribeVendors } from '../services/vendorService';
import { addEntry } from '../services/deliveryService';
import { addPurchase } from '../services/purchaseService';
import { recordPartialPayment } from '../services/billingService';
import { recordVendorPayment } from '../services/purchaseService';
import { rupeesToPaise, unitsToHundredths } from '../services/money';
import { todayIso } from '../services/customerService';
import type { Customer, Vendor, Product, ProductType, Slot } from '../lib/types';

export default function QuickAddPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<'customer' | 'vendor'>('customer');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  
  const [selectedId, setSelectedId] = useState<string>('');
  const [date, setDate] = useState(todayIso());
  
  // Delivery entry state
  const [qty, setQty] = useState('');
  const [product, setProduct] = useState<Product>('milk');
  const [type, setType] = useState<ProductType>('cow');
  const [slot, setSlot] = useState<Slot>('morning');
  
  // Payment state
  const [amountPaid, setAmountPaid] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const unsubC = subscribeCustomers(setCustomers);
    const unsubV = subscribeVendors(setVendors);
    return () => {
      unsubC();
      unsubV();
    };
  }, []);

  const activeList = tab === 'customer' ? customers : vendors;
  const activeEntity = tab === 'customer' 
    ? customers.find(c => c.id === selectedId)
    : vendors.find(v => v.id === selectedId);

  // If tab changes, clear selection
  useEffect(() => {
    setSelectedId('');
    setSuccess('');
    setError('');
  }, [tab]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!selectedId) {
      setError('Please select a ' + tab);
      return;
    }
    if (!qty.trim() && !amountPaid.trim()) {
      setError('Please enter either quantity or amount paid.');
      return;
    }

    setLoading(true);
    try {
      // 1. Add Delivery / Purchase if quantity exists
      if (qty.trim()) {
        const hundQty = unitsToHundredths(qty);
        if (tab === 'customer') {
          await addEntry(selectedId, {
            date,
            slot,
            product,
            quantity: hundQty,
            type: product === 'milk' || product === 'ghee' || product === 'cream' ? type : undefined,
          });
        } else {
          await addPurchase(selectedId, {
            date,
            slot,
            product,
            quantity: hundQty,
            type: product === 'milk' || product === 'ghee' || product === 'cream' ? type : undefined,
          });
        }
      }

      // 2. Add Payment if amount exists
      if (amountPaid.trim()) {
        const paise = rupeesToPaise(amountPaid);
        if (tab === 'customer') {
          await recordPartialPayment(selectedId, paise);
        } else {
          await recordVendorPayment(selectedId, paise);
        }
      }

      setSuccess(`Successfully recorded for ${activeEntity?.name}`);
      // Reset form
      setQty('');
      setAmountPaid('');
      
    } catch (err: any) {
      setError(err.message || 'An error occurred while saving.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl animate-fade-in space-y-4 p-4">
      <div className="flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition hover:text-slate-900">
          <ArrowLeft size={16} />
          Back
        </button>
        <h1 className="text-xl font-bold text-slate-900">Quick Add Entry</h1>
      </div>

      {/* Tabs */}
      <div className="flex rounded-xl bg-slate-100 p-1">
        {(['customer', 'vendor'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold capitalize transition ${
              tab === t
                ? 'bg-white text-brand-700 shadow-soft'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {t}s
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="card space-y-5 p-5 sm:p-6">
        {/* Select Entity */}
        <div className="space-y-1.5">
          <label className="block text-sm font-semibold text-slate-700">Select {tab}</label>
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="input w-full font-medium"
            required
          >
            <option value="">-- Choose {tab} --</option>
            {activeList.map((e) => (
              <option key={e.id} value={e.id}>{e.name}</option>
            ))}
          </select>
        </div>

        {activeEntity && (
          <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
            <p className="text-sm font-medium text-slate-600">
              Current Status: <span className="font-bold uppercase text-slate-900">{activeEntity.paymentStatus}</span>
            </p>
          </div>
        )}

        <div className="h-px w-full bg-slate-100" />

        {/* Date */}
        <div className="space-y-1.5">
          <label className="block text-sm font-semibold text-slate-700">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            max={todayIso()}
            className="input w-full"
            required
          />
        </div>

        {/* Delivery Section */}
        <div className="space-y-4 rounded-xl border border-brand-100 bg-brand-50/30 p-4">
          <h2 className="font-bold text-brand-900">1. Milk / Product (Dudh kitna)</h2>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600">Product</label>
              <select value={product} onChange={(e) => setProduct(e.target.value as Product)} className="input w-full text-sm">
                <option value="milk">Milk</option>
                <option value="ghee">Ghee</option>
                <option value="cream">Cream</option>
                <option value="paneer">Paneer</option>
                <option value="dahi">Dahi</option>
              </select>
            </div>
            
            {(product === 'milk' || product === 'ghee' || product === 'cream') && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600">Type</label>
                <select value={type} onChange={(e) => setType(e.target.value as ProductType)} className="input w-full text-sm">
                  <option value="cow">Cow</option>
                  <option value="buffalo">Buffalo</option>
                </select>
              </div>
            )}
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600">Slot</label>
              <select value={slot} onChange={(e) => setSlot(e.target.value as Slot)} className="input w-full text-sm">
                <option value="morning">Morning</option>
                <option value="evening">Evening</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600">Quantity</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                placeholder="0.0"
                className="input w-full"
              />
            </div>
          </div>
        </div>

        {/* Payment Section */}
        <div className="space-y-3 rounded-xl border border-emerald-100 bg-emerald-50/30 p-4">
          <h2 className="font-bold text-emerald-900">2. Payment (Paise kitne diya)</h2>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600">Amount (₹)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={amountPaid}
              onChange={(e) => setAmountPaid(e.target.value)}
              placeholder="0.00"
              className="input w-full"
            />
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-lg bg-rose-50 p-3 text-sm font-semibold text-rose-600">
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        {success && (
          <div className="flex items-center gap-2 rounded-lg bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">
            <CheckCircle2 size={16} />
            {success}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || (!qty && !amountPaid)}
          className="btn-primary flex w-full items-center justify-center gap-2"
        >
          <PlusCircle size={18} />
          {loading ? 'Saving...' : 'Save Entry'}
        </button>
      </form>
    </div>
  );
}
