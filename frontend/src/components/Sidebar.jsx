import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  FiHome,
  FiPackage,
  FiShoppingCart,
  FiTruck,
  FiLayers,
  FiSettings,
  FiBox,
  FiUsers,
  FiClipboard,
  FiChevronLeft,
  FiChevronRight,
  FiClock,
} from 'react-icons/fi';

const navItems = [
  {
    label: 'Dashboard',
    path: '/dashboard',
    icon: FiHome,
    roles: ['ADMIN', 'BUSINESS_OWNER'],
  },
  {
    label: 'Products',
    path: '/products',
    icon: FiPackage,
    roles: ['ADMIN', 'PRODUCT_MANAGER', 'PURCHASE_USER', 'SALES_USER'],
  },
  {
    label: 'Sales Orders',
    path: '/sales-orders',
    icon: FiShoppingCart,
    roles: ['ADMIN', 'SALES_USER', 'BUSINESS_OWNER'],
  },
  {
    label: 'Purchase Orders',
    path: '/purchase-orders',
    icon: FiTruck,
    roles: ['ADMIN', 'PURCHASE_USER', 'BUSINESS_OWNER'],
  },
  {
    label: 'Bill of Materials',
    path: '/bill-of-materials',
    icon: FiLayers,
    roles: ['ADMIN', 'MANUFACTURING_USER', 'BUSINESS_OWNER'],
  },
  {
    label: 'Manufacturing',
    path: '/manufacturing',
    icon: FiSettings,
    roles: ['ADMIN', 'MANUFACTURING_USER', 'BUSINESS_OWNER'],
  },
  {
    label: 'Vendors',
    path: '/vendors',
    icon: FiUsers,
    roles: ['ADMIN', 'PURCHASE_USER', 'BUSINESS_OWNER'],
  },
  {
    label: 'Vendor History',
    path: '/vendor-history',
    icon: FiClock,
    roles: ['ADMIN', 'PURCHASE_USER', 'BUSINESS_OWNER'],
  },
  {
    label: 'Inventory',
    path: '/purchase-inventory',
    icon: FiBox,
    roles: ['ADMIN', 'PURCHASE_USER', 'BUSINESS_OWNER'],
  },
  {
    label: 'Audit Logs',
    path: '/audit-logs',
    icon: FiClipboard,
    roles: ['ADMIN'],
  },
];

const Sidebar = ({ collapsed, onToggle }) => {
  const { pathname } = useLocation();
  const { hasRole } = useAuth();

  const filteredItems = navItems.filter(
    (item) => item.roles === null || hasRole(item.roles)
  );

  return (
    <aside
      className={`flex h-full flex-col bg-slate-900 transition-all duration-300 ease-in-out ${
        collapsed ? 'w-[72px]' : 'w-64'
      }`}
    >
      {/* Brand */}
      <div className="flex h-16 items-center gap-3 border-b border-slate-700/50 px-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-500 text-white">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            className="h-5 w-5"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {/* Simple chair / furniture icon */}
            <path d="M5 12V6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v6" />
            <path d="M3 12h18v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2z" />
            <path d="M5 16v4" />
            <path d="M19 16v4" />
          </svg>
        </div>
        {!collapsed && (
          <div className="overflow-hidden whitespace-nowrap animate-fade-in">
            <h1 className="text-sm font-bold text-white tracking-wide">
              Shiv Furniture
            </h1>
            <p className="text-[11px] text-slate-400">ERP System</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="mt-4 flex-1 space-y-1 overflow-y-auto px-3">
        {filteredItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.path || pathname.startsWith(item.path + '/');

          return (
            <Link
              key={item.path}
              to={item.path}
              title={collapsed ? item.label : undefined}
              className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-primary-500/15 text-primary-400 shadow-sm shadow-primary-500/10'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Icon
                className={`h-[18px] w-[18px] shrink-0 transition-colors duration-200 ${
                  isActive
                    ? 'text-primary-400'
                    : 'text-slate-500 group-hover:text-white'
                }`}
              />
              {!collapsed && (
                <span className="truncate">{item.label}</span>
              )}

              {/* Active indicator bar */}
              {isActive && (
                <span className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-primary-400" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Collapse toggle */}
      <div className="border-t border-slate-700/50 p-3">
        <button
          onClick={onToggle}
          className="flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
        >
          {collapsed ? (
            <FiChevronRight className="h-4 w-4" />
          ) : (
            <>
              <FiChevronLeft className="h-4 w-4" />
              <span>Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
