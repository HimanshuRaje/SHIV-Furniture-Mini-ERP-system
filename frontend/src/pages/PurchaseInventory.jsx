import { useEffect, useState, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';
import {
  FiBox,
  FiSearch,
  FiFilter,
  FiChevronDown,
  FiRefreshCw,
  FiCheckCircle,
  FiXCircle,
  FiAlertTriangle,
  FiBarChart2,
  FiPackage,
  FiEdit3,
  FiCheck,
  FiX,
} from 'react-icons/fi';
import { getProducts, updateProduct } from '../api/products';
import LoadingSpinner from '../components/LoadingSpinner';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (n) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(Number(n) || 0);

// ─── Stock Status Logic ───────────────────────────────────────────────────────
const getStockStatus = (product) => {
  const available = (product.onHandQty || 0) - (product.reservedQty || 0);
  if (product.status === 'Inactive')              return { label: 'Inactive',   color: 'gray'    };
  if (available <= 0)                             return { label: 'Unavailable', color: 'red'    };
  if (available <= (product.reorderPoint || 5))   return { label: 'Low Stock',  color: 'amber'   };
  return                                                 { label: 'Available',  color: 'emerald' };
};

const PILL_STYLES = {
  Available:   { pill: 'bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500', bar: 'bg-emerald-500' },
  'Low Stock': { pill: 'bg-amber-50  text-amber-700',   dot: 'bg-amber-400',   bar: 'bg-amber-400'   },
  Unavailable: { pill: 'bg-red-50    text-red-700',     dot: 'bg-red-500',     bar: 'bg-red-500'     },
  Inactive:    { pill: 'bg-gray-100  text-gray-500',    dot: 'bg-gray-400',    bar: 'bg-gray-400'    },
};

// ─── Status Pill ──────────────────────────────────────────────────────────────
const StockPill = ({ status }) => {
  const s = PILL_STYLES[status] || PILL_STYLES.Unavailable;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${s.pill}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {status}
    </span>
  );
};

// ─── Stat Card ────────────────────────────────────────────────────────────────
const StatCard = ({ label, value, sub, icon: Icon, accent }) => {
  const gradients = {
    blue:    'from-blue-500    to-indigo-600  shadow-blue-200',
    emerald: 'from-emerald-500 to-teal-600   shadow-emerald-200',
    amber:   'from-amber-500   to-orange-500  shadow-amber-200',
    red:     'from-red-500     to-rose-600    shadow-rose-200',
  };
  return (
    <div className="group relative overflow-hidden rounded-2xl bg-white border border-gray-100 p-5 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
          <p className="mt-1.5 text-2xl font-bold text-slate-900">{value}</p>
          {sub && <p className="mt-0.5 text-xs text-slate-500">{sub}</p>}
        </div>
        <div className={`flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${gradients[accent]} shadow-lg`}>
          <Icon className="h-5 w-5 text-white" />
        </div>
      </div>
    </div>
  );
};

// ─── Inline Editable Cell ─────────────────────────────────────────────────────
/**
 * Renders a badge that turns into an <input> on click.
 * Calls onSave(newValue) when the user presses Enter or blurs.
 * Pressing Escape cancels without saving.
 */
const EditableCell = ({ value, onSave, badgeClass, min = 0, saving }) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft]     = useState(String(value));
  const inputRef              = useRef(null);

  // Focus input when entering edit mode
  useEffect(() => {
    if (editing) {
      inputRef.current?.select();
    }
  }, [editing]);

  const startEdit = () => {
    if (saving) return;
    setDraft(String(value));
    setEditing(true);
  };

  const commit = () => {
    const parsed = parseInt(draft, 10);
    if (isNaN(parsed) || parsed < min) {
      toast.error(`Value must be ≥ ${min}`);
      setDraft(String(value));
      setEditing(false);
      return;
    }
    setEditing(false);
    if (parsed !== value) onSave(parsed);
  };

  const cancel = () => {
    setDraft(String(value));
    setEditing(false);
  };

  const handleKey = (e) => {
    if (e.key === 'Enter')  { e.preventDefault(); commit(); }
    if (e.key === 'Escape') { cancel(); }
  };

  if (editing) {
    return (
      <div className="flex items-center justify-center gap-1">
        <input
          ref={inputRef}
          type="number"
          min={min}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={handleKey}
          className="w-16 rounded-lg border-2 border-blue-400 bg-white px-2 py-1 text-center text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-100 shadow-sm"
          autoFocus
        />
        <button
          onMouseDown={(e) => { e.preventDefault(); commit(); }}
          className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 hover:bg-emerald-200 transition"
        >
          <FiCheck className="h-3 w-3" />
        </button>
        <button
          onMouseDown={(e) => { e.preventDefault(); cancel(); }}
          className="flex h-5 w-5 items-center justify-center rounded-full bg-red-50 text-red-500 hover:bg-red-100 transition"
        >
          <FiX className="h-3 w-3" />
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={startEdit}
      disabled={saving}
      title="Click to edit"
      className={`group/cell inline-flex items-center justify-center gap-1 rounded-lg px-2 h-7 min-w-[2.5rem] text-sm font-bold transition hover:ring-2 hover:ring-blue-300 hover:ring-offset-1 active:scale-95 disabled:opacity-60 ${badgeClass}`}
    >
      {value}
      <FiEdit3 className="h-2.5 w-2.5 opacity-0 group-hover/cell:opacity-60 transition-opacity" />
    </button>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────
const PurchaseInventory = () => {
  const [products, setProducts]       = useState([]);
  const [loading, setLoading]         = useState(true);
  const [savingId, setSavingId]       = useState(null); // productId currently saving
  const [search, setSearch]           = useState('');
  const [statusFilter, setFilter]     = useState('ALL');
  const [categoryFilter, setCategory] = useState('ALL');

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getProducts();
      setProducts(res.data.data || res.data);
    } catch {
      toast.error('Failed to load products.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // ── Inline save handler ──────────────────────────────────────────────────
  const handleFieldSave = useCallback(async (productId, field, newValue) => {
    // Optimistic local update
    setProducts((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, [field]: newValue } : p))
    );
    setSavingId(productId);
    try {
      await updateProduct(productId, { [field]: newValue });
      toast.success(
        `${field === 'onHandQty' ? 'On-hand' : field === 'reservedQty' ? 'Reserved' : 'Reorder point'} updated.`
      );
    } catch (err) {
      // Roll back on error
      toast.error(err?.response?.data?.error || 'Failed to update.');
      fetchProducts();
    } finally {
      setSavingId(null);
    }
  }, [fetchProducts]);

  // Dynamic category list
  const categories = [
    'ALL',
    ...Array.from(new Set(products.map((p) => p.category).filter(Boolean))),
  ];

  const filtered = products.filter((p) => {
    const status = getStockStatus(p);
    const matchStatus   = statusFilter === 'ALL' || status.label === statusFilter;
    const matchCategory = categoryFilter === 'ALL' || p.category === categoryFilter;
    const matchSearch   =
      !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku?.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchCategory && matchSearch;
  });

  const counts = {
    total:       products.length,
    available:   products.filter((p) => getStockStatus(p).label === 'Available').length,
    low:         products.filter((p) => getStockStatus(p).label === 'Low Stock').length,
    unavailable: products.filter((p) => getStockStatus(p).label === 'Unavailable').length,
  };
  const totalOnHand   = products.reduce((s, p) => s + (p.onHandQty   || 0), 0);
  const totalReserved = products.reduce((s, p) => s + (p.reservedQty || 0), 0);

  return (
    <div className="space-y-6 pb-8">
      {/* ── Header ── */}
      <div className="rounded-3xl border border-gray-100 bg-white px-6 py-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Inventory</h1>
            <p className="text-sm text-slate-500">
              Monitor stock levels and click any value to edit on-hand, reserved, or reorder point.
            </p>
          </div>
          <button
            onClick={fetchProducts}
            title="Refresh"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 text-slate-500 transition hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200"
          >
            <FiRefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard
          label="Total Products"
          value={counts.total}
          sub={`${totalOnHand} on-hand · ${totalReserved} reserved`}
          icon={FiBox}
          accent="blue"
        />
        <StatCard
          label="Available"
          value={counts.available}
          sub={`${totalOnHand - totalReserved} units free`}
          icon={FiCheckCircle}
          accent="emerald"
        />
        <StatCard
          label="Low Stock"
          value={counts.low}
          sub="Below reorder point"
          icon={FiAlertTriangle}
          accent="amber"
        />
        <StatCard
          label="Unavailable"
          value={counts.unavailable}
          sub="Zero stock available"
          icon={FiXCircle}
          accent="red"
        />
      </div>

      {/* ── Stock Table ── */}
      <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
        {/* Toolbar */}
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
              <FiBarChart2 className="h-4 w-4" />
            </div>
            <h2 className="text-base font-bold text-slate-900">Stock Overview</h2>
            <span className="text-xs text-slate-400">
              ({filtered.length} of {products.length})
            </span>
            {/* Edit hint */}
            <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-[10px] font-semibold text-blue-500">
              <FiEdit3 className="h-2.5 w-2.5" /> Click a value to edit
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Search */}
            <div className="relative">
              <FiSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                id="inv-search"
                type="text"
                placeholder="Search product or SKU…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-48 rounded-xl border border-gray-200 bg-slate-50 pl-8 pr-3 py-2 text-xs outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition"
              />
            </div>

            {/* Category */}
            <div className="relative">
              <FiFilter className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <select
                id="inv-category"
                value={categoryFilter}
                onChange={(e) => setCategory(e.target.value)}
                className="appearance-none rounded-xl border border-gray-200 bg-slate-50 pl-8 pr-7 py-2 text-xs font-medium text-slate-600 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition cursor-pointer"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c === 'ALL' ? 'All Categories' : c}
                  </option>
                ))}
              </select>
              <FiChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400" />
            </div>

            {/* Status filter pills */}
            <div className="flex items-center gap-1 rounded-xl border border-gray-200 bg-slate-50 p-1">
              {['ALL', 'Available', 'Low Stock', 'Unavailable'].map((s) => (
                <button
                  key={s}
                  onClick={() => setFilter(s)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                    statusFilter === s
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <LoadingSpinner fullPage={false} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-400 mb-3">
              <FiPackage className="h-6 w-6" />
            </div>
            <p className="text-sm font-medium text-slate-500">No products found</p>
            <p className="text-xs text-slate-400 mt-0.5">Try adjusting your search or filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-gray-100">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-slate-50">
                  <th className="px-4 py-3 text-left   text-[11px] font-semibold uppercase tracking-wide text-slate-400">Product</th>
                  <th className="px-4 py-3 text-left   text-[11px] font-semibold uppercase tracking-wide text-slate-400">SKU</th>
                  <th className="px-4 py-3 text-left   text-[11px] font-semibold uppercase tracking-wide text-slate-400">Category</th>
                  <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wide text-blue-400">
                    On Hand ✎
                  </th>
                  <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wide text-amber-400">
                    Reserved ✎
                  </th>
                  <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-400">Available</th>
                  <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    Reorder Pt. ✎
                  </th>
                  <th className="px-4 py-3 text-left   text-[11px] font-semibold uppercase tracking-wide text-slate-400">Status</th>
                  <th className="px-4 py-3 text-right  text-[11px] font-semibold uppercase tracking-wide text-slate-400">Cost Price</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((p, i) => {
                  const stockStatus = getStockStatus(p);
                  const available   = (p.onHandQty || 0) - (p.reservedQty || 0);
                  const maxQty      = Math.max(p.onHandQty || 0, 1);
                  const fillPct     = Math.min(Math.round((Math.max(available, 0) / maxQty) * 100), 100);
                  const barStyle    = PILL_STYLES[stockStatus.label];
                  const isSaving    = savingId === p.id;

                  return (
                    <tr
                      key={p.id}
                      className={`group transition-colors hover:bg-blue-50/20 ${
                        i % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'
                      } ${isSaving ? 'opacity-70' : ''}`}
                    >
                      {/* Product */}
                      <td className="px-4 py-3.5">
                        <p className="font-semibold text-slate-800">{p.name}</p>
                        <p className="text-[11px] text-slate-400">{p.type || 'Standard'}</p>
                      </td>

                      {/* SKU */}
                      <td className="px-4 py-3.5">
                        <span className="font-mono text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                          {p.sku || '—'}
                        </span>
                      </td>

                      {/* Category */}
                      <td className="px-4 py-3.5 text-xs text-slate-600">{p.category || '—'}</td>

                      {/* ── On Hand (editable) ── */}
                      <td className="px-4 py-3.5 text-center">
                        <EditableCell
                          value={p.onHandQty || 0}
                          onSave={(v) => handleFieldSave(p.id, 'onHandQty', v)}
                          badgeClass="bg-blue-50 text-blue-700"
                          min={0}
                          saving={isSaving}
                        />
                      </td>

                      {/* ── Reserved (editable) ── */}
                      <td className="px-4 py-3.5 text-center">
                        <EditableCell
                          value={p.reservedQty || 0}
                          onSave={(v) => handleFieldSave(p.id, 'reservedQty', v)}
                          badgeClass={(p.reservedQty || 0) > 0 ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-400'}
                          min={0}
                          saving={isSaving}
                        />
                      </td>

                      {/* Available (read-only, derived) */}
                      <td className="px-4 py-3.5 text-center">
                        <div className="flex flex-col items-center gap-1.5">
                          <span className={`inline-flex items-center justify-center h-7 min-w-[2rem] rounded-lg px-2 text-sm font-bold ${
                            available > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
                          }`}>
                            {available}
                          </span>
                          <div className="w-14 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${barStyle?.bar || 'bg-gray-300'}`}
                              style={{ width: `${fillPct}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* ── Reorder Point (editable) ── */}
                      <td className="px-4 py-3.5 text-center">
                        <EditableCell
                          value={p.reorderPoint ?? 0}
                          onSave={(v) => handleFieldSave(p.id, 'reorderPoint', v)}
                          badgeClass="bg-slate-100 text-slate-600"
                          min={0}
                          saving={isSaving}
                        />
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5">
                        <StockPill status={stockStatus.label} />
                      </td>

                      {/* Cost Price */}
                      <td className="px-4 py-3.5 text-right font-semibold text-slate-800">
                        {fmt(p.costPrice)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>

              {/* Footer totals */}
              <tfoot>
                <tr className="border-t-2 border-blue-100 bg-blue-50/50">
                  <td colSpan={3} className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wide text-blue-500">
                    Totals — {filtered.length} product{filtered.length !== 1 ? 's' : ''}
                  </td>
                  <td className="px-4 py-3 text-center font-extrabold text-blue-700">
                    {filtered.reduce((s, p) => s + (p.onHandQty || 0), 0)}
                  </td>
                  <td className="px-4 py-3 text-center font-extrabold text-amber-600">
                    {filtered.reduce((s, p) => s + (p.reservedQty || 0), 0)}
                  </td>
                  <td className="px-4 py-3 text-center font-extrabold text-emerald-600">
                    {filtered.reduce((s, p) => s + Math.max((p.onHandQty || 0) - (p.reservedQty || 0), 0), 0)}
                  </td>
                  <td colSpan={3} />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default PurchaseInventory;
