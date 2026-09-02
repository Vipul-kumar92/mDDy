import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  Truck,
  CheckCircle2,
  Clock,
  CircleDashed,
  ArrowUpRight,
  ArrowDownRight,
  ChevronRight,
  Wallet,
  Activity,
  Calendar,
} from 'lucide-react';
import { subscribeCustomers, todayIso } from '../services/customerService';
import { subscribeVendors } from '../services/vendorService';
import { paiseToRupees, hundredthsToUnits } from '../services/money';
import { getDailyLedger, type DailyLedgerItem } from '../services/dashboardService';
import type { Customer, Vendor } from '../lib/types';

type DashboardTab = 'all' | 'customers' | 'vendors' | 'daily';

export default function DashboardPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<DashboardTab>('all');
  
  // Ledger state
  const [ledgerDate, setLedgerDate] = useState(todayIso());
  const [ledgerItems, setLedgerItems] = useState<DailyLedgerItem[]>([]);
  const [ledgerLoading, setLedgerLoading] = useState(false);

  useEffect(() => {
    let customerLoaded = false;
    let vendorLoaded = false;

    const unsubCustomers = subscribeCustomers((list) => {
      setCustomers(list);
      customerLoaded = true;
      if (vendorLoaded) setLoading(false);
    });

    const unsubVendors = subscribeVendors((list) => {
      setVendors(list);
      vendorLoaded = true;
      if (customerLoaded) setLoading(false);
    });

    return () => {
      unsubCustomers();
      unsubVendors();
    };
  }, []);

  useEffect(() => {
    if (loading) return;
    setLedgerLoading(true);
    getDailyLedger(ledgerDate, customers, vendors)
      .then(setLedgerItems)
      .catch((err) => console.error('Failed to load ledger:', err))
      .finally(() => setLedgerLoading(false));
  }, [ledgerDate, customers, vendors, loading]);

  // Customer statistics
  const customerStats = useMemo(() => {
    const total = customers.length;
    const active = customers.filter((c) => c.active !== false).length;
    const inactive = total - active;
    const paid = customers.filter((c) => c.paymentStatus === 'paid').length;
    const partial = customers.filter((c) => c.paymentStatus === 'partial').length;
    const unpaid = customers.filter((c) => c.paymentStatus === 'unpaid').length;
    const collectedPaise = customers.reduce((sum, c) => sum + (c.paidPaise ?? 0), 0);

    const paidPercent = total > 0 ? Math.round((paid / total) * 100) : 0;
    const partialPercent = total > 0 ? Math.round((partial / total) * 100) : 0;
    const unpaidPercent = total > 0 ? Math.round((unpaid / total) * 100) : 0;

    const pendingList = customers.filter((c) => c.paymentStatus !== 'paid' && c.active !== false);

    return {
      total,
      active,
      inactive,
      paid,
      partial,
      unpaid,
      collectedPaise,
      paidPercent,
      partialPercent,
      unpaidPercent,
      pendingList,
    };
  }, [customers]);

  // Vendor statistics
  const vendorStats = useMemo(() => {
    const total = vendors.length;
    const active = vendors.filter((v) => v.active !== false).length;
    const inactive = total - active;
    const paid = vendors.filter((v) => v.paymentStatus === 'paid').length;
    const partial = vendors.filter((v) => v.paymentStatus === 'partial').length;
    const unpaid = vendors.filter((v) => v.paymentStatus === 'unpaid').length;
    const paidOutPaise = vendors.reduce((sum, v) => sum + (v.paidPaise ?? 0), 0);

    const paidPercent = total > 0 ? Math.round((paid / total) * 100) : 0;
    const partialPercent = total > 0 ? Math.round((partial / total) * 100) : 0;
    const unpaidPercent = total > 0 ? Math.round((unpaid / total) * 100) : 0;

    const pendingList = vendors.filter((v) => v.paymentStatus !== 'paid' && v.active !== false);

    return {
      total,
      active,
      inactive,
      paid,
      partial,
      unpaid,
      paidOutPaise,
      paidPercent,
      partialPercent,
      unpaidPercent,
      pendingList,
    };
  }, [vendors]);

  // Daily statistics
  const dailyStats = useMemo(() => {
    let customerMilkHundredths = 0;
    let customerCashPaise = 0;
    let vendorMilkHundredths = 0;
    let vendorCashPaise = 0;

    ledgerItems.forEach((item) => {
      if (item.type === 'customer_delivery') customerMilkHundredths += item.quantity || 0;
      if (item.type === 'customer_payment') customerCashPaise += item.amountPaise || 0;
      if (item.type === 'vendor_purchase') vendorMilkHundredths += item.quantity || 0;
      if (item.type === 'vendor_payment') vendorCashPaise += item.amountPaise || 0;
    });

    return {
      customerMilkHundredths,
      customerCashPaise,
      vendorMilkHundredths,
      vendorCashPaise,
    };
  }, [ledgerItems]);

  // Financial summary
  const netCashPaise = customerStats.collectedPaise - vendorStats.paidOutPaise;

  const currentMonthName = useMemo(() => {
    return new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  }, []);

  return (
    <div className="mx-auto max-w-2xl animate-fade-in space-y-4 p-4">
      {/* Header Banner */}
      <div className="animate-slide-up rounded-2xl bg-gradient-to-br from-slate-900 via-brand-950 to-slate-900 p-4 text-white shadow-sm ring-1 ring-white/10 sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500/20 text-brand-300 ring-1 ring-brand-400/30">
              <Activity size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold tracking-tight sm:text-xl">Stats Dashboard</h1>
                <span className="rounded-full bg-white/15 px-2 py-0.5 text-[11px] font-semibold text-white/90">
                  {currentMonthName}
                </span>
              </div>
              <p className="text-xs text-white/70">Overview of customers, vendors & billing health</p>
            </div>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="mt-4 flex gap-1 rounded-xl bg-white/10 p-1 backdrop-blur ring-1 ring-white/10">
          {(['all', 'customers', 'vendors', 'daily'] as DashboardTab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 rounded-lg py-1.5 text-[11px] font-semibold transition sm:text-xs ${
                tab === t ? 'bg-white text-slate-900 shadow-sm' : 'text-white/80 hover:text-white'
              }`}
            >
              {t === 'all' ? 'Overview' : t === 'customers' ? 'Customers' : t === 'vendors' ? 'Vendors' : 'Daily'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="card p-8 text-center text-slate-500">Loading stats…</div>
      ) : (
        <>
          {/* Financial Highlights (Shown in All view or general) */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {(tab === 'all' || tab === 'customers') && (
              <div className="card space-y-1 p-3.5 sm:p-4">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>Customer Inflow</span>
                  <ArrowDownRight size={16} className="text-emerald-600" />
                </div>
                <p className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
                  ₹{paiseToRupees(customerStats.collectedPaise)}
                </p>
                <p className="text-[11px] text-emerald-600 font-medium">Collected this cycle</p>
              </div>
            )}

            {(tab === 'all' || tab === 'vendors') && (
              <div className="card space-y-1 p-3.5 sm:p-4">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>Vendor Outflow</span>
                  <ArrowUpRight size={16} className="text-amber-600" />
                </div>
                <p className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
                  ₹{paiseToRupees(vendorStats.paidOutPaise)}
                </p>
                <p className="text-[11px] text-amber-600 font-medium">Paid out this cycle</p>
              </div>
            )}

            {tab === 'all' && (
              <div className="card col-span-2 space-y-1 p-3.5 sm:col-span-1 sm:p-4">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>Net Balance</span>
                  <Wallet size={16} className={netCashPaise >= 0 ? 'text-brand-600' : 'text-rose-600'} />
                </div>
                <p
                  className={`text-xl font-bold tracking-tight sm:text-2xl ${
                    netCashPaise >= 0 ? 'text-emerald-700' : 'text-rose-600'
                  }`}
                >
                  ₹{paiseToRupees(netCashPaise)}
                </p>
                <p className="text-[11px] text-slate-500 font-medium">Customer Inflow − Vendor Outflow</p>
              </div>
            )}
          </div>

          {/* CUSTOMER STATS CARD */}
          {(tab === 'all' || tab === 'customers') && (
            <div className="card space-y-4 p-4 sm:p-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-700 ring-1 ring-brand-200">
                    <Users size={18} />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900">Customer Statistics</h2>
                    <p className="text-xs text-slate-500">
                      {customerStats.active} Active · {customerStats.inactive} Inactive
                    </p>
                  </div>
                </div>
                <Link
                  to="/customers"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:text-brand-800"
                >
                  View all <ChevronRight size={14} />
                </Link>
              </div>

              {/* Status Breakdown Chips */}
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-xl bg-emerald-50/70 p-3 ring-1 ring-emerald-200/50">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-800">
                    <CheckCircle2 size={14} className="text-emerald-600" /> Paid
                  </div>
                  <p className="mt-1.5 text-xl font-extrabold text-emerald-950">{customerStats.paid}</p>
                  <p className="text-[10px] text-emerald-700 font-medium">{customerStats.paidPercent}% of total</p>
                </div>

                <div className="rounded-xl bg-sky-50/70 p-3 ring-1 ring-sky-200/50">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-sky-800">
                    <Clock size={14} className="text-sky-600" /> Partial
                  </div>
                  <p className="mt-1.5 text-xl font-extrabold text-sky-950">{customerStats.partial}</p>
                  <p className="text-[10px] text-sky-700 font-medium">{customerStats.partialPercent}% of total</p>
                </div>

                <div className="rounded-xl bg-amber-50/70 p-3 ring-1 ring-amber-200/50">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-800">
                    <CircleDashed size={14} className="text-amber-600" /> Unpaid
                  </div>
                  <p className="mt-1.5 text-xl font-extrabold text-amber-950">{customerStats.unpaid}</p>
                  <p className="text-[10px] text-amber-700 font-medium">{customerStats.unpaidPercent}% of total</p>
                </div>
              </div>

              {/* Progress visual bar */}
              {customerStats.total > 0 && (
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[11px] text-slate-500 font-medium">
                    <span>Payment Completion</span>
                    <span>{customerStats.paidPercent}% paid</span>
                  </div>
                  <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-slate-100 ring-1 ring-slate-200">
                    <div
                      style={{ width: `${customerStats.paidPercent}%` }}
                      className="bg-emerald-500 transition-all duration-500"
                    />
                    <div
                      style={{ width: `${customerStats.partialPercent}%` }}
                      className="bg-sky-500 transition-all duration-500"
                    />
                    <div
                      style={{ width: `${customerStats.unpaidPercent}%` }}
                      className="bg-amber-400 transition-all duration-500"
                    />
                  </div>
                </div>
              )}

              {/* Pending Customers Snapshot */}
              {tab === 'customers' && customerStats.pendingList.length > 0 && (
                <div className="pt-2 space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Pending Payments ({customerStats.pendingList.length})
                  </h3>
                  <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-slate-50/50">
                    {customerStats.pendingList.slice(0, 5).map((c) => (
                      <Link
                        key={c.id}
                        to={`/customers/${c.id}`}
                        className="flex items-center justify-between p-2.5 transition hover:bg-white"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-800">{c.name}</p>
                          {c.phone && <p className="text-xs text-slate-400">{c.phone}</p>}
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={
                              c.paymentStatus === 'partial'
                                ? 'pill bg-sky-100 text-sky-800 ring-sky-300'
                                : 'pill bg-amber-100 text-amber-800 ring-amber-300'
                            }
                          >
                            {c.paymentStatus === 'partial' ? 'Partial' : 'Unpaid'}
                          </span>
                          <ChevronRight size={14} className="text-slate-400" />
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* VENDOR STATS CARD */}
          {(tab === 'all' || tab === 'vendors') && (
            <div className="card space-y-4 p-4 sm:p-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-vendor-50 text-vendor-700 ring-1 ring-vendor-200">
                    <Truck size={18} />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900">Vendor Statistics</h2>
                    <p className="text-xs text-slate-500">
                      {vendorStats.active} Active · {vendorStats.inactive} Inactive
                    </p>
                  </div>
                </div>
                <Link
                  to="/vendors"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-vendor-700 hover:text-vendor-800"
                >
                  View all <ChevronRight size={14} />
                </Link>
              </div>

              {/* Status Breakdown Chips */}
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-xl bg-emerald-50/70 p-3 ring-1 ring-emerald-200/50">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-800">
                    <CheckCircle2 size={14} className="text-emerald-600" /> Paid
                  </div>
                  <p className="mt-1.5 text-xl font-extrabold text-emerald-950">{vendorStats.paid}</p>
                  <p className="text-[10px] text-emerald-700 font-medium">{vendorStats.paidPercent}% of total</p>
                </div>

                <div className="rounded-xl bg-sky-50/70 p-3 ring-1 ring-sky-200/50">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-sky-800">
                    <Clock size={14} className="text-sky-600" /> Partial
                  </div>
                  <p className="mt-1.5 text-xl font-extrabold text-sky-950">{vendorStats.partial}</p>
                  <p className="text-[10px] text-sky-700 font-medium">{vendorStats.partialPercent}% of total</p>
                </div>

                <div className="rounded-xl bg-amber-50/70 p-3 ring-1 ring-amber-200/50">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-800">
                    <CircleDashed size={14} className="text-amber-600" /> Unpaid
                  </div>
                  <p className="mt-1.5 text-xl font-extrabold text-amber-950">{vendorStats.unpaid}</p>
                  <p className="text-[10px] text-amber-700 font-medium">{vendorStats.unpaidPercent}% of total</p>
                </div>
              </div>

              {/* Progress visual bar */}
              {vendorStats.total > 0 && (
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[11px] text-slate-500 font-medium">
                    <span>Payout Completion</span>
                    <span>{vendorStats.paidPercent}% settled</span>
                  </div>
                  <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-slate-100 ring-1 ring-slate-200">
                    <div
                      style={{ width: `${vendorStats.paidPercent}%` }}
                      className="bg-emerald-500 transition-all duration-500"
                    />
                    <div
                      style={{ width: `${vendorStats.partialPercent}%` }}
                      className="bg-sky-500 transition-all duration-500"
                    />
                    <div
                      style={{ width: `${vendorStats.unpaidPercent}%` }}
                      className="bg-amber-400 transition-all duration-500"
                    />
                  </div>
                </div>
              )}

              {/* Pending Vendors Snapshot */}
              {tab === 'vendors' && vendorStats.pendingList.length > 0 && (
                <div className="pt-2 space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Pending Vendor Payouts ({vendorStats.pendingList.length})
                  </h3>
                  <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-slate-50/50">
                    {vendorStats.pendingList.slice(0, 5).map((v) => (
                      <Link
                        key={v.id}
                        to={`/vendors/${v.id}`}
                        className="flex items-center justify-between p-2.5 transition hover:bg-white"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-800">{v.name}</p>
                          {v.phone && <p className="text-xs text-slate-400">{v.phone}</p>}
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={
                              v.paymentStatus === 'partial'
                                ? 'pill bg-sky-100 text-sky-800 ring-sky-300'
                                : 'pill bg-amber-100 text-amber-800 ring-amber-300'
                            }
                          >
                            {v.paymentStatus === 'partial' ? 'Partial' : 'Unpaid'}
                          </span>
                          <ChevronRight size={14} className="text-slate-400" />
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* DAILY LEDGER SECTION */}
          {tab === 'daily' && (
            <div className="space-y-4 animate-fade-in">
              {/* Daily Stats Summary */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="card space-y-1 p-3">
                  <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Milk Delivered</p>
                  <p className="text-lg font-extrabold text-slate-900">{hundredthsToUnits(dailyStats.customerMilkHundredths)} <span className="text-xs font-medium text-slate-500">L</span></p>
                </div>
                <div className="card space-y-1 p-3 ring-emerald-100 bg-emerald-50/50">
                  <p className="text-[10px] uppercase font-bold text-emerald-700 tracking-wider">Cash Received</p>
                  <p className="text-lg font-extrabold text-emerald-700">₹{paiseToRupees(dailyStats.customerCashPaise)}</p>
                </div>
                <div className="card space-y-1 p-3">
                  <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Milk Purchased</p>
                  <p className="text-lg font-extrabold text-slate-900">{hundredthsToUnits(dailyStats.vendorMilkHundredths)} <span className="text-xs font-medium text-slate-500">L</span></p>
                </div>
                <div className="card space-y-1 p-3 ring-amber-100 bg-amber-50/50">
                  <p className="text-[10px] uppercase font-bold text-amber-700 tracking-wider">Cash Paid</p>
                  <p className="text-lg font-extrabold text-amber-700">₹{paiseToRupees(dailyStats.vendorCashPaise)}</p>
                </div>
              </div>

              {/* Feed */}
              <div className="card space-y-4 p-4 sm:p-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-700 ring-1 ring-brand-200">
                      <Calendar size={18} />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-slate-900">Date-wise Activity</h2>
                      <p className="text-xs text-slate-500">Entries and payments</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="date"
                      value={ledgerDate}
                      max={todayIso()}
                      onChange={(e) => setLedgerDate(e.target.value)}
                      className="input py-1.5 text-sm font-semibold text-slate-700 w-full sm:w-auto"
                    />
                  </div>
                </div>

                {ledgerLoading ? (
                  <div className="py-8 text-center text-sm font-medium text-slate-400">Loading activity...</div>
                ) : ledgerItems.length === 0 ? (
                  <div className="py-8 text-center text-sm font-medium text-slate-400">No activity recorded on this date.</div>
                ) : (
                  <div className="space-y-3">
                    {ledgerItems.map((item) => {
                      const isMoney = item.type === 'customer_payment' || item.type === 'vendor_payment';
                      const isCustomer = item.type.startsWith('customer');

                      return (
                        <div key={item.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl bg-slate-50 p-3 ring-1 ring-slate-100 hover:bg-slate-100 transition">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <Link to={isCustomer ? `/customers/${item.entityId}` : `/vendors/${item.entityId}`} className="truncate font-semibold text-slate-900 hover:text-brand-600 transition">
                                {item.entityName}
                              </Link>
                              <span className={`pill text-[9px] uppercase ${isCustomer ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'}`}>
                                {isCustomer ? 'Customer' : 'Vendor'}
                              </span>
                            </div>
                            <div className="mt-1 flex items-center gap-1.5 text-xs font-medium">
                              {isMoney ? (
                                <span className={isCustomer ? 'text-emerald-600' : 'text-amber-600'}>
                                  {isCustomer ? 'Received Payment' : 'Given Payment'}
                                </span>
                              ) : (
                                <span className="text-slate-600 capitalize">
                                  {item.product} {item.productType && `(${item.productType})`}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 sm:gap-1 border-t sm:border-t-0 border-slate-200 pt-2 sm:pt-0">
                            {isMoney ? (
                              <div className={`font-bold ${isCustomer ? 'text-emerald-600' : 'text-amber-600'}`}>
                                ₹{paiseToRupees(item.amountPaise!)}
                              </div>
                            ) : (
                              <div className="font-bold text-slate-700">
                                {hundredthsToUnits(item.quantity!)} {item.product === 'milk' ? 'L' : 'kg'} <span className="text-[10px] font-medium text-slate-400 font-normal">@ ₹{paiseToRupees(item.rate!)}</span>
                              </div>
                            )}
                            <div className="text-[10px] font-semibold text-slate-500 bg-white px-2 py-0.5 rounded-full ring-1 ring-slate-200 uppercase tracking-wider shadow-sm" title="Current Balance Status">
                              {item.entityStatus}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
