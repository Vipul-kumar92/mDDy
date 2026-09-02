import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, ChevronRight, Truck, CheckCircle2, CircleDashed, Clock } from 'lucide-react';
import { subscribeVendors, filterVendors } from '../services/vendorService';
import type { Vendor } from '../lib/types';
import VendorForm from '../components/VendorForm';
import Modal from '../components/Modal';

/** Vendor directory, Khatabook-style: summary + searchable list. */
export default function VendorListPage() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [term, setTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = subscribeVendors((list) => {
      setVendors(list);
      setLoading(false);
    });
    return unsub;
  }, []);

  const filtered = useMemo(() => filterVendors(vendors, term), [vendors, term]);
  const paidCount = vendors.filter((v) => v.paymentStatus === 'paid').length;
  const partialCount = vendors.filter((v) => v.paymentStatus === 'partial').length;
  const unpaidCount = vendors.filter((v) => v.paymentStatus === 'unpaid').length;

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4">
      <div className="animate-slide-up overflow-hidden rounded-3xl bg-gradient-to-br from-vendor-500 via-vendor-600 to-vendor-800 p-5 text-white shadow-lift">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/25">
            <Truck size={22} />
          </div>
          <div>
            <p className="text-sm font-medium text-white/70">Vendors</p>
            <p className="text-3xl font-extrabold leading-tight">{vendors.length}</p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2">
          {[
            { label: 'Paid', value: paidCount, Icon: CheckCircle2 },
            { label: 'Partial', value: partialCount, Icon: Clock },
            { label: 'Unpaid', value: unpaidCount, Icon: CircleDashed },
          ].map(({ label, value, Icon }) => (
            <div key={label} className="rounded-2xl bg-white/10 px-3 py-2 ring-1 ring-white/10 backdrop-blur">
              <Icon size={15} className="text-white/70" />
              <p className="mt-1 text-xl font-bold leading-none">{value}</p>
              <p className="text-[11px] text-white/70">{label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <h1 className="text-xl font-extrabold tracking-tight text-slate-800">Vendors</h1>
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-vendor-600 px-4 py-2.5 text-sm font-semibold text-white shadow-soft transition-all hover:bg-vendor-700 active:scale-[0.97]"
        >
          <Plus size={16} /> Add
        </button>
      </div>

      <Modal open={showForm} title="Add vendor" onClose={() => setShowForm(false)}>
        <VendorForm onSaved={() => setShowForm(false)} onCancel={() => setShowForm(false)} />
      </Modal>

      <div className="relative">
        <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="Search vendors…"
          aria-label="Search vendors"
          className="input pl-11 focus:border-vendor-500 focus:ring-vendor-500/10"
        />
      </div>

      {loading ? (
        <p className="text-slate-500">Loading…</p>
      ) : filtered.length === 0 ? (
        <div className="card flex flex-col items-center gap-3 p-10 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
            <Truck className="text-slate-300" size={26} />
          </div>
          <p className="text-sm text-slate-400">
            {vendors.length === 0 ? 'No vendors yet. Add one to get started.' : 'No matching vendors.'}
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {filtered.map((v, i) => (
            <li key={v.id} style={{ animationDelay: `${Math.min(i * 30, 300)}ms` }} className="animate-slide-up">
              <Link
                to={`/vendors/${v.id}`}
                className={`card flex items-center gap-3 px-4 py-3 transition-all duration-150 hover:-translate-y-0.5 hover:shadow-lift ${v.active === false ? 'opacity-60' : ''}`}
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-vendor-400 to-vendor-600 text-sm font-bold text-white shadow-soft">
                  {v.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-slate-800">
                    {v.name}
                    {v.active === false && <span className="ml-2 text-xs font-medium text-slate-400">· Inactive</span>}
                  </p>
                  {v.phone && <p className="text-sm text-slate-400">{v.phone}</p>}
                </div>
                <span
                  className={
                    v.paymentStatus === 'paid'
                      ? 'pill bg-green-50 text-green-700 ring-green-200'
                      : v.paymentStatus === 'partial'
                        ? 'pill bg-blue-50 text-blue-700 ring-blue-200'
                        : 'pill bg-amber-50 text-amber-700 ring-amber-200'
                  }
                >
                  {v.paymentStatus === 'paid' ? 'Paid' : v.paymentStatus === 'partial' ? 'Partial' : 'Unpaid'}
                </span>
                <ChevronRight size={18} className="text-slate-300" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
