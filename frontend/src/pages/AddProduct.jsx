import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import {
  FiArrowLeft,
  FiBox,
  FiCalendar,
  FiChevronRight,
  FiImage,
  FiPlusCircle,
  FiSave,
} from 'react-icons/fi';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { createProduct, getProduct, updateProduct } from '../api/products';
import { getVendors } from '../api/vendors';

const categoryOptions = ['Finished Goods', 'Raw Material', 'Component', 'Packaging', 'Consumable'];

const emptyForm = {
  name: '',
  category: 'Finished Goods',
  status: 'Active',
  salesPrice: '',
  costPrice: '',
  onHandQty: '',
  reorderPoint: '',
  sku: '',
  barcode: '',
  vendorId: '',
  manufacturer: '',
  procurementStrategy: 'MTS',
  procurementType: 'PURCHASE',
};

const fieldClass =
  'h-12 w-full rounded-lg border border-slate-300 bg-white px-4 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-100';

const getErrorMessage = (error) =>
  error.response?.data?.error ||
  error.response?.data?.message ||
  error.message ||
  'Failed to save product.';

const AddProduct = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);
  const [form, setForm] = useState(emptyForm);
  const [vendors, setVendors] = useState([]);
  const [saving, setSaving] = useState(false);

  const todayLabel = useMemo(
    () => new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
    []
  );

  useEffect(() => {
    const fetchVendors = async () => {
      try {
        const res = await getVendors();
        setVendors(res.data.data || res.data);
      } catch (error) {
        console.error('Vendors load failed', error);
        toast.error('Failed to load vendors.');
      }
    };

    fetchVendors();
  }, []);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const res = await getProduct(Number(id));
        const p = res.data.data || res.data;
        setForm({
          name: p.name || '',
          category: p.category || 'Finished Goods',
          status: p.status || 'Active',
          salesPrice: p.salesPrice?.toString() || '',
          costPrice: p.costPrice?.toString() || '',
          onHandQty: p.onHandQty?.toString() || '',
          reorderPoint: p.reorderPoint?.toString() || '',
          sku: p.sku || '',
          barcode: p.barcode || '',
          vendorId: p.vendorId?.toString() || '',
          manufacturer: p.manufacturer || '',
          procurementStrategy: p.procurementStrategy || 'MTS',
          procurementType: p.procurementType || 'PURCHASE',
        });
      } catch (error) {
        console.error('Failed to load product', error);
        toast.error('Failed to load product details.');
        navigate('/products');
      }
    };

    if (isEdit) {
      fetchProduct();
    }
  }, [id, isEdit, navigate]);

  const updateField = (name, value) => {
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);

    try {
      const payload = {
        name: form.name.trim(),
        sku: form.sku.trim(),
        category: form.category,
        salesPrice: Number(form.salesPrice),
        costPrice: Number(form.costPrice || 0),
        onHandQty: Number(form.onHandQty || 0),
        reservedQty: 0,
        reorderPoint: Number(form.reorderPoint || 0),
        procurementStrategy: form.procurementStrategy,
        procurementType: form.procurementType,
        vendorId: form.vendorId ? Number(form.vendorId) : null,
      };

      if (isEdit) {
        await updateProduct(Number(id), payload);
        toast.success('Product updated.');
      } else {
        await createProduct(payload);
        toast.success('Product saved.');
      }
      navigate('/products');
    } catch (error) {
      console.error('Product save failed', error);
      toast.error(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={() => navigate('/products')}
            className="mt-1 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-700 transition hover:bg-slate-50"
            aria-label="Back to products"
          >
            <FiArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-semibold text-slate-950">{isEdit ? 'Edit Product' : 'Add Product'}</h1>
            <p className="text-sm font-medium text-slate-500">{isEdit ? 'Modify product details' : 'Add a new product to your inventory'}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-sm font-semibold text-slate-500">
          <Link to="/dashboard" className="text-primary-600 hover:text-primary-700">
            Home
          </Link>
          <FiChevronRight className="h-4 w-4" />
          <Link to="/products" className="text-primary-600 hover:text-primary-700">
            Products
          </Link>
          <FiChevronRight className="h-4 w-4" />
          <span>{isEdit ? 'Edit Product' : 'Add Product'}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(360px,0.9fr)]">
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-8 flex items-center gap-3 text-primary-600">
            <FiBox className="h-5 w-5" />
            <h2 className="text-lg font-semibold">Basic Information</h2>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-semibold text-slate-800">Title / Product Name *</span>
              <input
                required
                value={form.name}
                onChange={(event) => updateField('name', event.target.value)}
                placeholder="Enter product name"
                className={fieldClass}
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-semibold text-slate-800">Product Organization</span>
              <select
                value={form.category}
                onChange={(event) => updateField('category', event.target.value)}
                className={fieldClass}
              >
                {categoryOptions.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>

            <div className="space-y-2">
              <span className="text-sm font-semibold text-slate-800">Media / Image</span>
              <label className="flex min-h-28 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-primary-200 bg-primary-50/20 px-4 py-5 text-center transition hover:bg-primary-50">
                <FiImage className="mb-2 h-6 w-6 text-primary-600" />
                <span className="text-sm font-semibold text-slate-800">Click to upload image</span>
                <span className="mt-1 text-xs font-medium text-slate-500">JPG, PNG or WEBP (Max. 2MB)</span>
                <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" />
              </label>
            </div>

            <label className="space-y-2">
              <span className="text-sm font-semibold text-slate-800">Status</span>
              <select
                value={form.status}
                onChange={(event) => updateField('status', event.target.value)}
                className={fieldClass}
              >
                <option>Active</option>
                <option>Draft</option>
                <option>Archived</option>
              </select>
            </label>
          </div>
        </section>

        <div className="space-y-4">
          <section className="grid grid-cols-1 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm sm:grid-cols-2">
            <div className="space-y-2 border-b border-slate-200 p-5 sm:border-b-0 sm:border-r">
              <span className="text-sm font-semibold text-slate-800">Date</span>
              <div className="flex h-12 items-center gap-3 rounded-lg border border-slate-300 px-4 text-sm font-semibold text-slate-700">
                <FiCalendar className="h-4 w-4 text-slate-500" />
                {todayLabel}
              </div>
            </div>
            <div className="space-y-4 p-5">
              <span className="text-sm font-semibold text-slate-800">Status</span>
              <label className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => updateField('status', form.status === 'Active' ? 'Draft' : 'Active')}
                  className={`relative h-7 w-12 rounded-full transition ${
                    form.status === 'Active' ? 'bg-primary-600' : 'bg-slate-300'
                  }`}
                  aria-label="Toggle product status"
                >
                  <span
                    className={`absolute top-1 h-5 w-5 rounded-full bg-white transition ${
                      form.status === 'Active' ? 'left-6' : 'left-1'
                    }`}
                  />
                </button>
                <span className="text-sm font-semibold text-slate-800">{form.status}</span>
              </label>
            </div>
          </section>

          <section className="space-y-6 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <label className="space-y-2">
              <span className="text-sm font-semibold text-slate-800">Vendor</span>
              <select
                value={form.vendorId}
                onChange={(event) => updateField('vendorId', event.target.value)}
                className={fieldClass}
              >
                <option value="">Select vendor</option>
                {vendors.map((vendor) => (
                  <option key={vendor.id} value={vendor.id}>
                    {vendor.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2">
              <span className="text-sm font-semibold text-slate-800">Manufacturing</span>
              <input
                value={form.manufacturer}
                onChange={(event) => updateField('manufacturer', event.target.value)}
                placeholder="Enter manufacturer name"
                className={fieldClass}
              />
            </label>
          </section>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <section className="grid grid-cols-1 gap-6 rounded-lg border border-slate-200 bg-white p-5 shadow-sm md:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm font-semibold text-slate-800">Sale Price (₹) *</span>
            <input
              required
              min="0"
              step="0.01"
              type="number"
              value={form.salesPrice}
              onChange={(event) => updateField('salesPrice', event.target.value)}
              placeholder="Enter sale price"
              className={fieldClass}
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-semibold text-slate-800">Cost Price (₹)</span>
            <input
              min="0"
              step="0.01"
              type="number"
              value={form.costPrice}
              onChange={(event) => updateField('costPrice', event.target.value)}
              placeholder="Enter cost price"
              className={fieldClass}
            />
          </label>
        </section>

        <section className="grid grid-cols-1 gap-6 rounded-lg border border-slate-200 bg-white p-5 shadow-sm md:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm font-semibold text-slate-800">Inventory</span>
            <input
              min="0"
              type="number"
              value={form.reorderPoint}
              onChange={(event) => updateField('reorderPoint', event.target.value)}
              placeholder="Enter opening stock"
              className={fieldClass}
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-semibold text-slate-800">Quantity *</span>
            <input
              required
              min="0"
              type="number"
              value={form.onHandQty}
              onChange={(event) => updateField('onHandQty', event.target.value)}
              placeholder="Enter quantity"
              className={fieldClass}
            />
          </label>
        </section>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <label className="space-y-2">
            <span className="text-sm font-semibold text-slate-800">SKU *</span>
            <input
              required
              value={form.sku}
              onChange={(event) => updateField('sku', event.target.value)}
              placeholder="Enter SKU"
              className={fieldClass}
            />
          </label>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <label className="space-y-2">
            <span className="text-sm font-semibold text-slate-800">Barcode</span>
            <input
              value={form.barcode}
              onChange={(event) => updateField('barcode', event.target.value)}
              placeholder="Enter barcode number"
              className={fieldClass}
            />
          </label>
        </section>
      </div>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-7 flex items-center gap-3 text-primary-600">
          <FiBox className="h-5 w-5" />
          <h2 className="text-lg font-semibold">Variants</h2>
        </div>
        <button
          type="button"
          onClick={() => toast('Variants option is not available yet.')}
          className="flex min-h-36 w-full flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white px-4 text-center transition hover:border-primary-300 hover:bg-primary-50/30"
        >
          <FiPlusCircle className="mb-3 h-8 w-8 text-primary-700" />
          <span className="text-sm font-semibold text-slate-700">Add options like size or color</span>
          <span className="mt-2 text-xs font-semibold text-slate-500">
            Example: Size (S, M, L), Color (Red, Blue, Green)
          </span>
        </button>
      </section>

      <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={() => navigate('/products')}
          disabled={saving}
          className="h-12 rounded-lg border border-slate-300 bg-white px-10 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-primary-600 px-10 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-700 disabled:opacity-50"
        >
          <FiSave className="h-5 w-5" />
          {saving ? 'Saving...' : isEdit ? 'Update Product' : 'Save Product'}
        </button>
      </div>
    </form>
  );
};

export default AddProduct;
