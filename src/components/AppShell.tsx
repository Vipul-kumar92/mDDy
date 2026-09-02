import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Users, Truck, IndianRupee, Calculator } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useIdleTimeout } from '../hooks/useIdleTimeout';
import ProfileMenu from './ProfileMenu';

const BASE_NAV = [
  { to: '/', label: 'Customers', Icon: Users },
  { to: '/vendors', label: 'Vendors', Icon: Truck },
  { to: '/rates', label: 'Rates', Icon: IndianRupee },
  { to: '/calculator', label: 'Calc', Icon: Calculator },
];

/** App layout: premium glassy top bar + mobile bottom tab bar. */
export default function AppShell({ children }: { children: ReactNode }) {
  const { logout, user } = useAuth();
  const location = useLocation();

  useIdleTimeout(() => {
    void logout();
  }, !!user);

  const isActive = (to: string) =>
    to === '/' ? location.pathname === '/' : location.pathname.startsWith(to);

  // Admin is reached from the profile menu, so keep the top nav to the core tabs.
  const NAV = BASE_NAV;

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-slate-200/70 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-2.5">
          {/* Brand */}
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-sm font-extrabold tracking-tight text-white shadow-glow">
              mD
            </div>
            <div className="leading-tight">
              <p className="text-[15px] font-bold text-slate-800">mDDy</p>
              <p className="text-[10px] font-medium text-slate-400">Dairy Manager</p>
            </div>
          </div>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-1 rounded-full bg-slate-100/80 p-1 sm:flex">
            {NAV.map(({ to, label, Icon }) => {
              const active = isActive(to);
              const activeColor = to === '/vendors' ? 'text-vendor-700' : 'text-brand-700';
              return (
                <Link
                  key={to}
                  to={to}
                  className={
                    active
                      ? `flex items-center gap-1.5 rounded-full bg-white px-3.5 py-1.5 text-sm font-semibold shadow-soft ${activeColor}`
                      : 'flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium text-slate-500 transition hover:text-slate-800'
                  }
                >
                  <Icon size={16} />
                  {label}
                </Link>
              );
            })}
          </nav>

          <ProfileMenu />
        </div>
      </header>

      <main className="mx-auto max-w-3xl animate-fade-in pb-24 sm:pb-8">{children}</main>

      {/* Mobile bottom tab bar */}
      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200/70 bg-white/90 backdrop-blur-xl sm:hidden">
        <div className="mx-auto flex max-w-3xl items-stretch justify-around px-2 pb-[env(safe-area-inset-bottom)]">
          {NAV.map(({ to, label, Icon }) => {
            const active = isActive(to);
            const isVendor = to === '/vendors';
            const dot = isVendor ? 'bg-vendor-600' : 'bg-brand-600';
            const ic = active ? (isVendor ? 'text-vendor-600' : 'text-brand-600') : 'text-slate-400';
            const tx = active ? (isVendor ? 'text-vendor-700' : 'text-brand-700') : 'text-slate-400';
            return (
              <Link
                key={to}
                to={to}
                className="relative flex flex-1 flex-col items-center gap-0.5 py-2.5"
              >
                {active && <span className={`absolute top-0 h-0.5 w-8 rounded-full ${dot}`} />}
                <Icon size={20} className={ic} />
                <span className={`text-[11px] ${active ? 'font-semibold' : 'font-medium'} ${tx}`}>{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
