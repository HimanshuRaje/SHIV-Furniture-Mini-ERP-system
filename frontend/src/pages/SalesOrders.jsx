import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
  FiPlus, FiEdit2, FiTrash2, FiCheck, FiX,
  FiUser, FiFileText, FiShoppingCart, FiCreditCard, FiTruck,
} from 'react-icons/fi';
import StatusBadge from '../components/StatusBadge';
import {
  getSalesOrders,
  createSalesOrder,
  updateSalesOrder,
  deleteSalesOrder,
  confirmSalesOrder,
  deliverSalesOrder,
  cancelSalesOrder,
} from '../api/sales';
import { getProducts } from '../api/products';
import DataTable from '../components/DataTable';
import LoadingSpinner from '../components/LoadingSpinner';
import ConfirmDialog from '../components/ConfirmDialog';
import { useAuth } from '../context/AuthContext';

const formatDate = (value) =>
  value
    ? new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    : '-';

const todayISO = () => new Date().toISOString().slice(0, 10);

const EMPTY_LINE = { productId: '', qty: 1, unitPrice: '', gstPercent: 18, discount: 0 };

const PAYMENT_METHODS = ['Cash', 'UPI', 'Bank Transfer', 'Cheque', 'Credit'];

// ─── Live calculation helpers ──────────────────────────────────────────────────
const calcLine = (line) => {
  const base = (parseFloat(line.unitPrice) || 0) * (parseInt(line.qty) || 0);
  const disc = parseFloat(line.discount) || 0;
  const gst = ((base - disc) * (parseFloat(line.gstPercent) || 0)) / 100;
  return { base, disc, gst, amount: base - disc + gst };
};

const calcTotals = (lines, paidAmount) => {
  const subTotal = lines.reduce((s, l) => s + (parseFloat(l.unitPrice) || 0) * (parseInt(l.qty) || 0), 0);
  const totalDiscount = lines.reduce((s, l) => s + (parseFloat(l.discount) || 0), 0);
  const totalGST = lines.reduce((s, l) => {
    const base = (parseFloat(l.unitPrice) || 0) * (parseInt(l.qty) || 0);
    const disc = parseFloat(l.discount) || 0;
    return s + ((base - disc) * (parseFloat(l.gstPercent) || 0)) / 100;
  }, 0);
  const grandTotal = subTotal - totalDiscount + totalGST;
  const balance = grandTotal - (parseFloat(paidAmount) || 0);
  return { subTotal, totalDiscount, totalGST, grandTotal, balance };
};

// ─── Invoice Modal ─────────────────────────────────────────────────────────────
const InvoiceModal = ({ isOpen, onClose, order, products, onSaved }) => {
  const isEdit = Boolean(order);

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [invoiceNo, setInvoiceNo] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(todayISO());
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [paidAmount, setPaidAmount] = useState('0');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState([{ ...EMPTY_LINE }]);
  const [saving, setSaving] = useState(false);

  // Populate form
  useEffect(() => {
    if (!isOpen) return;
    if (order) {
      setCustomerName(order.customerName || '');
      setCustomerPhone(order.customerPhone || '');
      setCustomerAddress(order.customerAddress || '');
      setInvoiceNo(order.invoiceNo || '');
      setInvoiceDate(order.orderDate ? order.orderDate.slice(0, 10) : todayISO());
      setPaymentMethod(order.paymentMethod || 'Cash');
      setPaidAmount(String(order.paidAmount ?? 0));
      setNotes(order.notes || '');
      setLines(
        order.lines?.length
          ? order.lines.map((l) => ({
              productId: String(l.productId),
              qty: l.qty,
              unitPrice: l.unitPrice,
              gstPercent: Number(l.gstPercent ?? 18),
              discount: Number(l.discount ?? 0),
            }))
          : [{ ...EMPTY_LINE }]
      );
    } else {
      setCustomerName(''); setCustomerPhone(''); setCustomerAddress('');
      setInvoiceNo(''); setInvoiceDate(todayISO());
      setPaymentMethod('Cash'); setPaidAmount('0'); setNotes('');
      setLines([{ ...EMPTY_LINE }]);
    }
  }, [isOpen, order]);

  const totals = calcTotals(lines, paidAmount);

  const handleLineChange = (idx, field, value) => {
    setLines((prev) => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], [field]: value };
      if (field === 'productId' && value) {
        const product = products.find((p) => String(p.id) === String(value));
        if (product) updated[idx].unitPrice = product.salesPrice;
      }
      return updated;
    });
  };

  const addLine = () => setLines((prev) => [...prev, { ...EMPTY_LINE }]);
  const removeLine = (idx) => { if (lines.length > 1) setLines((prev) => prev.filter((_, i) => i !== idx)); };

  const handleClear = () => {
    setCustomerName(''); setCustomerPhone(''); setCustomerAddress('');
    setInvoiceDate(todayISO()); setPaymentMethod('Cash'); setPaidAmount('0'); setNotes('');
    setLines([{ ...EMPTY_LINE }]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!customerName.trim()) { toast.error('Customer name is required.'); return; }
    const validLines = lines.filter((l) => l.productId && l.qty > 0 && l.unitPrice !== '');
    if (!validLines.length) { toast.error('At least one valid line item is required.'); return; }

    setSaving(true);
    try {
      const payload = {
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim() || null,
        customerAddress: customerAddress.trim() || null,
        invoiceNo: invoiceNo.trim() || null,
        paymentMethod,
        paidAmount: parseFloat(paidAmount) || 0,
        notes: notes.trim() || null,
        lines: validLines.map((l) => ({
          productId: parseInt(l.productId),
          qty: parseInt(l.qty),
          unitPrice: parseFloat(l.unitPrice),
          gstPercent: parseFloat(l.gstPercent) || 0,
          discount: parseFloat(l.discount) || 0,
        })),
      };

      if (isEdit) {
        await updateSalesOrder(order.id, payload);
        toast.success('Sales order updated!');
      } else {
        await createSalesOrder(payload);
        toast.success('Sales order created!');
      }
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Failed to save order.');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 py-8">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Dialog */}
      <div className="relative w-full max-w-7xl rounded-2xl bg-gray-50 shadow-2xl">
        {/* ── Header ── */}
        <div className="flex items-center justify-between rounded-t-2xl border-b border-gray-200 bg-white px-6 py-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              {isEdit ? `Edit Invoice #${order?.invoiceNo || order?.id}` : 'Create Invoice'}
            </h2>
            <p className="text-xs text-slate-500">Add customer, items and generate invoice</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            <FiX className="h-5 w-5" />
          </button>
        </div>

        <form id="invoice-form" onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 gap-4 p-4 lg:grid-cols-[1fr_1fr_280px]">

            {/* ── LEFT: Customer + Invoice Details ── */}
            <div className="space-y-4">
              {/* Customer Details */}
              <div className="rounded-xl border border-gray-200 bg-white p-4">
                <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-indigo-600">
                  <FiUser className="h-4 w-4" /> Customer Details
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600">Customer Name <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="e.g. Walk In Customer"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                      required
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600">Mobile No.</label>
                    <input
                      type="text"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="e.g. 9876543210"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600">Address</label>
                    <textarea
                      value={customerAddress}
                      onChange={(e) => setCustomerAddress(e.target.value)}
                      placeholder="Customer address..."
                      rows={2}
                      className="w-full resize-none rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                    />
                  </div>
                </div>
              </div>

              {/* Invoice Details */}
              <div className="rounded-xl border border-gray-200 bg-white p-4">
                <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-indigo-600">
                  <FiFileText className="h-4 w-4" /> Invoice Details
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600">Date</label>
                    <input
                      type="date"
                      value={invoiceDate}
                      onChange={(e) => setInvoiceDate(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600">Invoice No.</label>
                    <input
                      type="text"
                      value={invoiceNo}
                      onChange={(e) => setInvoiceNo(e.target.value)}
                      placeholder="Auto Generated"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                    />
                    <p className="mt-0.5 text-center text-[10px] text-indigo-400">( Auto Generated )</p>
                  </div>
                </div>
              </div>
            </div>

            {/* ── CENTER: Product Details ── */}
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-indigo-600">
                <FiShoppingCart className="h-4 w-4" /> Product Details
              </h3>

              {/* Product Lines Table */}
              <div className="overflow-x-auto">
                <table className="min-w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                      <th className="pb-2 pr-2 w-6">#</th>
                      <th className="pb-2 pr-2">Product Name</th>
                      <th className="pb-2 pr-2 w-14">Qty</th>
                      <th className="pb-2 pr-2 w-20">Price (₹)</th>
                      <th className="pb-2 pr-2 w-16">GST %</th>
                      <th className="pb-2 pr-2 w-20">Disc (₹)</th>
                      <th className="pb-2 pr-2 w-20 text-right">Amount</th>
                      <th className="pb-2 w-6"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {lines.map((line, idx) => {
                      const { amount } = calcLine(line);
                      return (
                        <tr key={idx}>
                          <td className="py-1.5 pr-2 text-slate-400">{idx + 1}</td>
                          <td className="py-1.5 pr-2">
                            <select
                              value={line.productId}
                              onChange={(e) => handleLineChange(idx, 'productId', e.target.value)}
                              className="w-full rounded border border-slate-300 bg-white px-2 py-1.5 text-xs outline-none focus:border-indigo-400"
                              required
                            >
                              <option value="">Product..</option>
                              {products.map((p) => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                              ))}
                            </select>
                          </td>
                          <td className="py-1.5 pr-2">
                            <input type="number" min="1" value={line.qty}
                              onChange={(e) => handleLineChange(idx, 'qty', e.target.value)}
                              className="w-full rounded border border-slate-300 px-2 py-1.5 text-xs outline-none focus:border-indigo-400" />
                          </td>
                          <td className="py-1.5 pr-2">
                            <input type="number" min="0" step="0.01" value={line.unitPrice}
                              onChange={(e) => handleLineChange(idx, 'unitPrice', e.target.value)}
                              placeholder="0.00"
                              className="w-full rounded border border-slate-300 px-2 py-1.5 text-xs outline-none focus:border-indigo-400" />
                          </td>
                          <td className="py-1.5 pr-2">
                            <select value={line.gstPercent}
                              onChange={(e) => handleLineChange(idx, 'gstPercent', e.target.value)}
                              className="w-full rounded border border-slate-300 bg-white px-1.5 py-1.5 text-xs outline-none focus:border-indigo-400">
                              {[0, 5, 12, 18, 28].map((r) => <option key={r} value={r}>{r}%</option>)}
                            </select>
                          </td>
                          <td className="py-1.5 pr-2">
                            <input type="number" min="0" step="0.01" value={line.discount}
                              onChange={(e) => handleLineChange(idx, 'discount', e.target.value)}
                              className="w-full rounded border border-slate-300 px-2 py-1.5 text-xs outline-none focus:border-indigo-400" />
                          </td>
                          <td className="py-1.5 pr-2 text-right font-semibold text-slate-700">
                            ₹{amount.toFixed(2)}
                          </td>
                          <td className="py-1.5">
                            <button type="button" onClick={() => removeLine(idx)}
                              disabled={lines.length === 1}
                              className="flex h-6 w-6 items-center justify-center rounded text-slate-400 hover:bg-red-50 hover:text-red-500 disabled:opacity-30">
                              <FiTrash2 className="h-3 w-3" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <button type="button" onClick={addLine}
                className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-dashed border-indigo-300 bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-600 transition hover:bg-indigo-100">
                <FiPlus className="h-3.5 w-3.5" /> Add Row
              </button>

              {/* Notes + Summary Row */}
              <div className="mt-4 grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Notes</label>
                  <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add any notes here..."
                    rows={4}
                    className="w-full resize-none rounded-lg border border-slate-300 px-3 py-2 text-xs outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" />
                </div>
                <div className="space-y-1.5 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Sub Total</span>
                    <span>₹{totals.subTotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-red-500">
                    <span>Total Discount</span>
                    <span>₹{totals.totalDiscount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Total GST</span>
                    <span>₹{totals.totalGST.toFixed(2)}</span>
                  </div>
                  <div className="mt-2 flex justify-between border-t border-slate-300 pt-2 text-sm font-bold text-indigo-600">
                    <span>Grand Total (₹)</span>
                    <span>₹{totals.grandTotal.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* ── RIGHT: Payment Details ── */}
            <div className="space-y-4">
              <div className="rounded-xl border border-gray-200 bg-white p-4">
                <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-indigo-600">
                  <FiCreditCard className="h-4 w-4" /> Payment Details
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600">Payment Method</label>
                    <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100">
                      {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600">Paid Amount (₹)</label>
                    <input type="number" min="0" step="0.01" value={paidAmount}
                      onChange={(e) => setPaidAmount(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" />
                  </div>
                  <div className="rounded-lg bg-green-50 p-3">
                    <p className="text-xs font-medium text-slate-600">Balance Amount (₹)</p>
                    <p className={`mt-1 text-2xl font-bold ${totals.balance < 0 ? 'text-red-500' : 'text-green-600'}`}>
                      {totals.balance.toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Summary panel */}
              <div className="rounded-xl border border-gray-200 bg-white p-4 text-sm">
                <div className="space-y-2">
                  <div className="flex justify-between text-slate-600">
                    <span>Sub Total (₹)</span>
                    <span>{totals.subTotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-red-500">
                    <span>Total Discount (₹)</span>
                    <span>{totals.totalDiscount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>GST Amount (₹)</span>
                    <span>{totals.totalGST.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-bold text-indigo-600">
                    <span>Grand Total (₹)</span>
                    <span>{totals.grandTotal.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── Footer Actions ── */}
          <div className="flex items-center gap-3 rounded-b-2xl border-t border-gray-200 bg-white px-6 py-4">
            <button type="submit" disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-green-700 disabled:opacity-50">
              {saving && <LoadingSpinner size={14} className="text-white" />}
              {saving ? 'Saving…' : isEdit ? '💾 Update Invoice' : '💾 Save Invoice'}
            </button>
            <button type="button" onClick={handleClear} disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50">
              ↺ Clear
            </button>
            <button type="button" onClick={onClose} disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50">
              <FiX className="h-4 w-4" /> Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Deliver Modal ─────────────────────────────────────────────────────────────
const DeliverModal = ({ isOpen, onClose, order, onSaved }) => {
  const [deliverQtys, setDeliverQtys] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen || !order) return;
    const initial = {};
    order.lines?.forEach((l) => {
      const remaining = l.qty - (l.deliveredQty || 0);
      initial[l.id] = remaining > 0 ? remaining : 0;
    });
    setDeliverQtys(initial);
  }, [isOpen, order]);

  const pendingLines = order?.lines?.filter((l) => (l.qty - (l.deliveredQty || 0)) > 0) || [];

  const handleSubmit = async (e) => {
    e.preventDefault();
    const lines = pendingLines
      .map((l) => ({ lineId: l.id, deliverQty: parseInt(deliverQtys[l.id]) || 0 }))
      .filter((l) => l.deliverQty > 0);

    if (!lines.length) { toast.error('Enter at least one delivery quantity.'); return; }

    setSaving(true);
    try {
      await deliverSalesOrder(order.id, lines);
      toast.success(`Delivery recorded for Order #${order.invoiceNo || order.id}.`);
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Failed to record delivery.');
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
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
              <FiTruck className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Record Delivery</h2>
              <p className="text-xs text-slate-500">Invoice #{order.invoiceNo || order.id} — {order.customerName}</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 transition">
            <FiX className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="p-6">
            {pendingLines.length === 0 ? (
              <p className="text-center text-sm text-slate-500">All lines have been fully delivered.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      <th className="pb-2 pr-3">Product</th>
                      <th className="pb-2 pr-3 w-20 text-center">Ordered</th>
                      <th className="pb-2 pr-3 w-20 text-center">Delivered</th>
                      <th className="pb-2 pr-3 w-24 text-center">Remaining</th>
                      <th className="pb-2 w-28 text-center">Deliver Now</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {pendingLines.map((line) => {
                      const remaining = line.qty - (line.deliveredQty || 0);
                      return (
                        <tr key={line.id}>
                          <td className="py-3 pr-3 font-medium text-slate-800">{line.product?.name || `#${line.productId}`}</td>
                          <td className="py-3 pr-3 text-center text-slate-600">{line.qty}</td>
                          <td className="py-3 pr-3 text-center text-slate-600">{line.deliveredQty || 0}</td>
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
                              value={deliverQtys[line.id] ?? remaining}
                              onChange={(e) => setDeliverQtys((prev) => ({ ...prev, [line.id]: e.target.value }))}
                              className="w-20 rounded-lg border border-slate-300 px-2 py-1.5 text-center text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
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
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 active:scale-95 disabled:opacity-50"
              >
                {saving ? 'Recording…' : <><FiTruck className="h-4 w-4" /> Record Delivery</>}
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

// ─── Main SalesOrders Page ─────────────────────────────────────────────────────
const SalesOrders = () => {
  const { user } = useAuth();
  const canEdit = user?.role === 'SALES_USER' || user?.role === 'ADMIN';

  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, order: null });
  const [deliverModal, setDeliverModal] = useState({ open: false, order: null });

  const fetchOrders = useCallback(async () => {
    try {
      const res = await getSalesOrders();
      setOrders(res.data.data || res.data);
    } catch {
      toast.error('Failed to load sales orders.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
    getProducts().then((res) => setProducts(res.data.data || res.data)).catch(() => {});
  }, [fetchOrders]);

  const openCreate = () => { setEditingOrder(null); setModalOpen(true); };

  const openEdit = (order) => {
    if (order.status !== 'DRAFT') { toast.error('Only DRAFT orders can be edited.'); return; }
    setEditingOrder(order);
    setModalOpen(true);
  };

  const openDelete = (order) => {
    if (order.status !== 'DRAFT') { toast.error('Only DRAFT orders can be deleted.'); return; }
    setDeleteDialog({ open: true, order });
  };

  const handleDelete = async () => {
    try {
      await deleteSalesOrder(deleteDialog.order.id);
      toast.success(`Order #${deleteDialog.order.id} deleted.`);
      setDeleteDialog({ open: false, order: null });
      fetchOrders();
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Failed to delete order.');
    }
  };

  const handleConfirm = async (order) => {
    try {
      const res = await confirmSalesOrder(order.id);
      const result = res.data.data || res.data;
      const notifications = result.procurementNotifications || [];
      const created = notifications.filter((item) => item.type !== 'ERROR');
      const failed = notifications.filter((item) => item.type === 'ERROR');

      if (created.length > 0) {
        toast.success(
          `Order #${order.id} confirmed. Auto-created ${created.length} procurement order${created.length > 1 ? 's' : ''}.`
        );
      } else {
        toast.success(`Order #${order.id} confirmed!`);
      }

      failed.forEach((item) => {
        toast.error(item.message || `Auto-procurement failed for ${item.productName || 'a product'}.`);
      });

      fetchOrders();
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Failed to confirm order.');
    }
  };

  const handleCancel = async (order) => {
    try {
      await cancelSalesOrder(order.id);
      toast.success(`Order #${order.id} cancelled.`);
      fetchOrders();
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Failed to cancel order.');
    }
  };

  const columns = [
    { header: 'Invoice No.', accessor: (item) => item.invoiceNo || `#${item.id}` },
    { header: 'Customer', accessor: 'customerName' },
    { header: 'Phone', accessor: (item) => item.customerPhone || '-' },
    { header: 'Status', accessor: (item) => <StatusBadge status={item.status} /> },
    { header: 'Date', accessor: (item) => formatDate(item.orderDate) },
    { header: 'Payment', accessor: (item) => item.paymentMethod || '-' },
    {
      header: 'Grand Total',
      accessor: (item) => {
        const subTotal = item.lines?.reduce((s, l) => s + Number(l.unitPrice || 0) * (l.qty || 0), 0) || 0;
        const totalDiscount = item.lines?.reduce((s, l) => s + Number(l.discount || 0), 0) || 0;
        const totalGST = item.lines?.reduce((s, l) => {
          const base = Number(l.unitPrice || 0) * (l.qty || 0);
          const disc = Number(l.discount || 0);
          return s + ((base - disc) * (Number(l.gstPercent || 0) / 100));
        }, 0) || 0;
        return `₹${(subTotal - totalDiscount + totalGST).toFixed(2)}`;
      },
    },
    {
      header: 'Balance',
      accessor: (item) => {
        const subTotal = item.lines?.reduce((s, l) => s + Number(l.unitPrice || 0) * (l.qty || 0), 0) || 0;
        const totalDiscount = item.lines?.reduce((s, l) => s + Number(l.discount || 0), 0) || 0;
        const totalGST = item.lines?.reduce((s, l) => {
          const base = Number(l.unitPrice || 0) * (l.qty || 0);
          return s + ((base - Number(l.discount || 0)) * (Number(l.gstPercent || 0) / 100));
        }, 0) || 0;
        const grand = subTotal - totalDiscount + totalGST;
        const bal = grand - Number(item.paidAmount || 0);
        return <span className={bal > 0 ? 'font-semibold text-red-500' : 'font-semibold text-green-600'}>₹{bal.toFixed(2)}</span>;
      },
    },
    ...(canEdit ? [{
      header: 'Actions',
      accessor: (item) => (
        <div className="flex items-center gap-1">
          <button onClick={() => openEdit(item)} disabled={item.status !== 'DRAFT'} title="Edit"
            className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 transition hover:bg-indigo-50 hover:text-indigo-600 disabled:cursor-not-allowed disabled:opacity-30">
            <FiEdit2 className="h-3.5 w-3.5" />
          </button>
          <button onClick={() => handleConfirm(item)} disabled={item.status !== 'DRAFT'} title="Confirm"
            className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 transition hover:bg-green-50 hover:text-green-600 disabled:cursor-not-allowed disabled:opacity-30">
            <FiCheck className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setDeliverModal({ open: true, order: item })}
            disabled={!['CONFIRMED', 'PARTIALLY_DELIVERED'].includes(item.status)}
            title="Deliver"
            className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 transition hover:bg-blue-50 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-30"
          >
            <FiTruck className="h-3.5 w-3.5" />
          </button>
          <button onClick={() => handleCancel(item)} disabled={!['DRAFT', 'CONFIRMED', 'PARTIALLY_DELIVERED'].includes(item.status)} title="Cancel"
            className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 transition hover:bg-amber-50 hover:text-amber-600 disabled:cursor-not-allowed disabled:opacity-30">
            <FiX className="h-3.5 w-3.5" />
          </button>
          <button onClick={() => openDelete(item)} disabled={item.status !== 'DRAFT'} title="Delete"
            className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 transition hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-30">
            <FiTrash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ),
    }] : []),
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-3xl border border-gray-200 bg-white px-6 py-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-slate-900">Sales Orders</h2>
            <p className="text-sm text-slate-500">Manage invoices and delivery status.</p>
          </div>
          {canEdit && (
            <button id="btn-new-sales-order" onClick={openCreate}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 active:scale-95">
              <FiPlus className="h-4 w-4" /> New Invoice
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      {loading ? <LoadingSpinner fullPage={false} /> : (
        <DataTable columns={columns} data={orders} emptyMessage="No sales orders found." />
      )}

      {/* Invoice Modal */}
      <InvoiceModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        order={editingOrder}
        products={products}
        onSaved={fetchOrders}
      />

      {/* Deliver Modal */}
      <DeliverModal
        isOpen={deliverModal.open}
        onClose={() => setDeliverModal({ open: false, order: null })}
        order={deliverModal.order}
        onSaved={fetchOrders}
      />

      {/* Delete Confirm Dialog */}
      <ConfirmDialog
        isOpen={deleteDialog.open}
        onClose={() => setDeleteDialog({ open: false, order: null })}
        onConfirm={handleDelete}
        title="Delete Sales Order"
        message={`Are you sure you want to delete Order #${deleteDialog.order?.id} for "${deleteDialog.order?.customerName}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
      />
    </div>
  );
};

export default SalesOrders;
