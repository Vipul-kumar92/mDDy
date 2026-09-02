import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, ChevronRight, Users } from 'lucide-react';
import { subscribeCustomers, filterCustomers } from '../services/customerService';
import type { Customer } from '../lib/types';
import CustomerForm from '../components/CustomerForm';
import Modal from '../components/Modal';

/** Customer directory, Khatabook-style: summary stats + searchable list. */
export default function CustomerListPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [term, setTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = subscribeCustomers((list) => {
      setCustomers(list);
      setLoading(false);
    });
    return unsub;
  }, []);

  const filtered = useMemo(() => filterCustomers(customers, term), [customers, term]);


  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4">
      {/* Header card — compact professional summary */}
      <div className="animate-slide-up rounded-2xl bg-gradient-to-br from-brand-600 via-brand-600 to-brand-700 p-3.5 text-white shadow-sm ring-1 ring-brand-500/30 sm:p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/25">
              <Users size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold tracking-tight text-white sm:text-lg">Customers</h1>
                <span className="rounded-full bg-white/15 px-2 py-0.5 text-xs font-semibold text-white ring-1 ring-white/20">
                  {customers.length}
                </span>
              </div>
              <p className="text-[11px] text-white/70">Directory & monthly deliveries</p>
            </div>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 rounded-xl bg-white px-3.5 py-1.5 text-xs font-semibold text-brand-700 shadow-sm transition hover:bg-brand-50 active:scale-[0.97] sm:text-sm"
          >
            <Plus size={15} /> Add
          </button>
        </div>
      </div>

      <Modal open={showForm} title="Add customer" onClose={() => setShowForm(false)}>
        <CustomerForm onCreated={() => setShowForm(false)} onCancel={() => setShowForm(false)} />
      </Modal>

      <div className="relative">
        <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="Search customers…"
          aria-label="Search customers"
          className="input pl-11"
        />
      </div>

      {loading ? (
        <p className="text-slate-500">Loading…</p>
      ) : filtered.length === 0 ? (
        <div className="card flex flex-col items-center gap-3 p-10 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
            <Users className="text-slate-300" size={26} />
          </div>
          <p className="text-sm text-slate-400">
            {customers.length === 0 ? 'No customers yet. Add one to get started.' : 'No matching customers.'}
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {filtered.map((c, i) => (
            <li key={c.id} style={{ animationDelay: `${Math.min(i * 30, 300)}ms` }} className="animate-slide-up">
              <Link
                to={`/customers/${c.id}`}
                className={`card flex items-center gap-3 px-4 py-3 transition-all duration-150 hover:-translate-y-0.5 hover:shadow-lift ${c.active === false ? 'opacity-60' : ''}`}
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 text-sm font-bold text-white shadow-soft">
                  {c.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-slate-800">
                    {c.name}
                    {c.active === false && <span className="ml-2 text-xs font-medium text-slate-400">· Inactive</span>}
                  </p>
                  {c.phone && <p className="text-sm text-slate-400">{c.phone}</p>}
                </div>
                <ChevronRight size={18} className="text-slate-300" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
