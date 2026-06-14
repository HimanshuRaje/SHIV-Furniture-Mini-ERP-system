import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
  FiPlus, FiEdit2, FiTrash2, FiCheck, FiX,
  FiPackage, FiFileText, FiShoppingBag, FiTruck,
  FiChevronDown, FiSearch,
} from 'react-icons/fi';
import StatusBadge from '../components/StatusBadge';
import {
  getPurchaseOrders,
  createPurchaseOrder,
  updatePurchaseOrder,
  deletePurchaseOrder,
  confirmPurchaseOrder,
  cancelPurchaseOrder,
  receivePurchaseOrder,
} from '../api/purchase';
import { getVendors } from '../api/vendors';
import { getProducts } from '../api/products';
import DataTable from '../components/DataTable';
import LoadingSpinner from '../components/LoadingSpinner';
import ConfirmDialog from '../components/ConfirmDialog';
import { useAuth } from '../context/AuthContext';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const formatDate = (value) =>
  value
    ? new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    : '-';

const EMPTY_LINE = { productId: '', qty: 1, unitCost: '' };

const calcLineCost = (line) =>
  (parseFloat(line.unitCost) || 0) * (parseInt(line.qty) || 0);

const calcTotals = (lines) => {
  const subtotal = lines.reduce((s, l) => s + calcLineCost(l), 0);
  return { subtotal, total: subtotal };
};

// ─── Create / Edit Modal ───────────────────────────────────────────────────────
const PurchaseOrderModal = ({ isOpen, onClose, order, vendors, products, onSaved }) => {
  const isEdit = Boolean(order);
  const isDraft = !isEdit || order?.status === 'DRAFT';

  const [vendorId, setVendorId] = useState('');
  const [referenceNo, setReferenceNo] = useState('');
  const [noteToSupplier, setNoteToSupplier] = useState('');
  const [status, setStatus] = useState('DRAFT');
  const [lines, setLines] = useState([{ ...EMPTY_LINE }]);
  const [saving, setSaving] = useState(false);
  const [productSearch, setProductSearch] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    if (order) {
      setVendorId(String(order.vendorId || ''));
      setReferenceNo(order.referenceNo || '');
      setNoteToSupplier(order.noteToSupplier || '');
      setStatus(order.status || 'DRAFT');
      setLines(
        order.lines?.length
          ? order.lines.map((l) => ({
              productId: String(l.productId),
              qty: l.qty,
              unitCost: String(l.unitCost),
            }))
          : [{ ...EMPTY_LINE }]
      );
    } else {
      setVendorId('');
      setReferenceNo('');
      setNoteToSupplier('');
      setStatus('DRAFT');
      setLines([{ ...EMPTY_LINE }]);
    }
    setProductSearch('');
  }, [isOpen, order]);

  const totals = calcTotals(lines);
  const lineCount = lines.filter((l) => l.productId && l.qty > 0).length;

  const handleLineChange = (idx, field, value) => {
    setLines((prev) => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], [field]: value };
      if (field === 'productId' && value) {
        const product = products.find((p) => String(p.id) === String(value));
        if (product) updated[idx].unitCost = String(product.costPrice);
      }
      return updated;
    });
  };

  const addLine = () => setLines((prev) => [...prev, { ...EMPTY_LINE }]);
  const removeLine = (idx) => {
    if (lines.length > 1) setLines((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleClear = () => {
    setVendorId('');
    setReferenceNo('');
    setNoteToSupplier('');
    setStatus('DRAFT');
    setLines([{ ...EMPTY_LINE }]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!vendorId) { toast.error('Please select a supplier.'); return; }
    const validLines = lines.filter((l) => l.productId && l.qty > 0 && l.unitCost !== '');
    if (!validLines.length) { toast.error('At least one valid line item is required.'); return; }

    setSaving(true);
    try {
      const payload = {
        vendorId: parseInt(vendorId),
        referenceNo: referenceNo.trim() || null,
        noteToSupplier: noteToSupplier.trim() || null,
        status: status,
      };

      if (isDraft) {
        payload.lines = validLines.map((l) => ({
          productId: parseInt(l.productId),
          qty: parseInt(l.qty),
          unitCost: parseFloat(l.unitCost),
        }));
      }

      if (isEdit) {
        await updatePurchaseOrder(order.id, payload);
        toast.success('Purchase order updated!');
      } else {
        await createPurchaseOrder(payload);
        toast.success('Purchase order created!');
      }
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Failed to save purchase order.');
    } finally {
      setSaving(false);
    }
  };

  const filteredProducts = productSearch
    ? products.filter(
        (p) =>
          p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
          p.sku?.toLowerCase().includes(productSearch.toLowerCase())
      )
    : products;

  if (!isOpen) return null;

  const selectedVendor = vendors.find((v) => String(v.id) === String(vendorId));

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 py-8">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-6xl rounded-2xl bg-gray-50 shadow-2xl">
        {/* ── Header ── */}
        <div className="flex items-center justify-between rounded-t-2xl border-b border-gray-200 bg-white px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <FiShoppingBag className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                {isEdit ? `Edit Purchase Order #${order?.id}` : 'Create Purchase Order'}
              </h2>
              <p className="text-xs text-slate-500">
                {isEdit ? 'Modify line items and supplier details' : 'Select supplier, add products and set quantities'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
          >
            <FiX className="h-5 w-5" />
          </button>
        </div>

        <form id="po-form" onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 gap-4 p-4 lg:grid-cols-[1fr_300px]">

            {/* ── LEFT ── */}
            <div className="space-y-4">
              <div className="rounded-xl border border-gray-200 bg-white p-4">
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <label className="mb-1.5 block text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      Supplier *
                    </label>
                    <div className="relative">
                      <select
                        id="po-vendor"
                        value={vendorId}
                        onChange={(e) => setVendorId(e.target.value)}
                        disabled={!isDraft}
                        className="w-full appearance-none rounded-lg border border-slate-300 bg-white px-4 py-2.5 pr-9 text-sm font-medium text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition disabled:bg-slate-100 disabled:cursor-not-allowed"
                        required
                      >
                        <option value="">Select supplier</option>
                        {vendors.map((v) => (
                          <option key={v.id} value={v.id}>{v.name}</option>
                        ))}
                      </select>
                      <FiChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    </div>
                  </div>
                  {selectedVendor?.contact && (
                    <div className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600 border border-slate-200">
                      <span className="font-medium">Contact:</span> {selectedVendor.contact}
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 bg-white p-4">
                <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-blue-600">
                  <FiPackage className="h-4 w-4" /> Products
                </h3>

                {isDraft && (
                  <div className="mb-3 flex items-center gap-2 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-xs text-slate-500">
                    <FiSearch className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                    <input
                      type="text"
                      placeholder="Search products to add…"
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      className="flex-1 bg-transparent outline-none placeholder-slate-400 text-slate-700"
                    />
                  </div>
                )}

                <div className="overflow-x-auto">
                  <table className="min-w-full text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-left text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                        <th className="pb-2 pr-2 w-6">#</th>
                        <th className="pb-2 pr-2">Products</th>
                        <th className="pb-2 pr-2 w-24">Supplier SKU</th>
                        <th className="pb-2 pr-2 w-16">Qty</th>
                        <th className="pb-2 pr-2 w-28">Cost (₹)</th>
                        <th className="pb-2 pr-2 w-24 text-right">Total</th>
                        <th className="pb-2 w-6"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {lines.map((line, idx) => {
                        const product = products.find((p) => String(p.id) === String(line.productId));
                        const lineTotal = calcLineCost(line);
                        const availableProducts = line.productId ? products : filteredProducts;

                        return (
                          <tr key={idx} className="group">
                            <td className="py-2 pr-2 text-slate-400 text-center">{idx + 1}</td>
                            <td className="py-2 pr-2">
                              <select
                                value={line.productId}
                                onChange={(e) => handleLineChange(idx, 'productId', e.target.value)}
                                disabled={!isDraft}
                                className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 disabled:bg-slate-100 disabled:cursor-not-allowed"
                                required
                              >
                                <option value="">Select product…</option>
                                {availableProducts.map((p) => (
                                  <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                              </select>
                            </td>
                            <td className="py-2 pr-2">
                              <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-1.5 text-xs font-mono text-slate-500">
                                {product?.sku || '—'}
                              </span>
                            </td>
                            <td className="py-2 pr-2">
                              <input
                                type="number"
                                min="1"
                                value={line.qty}
                                onChange={(e) => handleLineChange(idx, 'qty', e.target.value)}
                                disabled={!isDraft}
                                className="w-full rounded-lg border border-slate-300 px-2.5 py-2 text-xs outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 text-center disabled:bg-slate-100 disabled:cursor-not-allowed"
                              />
                            </td>
                            <td className="py-2 pr-2">
                              <div className="flex items-center gap-1">
                                <span className="text-slate-400">₹</span>
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={line.unitCost}
                                  onChange={(e) => handleLineChange(idx, 'unitCost', e.target.value)}
                                  disabled={!isDraft}
                                  placeholder="0.00"
                                  className="w-full rounded-lg border border-slate-300 px-2.5 py-2 text-xs outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 disabled:bg-slate-100 disabled:cursor-not-allowed"
                                />
                              </div>
                            </td>
                            <td className="py-2 pr-2 text-right font-semibold text-slate-700">
                              ₹{lineTotal.toFixed(2)}
                            </td>
                            <td className="py-2">
                              <button
                                type="button"
                                onClick={() => removeLine(idx)}
                                disabled={!isDraft || lines.length === 1}
                                className="flex h-6 w-6 items-center justify-center rounded text-slate-400 hover:bg-red-50 hover:text-red-500 disabled:opacity-30 transition"
                              >
                                <FiX className="h-3.5 w-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {isDraft && (
                  <button
                    type="button"
                    onClick={addLine}
                    className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-dashed border-blue-300 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-600 transition hover:bg-blue-100"
                  >
                    <FiPlus className="h-3.5 w-3.5" /> Add Row
                  </button>
                )}
              </div>
            </div>

            {/* ── RIGHT ── */}
            <div className="space-y-4">
              <div className="rounded-xl border border-gray-200 bg-white p-4">
                <h3 className="mb-3 flex items-center justify-between text-sm font-semibold text-slate-700">
                  Cost summary
                  <FiFileText className="h-4 w-4 text-slate-400" />
                </h3>
                <div className="mb-3">
                  <p className="text-xs font-medium text-slate-500 mb-2">Order details</p>
                  <div className="flex justify-between text-xs text-slate-600 mb-1.5">
                    <span>{lineCount} variant{lineCount !== 1 ? 's' : ''} ({lineCount} item{lineCount !== 1 ? 's' : ''})</span>
                    <span>₹{totals.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>Taxes (Included)</span>
                    <span>₹0.00</span>
                  </div>
                </div>
                <div className="border-t border-slate-200 pt-3 flex justify-between font-semibold text-sm text-slate-800">
                  <span>Total</span>
                  <span>₹{totals.total.toFixed(2)}</span>
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 bg-white p-4">
                <h3 className="mb-3 text-sm font-semibold text-slate-700">Purchase order details</h3>

                <div className="mb-3">
                  <label className="mb-1 block text-xs font-medium text-slate-600">Status</label>
                  <div className="relative">
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      className="w-full appearance-none rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 pr-9 transition"
                    >
                      <option value="DRAFT">Draft</option>
                      <option value="CONFIRMED">Pending</option>
                      <option value="FULLY_RECEIVED">Received</option>
                      <option value="CANCELLED">Cancel</option>
                    </select>
                    <FiChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  </div>
                </div>

                <div className="mb-3">
                  <label className="mb-1 block text-xs font-medium text-slate-600">Reference number</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={referenceNo}
                      onChange={(e) => setReferenceNo(e.target.value.slice(0, 255))}
                      maxLength={255}
                      placeholder="e.g. PO-2024-001"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 pr-12"
                    />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400">
                      {referenceNo.length}/255
                    </span>
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Note to supplier</label>
                  <div className="relative">
                    <textarea
                      value={noteToSupplier}
                      onChange={(e) => setNoteToSupplier(e.target.value.slice(0, 5000))}
                      maxLength={5000}
                      rows={4}
                      placeholder="Additional notes for the supplier…"
                      className="w-full resize-none rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                    <span className="absolute right-3 bottom-2 text-[10px] text-slate-400">
                      {noteToSupplier.length}/5000
                    </span>
                  </div>
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-600">
                    Currency <span className="font-semibold text-slate-800 ml-1">INR ₹</span>
                  </span>
                </div>
              </div>

              {selectedVendor && (
                <div className="rounded-xl border border-blue-100 bg-blue-50 p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <FiTruck className="h-4 w-4 text-blue-500" />
                    <p className="text-xs font-semibold text-blue-700">{selectedVendor.name}</p>
                  </div>
                  {selectedVendor.email && (
                    <p className="text-xs text-blue-600">{selectedVendor.email}</p>
                  )}
                  {selectedVendor.contact && (
                    <p className="text-xs text-blue-500">{selectedVendor.contact}</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ── Footer ── */}
          <div className="flex items-center gap-3 rounded-b-2xl border-t border-gray-200 bg-white px-6 py-4">
            <button
              type="submit"
              disabled={saving}
              id="btn-save-po"
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 active:scale-95 disabled:opacity-50"
            >
              {saving && <LoadingSpinner size={14} className="text-white" />}
              {saving ? 'Saving…' : isEdit ? '💾 Update Order' : '📦 Create Order'}
            </button>
            <button
              type="button"
              onClick={handleClear}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
            >
              ↺ Clear
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

// ─── Receive Modal ────────────────────────────────────────────────────────────
const ReceiveModal = ({ isOpen, onClose, order, onSaved }) => {
  const [receiveQtys, setReceiveQtys] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen || !order) return;
    const initial = {};
    order.lines?.forEach((l) => {
      const remaining = l.qty - (l.receivedQty || 0);
      initial[l.id] = remaining > 0 ? remaining : 0;
    });
    setReceiveQtys(initial);
  }, [isOpen, order]);

  const pendingLines = order?.lines?.filter((l) => (l.qty - (l.receivedQty || 0)) > 0) || [];

  const handleSubmit = async (e) => {
    e.preventDefault();
    const lines = pendingLines
      .map((l) => ({ lineId: l.id, receiveQty: parseInt(receiveQtys[l.id]) || 0 }))
      .filter((l) => l.receiveQty > 0);

    if (!lines.length) { toast.error('Enter at least one receive quantity.'); return; }

    setSaving(true);
    try {
      await receivePurchaseOrder(order.id, lines);
      toast.success(`Receipt recorded for PO #${order.id}.`);
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Failed to record receipt.');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen || !order) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 py-8">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between rounded-t-2xl border-b border-gray-200 bg-white px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <FiPackage className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Receive Goods</h2>
              <p className="text-xs text-slate-500">PO #{order.id} — {order.vendor?.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 transition">
            <FiX className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="p-6">
            {pendingLines.length === 0 ? (
              <p className="text-center text-sm text-slate-500">All lines have been fully received.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      <th className="pb-2 pr-3">Product</th>
                      <th className="pb-2 pr-3 w-20 text-center">Ordered</th>
                      <th className="pb-2 pr-3 w-20 text-center">Received</th>
                      <th className="pb-2 pr-3 w-24 text-center">Remaining</th>
                      <th className="pb-2 w-28 text-center">Receive Now</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {pendingLines.map((line) => {
                      const remaining = line.qty - (line.receivedQty || 0);
                      return (
                        <tr key={line.id}>
                          <td className="py-3 pr-3 font-medium text-slate-800">{line.product?.name || `#${line.productId}`}</td>
                          <td className="py-3 pr-3 text-center text-slate-600">{line.qty}</td>
                          <td className="py-3 pr-3 text-center text-slate-600">{line.receivedQty || 0}</td>
                          <td className="py-3 pr-3 text-center">
                            <span className="inline-flex items-center justify-center h-6 min-w-[2rem] rounded-md bg-amber-50 px-1.5 font-bold text-amber-700">
                              {remaining}
                            </span>
                          </td>
                          <td className="py-3 text-center">
                            <input
                              type="number"
                              min="0"
                              max={remaining}
                              value={receiveQtys[line.id] ?? remaining}
                              onChange={(e) => setReceiveQtys((prev) => ({ ...prev, [line.id]: e.target.value }))}
                              className="w-20 rounded-lg border border-slate-300 px-2 py-1.5 text-center text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {pendingLines.length > 0 && (
            <div className="flex items-center gap-3 rounded-b-2xl border-t border-gray-200 bg-gray-50 px-6 py-4">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 active:scale-95 disabled:opacity-50"
              >
                {saving ? 'Recording…' : <><FiPackage className="h-4 w-4" /> Record Receipt</>}
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
          )}
        </form>
      </div>
    </div>
  );
};

// ─── Main PurchaseOrders Page ─────────────────────────────────────────────────
const PurchaseOrders = () => {
  const { user } = useAuth();
  const canManage = user?.role === 'PURCHASE_USER' || user?.role === 'ADMIN' || user?.role === 'BUSINESS_OWNER';

  const [orders, setOrders]     = useState([]);
  const [vendors, setVendors]   = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [modalOpen, setModalOpen]   = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, order: null });
  const [receiveModal, setReceiveModal] = useState({ open: false, order: null });

  const fetchOrders = useCallback(async () => {
    try {
      const res = await getPurchaseOrders();
      setOrders(res.data.data || res.data);
    } catch {
      toast.error('Failed to load purchase orders.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
    getVendors().then((res) => setVendors(res.data.data || res.data)).catch(() => {});
    getProducts().then((res) => setProducts(res.data.data || res.data)).catch(() => {});
  }, [fetchOrders]);

  const openCreate = () => { setEditingOrder(null); setModalOpen(true); };
  const openEdit   = (order) => { setEditingOrder(order); setModalOpen(true); };

  const openDelete = (order) => {
    if (order.status !== 'DRAFT') { toast.error('Only DRAFT orders can be deleted.'); return; }
    setDeleteDialog({ open: true, order });
  };

  const handleDelete = async () => {
    try {
      await deletePurchaseOrder(deleteDialog.order.id);
      toast.success(`PO #${deleteDialog.order.id} deleted.`);
      setDeleteDialog({ open: false, order: null });
      fetchOrders();
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Failed to delete order.');
    }
  };

  const handleConfirm = async (order) => {
    try {
      await confirmPurchaseOrder(order.id);
      toast.success(`PO #${order.id} confirmed!`);
      fetchOrders();
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Failed to confirm order.');
    }
  };

  const handleCancel = async (order) => {
    try {
      await cancelPurchaseOrder(order.id);
      toast.success(`PO #${order.id} cancelled.`);
      fetchOrders();
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Failed to cancel order.');
    }
  };

  const columns = [
    {
      header: 'PO #',
      accessor: (item) => (
        <span className="font-mono text-xs font-semibold text-slate-700">#{item.id}</span>
      ),
    },
    {
      header: 'Supplier',
      accessor: (item) => (
        <div>
          <p className="text-sm font-medium text-slate-800">{item.vendor?.name || '-'}</p>
          {item.vendor?.contact && (
            <p className="text-xs text-slate-400">{item.vendor.contact}</p>
          )}
        </div>
      ),
    },
    { header: 'Status',     accessor: (item) => <StatusBadge status={item.status} /> },
    { header: 'Order Date', accessor: (item) => formatDate(item.orderDate) },
    { header: 'Created By', accessor: (item) => item.createdBy?.name || '-' },
    { header: 'Lines',      accessor: (item) => item.lines?.length ?? 0 },
    {
      header: 'Total Qty',
      accessor: (item) => item.lines?.reduce((sum, l) => sum + (l.qty || 0), 0) ?? 0,
    },
    {
      header: 'Total Cost',
      accessor: (item) => {
        const total = item.lines?.reduce(
          (sum, l) => sum + Number(l.unitCost || 0) * (l.qty || 0),
          0
        );
        return (
          <span className="font-semibold text-slate-800">
            ₹{Number(total || 0).toFixed(2)}
          </span>
        );
      },
    },
    ...(canManage
      ? [
          {
            header: 'Actions',
            accessor: (item) => (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => openEdit(item)}
                  title="Edit"
                  className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 transition hover:bg-blue-50 hover:text-blue-600"
                >
                  <FiEdit2 className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => handleConfirm(item)}
                  disabled={item.status !== 'DRAFT'}
                  title="Confirm"
                  className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 transition hover:bg-green-50 hover:text-green-600 disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <FiCheck className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => setReceiveModal({ open: true, order: item })}
                  disabled={!['CONFIRMED', 'PARTIALLY_RECEIVED'].includes(item.status)}
                  title="Receive Goods"
                  className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 transition hover:bg-indigo-50 hover:text-indigo-600 disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <FiPackage className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => handleCancel(item)}
                  disabled={!['DRAFT', 'CONFIRMED'].includes(item.status)}
                  title="Cancel"
                  className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 transition hover:bg-amber-50 hover:text-amber-600 disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <FiX className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => openDelete(item)}
                  disabled={item.status !== 'DRAFT'}
                  title="Delete"
                  className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 transition hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <FiTrash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ),
          },
        ]
      : []),
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-3xl border border-gray-200 bg-white px-6 py-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-slate-900">Purchase Orders</h2>
            <p className="text-sm text-slate-500">
              {canManage
                ? 'Create, manage and track purchase orders with suppliers.'
                : 'Review purchase orders and receipt status.'}
            </p>
          </div>
          {canManage && (
            <button
              id="btn-new-purchase-order"
              onClick={openCreate}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 active:scale-95"
            >
              <FiPlus className="h-4 w-4" /> New Purchase Order
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <LoadingSpinner fullPage={false} />
      ) : (
        <DataTable
          columns={columns}
          data={orders}
          emptyMessage="No purchase orders found. Create your first purchase order to get started."
        />
      )}

      {/* Create / Edit Modal */}
      <PurchaseOrderModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        order={editingOrder}
        vendors={vendors}
        products={products}
        onSaved={fetchOrders}
      />

      {/* Receive Modal */}
      <ReceiveModal
        isOpen={receiveModal.open}
        onClose={() => setReceiveModal({ open: false, order: null })}
        order={receiveModal.order}
        onSaved={fetchOrders}
      />

      {/* Delete Confirm Dialog */}
      <ConfirmDialog
        isOpen={deleteDialog.open}
        onClose={() => setDeleteDialog({ open: false, order: null })}
        onConfirm={handleDelete}
        title="Delete Purchase Order"
        message={`Are you sure you want to delete PO #${deleteDialog.order?.id} from "${deleteDialog.order?.vendor?.name || 'this supplier'}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
      />
    </div>
  );
};

export default PurchaseOrders;
