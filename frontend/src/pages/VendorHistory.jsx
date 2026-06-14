import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  FiArrowLeft,
  FiBriefcase,
  FiUser,
  FiMail,
  FiPhone,
  FiMapPin,
  FiFileText,
  FiPackage,
  FiShoppingBag,
  FiTrendingUp,
  FiCheckCircle,
  FiXCircle,
  FiClock,
  FiChevronDown,
  FiChevronUp,
  FiSearch,
  FiFilter,
  FiRefreshCw,
} from 'react-icons/fi';
import { getVendors, getVendorHistory } from '../api/vendors';
import LoadingSpinner from '../components/LoadingSpinner';
import StatusBadge from '../components/StatusBadge';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (n) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(Number(n));

const fmtDate = (d) =>
  new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

const fmtTime = (d) =>
  new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

const orderTotal = (order) =>
  order.lines.reduce((sum, l) => sum + Number(l.unitCost) * l.qty, 0);

const STATUS_COLORS = {
  DRAFT:              { bg: 'bg-gray-100',   text: 'text-gray-600',   dot: 'bg-gray-400'   },
  CONFIRMED:          { bg: 'bg-blue-50',    text: 'text-blue-700',   dot: 'bg-blue-500'   },
  PARTIALLY_RECEIVED: { bg: 'bg-amber-50',   text: 'text-amber-700',  dot: 'bg-amber-500'  },
  FULLY_RECEIVED:     { bg: 'bg-emerald-50', text: 'text-emerald-700',dot: 'bg-emerald-500'},
  CANCELLED:          { bg: 'bg-red-50',     text: 'text-red-600',    dot: 'bg-red-400'    },
};

// ─── Status Pill ──────────────────────────────────────────────────────────────
const StatusPill = ({ status }) => {
  const c = STATUS_COLORS[status] || STATUS_COLORS.DRAFT;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${c.bg} ${c.text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${c.dot}`} />
      {status.replace(/_/g, ' ')}
    </span>
  );
};

// ─── Stat Card ────────────────────────────────────────────────────────────────
const StatCard = ({ icon: Icon, label, value, sub, accent }) => {
  const accents = {
    violet: 'from-violet-500 to-purple-600 shadow-violet-200',
    blue:   'from-blue-500 to-indigo-600 shadow-blue-200',
    emerald:'from-emerald-500 to-teal-600 shadow-emerald-200',
    amber:  'from-amber-500 to-orange-600 shadow-amber-200',
    red:    'from-red-500 to-rose-600 shadow-rose-200',
  };
  return (
    <div className="group relative overflow-hidden rounded-2xl bg-white border border-gray-100 p-5 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
          <p className="mt-1.5 text-2xl font-bold text-slate-900">{value}</p>
          {sub && <p className="mt-0.5 text-xs text-slate-500">{sub}</p>}
        </div>
        <div className={`flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${accents[accent]} shadow-lg`}>
          <Icon className="h-5 w-5 text-white" />
        </div>
      </div>
    </div>
  );
};

// ─── Expandable Order Row ─────────────────────────────────────────────────────
const OrderRow = ({ order, idx }) => {
  const [open, setOpen] = useState(false);
  const total = orderTotal(order);

  return (
    <>
      <tr
        className={`group cursor-pointer transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'} hover:bg-violet-50/40`}
        onClick={() => setOpen((p) => !p)}
      >
        {/* PO ID */}
        <td className="px-4 py-3.5 whitespace-nowrap">
          <span className="inline-flex items-center gap-1 rounded-lg bg-violet-100 px-2.5 py-0.5 text-xs font-bold text-violet-700 font-mono">
            PO-{order.id}
          </span>
        </td>
        {/* Date */}
        <td className="px-4 py-3.5 whitespace-nowrap">
          <p className="text-sm font-medium text-slate-700">{fmtDate(order.orderDate)}</p>
          <p className="text-[11px] text-slate-400">{fmtTime(order.createdAt)}</p>
        </td>
        {/* Status */}
        <td className="px-4 py-3.5 whitespace-nowrap">
          <StatusPill status={order.status} />
        </td>
        {/* Items */}
        <td className="px-4 py-3.5 whitespace-nowrap text-sm text-slate-600 text-center">
          {order.lines.length} item{order.lines.length !== 1 ? 's' : ''}
        </td>
        {/* Total */}
        <td className="px-4 py-3.5 whitespace-nowrap">
          <p className="text-sm font-bold text-slate-800">{fmt(total)}</p>
          {order.status !== 'CANCELLED' && (
            <p className="text-[11px] text-slate-400">
              Received: {fmt(order.lines.reduce((s, l) => s + Number(l.unitCost) * l.receivedQty, 0))}
            </p>
          )}
        </td>
        {/* Created By */}
        <td className="px-4 py-3.5 whitespace-nowrap text-xs text-slate-500">
          {order.createdBy?.name || order.createdBy?.email || '—'}
        </td>
        {/* Expand */}
        <td className="px-4 py-3.5 text-center">
          <button className="inline-flex items-center justify-center rounded-lg p-1 text-slate-400 hover:bg-violet-100 hover:text-violet-600 transition">
            {open ? <FiChevronUp className="h-4 w-4" /> : <FiChevronDown className="h-4 w-4" />}
          </button>
        </td>
      </tr>

      {/* Expanded Lines */}
      {open && (
        <tr>
          <td colSpan={7} className="px-0 py-0 bg-violet-50/30">
            <div className="border-t border-b border-violet-100 px-6 py-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-violet-600">
                Line Items — PO-{order.id}
              </p>
              <div className="overflow-x-auto rounded-xl border border-violet-100 bg-white shadow-sm">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-violet-50 bg-violet-50/50">
                      <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-violet-500">Product</th>
                      <th className="px-4 py-2.5 text-center text-[11px] font-semibold uppercase tracking-wide text-violet-500">SKU</th>
                      <th className="px-4 py-2.5 text-center text-[11px] font-semibold uppercase tracking-wide text-violet-500">Ordered</th>
                      <th className="px-4 py-2.5 text-center text-[11px] font-semibold uppercase tracking-wide text-violet-500">Received</th>
                      <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-violet-500">Unit Cost</th>
                      <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-violet-500">Line Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.lines.map((line, li) => (
                      <tr key={line.id} className={li % 2 === 0 ? '' : 'bg-slate-50/50'}>
                        <td className="px-4 py-2.5 font-medium text-slate-800">
                          {line.product?.name || `Product #${line.productId}`}
                        </td>
                        <td className="px-4 py-2.5 text-center font-mono text-xs text-slate-500">
                          {line.product?.sku || '—'}
                        </td>
                        <td className="px-4 py-2.5 text-center text-slate-700">{line.qty}</td>
                        <td className="px-4 py-2.5 text-center">
                          <span className={`font-semibold ${line.receivedQty >= line.qty ? 'text-emerald-600' : line.receivedQty > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
                            {line.receivedQty}
                          </span>
                          <span className="text-slate-300"> / {line.qty}</span>
                        </td>
                        <td className="px-4 py-2.5 text-right text-slate-700">{fmt(line.unitCost)}</td>
                        <td className="px-4 py-2.5 text-right font-semibold text-slate-800">
                          {fmt(Number(line.unitCost) * line.qty)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-violet-100 bg-violet-50/40">
                      <td colSpan={5} className="px-4 py-2.5 text-right text-xs font-bold uppercase tracking-wide text-violet-600">
                        Order Total
                      </td>
                      <td className="px-4 py-2.5 text-right text-sm font-extrabold text-violet-700">
                        {fmt(total)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
};

// ─── Vendor Selector ──────────────────────────────────────────────────────────
const VendorSelector = ({ vendors, selectedId, onChange }) => (
  <div className="relative">
    <FiBriefcase className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-violet-500" />
    <select
      id="vendor-selector"
      value={selectedId || ''}
      onChange={(e) => onChange(e.target.value)}
      className="appearance-none w-full rounded-xl border border-violet-200 bg-violet-50 pl-9 pr-10 py-2.5 text-sm font-medium text-slate-700 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100 transition cursor-pointer"
    >
      <option value="">— Select a Vendor —</option>
      {vendors.map((v) => (
        <option key={v.id} value={v.id}>{v.name}</option>
      ))}
    </select>
    <FiChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
  </div>
);

// ─── Main Page ────────────────────────────────────────────────────────────────
const VendorHistory = () => {
  const { id: urlId } = useParams();
  const navigate = useNavigate();

  const [vendors, setVendors] = useState([]);
  const [selectedId, setSelectedId] = useState(urlId || null);
  const [historyData, setHistoryData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [vendorsLoading, setVendorsLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Load vendor list
  useEffect(() => {
    (async () => {
      try {
        const res = await getVendors();
        setVendors(res.data.data || res.data);
      } catch {
        toast.error('Failed to load vendors.');
      } finally {
        setVendorsLoading(false);
      }
    })();
  }, []);

  // Load history when vendor changes
  const loadHistory = useCallback(async (vid) => {
    if (!vid) return;
    setLoading(true);
    setHistoryData(null);
    try {
      const res = await getVendorHistory(vid);
      setHistoryData(res.data.data);
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Failed to load vendor history.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedId) {
      navigate(`/vendor-history/${selectedId}`, { replace: true });
      loadHistory(selectedId);
    }
  }, [selectedId, loadHistory, navigate]);

  // Filtered orders
  const filteredOrders = historyData?.orders?.filter((o) => {
    const matchStatus = statusFilter === 'ALL' || o.status === statusFilter;
    const matchSearch =
      !searchTerm ||
      `PO-${o.id}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.lines.some((l) =>
        l.product?.name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    return matchStatus && matchSearch;
  }) || [];

  const { vendor, stats, productSummary } = historyData || {};

  return (
    <div className="space-y-6 pb-8">
      {/* ── Page Header ── */}
      <div className="rounded-3xl border border-gray-100 bg-white px-6 py-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/vendors')}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 bg-white text-slate-500 shadow-sm transition hover:bg-violet-50 hover:text-violet-600 hover:border-violet-200"
            >
              <FiArrowLeft className="h-4 w-4" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Vendor History</h1>
              <p className="text-sm text-slate-500">
                Complete purchase transaction history &amp; analytics per vendor
              </p>
            </div>
          </div>

          {/* Vendor Picker */}
          <div className="flex items-center gap-3">
            {vendorsLoading ? (
              <LoadingSpinner size={18} />
            ) : (
              <div className="w-64">
                <VendorSelector
                  vendors={vendors}
                  selectedId={selectedId}
                  onChange={setSelectedId}
                />
              </div>
            )}
            {selectedId && (
              <button
                onClick={() => loadHistory(selectedId)}
                title="Refresh"
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 text-slate-500 transition hover:bg-violet-50 hover:text-violet-600 hover:border-violet-200"
              >
                <FiRefreshCw className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Empty / No Selection ── */}
      {!selectedId && (
        <div className="flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-gray-200 bg-white py-20 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-100 text-violet-500 mb-4">
            <FiBriefcase className="h-8 w-8" />
          </div>
          <h3 className="text-lg font-semibold text-slate-700">Select a Vendor</h3>
          <p className="mt-1 text-sm text-slate-400 max-w-sm">
            Choose a vendor from the dropdown above to view their complete purchase history and analytics.
          </p>
        </div>
      )}

      {/* ── Loading ── */}
      {selectedId && loading && (
        <div className="flex items-center justify-center py-20">
          <LoadingSpinner fullPage={false} />
        </div>
      )}

      {/* ── Vendor Content ── */}
      {!loading && historyData && (
        <>
          {/* ── Vendor Profile Card ── */}
          <div className="rounded-3xl border border-gray-100 bg-white shadow-sm overflow-hidden">
            {/* Gradient Banner */}
            <div className="h-24 bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 relative">
              <div className="absolute inset-0 opacity-20"
                style={{backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)', backgroundSize: '30px 30px'}}
              />
            </div>

            <div className="px-6 pb-6">
              <div className="flex flex-wrap items-end justify-between gap-4 -mt-8">
                {/* Avatar */}
                <div className="flex items-end gap-4">
                  <div className="flex h-20 w-20 items-center justify-center rounded-2xl border-4 border-white bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg text-white shrink-0">
                    <FiBriefcase className="h-9 w-9" />
                  </div>
                  <div className="mb-1">
                    <h2 className="text-xl font-bold text-slate-900">{vendor.name}</h2>
                    {vendor.gstNumber && (
                      <p className="font-mono text-xs text-slate-500 mt-0.5">
                        GST: <span className="text-slate-700">{vendor.gstNumber}</span>
                      </p>
                    )}
                    {vendor.companyRegNo && (
                      <p className="font-mono text-xs text-slate-400">
                        Reg: {vendor.companyRegNo}
                      </p>
                    )}
                  </div>
                </div>

                {/* Contact Details */}
                <div className="flex flex-wrap gap-4 text-sm text-slate-600 mb-1">
                  {vendor.contact && (
                    <div className="flex items-center gap-1.5">
                      <FiUser className="h-3.5 w-3.5 text-violet-400" />
                      {vendor.contact}
                    </div>
                  )}
                  {vendor.email && (
                    <a href={`mailto:${vendor.email}`} className="flex items-center gap-1.5 hover:text-violet-600 transition">
                      <FiMail className="h-3.5 w-3.5 text-violet-400" />
                      {vendor.email}
                    </a>
                  )}
                  {vendor.phone && (
                    <div className="flex items-center gap-1.5">
                      <FiPhone className="h-3.5 w-3.5 text-violet-400" />
                      {vendor.phone}
                    </div>
                  )}
                  {vendor.address && (
                    <div className="flex items-center gap-1.5 max-w-xs truncate">
                      <FiMapPin className="h-3.5 w-3.5 text-violet-400 shrink-0" />
                      <span className="truncate">{vendor.address}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ── Stats Grid ── */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            <StatCard
              icon={FiShoppingBag}
              label="Total Orders"
              value={stats.totalOrders}
              sub={`${stats.activeOrders} active`}
              accent="violet"
            />
            <StatCard
              icon={FiTrendingUp}
              label="Total Purchases"
              value={fmt(stats.totalAmount)}
              sub="Excl. cancelled"
              accent="blue"
            />
            <StatCard
              icon={FiCheckCircle}
              label="Amount Received"
              value={fmt(stats.totalReceivedAmount)}
              sub={`${Math.round((Number(stats.totalReceivedAmount) / (Number(stats.totalAmount) || 1)) * 100)}% fulfilled`}
              accent="emerald"
            />
            <StatCard
              icon={FiPackage}
              label="Products Supplied"
              value={stats.totalProducts}
              sub="Linked products"
              accent="amber"
            />
            <StatCard
              icon={FiXCircle}
              label="Cancelled Orders"
              value={stats.cancelledOrders}
              sub={`${stats.totalOrders - stats.cancelledOrders} completed`}
              accent="red"
            />
          </div>

          {/* ── Product Purchase Summary ── */}
          {productSummary?.length > 0 && (
            <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
                  <FiPackage className="h-4 w-4" />
                </div>
                <h3 className="text-base font-bold text-slate-900">Products Purchased</h3>
                <span className="ml-auto text-xs text-slate-400">{productSummary.length} product{productSummary.length !== 1 ? 's' : ''}</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="pb-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-400">Product</th>
                      <th className="pb-2.5 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-400">SKU</th>
                      <th className="pb-2.5 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-400">Orders</th>
                      <th className="pb-2.5 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-400">Qty Ordered</th>
                      <th className="pb-2.5 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-400">Qty Received</th>
                      <th className="pb-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-slate-400">Total Spent</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {productSummary.map((ps, i) => {
                      const fillPct = ps.totalQtyOrdered > 0
                        ? Math.round((ps.totalQtyReceived / ps.totalQtyOrdered) * 100)
                        : 0;
                      return (
                        <tr key={i} className="group hover:bg-amber-50/40 transition-colors">
                          <td className="py-3 pr-4">
                            <p className="font-semibold text-slate-800">{ps.product?.name}</p>
                            <p className="text-[11px] text-slate-400">{ps.product?.category}</p>
                          </td>
                          <td className="py-3 px-2 text-center font-mono text-xs text-slate-500">
                            {ps.product?.sku || '—'}
                          </td>
                          <td className="py-3 px-2 text-center">
                            <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-amber-100 text-xs font-bold text-amber-700">
                              {ps.orderCount}
                            </span>
                          </td>
                          <td className="py-3 px-2 text-center font-medium text-slate-700">{ps.totalQtyOrdered}</td>
                          <td className="py-3 px-2 text-center">
                            <div className="flex flex-col items-center gap-1">
                              <span className={`font-semibold text-sm ${fillPct >= 100 ? 'text-emerald-600' : fillPct > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
                                {ps.totalQtyReceived}
                              </span>
                              {/* Progress bar */}
                              <div className="w-16 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all ${fillPct >= 100 ? 'bg-emerald-500' : fillPct > 0 ? 'bg-amber-400' : 'bg-gray-300'}`}
                                  style={{ width: `${Math.min(fillPct, 100)}%` }}
                                />
                              </div>
                              <span className="text-[10px] text-slate-400">{fillPct}%</span>
                            </div>
                          </td>
                          <td className="py-3 pl-4 text-right font-bold text-slate-800">{fmt(ps.totalAmount)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  {/* Footer total */}
                  <tfoot>
                    <tr className="border-t-2 border-amber-100">
                      <td colSpan={5} className="pt-3 text-right text-xs font-bold uppercase tracking-wide text-amber-600">
                        Grand Total
                      </td>
                      <td className="pt-3 pl-4 text-right text-base font-extrabold text-amber-700">
                        {fmt(productSummary.reduce((s, p) => s + p.totalAmount, 0))}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* ── Transaction History ── */}
          <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100 text-violet-600">
                  <FiFileText className="h-4 w-4" />
                </div>
                <h3 className="text-base font-bold text-slate-900">Transaction History</h3>
                <span className="text-xs text-slate-400">
                  ({filteredOrders.length} of {historyData.orders.length})
                </span>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-3">
                {/* Search */}
                <div className="relative">
                  <FiSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <input
                    id="history-search"
                    type="text"
                    placeholder="Search PO or product…"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-48 rounded-xl border border-gray-200 bg-slate-50 pl-8 pr-3 py-2 text-xs outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition"
                  />
                </div>

                {/* Status filter */}
                <div className="relative">
                  <FiFilter className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <select
                    id="status-filter"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="appearance-none rounded-xl border border-gray-200 bg-slate-50 pl-8 pr-8 py-2 text-xs font-medium text-slate-600 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition cursor-pointer"
                  >
                    <option value="ALL">All Statuses</option>
                    <option value="DRAFT">Draft</option>
                    <option value="CONFIRMED">Confirmed</option>
                    <option value="PARTIALLY_RECEIVED">Partially Received</option>
                    <option value="FULLY_RECEIVED">Fully Received</option>
                    <option value="CANCELLED">Cancelled</option>
                  </select>
                  <FiChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400" />
                </div>
              </div>
            </div>

            {filteredOrders.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-400 mb-3">
                  <FiClock className="h-6 w-6" />
                </div>
                <p className="text-sm font-medium text-slate-500">No transactions found</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {historyData.orders.length === 0
                    ? 'This vendor has no purchase orders yet.'
                    : 'Try adjusting your search or status filter.'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-gray-100">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-slate-50">
                      <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-400">PO #</th>
                      <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-400">Date</th>
                      <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-400">Status</th>
                      <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-400">Items</th>
                      <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-400">Amount</th>
                      <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-400">Created By</th>
                      <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-400">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredOrders.map((order, idx) => (
                      <OrderRow key={order.id} order={order} idx={idx} />
                    ))}
                  </tbody>
                  {/* Summary footer */}
                  <tfoot>
                    <tr className="border-t-2 border-violet-100 bg-violet-50/40">
                      <td colSpan={4} className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wide text-violet-600">
                        Showing {filteredOrders.length} order{filteredOrders.length !== 1 ? 's' : ''} — Total
                      </td>
                      <td className="px-4 py-3 text-left text-sm font-extrabold text-violet-700">
                        {fmt(filteredOrders.filter(o => o.status !== 'CANCELLED').reduce((s, o) => s + orderTotal(o), 0))}
                      </td>
                      <td colSpan={2} />
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default VendorHistory;
