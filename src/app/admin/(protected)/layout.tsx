'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { BarChart2, Coffee, ClipboardList, Layers, Users, LogOut, Menu, X } from 'lucide-react';

const NAV = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: BarChart2 },
  { href: '/admin/menu', label: 'Thực đơn', icon: Coffee },
  { href: '/admin/orders', label: 'Đơn hàng', icon: ClipboardList },
  { href: '/admin/toppings', label: 'Topping', icon: Layers },
  { href: '/admin/customers', label: 'Khách hàng', icon: Users },
];

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isAuth, setIsAuth] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (localStorage.getItem('admin_auth')) {
      setIsAuth(true);
    } else {
      router.replace('/admin');
    }
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('admin_auth');
    router.replace('/admin');
  };

  if (!isAuth) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const Sidebar = () => (
    <div className="flex flex-col h-full py-6 px-3">
      <div className="px-3 mb-8">
        <h1 className="font-bold text-orange-600 text-lg italic leading-tight">Hay là cà phê</h1>
        <p className="text-[10px] text-gray-400 uppercase tracking-widest mt-0.5">Admin Panel</p>
      </div>

      <nav className="flex-1 space-y-1">
        {NAV.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            onClick={() => setMobileOpen(false)}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
              pathname === href
                ? 'bg-orange-50 text-orange-600'
                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
            }`}
          >
            <Icon size={18} />
            {label}
          </Link>
        ))}
      </nav>

      <button
        onClick={handleLogout}
        className="flex items-center gap-2 px-3 py-2 text-sm text-gray-400 hover:text-red-500 transition-colors rounded-xl hover:bg-red-50"
      >
        <LogOut size={16} />
        Đăng xuất
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-56 bg-white border-r flex-col fixed h-full shadow-sm">
        <Sidebar />
      </aside>

      {/* Mobile top bar */}
      <header className="md:hidden fixed top-0 left-0 right-0 bg-white border-b z-50 flex items-center justify-between px-4 h-14 shadow-sm">
        <div>
          <span className="font-bold text-orange-600 text-base italic">Hay là cà phê</span>
          <span className="text-[9px] text-gray-400 uppercase tracking-widest ml-2">Admin</span>
        </div>
        <button onClick={() => setMobileOpen(!mobileOpen)} className="p-1 text-gray-600">
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </header>

      {/* Mobile drawer */}
      {mobileOpen && (
        <>
          <div
            className="md:hidden fixed inset-0 z-40 bg-black/40"
            onClick={() => setMobileOpen(false)}
          />
          <div className="md:hidden fixed top-0 left-0 bottom-0 w-60 bg-white z-50 shadow-2xl">
            <div className="pt-14">
              <Sidebar />
            </div>
          </div>
        </>
      )}

      {/* Main content */}
      <main className="flex-1 md:ml-56 pt-14 md:pt-0">
        <div className="p-4 md:p-8 max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
