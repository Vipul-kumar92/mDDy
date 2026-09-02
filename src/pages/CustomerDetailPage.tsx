import { useCallback, useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { listCurrentEntries } from '../services/deliveryService';
import { markPaid, listCycles, computeBill, recordPartialPayment, listPayments, lastOfMonth, type PaymentLog } from '../services/billingService';
import { deleteCustomer, getCustomer, setCustomerActive } from '../services/customerService';
import { paiseToRupees, rupeesToPaise } from '../services/money';
import ConfirmDialog from '../components/ConfirmDialog';
import { useNavigate } from 'react-router-dom';
import { Trash2, Plus, Pencil, Power } from 'lucide-react';
import CustomerForm from '../components/CustomerForm';
import DeliveryEntryForm from '../components/DeliveryEntryForm';
import EntryList from '../components/EntryList';
import BillSummary from '../components/BillSummary';
import PaymentHistory from '../components/PaymentHistory';
import Modal from '../components/Modal';
import { AppError, type ClosedCycle, type Customer, type DeliveryEntry } from '../lib/types';

type Tab = 'entries' | 'bill' | 'history';

/** Customer detail with a header card and tabbed sections. */
export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [entries, setEntries] = useState<DeliveryEntry[]>([]);
  const [cycles, setCycles] = useState<ClosedCycle[]>([]);
  const [payments, setPayments] = useState<PaymentLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [paying, setPaying] = useState(false);
  const [tab, setTab] = useState<Tab>('entries');
  const [showAdd, setShowAdd] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmToggle, setConfirmToggle] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(false);
  const [partialAmount, setPartialAmount] = useState('');
  const [editEntry, setEditEntry] = useState<DeliveryEntry | null>(null);
  const navigate = useNavigate();

  const loadCustomer = useCallback(async () => {
    if (!id) return;
    const c = await getCustomer(id);
    if (c) setCustomer(c);
  }, [id]);

  const refresh = useCallback(async () => {
    if (!id) return;
    const [e, c, p] = await Promise.all([listCurrentEntries(id), listCycles(id), listPayments(id)]);
    setEntries(e);
    setCycles(c);
    setPayments(p);
    await loadCustomer();
  }, [id, loadCustomer]);

  useEffect(() => {
    setLoading(true);
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  const handleMarkPaid = async () => {
    if (!id) return;
    setMessage('');
    setPaying(true);
    try {
      // Pay the remaining balance so the final payment is logged, then the
      // cycle closes automatically inside recordPartialPayment.
      const bill = computeBill(entries);
      const total = bill.error ? 0 : bill.grandTotalPaise;
      const balance = Math.max(total - (customer?.paidPaise ?? 0), 0);
      if (balance > 0) {
        await recordPartialPayment(id, balance);
      } else {
        await markPaid(id);
      }
      await refresh();
      setMessage('Marked as paid. A new cycle has started.');
    } catch (err) {
      console.error('Mark as paid failed:', err);
      if (err instanceof AppError && err.code === 'NOTHING_TO_PAY') {
        setMessage('There is nothing to mark as paid.');
      } else {
        const msg = (err as { message?: string })?.message ?? '';
        setMessage(msg ? `Could not mark as paid: ${msg}` : 'Could not mark as paid. Please try again.');
      }
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
      await recordPartialPayment(id, paise);
      setPartialAmount('');
      await refresh();
      setMessage('Payment recorded.');
    } catch (err) {
      console.error('Partial payment failed:', err);
      const msg = (err as { message?: string })?.message ?? '';
      setMessage(msg ? `Could not record payment: ${msg}` : 'Could not record payment.');
    } finally {
      setPaying(false);
    }
  };

  if (loading) return <div className="p-4 text-slate-500">Loading…</div>;
  if (!customer) return <div className="p-4 text-slate-500">Customer not found.</div>;

  const initials = customer.name.slice(0, 2).toUpperCase();
  const status = customer.paymentStatus;
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
          ? 'flex-1 rounded-xl bg-white px-3 py-2 text-sm font-semibold text-brand-700 shadow-soft'
          : 'flex-1 rounded-xl px-3 py-2 text-sm font-medium text-slate-500 transition hover:text-slate-700'
      }
    >
      {label}
      {count !== undefined && count > 0 && (
        <span className="ml-1 rounded-full bg-brand-100 px-1.5 text-xs font-semibold text-brand-700">{count}</span>
      )}
    </button>
  );

  return (
    <div className="mx-auto max-w-2xl animate-fade-in space-y-4 p-4">
      <Link to="/" className="inline-flex items-center gap-1 text-sm font-medium text-slate-500 transition hover:text-brand-700">
        ‹ Customers
      </Link>

      {/* Header card — gradient hero */}
      <div className="animate-slide-up overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600 via-brand-600 to-brand-800 p-5 text-white shadow-lift">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-xl font-bold text-white ring-1 ring-white/25">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-2xl font-extrabold leading-tight">{customer.name}</h1>
            {customer.phone && <p className="truncate text-sm text-white/70">{customer.phone}</p>}
          </div>
        </div>
        {/* Badges + actions on their own row so the name never gets squeezed. */}
        <div className="mt-4 flex items-center gap-2 border-t border-white/15 pt-3">
          <span className="pill bg-white/15 text-white ring-white/25">{statusBadge.label}</span>
          {customer.active === false && (
            <span className="pill bg-white/25 text-white ring-white/30">Inactive</span>
          )}
          <div className="ml-auto flex shrink-0 items-center gap-0.5">
            <button
              onClick={() => setEditingCustomer(true)}
              aria-label="Edit customer"
              title="Edit customer"
              className="rounded-xl p-2 text-white/80 transition hover:bg-white/15 hover:text-white"
            >
              <Pencil size={18} />
            </button>
            <button
              onClick={() => setConfirmToggle(true)}
              aria-label={customer.active === false ? 'Activate customer' : 'Deactivate customer'}
              title={customer.active === false ? 'Activate' : 'Deactivate'}
              className="rounded-xl p-2 text-white/80 transition hover:bg-white/15 hover:text-white"
            >
              <Power size={18} />
            </button>
            <button
              onClick={() => setConfirmDelete(true)}
              aria-label="Delete customer"
              title="Delete customer"
              className="rounded-xl p-2 text-white/80 transition hover:bg-white/15 hover:text-white"
            >
              <Trash2 size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-2xl bg-slate-100/80 p-1 shadow-soft">
        {tabBtn('entries', 'Entries', entries.length)}
        {tabBtn('bill', 'Bill')}
        {tabBtn('history', 'History', cycles.length)}
      </div>

      {tab === 'entries' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-800">Current month</h2>
              <p className="text-xs text-slate-500">
                {customer.currentCycleStart} – {lastOfMonth(customer.currentCycleStart)}
              </p>
            </div>
            <button
              onClick={() => setShowAdd(true)}
              className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-brand-700"
            >
              <Plus size={16} /> Add delivery
            </button>
          </div>
          <EntryList
            customerId={customer.id}
            entries={entries}
            onChanged={refresh}
            onEdit={(e) => setEditEntry(e)}
          />

          <Modal open={showAdd} title="Record delivery" onClose={() => setShowAdd(false)}>
            <DeliveryEntryForm
              customerId={customer.id}
              onSaved={() => {
                setShowAdd(false);
                void refresh();
              }}
            />
          </Modal>

          <Modal open={editEntry !== null} title="Edit delivery" onClose={() => setEditEntry(null)}>
            {editEntry && (
              <DeliveryEntryForm
                customerId={customer.id}
                entry={editEntry}
                onSaved={() => {
                  setEditEntry(null);
                  void refresh();
                }}
              />
            )}
          </Modal>
        </div>
      )}

      {tab === 'bill' && (
        <div className="space-y-3">
          <BillSummary customer={customer} entries={entries} />

          {(() => {
            const bill = computeBill(entries);
            const total = bill.error ? 0 : bill.grandTotalPaise;
            const paid = customer.paidPaise ?? 0;
            const balance = Math.max(total - paid, 0);
            const disabled = paying || entries.length === 0 || !!bill.error;

            return (
              <div className="card space-y-4 p-4">
                <h2 className="text-base font-semibold text-slate-800">Payment</h2>

                {/* Amounts */}
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

                {/* Payments made this cycle (unpaid payment log is cleared on close). */}
                {(() => {
                  const cyclePayments = payments;
                  if (cyclePayments.length === 0) return null;
                  return (
                    <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                      <p className="mb-2 text-xs font-medium text-slate-500">Payments this cycle</p>
                      <ul className="space-y-1">
                        {cyclePayments.map((p) => (
                          <li key={p.id} className="flex items-center justify-between text-sm">
                            <span className="text-slate-600">{p.date}</span>
                            <span className="font-medium text-slate-800">₹{paiseToRupees(p.amountPaise)}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })()}

                {/* Partial payment */}
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
                  <button
                    onClick={handlePartial}
                    disabled={disabled || !partialAmount.trim()}
                    className="btn-outline"
                  >
                    Add payment
                  </button>
                </div>

                <button
                  onClick={handleMarkPaid}
                  disabled={disabled}
                  className="w-full rounded-xl bg-green-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-green-700 active:scale-[0.98] disabled:opacity-50"
                >
                  {paying ? 'Processing…' : 'Mark fully paid'}
                </button>

                {message && <p className="text-center text-sm text-slate-600">{message}</p>}
              </div>
            );
          })()}
        </div>
      )}

      {tab === 'history' && <PaymentHistory cycles={cycles} customer={customer} />}

      <Modal open={editingCustomer} title="Edit customer" onClose={() => setEditingCustomer(false)}>
        <CustomerForm
          customer={customer}
          onSaved={() => {
            setEditingCustomer(false);
            void refresh();
          }}
          onCancel={() => setEditingCustomer(false)}
        />
      </Modal>

      <ConfirmDialog
        open={confirmToggle}
        title={customer.active === false ? 'Activate customer?' : 'Deactivate customer?'}
        message={
          customer.active === false
            ? `"${customer.name}" will become active again.`
            : `"${customer.name}" will be marked inactive. Data stays, but they'll show as inactive.`
        }
        confirmLabel={customer.active === false ? 'Activate' : 'Deactivate'}
        onConfirm={async () => {
          setConfirmToggle(false);
          if (id) await setCustomerActive(id, customer.active === false);
          await refresh();
        }}
        onCancel={() => setConfirmToggle(false)}
      />

      <ConfirmDialog
        open={confirmDelete}
        title="Delete customer?"
        message={`This will delete "${customer.name}". This cannot be undone.`}
        confirmLabel="Delete customer"
        onConfirm={async () => {
          setConfirmDelete(false);
          if (id) await deleteCustomer(id);
          navigate('/');
        }}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
}
