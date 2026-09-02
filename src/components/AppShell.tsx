import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Users, Truck, IndianRupee, Calculator, BarChart3, Menu, PlusCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useIdleTimeout } from '../hooks/useIdleTimeout';
import ProfileMenu from './ProfileMenu';

const BASE_NAV = [
  { to: '/quick-add', label: 'Quick Add', Icon: PlusCircle },
  { to: '/', label: 'Stats', Icon: BarChart3 },
  { to: '/customers', label: 'Customers', Icon: Users },
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
      <header className="sticky top-0 z-20 bg-gradient-to-r from-brand-700 via-brand-600 to-brand-700 shadow-md">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          {/* Left side: Hamburger + Brand */}
          <div className="flex items-center gap-3">
            {/* Hamburger Nav */}
            <div className="relative">
              <button
                onClick={() => setNavOpen(!navOpen)}
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-white transition hover:bg-white/20 active:bg-white/30 ring-1 ring-white/20 backdrop-blur-sm"
              >
                <Menu size={20} />
              </button>

              {navOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setNavOpen(false)} />
                  <div className="absolute left-0 top-full mt-2 w-48 z-50 overflow-hidden rounded-2xl bg-white p-1.5 shadow-xl ring-1 ring-slate-900/5 animate-scale-in origin-top-left">
                    {NAV.map(({ to, label, Icon }) => {
                      const active = isActive(to);
                      const isVendor = to === '/vendors';
                      const isStats = to === '/';

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
                          className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${active ? activeBg : 'text-slate-600 active:bg-slate-50 md:hover:bg-slate-50'
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

            {/* Brand Logo */}
            <div className="flex items-center gap-3 ml-1">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 text-lg font-extrabold tracking-tight text-white ring-1 ring-white/30 backdrop-blur-sm shadow-sm">
                mD
              </div>
              <div className="leading-tight text-white">
                <p className="text-[17px] font-extrabold tracking-wide">mDDy</p>
                <p className="text-[10.5px] font-semibold text-brand-100 uppercase tracking-widest">Dairy Manager</p>
              </div>
            </div>
          </div>

          {/* Profile Menu */}
          <div className="flex items-center">
            <ProfileMenu />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl animate-fade-in pb-8">{children}</main>

      {/* Mobile bottom tab bar removed as per user request */}
    </div>
  );
}
