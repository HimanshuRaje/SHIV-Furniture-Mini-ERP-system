import React, { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
  FiPlus, FiEdit2, FiTrash2, FiCheck, FiX, FiPlay,
  FiFlag, FiChevronDown, FiChevronRight, FiPackage,
  FiZap, FiAlertTriangle, FiCheckCircle, FiUser,
  FiSearch, FiRefreshCw,
} from 'react-icons/fi';
import StatusBadge from '../components/StatusBadge';
import {
  getManufacturingOrders,
  createManufacturingOrder,
  updateManufacturingOrder,
  deleteManufacturingOrder,
  confirmMO,
  startMO,
  completeMO,
  cancelMO,
  updateWorkOrder,
} from '../api/manufacturing';
import { getProducts } from '../api/products';
import { getBOMs } from '../api/bom';
import { getMfgUsers } from '../api/users';
import LoadingSpinner from '../components/LoadingSpinner';
import ConfirmDialog from '../components/ConfirmDialog';
import { useAuth } from '../context/AuthContext';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const formatDate = (v) =>
  v ? new Date(v).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '-';

const WO_STATUS_STYLES = {
  PENDING:     { pill: 'bg-gray-100 text-gray-600',     dot: 'bg-gray-400'    },
  IN_PROGRESS: { pill: 'bg-indigo-100 text-indigo-700', dot: 'bg-indigo-400'  },
  DONE:        { pill: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500' },
};

// ─── Component Requirements Preview ──────────────────────────────────────────
const ComponentRequirements = ({ bom, moQty }) => {
  if (!bom?.components?.length) return null;
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-100">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-slate-50 border-b border-gray-100">
            <th className="px-3 py-2 text-left font-semibold text-slate-400 uppercase tracking-wide">Component</th>
            <th className="px-3 py-2 text-center font-semibold text-slate-400 uppercase tracking-wide">Per Unit</th>
            <th className="px-3 py-2 text-center font-semibold text-slate-400 uppercase tracking-wide">Required (×{moQty})</th>
            <th className="px-3 py-2 text-center font-semibold text-slate-400 uppercase tracking-wide">On Hand</th>
            <th className="px-3 py-2 text-center font-semibold text-slate-400 uppercase tracking-wide">Available</th>
            <th className="px-3 py-2 text-left font-semibold text-slate-400 uppercase tracking-wide">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {bom.components.map((c) => {
            const required  = c.qty * (parseInt(moQty) || 1);
            const onHand    = c.componentProduct?.onHandQty || 0;
            const reserved  = c.componentProduct?.reservedQty || 0;
            const available = onHand - reserved;
            const sufficient = available >= required;
            return (
              <tr key={c.id} className="bg-white hover:bg-slate-50 transition-colors">
                <td className="px-3 py-2.5 font-medium text-slate-800">{c.componentProduct?.name || '-'}</td>
                <td className="px-3 py-2.5 text-center text-slate-600">{c.qty}</td>
                <td className="px-3 py-2.5 text-center">
                  <span className="font-bold text-slate-800">{required}</span>
                </td>
                <td className="px-3 py-2.5 text-center">
                  <span className="inline-flex items-center justify-center h-6 min-w-[2rem] rounded-md bg-blue-50 px-1.5 font-bold text-blue-700">
                    {onHand}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-center">
                  <span className={`inline-flex items-center justify-center h-6 min-w-[2rem] rounded-md px-1.5 font-bold ${
                    available >= required ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
                  }`}>
                    {available}
                  </span>
                </td>
                <td className="px-3 py-2.5">
                  {sufficient ? (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600">
                      <FiCheckCircle className="h-3 w-3" /> Sufficient
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600">
                      <FiAlertTriangle className="h-3 w-3" /> Shortfall: {Math.max(required - available, 0)}
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

// ─── Expanded MO Row ──────────────────────────────────────────────────────────
const MoExpandedRow = ({ mo, onWorkOrderStatusChange }) => {
  const colCount = 9;
  return (
    <tr className="bg-slate-50/80">
      <td colSpan={colCount} className="px-6 py-0">
        <div className="py-4 space-y-4">
          {/* Component Requirements */}
          {mo.bom?.components?.length > 0 && (
            <div>
              <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-500">
                <FiPackage className="h-3.5 w-3.5" /> Component Requirements (for qty = {mo.qty})
              </p>
              <ComponentRequirements bom={mo.bom} moQty={mo.qty} />
            </div>
          )}

          {/* Work Orders */}
          {mo.workOrders?.length > 0 && (
            <div>
              <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-500">
                <FiZap className="h-3.5 w-3.5" /> Work Orders
              </p>
              <div className="overflow-x-auto rounded-xl border border-gray-100">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-white border-b border-gray-100">
                      <th className="px-3 py-2 text-left font-semibold text-slate-400 uppercase tracking-wide">Operation</th>
                      <th className="px-3 py-2 text-left font-semibold text-slate-400 uppercase tracking-wide">Work Center</th>
                      <th className="px-3 py-2 text-center font-semibold text-slate-400 uppercase tracking-wide">Duration</th>
                      <th className="px-3 py-2 text-left font-semibold text-slate-400 uppercase tracking-wide">Status</th>
                      {mo.status === 'IN_PROGRESS' && (
                        <th className="px-3 py-2 text-left font-semibold text-slate-400 uppercase tracking-wide">Update</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {mo.workOrders.map((wo) => {
                      const s = WO_STATUS_STYLES[wo.status] || WO_STATUS_STYLES.PENDING;
                      return (
                        <tr key={wo.id} className="bg-white hover:bg-slate-50/80 transition-colors">
                          <td className="px-3 py-2.5 font-medium text-slate-800">{wo.operationName}</td>
                          <td className="px-3 py-2.5 text-slate-600">{wo.workCenter || '—'}</td>
                          <td className="px-3 py-2.5 text-center text-slate-600">{wo.durationMins} min</td>
                          <td className="px-3 py-2.5">
                            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${s.pill}`}>
                              <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
                              {wo.status.replace('_', ' ')}
                            </span>
                          </td>
                          {mo.status === 'IN_PROGRESS' && (
                            <td className="px-3 py-2.5">
                              <div className="flex items-center gap-1">
                                {wo.status === 'PENDING' && (
                                  <button
                                    onClick={() => onWorkOrderStatusChange(wo.id, 'IN_PROGRESS')}
                                    className="inline-flex items-center gap-1 rounded-lg bg-indigo-50 px-2 py-1 text-xs font-semibold text-indigo-600 hover:bg-indigo-100 transition"
                                  >
                                    <FiPlay className="h-2.5 w-2.5" /> Start
                                  </button>
                                )}
                                {wo.status === 'IN_PROGRESS' && (
                                  <button
                                    onClick={() => onWorkOrderStatusChange(wo.id, 'DONE')}
                                    className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-600 hover:bg-emerald-100 transition"
                                  >
                                    <FiCheck className="h-2.5 w-2.5" /> Done
                                  </button>
                                )}
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {!mo.bom?.components?.length && !mo.workOrders?.length && (
            <p className="text-xs text-slate-400 italic">No component or work order data available.</p>
          )}
        </div>
      </td>
    </tr>
  );
};

// ─── Create / Edit Modal ──────────────────────────────────────────────────────
const MOModal = ({ isOpen, onClose, mo, products, boms, mfgUsers, onSaved }) => {
  const isEdit = Boolean(mo);

  const [productId,    setProductId]    = useState('');
  const [bomId,        setBomId]        = useState('');
  const [qty,          setQty]          = useState(1);
  const [assignedToId, setAssignedToId] = useState('');
  const [saving,       setSaving]       = useState(false);

  // Boms filtered for selected product
  const productBoms = boms.filter((b) => String(b.productId) === String(productId));
  const selectedBom = boms.find((b) => String(b.id) === String(bomId));

  useEffect(() => {
    if (!isOpen) return;
    if (mo) {
      setProductId(String(mo.productId || ''));
      setBomId(String(mo.bomId || ''));
      setQty(mo.qty || 1);
      setAssignedToId(String(mo.assignedToId || ''));
    } else {
      setProductId(''); setBomId(''); setQty(1); setAssignedToId('');
    }
  }, [isOpen, mo]);

  // Auto-select first BoM when product changes
  useEffect(() => {
    if (!isEdit && productId) {
      const firstBom = boms.find((b) => String(b.productId) === String(productId));
      setBomId(firstBom ? String(firstBom.id) : '');
    }
  }, [productId, boms, isEdit]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!productId || !bomId || qty < 1) {
      toast.error('Please fill all required fields.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        productId: parseInt(productId),
        bomId:     parseInt(bomId),
        qty:       parseInt(qty),
        assignedToId: assignedToId ? parseInt(assignedToId) : null,
      };
      if (isEdit) {
        await updateManufacturingOrder(mo.id, payload);
        toast.success('Manufacturing order updated!');
      } else {
        await createManufacturingOrder(payload);
        toast.success('Manufacturing order created!');
      }
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Failed to save MO.');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const productsWithBom = products.filter((p) => boms.some((b) => b.productId === p.id));

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 py-8">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-4xl rounded-2xl bg-gray-50 shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between rounded-t-2xl border-b border-gray-200 bg-white px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <FiZap className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                {isEdit ? `Edit Manufacturing Order #${mo.id}` : 'Create Manufacturing Order'}
              </h2>
              <p className="text-xs text-slate-500">
                {isEdit ? 'Update draft order details' : 'Select a product and BoM to start production'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 transition">
            <FiX className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 gap-4 p-4 lg:grid-cols-[1fr_260px]">

            {/* ── LEFT ── */}
            <div className="space-y-4">
              {/* Product */}
              <div className="rounded-xl border border-gray-200 bg-white p-4">
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
                  Finished Product *
                </label>
                <select
                  value={productId}
                  onChange={(e) => setProductId(e.target.value)}
                  disabled={isEdit}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-medium text-slate-800 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition disabled:bg-slate-100 disabled:cursor-not-allowed"
                  required
                >
                  <option value="">— Select product with BoM —</option>
                  {productsWithBom.map((p) => (
                    <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                  ))}
                </select>
                {products.length > 0 && productsWithBom.length === 0 && (
                  <p className="mt-1 text-xs text-amber-600">⚠️ No products have a BoM defined yet.</p>
                )}
              </div>

              {/* BoM selector */}
              {productId && (
                <div className="rounded-xl border border-gray-200 bg-white p-4">
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
                    Bill of Materials *
                  </label>
                  {productBoms.length === 0 ? (
                    <p className="text-sm text-amber-600">No BoM found for this product.</p>
                  ) : (
                    <select
                      value={bomId}
                      onChange={(e) => setBomId(e.target.value)}
                      disabled={isEdit}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-medium text-slate-800 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition disabled:bg-slate-100"
                      required
                    >
                      <option value="">— Select BoM —</option>
                      {productBoms.map((b) => (
                        <option key={b.id} value={b.id}>BoM #{b.id} — {b.components?.length} components</option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              {/* Qty + Assigned To */}
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-xl border border-gray-200 bg-white p-4">
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
                    Quantity *
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={qty}
                    onChange={(e) => setQty(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-semibold outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 text-center"
                    required
                  />
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-4">
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500 flex items-center gap-1">
                    <FiUser className="h-3 w-3" /> Assigned To
                  </label>
                  <select
                    value={assignedToId}
                    onChange={(e) => setAssignedToId(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition"
                  >
                    <option value="">— Unassigned —</option>
                    {mfgUsers.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Component preview */}
              {selectedBom && parseInt(qty) > 0 && (
                <div className="rounded-xl border border-gray-200 bg-white p-4">
                  <p className="mb-3 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-500">
                    <FiPackage className="h-3.5 w-3.5" /> Component Requirements Preview
                  </p>
                  <ComponentRequirements bom={selectedBom} moQty={qty} />
                </div>
              )}
            </div>

            {/* ── RIGHT: Summary ── */}
            <div>
              <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-emerald-600 mb-3">Order Summary</p>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Product</span>
                    <span className="font-semibold text-slate-800 text-right max-w-[130px] truncate">
                      {products.find((p) => String(p.id) === String(productId))?.name || '—'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">BoM</span>
                    <span className="font-semibold text-slate-800">#{bomId || '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Quantity</span>
                    <span className="font-bold text-emerald-700 text-lg">{qty || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Components</span>
                    <span className="font-semibold text-slate-800">{selectedBom?.components?.length ?? 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Work orders</span>
                    <span className="font-semibold text-slate-800">{selectedBom?.operations?.length ?? 0}</span>
                  </div>
                </div>

                {selectedBom && parseInt(qty) > 0 && (
                  <div className="mt-4 border-t border-emerald-200 pt-3">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-600 mb-2">Total Materials Needed</p>
                    {selectedBom.components?.map((c) => (
                      <div key={c.id} className="flex justify-between text-xs py-0.5">
                        <span className="text-slate-600 truncate max-w-[120px]">{c.componentProduct?.name}</span>
                        <span className="font-semibold text-slate-800 ml-2">{c.qty * parseInt(qty)} units</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center gap-3 rounded-b-2xl border-t border-gray-200 bg-white px-6 py-4">
            <button
              type="submit"
              disabled={saving || !productId || !bomId}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 active:scale-95 disabled:opacity-50"
            >
              {saving && <LoadingSpinner size={14} className="text-white" />}
              {saving ? 'Saving…' : isEdit ? '💾 Update Order' : '⚡ Create MO'}
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

// ─── Action Buttons per MO Status ────────────────────────────────────────────
const MoActions = ({ mo, canManage, onEdit, onDelete, onConfirm, onStart, onComplete, onCancel }) => {
  if (!canManage) return null;
  return (
    <div className="flex items-center gap-1 flex-wrap">
      {mo.status === 'DRAFT' && (
        <>
          <button onClick={() => onConfirm(mo)} title="Confirm & Reserve Stock"
            className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 hover:bg-emerald-50 hover:text-emerald-600 transition">
            <FiCheck className="h-3.5 w-3.5" />
          </button>
          <button onClick={() => onEdit(mo)} title="Edit"
            className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 hover:bg-blue-50 hover:text-blue-600 transition">
            <FiEdit2 className="h-3.5 w-3.5" />
          </button>
          <button onClick={() => onDelete(mo)} title="Delete"
            className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-600 transition">
            <FiTrash2 className="h-3.5 w-3.5" />
          </button>
        </>
      )}
      {mo.status === 'CONFIRMED' && (
        <>
          <button onClick={() => onStart(mo)} title="Start Production"
            className="inline-flex h-7 items-center gap-1 rounded-lg px-2 text-xs font-semibold text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 transition">
            <FiPlay className="h-3 w-3" /> Start
          </button>
          <button onClick={() => onCancel(mo)} title="Cancel"
            className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 hover:bg-amber-50 hover:text-amber-600 transition">
            <FiX className="h-3.5 w-3.5" />
          </button>
        </>
      )}
      {mo.status === 'IN_PROGRESS' && (
        <button onClick={() => onComplete(mo)} title="Mark as Done"
          className="inline-flex h-7 items-center gap-1 rounded-lg px-2 text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition">
          <FiFlag className="h-3 w-3" /> Complete
        </button>
      )}
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────
const ManufacturingOrders = () => {
  const { user } = useAuth();
  const canManage = ['ADMIN', 'MANUFACTURING_USER', 'BUSINESS_OWNER'].includes(user?.role);

  const [orders,       setOrders]       = useState([]);
  const [products,     setProducts]     = useState([]);
  const [boms,         setBoms]         = useState([]);
  const [mfgUsers,     setMfgUsers]     = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [modalOpen,    setModalOpen]    = useState(false);
  const [editingMO,    setEditingMO]    = useState(null);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, mo: null });
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [search,       setSearch]       = useState('');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [ordersRes, productsRes, bomsRes, usersRes] = await Promise.all([
        getManufacturingOrders(),
        getProducts(),
        getBOMs(),
        getMfgUsers(),
      ]);
      setOrders(ordersRes.data.data   || ordersRes.data);
      setProducts(productsRes.data.data || productsRes.data);
      setBoms(bomsRes.data.data         || bomsRes.data);
      setMfgUsers(usersRes.data.data    || usersRes.data);
    } catch {
      toast.error('Failed to load manufacturing data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const toggleRow = (id) =>
    setExpandedRows((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const openCreate  = () => { setEditingMO(null); setModalOpen(true); };
  const openEdit    = (mo) => { setEditingMO(mo); setModalOpen(true); };

  const handleDelete = async () => {
    try {
      await deleteManufacturingOrder(deleteDialog.mo.id);
      toast.success(`MO #${deleteDialog.mo.id} deleted.`);
      setDeleteDialog({ open: false, mo: null });
      fetchAll();
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Failed to delete MO.');
    }
  };

  const handleConfirm = async (mo) => {
    try {
      const res = await confirmMO(mo.id);
      const notifications = res.data.data?.procurementNotifications || [];
      toast.success(`MO #${mo.id} confirmed and stock reserved!`);
      notifications.forEach((n) => {
        if (n.type === 'ERROR') toast.error(`Procurement: ${n.message}`);
        else toast(n.message, { icon: '📦' });
      });
      fetchAll();
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Failed to confirm MO.');
    }
  };

  const handleStart = async (mo) => {
    try {
      await startMO(mo.id);
      toast.success(`MO #${mo.id} started — production in progress!`);
      fetchAll();
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Failed to start MO.');
    }
  };

  const handleComplete = async (mo) => {
    try {
      await completeMO(mo.id);
      toast.success(`MO #${mo.id} completed! Stock updated.`);
      fetchAll();
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Failed to complete MO.');
    }
  };

  const handleCancel = async (mo) => {
    try {
      await cancelMO(mo.id);
      toast.success(`MO #${mo.id} cancelled.`);
      fetchAll();
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Failed to cancel MO.');
    }
  };

  const handleWorkOrderStatus = async (woId, status) => {
    try {
      await updateWorkOrder(woId, { status });
      toast.success(`Work order updated to ${status}.`);
      fetchAll();
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Failed to update work order.');
    }
  };

  const filtered = search
    ? orders.filter((o) =>
        o.product?.name.toLowerCase().includes(search.toLowerCase()) ||
        String(o.id).includes(search)
      )
    : orders;

  // Status counts
  const counts = {
    DRAFT: orders.filter((o) => o.status === 'DRAFT').length,
    CONFIRMED: orders.filter((o) => o.status === 'CONFIRMED').length,
    IN_PROGRESS: orders.filter((o) => o.status === 'IN_PROGRESS').length,
    DONE: orders.filter((o) => o.status === 'DONE').length,
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="rounded-3xl border border-gray-200 bg-white px-6 py-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Manufacturing Orders</h1>
            <p className="text-sm text-slate-500">
              Track production runs from draft through completion. Stock is reserved on confirm and consumed on done.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchAll}
              title="Refresh"
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 text-slate-500 hover:bg-emerald-50 hover:text-emerald-600 transition"
            >
              <FiRefreshCw className="h-4 w-4" />
            </button>
            {canManage && (
              <button
                id="btn-new-mo"
                onClick={openCreate}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 active:scale-95"
              >
                <FiPlus className="h-4 w-4" /> New MO
              </button>
            )}
          </div>
        </div>

        {/* Status summary pills */}
        <div className="mt-4 flex flex-wrap gap-2">
          {[
            { label: 'Draft',       count: counts.DRAFT,       color: 'bg-gray-100 text-gray-700'       },
            { label: 'Confirmed',   count: counts.CONFIRMED,   color: 'bg-blue-100 text-blue-700'       },
            { label: 'In Progress', count: counts.IN_PROGRESS, color: 'bg-indigo-100 text-indigo-700'   },
            { label: 'Done',        count: counts.DONE,        color: 'bg-emerald-100 text-emerald-700' },
          ].map(({ label, count, color }) => (
            <span key={label} className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${color}`}>
              {label}: <strong>{count}</strong>
            </span>
          ))}
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <FiSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search by product or MO #…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-xl border border-gray-200 bg-white pl-9 pr-3 py-2.5 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition shadow-sm"
        />
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <LoadingSpinner fullPage={false} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-3xl border border-gray-100 bg-white p-12 text-center shadow-sm">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-400 mx-auto mb-4">
            <FiZap className="h-7 w-7" />
          </div>
          <p className="text-base font-semibold text-slate-700">No Manufacturing Orders</p>
          <p className="mt-1 text-sm text-slate-400">
            {search ? 'No orders match your search.' : 'Create a manufacturing order to start production.'}
          </p>
          {canManage && !search && (
            <button onClick={openCreate} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition">
              <FiPlus className="h-4 w-4" /> New MO
            </button>
          )}
        </div>
      ) : (
        <div className="rounded-3xl border border-gray-100 bg-white overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-slate-50">
                <th className="w-8 px-4 py-3" />
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-400">MO #</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-400">Product</th>
                <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-400">Qty</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-400">Status</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-400">BoM</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-400">Assigned To</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-400">Updated</th>
                {canManage && <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-400">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((mo, i) => {
                const expanded = expandedRows.has(mo.id);
                return (
                  <React.Fragment key={mo.id}>
                    <tr
                      key={mo.id}
                      className={`group transition-colors hover:bg-emerald-50/20 cursor-pointer ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}`}
                      onClick={() => toggleRow(mo.id)}
                    >
                      <td className="px-4 py-3.5 text-slate-400">
                        {expanded
                          ? <FiChevronDown className="h-4 w-4" />
                          : <FiChevronRight className="h-4 w-4" />}
                      </td>

                      <td className="px-4 py-3.5">
                        <span className="font-mono text-xs font-bold text-emerald-600">#{mo.id}</span>
                      </td>

                      <td className="px-4 py-3.5">
                        <p className="font-semibold text-slate-800">{mo.product?.name || '-'}</p>
                        <p className="text-xs font-mono text-slate-400">{mo.product?.sku}</p>
                      </td>

                      <td className="px-4 py-3.5 text-center">
                        <span className="inline-flex items-center justify-center h-7 min-w-[2.5rem] rounded-lg bg-emerald-100 px-2 text-sm font-bold text-emerald-700">
                          {mo.qty}
                        </span>
                      </td>

                      <td className="px-4 py-3.5">
                        <StatusBadge status={mo.status} />
                      </td>

                      <td className="px-4 py-3.5 text-xs text-slate-500">
                        <span className="font-mono text-indigo-600">#{mo.bomId}</span>
                        <span className="text-slate-400 ml-1">({mo.bom?.components?.length ?? 0} parts)</span>
                      </td>

                      <td className="px-4 py-3.5 text-xs text-slate-600">
                        {mo.assignedTo?.name || <span className="text-slate-300">—</span>}
                      </td>

                      <td className="px-4 py-3.5 text-xs text-slate-500">{formatDate(mo.updatedAt)}</td>

                      {canManage && (
                        <td className="px-4 py-3.5" onClick={(e) => e.stopPropagation()}>
                          <MoActions
                            mo={mo}
                            canManage={canManage}
                            onEdit={openEdit}
                            onDelete={(m) => setDeleteDialog({ open: true, mo: m })}
                            onConfirm={handleConfirm}
                            onStart={handleStart}
                            onComplete={handleComplete}
                            onCancel={handleCancel}
                          />
                        </td>
                      )}
                    </tr>

                    {expanded && (
                      <MoExpandedRow
                        mo={mo}
                        onWorkOrderStatusChange={handleWorkOrderStatus}
                      />
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      <MOModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        mo={editingMO}
        products={products}
        boms={boms}
        mfgUsers={mfgUsers}
        onSaved={fetchAll}
      />

      {/* Delete Dialog */}
      <ConfirmDialog
        isOpen={deleteDialog.open}
        onClose={() => setDeleteDialog({ open: false, mo: null })}
        onConfirm={handleDelete}
        title="Delete Manufacturing Order"
        message={`Delete MO #${deleteDialog.mo?.id} for "${deleteDialog.mo?.product?.name || 'this product'}"? This cannot be undone.`}
        confirmText="Delete"
        variant="danger"
      />
    </div>
  );
};

export default ManufacturingOrders;
