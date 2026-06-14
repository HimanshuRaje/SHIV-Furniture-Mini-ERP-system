import React, { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
  FiPlus, FiEdit2, FiTrash2, FiChevronDown, FiChevronRight,
  FiX, FiPackage, FiLayers, FiZap, FiSearch, FiClock,
  FiCheckCircle, FiAlertTriangle,
} from 'react-icons/fi';
import { getBOMs, createBOM, updateBOM, deleteBOM } from '../api/bom';
import { getProducts } from '../api/products';
import LoadingSpinner from '../components/LoadingSpinner';
import ConfirmDialog from '../components/ConfirmDialog';
import { useAuth } from '../context/AuthContext';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const formatDate = (v) =>
  v ? new Date(v).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '-';

const EMPTY_COMP = { componentProductId: '', qty: 1 };
const EMPTY_OP   = { name: '', durationMins: 30, workCenter: '' };

// ─── Component Availability Badge ─────────────────────────────────────────────
const AvailBadge = ({ product }) => {
  if (!product) return <span className="text-slate-400">—</span>;
  const free = (product.onHandQty || 0) - (product.reservedQty || 0);
  if (free <= 0)  return <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-600"><FiAlertTriangle className="h-3 w-3" /> Out of stock</span>;
  if (free <= 5)  return <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600"><FiAlertTriangle className="h-3 w-3" /> Low ({free})</span>;
  return              <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600"><FiCheckCircle className="h-3 w-3" /> {free} avail.</span>;
};

// ─── Expanded Row: Component Breakdown ────────────────────────────────────────
const BomExpandedRow = ({ bom }) => {
  const colCount = 7;
  return (
    <tr className="bg-slate-50/80">
      <td colSpan={colCount} className="px-6 py-0">
        <div className="py-4 space-y-4">
          {/* Components */}
          {bom.components?.length > 0 && (
            <div>
              <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-500">
                <FiPackage className="h-3.5 w-3.5" /> Components
              </p>
              <div className="overflow-x-auto rounded-xl border border-gray-100">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-white border-b border-gray-100">
                      <th className="px-3 py-2 text-left font-semibold text-slate-400 uppercase tracking-wide">Material</th>
                      <th className="px-3 py-2 text-left font-semibold text-slate-400 uppercase tracking-wide">SKU</th>
                      <th className="px-3 py-2 text-center font-semibold text-slate-400 uppercase tracking-wide">Qty / Unit</th>
                      <th className="px-3 py-2 text-center font-semibold text-slate-400 uppercase tracking-wide">On Hand</th>
                      <th className="px-3 py-2 text-left font-semibold text-slate-400 uppercase tracking-wide">Availability</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {bom.components.map((c) => (
                      <tr key={c.id} className="bg-white hover:bg-blue-50/30 transition-colors">
                        <td className="px-3 py-2.5 font-medium text-slate-800">{c.componentProduct?.name || '-'}</td>
                        <td className="px-3 py-2.5 font-mono text-slate-500 bg-slate-50 rounded">{c.componentProduct?.sku || '—'}</td>
                        <td className="px-3 py-2.5 text-center">
                          <span className="inline-flex items-center justify-center h-6 min-w-[2rem] rounded-md bg-blue-100 px-2 font-bold text-blue-700">
                            {c.qty}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <span className="font-semibold text-slate-700">{c.componentProduct?.onHandQty ?? '—'}</span>
                        </td>
                        <td className="px-3 py-2.5">
                          <AvailBadge product={c.componentProduct} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Operations */}
          {bom.operations?.length > 0 && (
            <div>
              <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-500">
                <FiZap className="h-3.5 w-3.5" /> Operations
              </p>
              <div className="overflow-x-auto rounded-xl border border-gray-100">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-white border-b border-gray-100">
                      <th className="px-3 py-2 text-left font-semibold text-slate-400 uppercase tracking-wide">Operation</th>
                      <th className="px-3 py-2 text-center font-semibold text-slate-400 uppercase tracking-wide">Duration</th>
                      <th className="px-3 py-2 text-left font-semibold text-slate-400 uppercase tracking-wide">Work Center</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {bom.operations.map((op) => (
                      <tr key={op.id} className="bg-white hover:bg-blue-50/30 transition-colors">
                        <td className="px-3 py-2.5 font-medium text-slate-800">{op.name}</td>
                        <td className="px-3 py-2.5 text-center">
                          <span className="inline-flex items-center gap-1 text-slate-600">
                            <FiClock className="h-3 w-3 text-slate-400" />
                            {op.durationMins} min
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-slate-600">{op.workCenter || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {!bom.components?.length && !bom.operations?.length && (
            <p className="text-xs text-slate-400 italic">No components or operations defined.</p>
          )}
        </div>
      </td>
    </tr>
  );
};

// ─── Create / Edit Modal ───────────────────────────────────────────────────────
const BomModal = ({ isOpen, onClose, bom, products, onSaved }) => {
  const isEdit = Boolean(bom);

  const [productId,   setProductId]   = useState('');
  const [notes,       setNotes]       = useState('');
  const [components,  setComponents]  = useState([{ ...EMPTY_COMP }]);
  const [operations,  setOperations]  = useState([]);
  const [saving,      setSaving]      = useState(false);
  const [search,      setSearch]      = useState('');

  useEffect(() => {
    if (!isOpen) return;
    if (bom) {
      setProductId(String(bom.productId || ''));
      setNotes(bom.notes || '');
      setComponents(
        bom.components?.length
          ? bom.components.map((c) => ({ componentProductId: String(c.componentProductId), qty: c.qty }))
          : [{ ...EMPTY_COMP }]
      );
      setOperations(
        bom.operations?.map((o) => ({ name: o.name, durationMins: o.durationMins, workCenter: o.workCenter || '' })) || []
      );
    } else {
      setProductId(''); setNotes('');
      setComponents([{ ...EMPTY_COMP }]);
      setOperations([]);
    }
    setSearch('');
  }, [isOpen, bom]);

  // Component handlers
  const updateComp = (idx, field, val) =>
    setComponents((prev) => prev.map((c, i) => (i === idx ? { ...c, [field]: val } : c)));
  const addComp    = () => setComponents((prev) => [...prev, { ...EMPTY_COMP }]);
  const removeComp = (idx) => { if (components.length > 1) setComponents((prev) => prev.filter((_, i) => i !== idx)); };

  // Operation handlers
  const updateOp   = (idx, field, val) =>
    setOperations((prev) => prev.map((o, i) => (i === idx ? { ...o, [field]: val } : o)));
  const addOp      = () => setOperations((prev) => [...prev, { ...EMPTY_OP }]);
  const removeOp   = (idx) => setOperations((prev) => prev.filter((_, i) => i !== idx));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!productId) { toast.error('Select a finished product.'); return; }
    const validComps = components.filter((c) => c.componentProductId && c.qty > 0);
    if (!validComps.length) { toast.error('Add at least one component.'); return; }

    setSaving(true);
    try {
      const payload = {
        productId: parseInt(productId),
        notes: notes.trim() || null,
        components: validComps.map((c) => ({
          componentProductId: parseInt(c.componentProductId),
          qty: parseInt(c.qty),
        })),
        operations: operations
          .filter((o) => o.name.trim())
          .map((o) => ({
            name: o.name.trim(),
            durationMins: parseInt(o.durationMins) || 0,
            workCenter: o.workCenter.trim() || null,
          })),
      };

      if (isEdit) {
        await updateBOM(bom.id, payload);
        toast.success('BoM updated!');
      } else {
        await createBOM(payload);
        toast.success('BoM created!');
      }
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Failed to save BoM.');
    } finally {
      setSaving(false);
    }
  };

  const filteredProducts = search
    ? products.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()) || p.sku?.toLowerCase().includes(search.toLowerCase()))
    : products;

  if (!isOpen) return null;

  const selectedProduct = products.find((p) => String(p.id) === String(productId));

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 py-8">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-5xl rounded-2xl bg-gray-50 shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between rounded-t-2xl border-b border-gray-200 bg-white px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
              <FiLayers className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                {isEdit ? `Edit BoM #${bom.id}` : 'Create Bill of Materials'}
              </h2>
              <p className="text-xs text-slate-500">
                {isEdit ? 'Update components and operations' : 'Define the recipe for manufacturing a finished product'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 transition">
            <FiX className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 gap-4 p-4 lg:grid-cols-[1fr_280px]">

            {/* ── LEFT ── */}
            <div className="space-y-4">

              {/* Finished Product */}
              <div className="rounded-xl border border-gray-200 bg-white p-4">
                <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">
                  Finished Product (Output) *
                </label>
                <div className="flex items-center gap-2 mb-2 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-2">
                  <FiSearch className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                  <input
                    type="text"
                    placeholder="Search products…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="flex-1 bg-transparent outline-none text-xs placeholder-slate-400 text-slate-700"
                  />
                </div>
                <select
                  value={productId}
                  onChange={(e) => setProductId(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-medium text-slate-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition"
                  required
                >
                  <option value="">— Select finished product —</option>
                  {filteredProducts.map((p) => (
                    <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                  ))}
                </select>
                {selectedProduct && (
                  <p className="mt-1.5 text-xs text-slate-500">
                    Category: <span className="font-medium">{selectedProduct.category}</span> · Type: <span className="font-medium">{selectedProduct.type}</span>
                  </p>
                )}
              </div>

              {/* Components */}
              <div className="rounded-xl border border-gray-200 bg-white p-4">
                <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-indigo-600">
                  <FiPackage className="h-4 w-4" /> Input Materials (Components) *
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-left text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                        <th className="pb-2 pr-2 w-6">#</th>
                        <th className="pb-2 pr-2">Component Product</th>
                        <th className="pb-2 pr-2 w-20">Qty / Unit</th>
                        <th className="pb-2 w-6"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {components.map((comp, idx) => (
                        <tr key={idx}>
                          <td className="py-2 pr-2 text-slate-400 text-center">{idx + 1}</td>
                          <td className="py-2 pr-2">
                            <select
                              value={comp.componentProductId}
                              onChange={(e) => updateComp(idx, 'componentProductId', e.target.value)}
                              className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100"
                              required
                            >
                              <option value="">Select component…</option>
                              {products
                                .filter((p) => String(p.id) !== String(productId))
                                .map((p) => (
                                  <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                                ))}
                            </select>
                          </td>
                          <td className="py-2 pr-2">
                            <input
                              type="number"
                              min="1"
                              value={comp.qty}
                              onChange={(e) => updateComp(idx, 'qty', e.target.value)}
                              className="w-full rounded-lg border border-slate-300 px-2.5 py-2 text-xs outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100 text-center"
                              required
                            />
                          </td>
                          <td className="py-2">
                            <button
                              type="button"
                              onClick={() => removeComp(idx)}
                              disabled={components.length === 1}
                              className="flex h-6 w-6 items-center justify-center rounded text-slate-400 hover:bg-red-50 hover:text-red-500 disabled:opacity-30 transition"
                            >
                              <FiX className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <button
                  type="button"
                  onClick={addComp}
                  className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-dashed border-indigo-300 bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-600 transition hover:bg-indigo-100"
                >
                  <FiPlus className="h-3.5 w-3.5" /> Add Component
                </button>
              </div>

              {/* Operations */}
              <div className="rounded-xl border border-gray-200 bg-white p-4">
                <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-600">
                  <FiZap className="h-4 w-4 text-amber-500" /> Operations
                  <span className="text-xs font-normal text-slate-400">(optional)</span>
                </h3>
                {operations.length > 0 ? (
                  <div className="space-y-2 mb-3">
                    {operations.map((op, idx) => (
                      <div key={idx} className="grid grid-cols-[1fr_80px_120px_24px] gap-2 items-center">
                        <input
                          type="text"
                          placeholder="Operation name"
                          value={op.name}
                          onChange={(e) => updateOp(idx, 'name', e.target.value)}
                          className="rounded-lg border border-slate-300 px-2.5 py-2 text-xs outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100"
                        />
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min="1"
                            value={op.durationMins}
                            onChange={(e) => updateOp(idx, 'durationMins', e.target.value)}
                            className="w-full rounded-lg border border-slate-300 px-2 py-2 text-xs outline-none focus:border-indigo-400 text-center"
                          />
                          <span className="text-[10px] text-slate-400 whitespace-nowrap">min</span>
                        </div>
                        <input
                          type="text"
                          placeholder="Work center"
                          value={op.workCenter}
                          onChange={(e) => updateOp(idx, 'workCenter', e.target.value)}
                          className="rounded-lg border border-slate-300 px-2.5 py-2 text-xs outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100"
                        />
                        <button
                          type="button"
                          onClick={() => removeOp(idx)}
                          className="flex h-6 w-6 items-center justify-center rounded text-slate-400 hover:bg-red-50 hover:text-red-500 transition"
                        >
                          <FiX className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mb-3 text-xs text-slate-400 italic">No operations. Add steps like "Cutting", "Assembly", etc.</p>
                )}
                <button
                  type="button"
                  onClick={addOp}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-600 transition hover:bg-amber-100"
                >
                  <FiPlus className="h-3.5 w-3.5" /> Add Operation
                </button>
              </div>
            </div>

            {/* ── RIGHT: Notes + Summary ── */}
            <div className="space-y-4">
              <div className="rounded-xl border border-gray-200 bg-white p-4">
                <label className="mb-2 block text-xs font-semibold text-slate-600">Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={5}
                  placeholder="Manufacturing notes, special instructions…"
                  className="w-full resize-none rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
              </div>

              {/* Summary card */}
              <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-indigo-500 mb-3">Summary</p>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Finished product</span>
                    <span className="font-semibold text-slate-800 truncate max-w-[130px]">
                      {selectedProduct?.name || '—'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Components</span>
                    <span className="font-semibold text-indigo-700">
                      {components.filter((c) => c.componentProductId).length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Operations</span>
                    <span className="font-semibold text-amber-600">
                      {operations.filter((o) => o.name).length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Total op. time</span>
                    <span className="font-semibold text-slate-700">
                      {operations.reduce((s, o) => s + (parseInt(o.durationMins) || 0), 0)} min
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center gap-3 rounded-b-2xl border-t border-gray-200 bg-white px-6 py-4">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 active:scale-95 disabled:opacity-50"
            >
              {saving && <LoadingSpinner size={14} className="text-white" />}
              {saving ? 'Saving…' : isEdit ? '💾 Update BoM' : '🏗️ Create BoM'}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
            >
              <FiX className="h-4 w-4" /> Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Main Page ─────────────────────────────────────────────────────────────────
const BillOfMaterials = () => {
  const { user } = useAuth();
  const canManage = ['ADMIN', 'MANUFACTURING_USER', 'BUSINESS_OWNER'].includes(user?.role);

  const [boms,         setBoms]         = useState([]);
  const [products,     setProducts]     = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [modalOpen,    setModalOpen]    = useState(false);
  const [editingBom,   setEditingBom]   = useState(null);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, bom: null });
  const [expandedRows, setExpandedRows] = useState(new Set());

  const fetchBoms = useCallback(async () => {
    try {
      const res = await getBOMs();
      setBoms(res.data.data || res.data);
    } catch {
      toast.error('Failed to load BoMs.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBoms();
    getProducts().then((r) => setProducts(r.data.data || r.data)).catch(() => {});
  }, [fetchBoms]);

  const toggleRow = (id) =>
    setExpandedRows((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const openCreate = () => { setEditingBom(null); setModalOpen(true); };
  const openEdit   = (bom) => { setEditingBom(bom); setModalOpen(true); };

  const handleDelete = async () => {
    try {
      await deleteBOM(deleteDialog.bom.id);
      toast.success(`BoM #${deleteDialog.bom.id} deleted.`);
      setDeleteDialog({ open: false, bom: null });
      fetchBoms();
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Failed to delete BoM.');
    }
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="rounded-3xl border border-gray-200 bg-white px-6 py-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Bill of Materials</h1>
            <p className="text-sm text-slate-500">
              Define manufacturing recipes: finished products, required components, and production operations.
            </p>
          </div>
          {canManage && (
            <button
              id="btn-new-bom"
              onClick={openCreate}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 active:scale-95"
            >
              <FiPlus className="h-4 w-4" /> New BoM
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <LoadingSpinner fullPage={false} />
        </div>
      ) : boms.length === 0 ? (
        <div className="rounded-3xl border border-gray-100 bg-white p-12 text-center shadow-sm">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-400 mx-auto mb-4">
            <FiLayers className="h-7 w-7" />
          </div>
          <p className="text-base font-semibold text-slate-700">No Bills of Materials</p>
          <p className="mt-1 text-sm text-slate-400">Create your first BoM to define how products are manufactured.</p>
          {canManage && (
            <button onClick={openCreate} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition">
              <FiPlus className="h-4 w-4" /> New BoM
            </button>
          )}
        </div>
      ) : (
        <div className="rounded-3xl border border-gray-100 bg-white overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-slate-50">
                <th className="w-8 px-4 py-3" />
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-400">BoM #</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-400">Finished Product</th>
                <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-400">Components</th>
                <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-400">Operations</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-400">Notes</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-400">Updated</th>
                {canManage && <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-400">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {boms.map((bom, i) => {
                const expanded = expandedRows.has(bom.id);
                return (
                  <React.Fragment key={bom.id}>
                    <tr
                      key={bom.id}
                      className={`group transition-colors hover:bg-indigo-50/20 cursor-pointer ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}`}
                      onClick={() => toggleRow(bom.id)}
                    >
                      {/* Expand chevron */}
                      <td className="px-4 py-3.5 text-slate-400">
                        {expanded
                          ? <FiChevronDown className="h-4 w-4 transition-transform" />
                          : <FiChevronRight className="h-4 w-4 transition-transform" />}
                      </td>

                      {/* BoM # */}
                      <td className="px-4 py-3.5">
                        <span className="font-mono text-xs font-bold text-indigo-600">#{bom.id}</span>
                      </td>

                      {/* Product */}
                      <td className="px-4 py-3.5">
                        <p className="font-semibold text-slate-800">{bom.product?.name || '-'}</p>
                        <p className="text-xs text-slate-400 font-mono">{bom.product?.sku}</p>
                      </td>

                      {/* Component count */}
                      <td className="px-4 py-3.5 text-center">
                        <span className="inline-flex items-center justify-center h-6 min-w-[1.5rem] rounded-md bg-indigo-100 px-2 text-xs font-bold text-indigo-700">
                          {bom.components?.length ?? 0}
                        </span>
                      </td>

                      {/* Operation count */}
                      <td className="px-4 py-3.5 text-center">
                        <span className="inline-flex items-center justify-center h-6 min-w-[1.5rem] rounded-md bg-amber-100 px-2 text-xs font-bold text-amber-700">
                          {bom.operations?.length ?? 0}
                        </span>
                      </td>

                      {/* Notes */}
                      <td className="px-4 py-3.5 text-xs text-slate-500 max-w-[180px] truncate">
                        {bom.notes || <span className="text-slate-300 italic">—</span>}
                      </td>

                      {/* Updated */}
                      <td className="px-4 py-3.5 text-xs text-slate-500">{formatDate(bom.updatedAt)}</td>

                      {/* Actions */}
                      {canManage && (
                        <td className="px-4 py-3.5" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => openEdit(bom)}
                              title="Edit"
                              className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 transition"
                            >
                              <FiEdit2 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => setDeleteDialog({ open: true, bom })}
                              title="Delete"
                              className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-600 transition"
                            >
                              <FiTrash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>

                    {/* Expanded row */}
                    {expanded && <BomExpandedRow bom={bom} />}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      <BomModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        bom={editingBom}
        products={products}
        onSaved={fetchBoms}
      />

      {/* Delete Dialog */}
      <ConfirmDialog
        isOpen={deleteDialog.open}
        onClose={() => setDeleteDialog({ open: false, bom: null })}
        onConfirm={handleDelete}
        title="Delete Bill of Materials"
        message={`Are you sure you want to delete BoM #${deleteDialog.bom?.id} for "${deleteDialog.bom?.product?.name || 'this product'}"? This will also remove all linked components and operations.`}
        confirmText="Delete"
        variant="danger"
      />
    </div>
  );
};

export default BillOfMaterials;
