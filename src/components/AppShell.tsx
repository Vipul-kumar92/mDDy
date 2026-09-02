import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Users, Truck, IndianRupee, Calculator, BarChart3, Menu } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useIdleTimeout } from '../hooks/useIdleTimeout';
import ProfileMenu from './ProfileMenu';

const BASE_NAV = [
  { to: '/dashboard', label: 'Stats', Icon: BarChart3 },
  { to: '/', label: 'Customers', Icon: Users },
  { to: '/vendors', label: 'Vendors', Icon: Truck },
  { to: '/rates', label: 'Rates', Icon: IndianRupee },
  { to: '/calculator', label: 'Calc', Icon: Calculator },
];

/** App layout: premium glassy top bar + mobile bottom tab bar. */
export default function AppShell({ children }: { children: React.ReactNode }) {
  const { logout, user } = useAuth();
  const location = useLocation();
  const [navOpen, setNavOpen] = useState(false);

  useIdleTimeout(() => {
    void logout();
  }, !!user);

  const isActive = (to: string) =>
    to === '/'
      ? location.pathname === '/' || location.pathname.startsWith('/customers')
      : location.pathname.startsWith(to);

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

          {/* Hamburger Nav */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <button
                onClick={() => setNavOpen(!navOpen)}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600 transition hover:bg-slate-200 hover:text-slate-900"
              >
                <Menu size={20} />
              </button>

              {navOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setNavOpen(false)} />
                  <div className="absolute right-0 top-full mt-2 w-48 z-50 overflow-hidden rounded-2xl bg-white p-1.5 shadow-xl ring-1 ring-slate-900/5 animate-scale-in origin-top-right">
                    {NAV.map(({ to, label, Icon }) => {
                      const active = isActive(to);
                      const isVendor = to === '/vendors';
                      const isStats = to === '/dashboard';
                      
                      let activeBg = 'bg-brand-50 text-brand-700';
                      let activeIcon = 'text-brand-600';
                      if (isVendor) {
                        activeBg = 'bg-vendor-50 text-vendor-700';
                        activeIcon = 'text-vendor-600';
                      } else if (isStats) {
                        activeBg = 'bg-slate-100 text-slate-900';
                        activeIcon = 'text-slate-800';
                      }

                      return (
                        <Link
                          key={to}
                          to={to}
                          onClick={() => setNavOpen(false)}
                          className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                            active ? activeBg : 'text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          <Icon size={18} className={active ? activeIcon : 'text-slate-400'} />
                          {label}
                        </Link>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
            
            <div className="h-6 w-px bg-slate-200" />

          <ProfileMenu />
        </div>
      </header>

      <main className="mx-auto max-w-3xl animate-fade-in pb-24 sm:pb-8">{children}</main>

      {/* Mobile bottom tab bar removed as per user request */}
    </div>
  );
}
