import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
  FiPlus, FiEdit2, FiTrash2, FiX,
  FiUser, FiMail, FiPhone, FiMapPin, FiFileText, FiBriefcase,
} from 'react-icons/fi';
import {
  getVendors,
  createVendor,
  updateVendor,
  deleteVendor,
} from '../api/vendors';
import DataTable from '../components/DataTable';
import LoadingSpinner from '../components/LoadingSpinner';
import ConfirmDialog from '../components/ConfirmDialog';
import { useAuth } from '../context/AuthContext';

// ─── Vendor Form Modal ────────────────────────────────────────────────────────
const VendorModal = ({ isOpen, onClose, vendor, onSaved }) => {
  const isEdit = Boolean(vendor);

  const [name, setName] = useState('');
  const [companyRegNo, setCompanyRegNo] = useState('');
  const [gstNumber, setGstNumber] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [contact, setContact] = useState('');
  const [address, setAddress] = useState('');
  const [saving, setSaving] = useState(false);

  // Populate form when vendor changes
  useEffect(() => {
    if (!isOpen) return;
    if (vendor) {
      setName(vendor.name || '');
      setCompanyRegNo(vendor.companyRegNo || '');
      setGstNumber(vendor.gstNumber || '');
      setEmail(vendor.email || '');
      setPhone(vendor.phone || '');
      setContact(vendor.contact || '');
      setAddress(vendor.address || '');
    } else {
      setName('');
      setCompanyRegNo('');
      setGstNumber('');
      setEmail('');
      setPhone('');
      setContact('');
      setAddress('');
    }
  }, [isOpen, vendor]);

  const handleClear = () => {
    setName('');
    setCompanyRegNo('');
    setGstNumber('');
    setEmail('');
    setPhone('');
    setContact('');
    setAddress('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) { toast.error('Company name is required.'); return; }

    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        companyRegNo: companyRegNo.trim() || null,
        gstNumber: gstNumber.trim() || null,
        email: email.trim() || null,
        phone: phone.trim() || null,
        contact: contact.trim() || null,
        address: address.trim() || null,
      };

      if (isEdit) {
        await updateVendor(vendor.id, payload);
        toast.success('Vendor updated successfully!');
      } else {
        await createVendor(payload);
        toast.success('Vendor created successfully!');
      }
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Failed to save vendor.');
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
      <div className="relative w-full max-w-3xl rounded-2xl bg-gray-50 shadow-2xl">
        {/* ── Header ── */}
        <div className="flex items-center justify-between rounded-t-2xl border-b border-gray-200 bg-white px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
              <FiBriefcase className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                {isEdit ? `Edit Vendor — ${vendor?.name}` : 'Add New Vendor'}
              </h2>
              <p className="text-xs text-slate-500">
                {isEdit ? 'Update vendor details and contact information' : 'Fill in the vendor details to add a new supplier'}
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

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 gap-4 p-4 lg:grid-cols-[1fr_280px]">

            {/* ── LEFT: Main Details ── */}
            <div className="space-y-4">
              {/* Company Info */}
              <div className="rounded-xl border border-gray-200 bg-white p-4">
                <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-violet-600">
                  <FiBriefcase className="h-4 w-4" /> Company Information
                </h3>
                <div className="space-y-3">
                  {/* Company Name */}
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-slate-600">
                      Company Name <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <FiBriefcase className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <input
                        id="vendor-name"
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Tata Steel Ltd."
                        required
                        className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2.5 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100 transition"
                      />
                    </div>
                  </div>

                  {/* Company Reg No + GST */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-slate-600">
                        Company Reg. Number
                      </label>
                      <div className="relative">
                        <FiFileText className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                          id="vendor-reg-no"
                          type="text"
                          value={companyRegNo}
                          onChange={(e) => setCompanyRegNo(e.target.value)}
                          placeholder="e.g. U27100MH1907PLC000023"
                          className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2.5 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100 transition"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-slate-600">
                        GST Number
                      </label>
                      <div className="relative">
                        <FiFileText className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                          id="vendor-gst"
                          type="text"
                          value={gstNumber}
                          onChange={(e) => setGstNumber(e.target.value.toUpperCase())}
                          placeholder="e.g. 27AAACT2727Q1ZW"
                          maxLength={15}
                          className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2.5 text-sm font-mono outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100 transition"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Contact Info */}
              <div className="rounded-xl border border-gray-200 bg-white p-4">
                <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-violet-600">
                  <FiUser className="h-4 w-4" /> Contact Details
                </h3>
                <div className="space-y-3">
                  {/* Contact Person */}
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-slate-600">
                      Contact Person
                    </label>
                    <div className="relative">
                      <FiUser className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <input
                        id="vendor-contact"
                        type="text"
                        value={contact}
                        onChange={(e) => setContact(e.target.value)}
                        placeholder="e.g. Rahul Sharma"
                        className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2.5 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100 transition"
                      />
                    </div>
                  </div>

                  {/* Email + Phone */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-slate-600">
                        Email Address
                      </label>
                      <div className="relative">
                        <FiMail className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                          id="vendor-email"
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="vendor@company.com"
                          className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2.5 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100 transition"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-slate-600">
                        Phone No.
                      </label>
                      <div className="relative">
                        <FiPhone className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                          id="vendor-phone"
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="e.g. +91 98765 43210"
                          className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2.5 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100 transition"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Address */}
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-slate-600">
                      Address
                    </label>
                    <div className="relative">
                      <FiMapPin className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
                      <textarea
                        id="vendor-address"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="Full business address…"
                        rows={3}
                        className="w-full resize-none rounded-lg border border-slate-300 pl-9 pr-3 py-2.5 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100 transition"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ── RIGHT: Summary Card ── */}
            <div className="space-y-4">
              {/* Preview Card */}
              <div className="rounded-xl border border-gray-200 bg-white p-4">
                <h3 className="mb-3 text-sm font-semibold text-slate-700">Vendor Preview</h3>

                <div className="space-y-3">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-violet-100 text-violet-700">
                    <FiBriefcase className="h-7 w-7" />
                  </div>

                  <div>
                    <p className="text-base font-semibold text-slate-800 break-words">
                      {name || <span className="text-slate-300 italic">Company Name</span>}
                    </p>
                    {gstNumber && (
                      <p className="mt-0.5 font-mono text-xs text-slate-500">GST: {gstNumber}</p>
                    )}
                    {companyRegNo && (
                      <p className="font-mono text-xs text-slate-400">Reg: {companyRegNo}</p>
                    )}
                  </div>

                  <div className="border-t border-slate-100 pt-3 space-y-1.5">
                    {contact && (
                      <div className="flex items-center gap-2 text-xs text-slate-600">
                        <FiUser className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                        {contact}
                      </div>
                    )}
                    {email && (
                      <div className="flex items-center gap-2 text-xs text-slate-600">
                        <FiMail className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                        <span className="truncate">{email}</span>
                      </div>
                    )}
                    {phone && (
                      <div className="flex items-center gap-2 text-xs text-slate-600">
                        <FiPhone className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                        {phone}
                      </div>
                    )}
                    {address && (
                      <div className="flex items-start gap-2 text-xs text-slate-600">
                        <FiMapPin className="h-3.5 w-3.5 text-slate-400 flex-shrink-0 mt-0.5" />
                        <span className="whitespace-pre-wrap">{address}</span>
                      </div>
                    )}
                    {!contact && !email && !phone && !address && (
                      <p className="text-xs text-slate-300 italic">Contact details will appear here…</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Field summary */}
              <div className="rounded-xl border border-gray-100 bg-slate-50 p-3">
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Fields</p>
                <div className="space-y-1">
                  {[
                    { label: 'Company Name', value: name, required: true },
                    { label: 'Reg. No.', value: companyRegNo },
                    { label: 'GST No.', value: gstNumber },
                    { label: 'Email', value: email },
                    { label: 'Phone', value: phone },
                    { label: 'Contact', value: contact },
                    { label: 'Address', value: address },
                  ].map(({ label, value, required }) => (
                    <div key={label} className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">
                        {label}
                        {required && <span className="text-red-400 ml-0.5">*</span>}
                      </span>
                      <span
                        className={`font-medium ${value ? 'text-emerald-600' : 'text-slate-300'}`}
                      >
                        {value ? '✓' : '—'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ── Footer ── */}
          <div className="flex items-center gap-3 rounded-b-2xl border-t border-gray-200 bg-white px-6 py-4">
            <button
              type="submit"
              disabled={saving}
              id="btn-save-vendor"
              className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-700 active:scale-95 disabled:opacity-50"
            >
              {saving && <LoadingSpinner size={14} className="text-white" />}
              {saving ? 'Saving…' : isEdit ? '💾 Update Vendor' : '➕ Add Vendor'}
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

// ─── Main Vendors Page ────────────────────────────────────────────────────────
const Vendors = () => {
  const { user } = useAuth();
  const canManage =
    user?.role === 'PURCHASE_USER' ||
    user?.role === 'ADMIN' ||
    user?.role === 'BUSINESS_OWNER';

  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState(null);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, vendor: null });

  const fetchVendors = useCallback(async () => {
    try {
      const res = await getVendors();
      setVendors(res.data.data || res.data);
    } catch {
      toast.error('Failed to load vendors.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVendors();
  }, [fetchVendors]);

  const openCreate = () => { setEditingVendor(null); setModalOpen(true); };
  const openEdit = (v) => { setEditingVendor(v); setModalOpen(true); };
  const openDelete = (v) => setDeleteDialog({ open: true, vendor: v });

  const handleDelete = async () => {
    try {
      await deleteVendor(deleteDialog.vendor.id);
      toast.success(`Vendor "${deleteDialog.vendor.name}" deleted.`);
      setDeleteDialog({ open: false, vendor: null });
      fetchVendors();
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Failed to delete vendor.');
    }
  };

  const columns = [
    {
      header: 'Company',
      accessor: (item) => (
        <div>
          <p className="text-sm font-semibold text-slate-800">{item.name}</p>
          {item.companyRegNo && (
            <p className="font-mono text-[10px] text-slate-400">Reg: {item.companyRegNo}</p>
          )}
        </div>
      ),
    },
    {
      header: 'GST Number',
      accessor: (item) =>
        item.gstNumber ? (
          <span className="font-mono text-xs font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
            {item.gstNumber}
          </span>
        ) : (
          <span className="text-slate-300 text-xs">—</span>
        ),
    },
    {
      header: 'Contact',
      accessor: (item) => (
        <div className="space-y-0.5">
          {item.contact && <p className="text-sm text-slate-700">{item.contact}</p>}
          {item.phone && (
            <p className="flex items-center gap-1 text-xs text-slate-500">
              <FiPhone className="h-3 w-3" /> {item.phone}
            </p>
          )}
        </div>
      ),
    },
    {
      header: 'Email',
      accessor: (item) =>
        item.email ? (
          <a
            href={`mailto:${item.email}`}
            className="text-sm text-blue-600 hover:underline"
          >
            {item.email}
          </a>
        ) : (
          <span className="text-slate-300 text-xs">—</span>
        ),
    },
    {
      header: 'Address',
      accessor: (item) =>
        item.address ? (
          <p className="text-xs text-slate-600 max-w-[200px] truncate" title={item.address}>
            {item.address}
          </p>
        ) : (
          <span className="text-slate-300 text-xs">—</span>
        ),
    },
    { header: 'Products', accessor: (item) => item.products?.length ?? 0 },
    ...(canManage
      ? [
          {
            header: 'Actions',
            accessor: (item) => (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => openEdit(item)}
                  title="Edit vendor"
                  className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 transition hover:bg-violet-50 hover:text-violet-600"
                >
                  <FiEdit2 className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => openDelete(item)}
                  title="Delete vendor"
                  className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 transition hover:bg-red-50 hover:text-red-600"
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
            <h2 className="text-2xl font-semibold text-slate-900">Vendors</h2>
            <p className="text-sm text-slate-500">
              {canManage
                ? 'Manage supplier profiles, contact details and company information.'
                : 'View vendor details and supplier relationships.'}
            </p>
          </div>
          {canManage && (
            <button
              id="btn-new-vendor"
              onClick={openCreate}
              className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-700 active:scale-95"
            >
              <FiPlus className="h-4 w-4" /> Add Vendor
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
          data={vendors}
          emptyMessage="No vendors found. Add your first supplier to get started."
        />
      )}

      {/* Vendor Modal */}
      <VendorModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        vendor={editingVendor}
        onSaved={fetchVendors}
      />

      {/* Delete Confirm Dialog */}
      <ConfirmDialog
        isOpen={deleteDialog.open}
        onClose={() => setDeleteDialog({ open: false, vendor: null })}
        onConfirm={handleDelete}
        title="Delete Vendor"
        message={`Are you sure you want to delete "${deleteDialog.vendor?.name}"? This action cannot be undone. Vendors with active purchase orders cannot be deleted.`}
        confirmText="Delete Vendor"
        variant="danger"
      />
    </div>
  );
};

export default Vendors;
