import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Sidebar from './Sidebar';
import { FiMenu, FiLogOut, FiX } from 'react-icons/fi';

/* Map pathnames to readable page titles */
const pageTitles = {
  '/dashboard': 'Dashboard',
  '/products': 'Products',
  '/sales-orders': 'Sales Orders',
  '/purchase-orders': 'Purchase Orders',
  '/bill-of-materials': 'Bill of Materials',
  '/manufacturing': 'Manufacturing Orders',
  '/inventory': 'Inventory',
  '/vendors': 'Vendors',
  '/vendor-history': 'Vendor History',
  '/purchase-inventory': 'Inventory',
  '/audit-logs': 'Audit Logs',
};

const roleBadgeColors = {
  ADMIN: 'bg-purple-100 text-purple-700',
  BUSINESS_OWNER: 'bg-emerald-100 text-emerald-700',
  SALES_USER: 'bg-blue-100 text-blue-700',
  PURCHASE_USER: 'bg-amber-100 text-amber-700',
  MANUFACTURING_USER: 'bg-indigo-100 text-indigo-700',
  INVENTORY_MANAGER: 'bg-teal-100 text-teal-700',
  PRODUCT_MANAGER: 'bg-rose-100 text-rose-700',
};

const Layout = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  // Prevent body scroll when mobile sidebar is open
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  const currentTitle =
    pageTitles[location.pathname] ||
    pageTitles[
      Object.keys(pageTitles).find((key) =>
        location.pathname.startsWith(key + '/')
      )
    ] ||
    'Page';

  const roleLabel = user?.role?.replace(/_/g, ' ') || 'User';
  const badgeColor = roleBadgeColors[user?.role] || 'bg-gray-100 text-gray-700';

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* ─── Desktop sidebar ─── */}
      <div className="hidden lg:flex">
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed((prev) => !prev)}
        />
      </div>

      {/* ─── Mobile sidebar overlay ─── */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 flex lg:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 animate-fade-in"
            onClick={() => setMobileOpen(false)}
          />

          {/* Sidebar panel */}
          <div className="relative z-10 animate-slide-down w-64">
            <Sidebar collapsed={false} onToggle={() => setMobileOpen(false)} />
          </div>

          {/* Close button */}
          <button
            onClick={() => setMobileOpen(false)}
            className="absolute right-4 top-4 z-20 rounded-lg bg-slate-800 p-2 text-white"
          >
            <FiX className="h-5 w-5" />
          </button>
        </div>
      )}

      {/* ─── Main content area ─── */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top header bar */}
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-6 lg:px-8">
          {/* Left side — mobile menu + breadcrumb */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => setMobileOpen(true)}
              className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 lg:hidden"
            >
              <FiMenu className="h-5 w-5" />
            </button>

            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                {currentTitle}
              </h2>
            </div>
          </div>

          {/* Right side — user info + logout */}
          <div className="flex items-center gap-4">
            {/* User name & role */}
            <div className="hidden items-center gap-3 sm:flex">
              <div className="text-right">
                <p className="text-sm font-medium text-slate-700">
                  {user?.name || user?.email || 'User'}
                </p>
                <span
                  className={`inline-block mt-0.5 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${badgeColor}`}
                >
                  {roleLabel}
                </span>
              </div>

              {/* Avatar circle */}
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-100 text-sm font-bold text-primary-700">
                {(user?.name || user?.email || 'U').charAt(0).toUpperCase()}
              </div>
            </div>

            {/* Logout */}
            <button
              onClick={logout}
              title="Logout"
              className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500"
            >
              <FiLogOut className="h-5 w-5" />
            </button>
          </div>
        </header>

        {/* Scrollable content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
