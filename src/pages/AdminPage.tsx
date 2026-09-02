import { useEffect, useState } from 'react';
import { ShieldCheck, KeyRound, Ban, RotateCcw, Search } from 'lucide-react';
import { listClients, setClientStatus, resetClientPassword } from '../services/clientService';
import { isSuperAdmin, SUPER_ADMIN_EMAIL } from '../lib/firebase';
import type { Client } from '../lib/types';

/** Super-admin panel: view all clients, reset passwords, close/resume accounts. */
export default function AdminPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [term, setTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');

  const admin = isSuperAdmin();

  const load = async () => {
    setLoading(true);
    try {
      const all = await listClients();
      // The super admin manages clients but is not a client themselves.
      setClients(all.filter((c) => c.email.toLowerCase() !== SUPER_ADMIN_EMAIL));
    } catch (err) {
      console.error('listClients failed (check Firestore rules / admin email):', err);
      setMsg('Could not load clients. Check console for details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (admin) void load();
    else setLoading(false);
  }, [admin]);

  if (!admin) {
    return (
      <div className="mx-auto max-w-2xl p-4">
        <div className="card flex flex-col items-center gap-3 p-10 text-center">
          <ShieldCheck className="text-slate-300" size={30} />
          <p className="text-sm text-slate-400">You do not have access to this page.</p>
        </div>
      </div>
    );
  }

  const filtered = clients.filter((c) => c.email.toLowerCase().includes(term.trim().toLowerCase()));
  const active = clients.filter((c) => c.status === 'active').length;

  const doReset = async (c: Client) => {
    setMsg('');
    try {
      await resetClientPassword(c.email);
      setMsg(`Password reset email sent to ${c.email}.`);
    } catch {
      setMsg('Could not send reset email.');
    }
  };

  const toggleStatus = async (c: Client) => {
    await setClientStatus(c.id, c.status === 'active' ? 'closed' : 'active');
    await load();
  };

  return (
    <div className="mx-auto max-w-2xl animate-fade-in space-y-4 p-4">
      {/* Hero */}
      <div className="animate-slide-up overflow-hidden rounded-3xl bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900 p-5 text-white shadow-lift">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/25">
            <ShieldCheck size={22} />
          </div>
          <div>
            <p className="text-sm font-medium text-white/70">Super admin</p>
            <p className="text-3xl font-extrabold leading-tight">{clients.length}</p>
          </div>
          <div className="ml-auto text-right text-sm text-white/70">
            <p>{active} active</p>
            <p>{clients.length - active} closed</p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <h1 className="text-xl font-extrabold tracking-tight text-slate-800">Clients</h1>
        <button onClick={() => void load()} className="btn-outline">
          Refresh
        </button>
      </div>

      <p className="rounded-xl bg-slate-100 px-3 py-2 text-xs text-slate-500">
        A client appears here after they log in to the app for the first time.
      </p>

      {msg && <p className="rounded-xl bg-green-50 px-3 py-2 text-sm text-green-700">{msg}</p>}

      <div className="relative">
        <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="Search by email…"
          className="input pl-11"
        />
      </div>

      {loading ? (
        <p className="text-slate-500">Loading…</p>
      ) : filtered.length === 0 ? (
        <div className="card p-8 text-center text-sm text-slate-400">No clients found.</div>
      ) : (
        <ul className="space-y-2">
          {filtered.map((c) => (
            <li key={c.id} className="card flex items-center gap-3 px-4 py-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-sm font-bold text-slate-600">
                {c.email.slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-slate-800">{c.name || c.email}</p>
                <p className="truncate text-xs text-slate-400">{c.email}</p>
              </div>
              <span
                className={
                  c.status === 'active'
                    ? 'pill bg-green-50 text-green-700 ring-green-200'
                    : 'pill bg-red-50 text-red-700 ring-red-200'
                }
              >
                {c.status === 'active' ? 'Active' : 'Closed'}
              </span>
              <button
                onClick={() => void doReset(c)}
                title="Send password reset email"
                className="rounded-lg p-2 text-slate-400 transition hover:bg-brand-50 hover:text-brand-600"
              >
                <KeyRound size={17} />
              </button>
              <button
                onClick={() => void toggleStatus(c)}
                title={c.status === 'active' ? 'Close account' : 'Resume account'}
                className={
                  c.status === 'active'
                    ? 'rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600'
                    : 'rounded-lg p-2 text-slate-400 transition hover:bg-green-50 hover:text-green-600'
                }
              >
                {c.status === 'active' ? <Ban size={17} /> : <RotateCcw size={17} />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
