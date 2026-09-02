import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Pencil, Trash2, Plus, Truck, Power, Phone } from 'lucide-react';
import { getVendor, deleteVendor, setVendorActive } from '../services/vendorService';
import {
  listPurchases,
  computePurchaseBill,
  markPurchasePaid,
  recordVendorPayment,
  listVendorCycles,
  listVendorPayments,
  type PaymentLog,
} from '../services/purchaseService';
import { paiseToRupees, rupeesToPaise } from '../services/money';
import { type ClosedCycle, type PurchaseEntry, type Vendor } from '../lib/types';
import VendorForm from '../components/VendorForm';
import PurchaseEntryForm from '../components/PurchaseEntryForm';
import PurchaseList from '../components/PurchaseList';
import PaymentHistory from '../components/PaymentHistory';
import BillSummary from '../components/BillSummary';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';

type Tab = 'entries' | 'bill' | 'history';

export default function VendorDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [entries, setEntries] = useState<PurchaseEntry[]>([]);
  const [cycles, setCycles] = useState<ClosedCycle[]>([]);
  const [payments, setPayments] = useState<PaymentLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('entries');
  const [editing, setEditing] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [editEntry, setEditEntry] = useState<PurchaseEntry | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmToggle, setConfirmToggle] = useState(false);
  const [partialAmount, setPartialAmount] = useState('');
  const [message, setMessage] = useState('');
  const [paying, setPaying] = useState(false);

  const refresh = useCallback(async () => {
    if (!id) return;
    const [v, e, c, p] = await Promise.all([
      getVendor(id),
      listPurchases(id),
      listVendorCycles(id),
      listVendorPayments(id),
    ]);
    setVendor(v);
    setEntries(e);
    setCycles(c);
    setPayments(p);
  }, [id]);

  useEffect(() => {
    setLoading(true);
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  const bill = useMemo(() => computePurchaseBill(entries), [entries]);

  const handleMarkPaid = async () => {
    if (!id) return;
    setMessage('');
    setPaying(true);
    try {
      const total = bill.error ? 0 : bill.grandTotalPaise;
      const balance = Math.max(total - (vendor?.paidPaise ?? 0), 0);
      if (balance > 0) await recordVendorPayment(id, balance);
      else await markPurchasePaid(id);
      await refresh();
      setMessage('Marked as paid. A new cycle has started.');
    } catch (err) {
      const msg = (err as { message?: string })?.message ?? '';
      setMessage(msg ? `Could not mark as paid: ${msg}` : 'Could not mark as paid.');
    } finally {
      setPaying(false);
    }
  };

  const handlePartial = async () => {
    if (!id) return;
    setMessage('');
    let paise: number;
    try {
      paise = rupeesToPaise(partialAmount);
    } catch {
      setMessage('Enter a valid amount.');
      return;
    }
    setPaying(true);
    try {
      await recordVendorPayment(id, paise);
      setPartialAmount('');
      await refresh();
      setMessage('Payment recorded.');
    } catch (err) {
      const msg = (err as { message?: string })?.message ?? '';
      setMessage(msg ? `Could not record payment: ${msg}` : 'Could not record payment.');
    } finally {
      setPaying(false);
    }
  };

  const handleDeleteVendor = async () => {
    if (!id) return;
    await deleteVendor(id);
    navigate('/vendors');
  };

  if (loading) return <div className="p-4 text-slate-500">Loading…</div>;
  if (!id || !vendor) return <div className="p-4 text-slate-500">Vendor not found.</div>;

  const initials = vendor.name.slice(0, 2).toUpperCase();
  const status = vendor.paymentStatus;
  const statusBadge =
    status === 'paid'
      ? { cls: 'bg-green-50 text-green-700 ring-green-200', label: '✓ Paid' }
      : status === 'partial'
        ? { cls: 'bg-blue-50 text-blue-700 ring-blue-200', label: '◐ Partial' }
        : { cls: 'bg-amber-50 text-amber-700 ring-amber-200', label: '● Unpaid' };

  const tabBtn = (key: Tab, label: string, count?: number) => (
    <button
      onClick={() => setTab(key)}
      className={
        tab === key
          ? 'flex-1 rounded-xl bg-white px-3 py-2 text-sm font-semibold text-vendor-700 shadow-soft'
          : 'flex-1 rounded-xl px-3 py-2 text-sm font-medium text-slate-500 transition hover:text-slate-700'
      }
    >
      {label}
      {count !== undefined && count > 0 && (
        <span className="ml-1 rounded-full bg-vendor-100 px-1.5 text-xs font-semibold text-vendor-700">{count}</span>
      )}
    </button>
  );

  // BillSummary/PaymentHistory expect a Customer-like object; vendor matches the fields used.
  const asCustomer = { ...vendor } as unknown as Parameters<typeof BillSummary>[0]['customer'];

  return (
    <div className="mx-auto max-w-2xl animate-fade-in space-y-4 p-4">
      <Link to="/vendors" className="inline-flex items-center gap-1 text-sm font-medium text-slate-500 transition hover:text-vendor-700">
        ‹ Vendors
      </Link>

      {/* Header card — compact professional card */}
      <div className="animate-slide-up rounded-2xl bg-gradient-to-br from-vendor-600 via-vendor-600 to-vendor-700 p-4 text-white shadow-sm ring-1 ring-vendor-500/30">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/15 text-base font-bold text-white ring-1 ring-white/25">
              {initials}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h1 className="truncate text-lg font-bold leading-tight sm:text-xl">{vendor.name}</h1>
                <span className="inline-flex items-center gap-1 rounded-md bg-white/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white/90 ring-1 ring-white/20">
                  <Truck size={10} /> Vendor
                </span>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                {vendor.phone && (
                  <span className="inline-flex items-center gap-1 font-medium text-white/80">
                    <Phone size={11} className="text-white/70" />
                    {vendor.phone}
                  </span>
                )}
                <span className="inline-flex items-center rounded-md bg-white/15 px-2 py-0.5 text-[11px] font-semibold text-white ring-1 ring-white/20">
                  {statusBadge.label}
                </span>
                {vendor.active === false && (
                  <span className="inline-flex items-center rounded-md bg-rose-500/30 px-2 py-0.5 text-[11px] font-semibold text-rose-100 ring-1 ring-rose-400/30">
                    Inactive
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-0.5 rounded-xl bg-white/10 p-1 ring-1 ring-white/15 backdrop-blur">
            <button
              onClick={() => setEditing(true)}
              aria-label="Edit vendor"
              title="Edit vendor"
              className="rounded-lg p-1.5 text-white/85 transition hover:bg-white/20 hover:text-white"
            >
              <Pencil size={15} />
            </button>
            <button
              onClick={() => setConfirmToggle(true)}
              aria-label={vendor.active === false ? 'Activate vendor' : 'Deactivate vendor'}
              title={vendor.active === false ? 'Activate' : 'Deactivate'}
              className="rounded-lg p-1.5 text-white/85 transition hover:bg-white/20 hover:text-white"
            >
              <Power size={15} />
            </button>
            <button
              onClick={() => setConfirmDelete(true)}
              aria-label="Delete vendor"
              title="Delete vendor"
              className="rounded-lg p-1.5 text-white/85 transition hover:bg-rose-500/30 hover:text-white"
            >
              <Trash2 size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-2xl bg-slate-100/80 p-1 shadow-soft">
        {tabBtn('entries', 'Purchases', entries.length)}
        {tabBtn('bill', 'Bill')}
        {tabBtn('history', 'History', cycles.length)}
      </div>

      {tab === 'entries' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-800">Current month</h2>
            <button onClick={() => setShowAdd(true)} className="flex items-center gap-1.5 rounded-xl bg-vendor-600 px-4 py-2.5 text-sm font-semibold text-white shadow-soft transition-all hover:bg-vendor-700 active:scale-[0.97]">
              <Plus size={16} /> Add purchase
            </button>
          </div>
          <PurchaseList vendorId={id} entries={entries} onChanged={refresh} onEdit={(e) => setEditEntry(e)} />

          <Modal open={showAdd} title="Add purchase" onClose={() => setShowAdd(false)}>
            <PurchaseEntryForm vendorId={id} onSaved={() => { setShowAdd(false); void refresh(); }} />
          </Modal>
          <Modal open={editEntry !== null} title="Edit purchase" onClose={() => setEditEntry(null)}>
            {editEntry && (
              <PurchaseEntryForm vendorId={id} entry={editEntry} onSaved={() => { setEditEntry(null); void refresh(); }} />
            )}
          </Modal>
        </div>
      )}

      {tab === 'bill' && (
        <div className="space-y-3">
          <BillSummary customer={asCustomer} entries={entries as unknown as Parameters<typeof BillSummary>[0]['entries']} />
          {(() => {
            const total = bill.error ? 0 : bill.grandTotalPaise;
            const paid = vendor.paidPaise ?? 0;
            const balance = Math.max(total - paid, 0);
            const disabled = paying || entries.length === 0 || !!bill.error;
            return (
              <div className="card space-y-4 p-4">
                <h2 className="text-base font-semibold text-slate-800">Payment to vendor</h2>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="text-xs text-slate-500">Bill</p>
                    <p className="mt-0.5 font-bold text-slate-800">₹{paiseToRupees(total)}</p>
                  </div>
                  <div className="rounded-xl bg-green-50 p-3">
                    <p className="text-xs text-slate-500">Paid</p>
                    <p className="mt-0.5 font-bold text-green-700">₹{paiseToRupees(paid)}</p>
                  </div>
                  <div className="rounded-xl bg-amber-50 p-3">
                    <p className="text-xs text-slate-500">Balance</p>
                    <p className="mt-0.5 font-bold text-amber-700">₹{paiseToRupees(balance)}</p>
                  </div>
                </div>

                {payments.length > 0 && (
                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                    <p className="mb-2 text-xs font-medium text-slate-500">Payments this cycle</p>
                    <ul className="space-y-1">
                      {payments.map((p) => (
                        <li key={p.id} className="flex items-center justify-between text-sm">
                          <span className="text-slate-600">{p.date}</span>
                          <span className="font-medium text-slate-800">₹{paiseToRupees(p.amountPaise)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <label className="text-sm font-medium text-slate-700">Record a payment (₹)</label>
                    <input
                      inputMode="decimal"
                      value={partialAmount}
                      onChange={(e) => setPartialAmount(e.target.value)}
                      placeholder={balance > 0 ? paiseToRupees(balance) : '0.00'}
                      className="input mt-1"
                    />
                  </div>
                  <button onClick={handlePartial} disabled={disabled || !partialAmount.trim()} className="btn-outline">
                    Add payment
                  </button>
                </div>

                <button
                  onClick={handleMarkPaid}
                  disabled={disabled}
                  className="w-full rounded-xl bg-green-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-green-700 disabled:opacity-50"
                >
                  {paying ? 'Processing…' : 'Mark fully paid'}
                </button>
                {message && <p className="text-center text-sm text-slate-600">{message}</p>}
              </div>
            );
          })()}
        </div>
      )}

      {tab === 'history' && <PaymentHistory cycles={cycles} customer={asCustomer} />}

      <Modal open={editing} title="Edit vendor" onClose={() => setEditing(false)}>
        <VendorForm vendor={vendor} onSaved={async () => { setVendor(await getVendor(id)); setEditing(false); }} onCancel={() => setEditing(false)} />
      </Modal>

      <ConfirmDialog
        open={confirmToggle}
        title={vendor.active === false ? 'Activate vendor?' : 'Deactivate vendor?'}
        message={
          vendor.active === false
            ? `"${vendor.name}" will become active again.`
            : `"${vendor.name}" will be marked inactive. Data stays, but they'll show as inactive.`
        }
        confirmLabel={vendor.active === false ? 'Activate' : 'Deactivate'}
        onConfirm={async () => {
          setConfirmToggle(false);
          await setVendorActive(id, vendor.active === false);
          await refresh();
        }}
        onCancel={() => setConfirmToggle(false)}
      />

      <ConfirmDialog
        open={confirmDelete}
        title="Delete vendor?"
        message={`This will delete "${vendor.name}".`}
        confirmLabel="Delete vendor"
        onConfirm={() => { setConfirmDelete(false); void handleDeleteVendor(); }}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
}
