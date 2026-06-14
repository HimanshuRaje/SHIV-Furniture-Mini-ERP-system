import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import {
  FiDownload,
  FiPlus,
  FiUpload,
  FiSearch,
  FiTrash2,
  FiEdit2,
  FiChevronDown,
  FiBox,
  FiArrowUp,
  FiArrowDown,
} from 'react-icons/fi';
import { useNavigate, Link } from 'react-router-dom';
import { getProducts, deleteProduct, updateProduct } from '../api/products';
import LoadingSpinner from '../components/LoadingSpinner';
import { useAuth } from '../context/AuthContext';

const Products = () => {
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  const canManage = hasRole(['ADMIN', 'PRODUCT_MANAGER', 'PURCHASE_USER']);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Tabs and filtering states
  const [selectedTab, setSelectedTab] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  
  // Sorting states
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');
  
  // Selection states (for bulk actions)
  const [selectedIds, setSelectedIds] = useState([]);
  const [showBulkMenu, setShowBulkMenu] = useState(false);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const res = await getProducts();
      setProducts(res.data.data || res.data);
    } catch (error) {
      console.error('Products load failed', error);
      toast.error('Failed to load products.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleComingSoon = (label) => {
    toast(`${label} option is not available yet.`);
  };

  // Sorting handler
  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  // Checkbox handlers
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(filteredProducts.map((p) => p.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((item) => item !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  // Individual Delete handler
  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;
    try {
      await deleteProduct(id);
      toast.success('Product deleted.');
      setSelectedIds(selectedIds.filter((item) => item !== id));
      fetchProducts();
    } catch (error) {
      console.error('Failed to delete product', error);
      toast.error(error.response?.data?.error || 'Failed to delete product.');
    }
  };

  // Bulk actions handlers
  const handleBulkDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete the ${selectedIds.length} selected products?`)) return;
    try {
      await Promise.all(selectedIds.map((id) => deleteProduct(id)));
      toast.success('Selected products deleted.');
      setSelectedIds([]);
      setShowBulkMenu(false);
      fetchProducts();
    } catch (error) {
      console.error('Bulk delete failed', error);
      toast.error('Failed to delete some products.');
      fetchProducts();
    }
  };

  const handleBulkStatusUpdate = async (status) => {
    try {
      await Promise.all(
        selectedIds.map((id) => {
          const original = products.find((p) => p.id === id);
          return updateProduct(id, { ...original, status });
        })
      );
      toast.success(`Selected products marked as ${status}.`);
      setSelectedIds([]);
      setShowBulkMenu(false);
      fetchProducts();
    } catch (error) {
      console.error('Bulk status update failed', error);
      toast.error('Failed to update status.');
      fetchProducts();
    }
  };

  // Filters logic
  const filteredProducts = products
    .filter((p) => {
      // 1. Status Tab filter
      if (selectedTab === 'Active') return p.status === 'Active';
      if (selectedTab === 'Draft') return p.status === 'Draft';
      if (selectedTab === 'Archived') return p.status === 'Archived';
      return true; // 'All'
    })
    .filter((p) => {
      // 2. Search term filter
      if (!searchTerm) return true;
      const lower = searchTerm.toLowerCase();
      return (
        p.name.toLowerCase().includes(lower) ||
        (p.sku && p.sku.toLowerCase().includes(lower)) ||
        (p.category && p.category.toLowerCase().includes(lower)) ||
        (p.type && p.type.toLowerCase().includes(lower)) ||
        (p.vendor?.name && p.vendor.name.toLowerCase().includes(lower))
      );
    })
    .sort((a, b) => {
      // 3. Sorting logic
      let fieldA = a[sortBy];
      let fieldB = b[sortBy];

      // Handle nested vendor object
      if (sortBy === 'vendor') {
        fieldA = a.vendor?.name || '';
        fieldB = b.vendor?.name || '';
      }

      if (typeof fieldA === 'string') {
        return sortOrder === 'asc'
          ? fieldA.localeCompare(fieldB)
          : fieldB.localeCompare(fieldA);
      } else {
        // Numeric/Decimal/Nulls
        const numA = Number(fieldA ?? 0);
        const numB = Number(fieldB ?? 0);
        return sortOrder === 'asc' ? numA - numB : numB - numA;
      }
    });

  return (
    <div className="space-y-6">
      {/* ─── Top Header Action Bar ─── */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Products</h2>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => handleComingSoon('Export')}
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-white border border-slate-300 px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            <FiDownload className="h-4 w-4" />
            Export
          </button>
          <button
            type="button"
            onClick={() => handleComingSoon('Import')}
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-white border border-slate-300 px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            <FiUpload className="h-4 w-4" />
            Import
          </button>
          
          {/* More Actions Dropdown */}
          {canManage && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowBulkMenu((prev) => !prev)}
                className="inline-flex h-9 items-center gap-2 rounded-lg bg-white border border-slate-300 px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
              >
                More actions
                <FiChevronDown className="h-4 w-4" />
              </button>

              {showBulkMenu && (
                <div className="absolute right-0 mt-1.5 z-10 w-48 rounded-lg border border-slate-200 bg-white py-1.5 shadow-lg">
                  {selectedIds.length > 0 ? (
                    <>
                      <div className="px-3 py-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        Bulk Actions ({selectedIds.length})
                      </div>
                      <button
                        type="button"
                        onClick={() => handleBulkStatusUpdate('Active')}
                        className="flex w-full items-center px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                      >
                        Mark as Active
                      </button>
                      <button
                        type="button"
                        onClick={() => handleBulkStatusUpdate('Draft')}
                        className="flex w-full items-center px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                      >
                        Mark as Draft
                      </button>
                      <button
                        type="button"
                        onClick={() => handleBulkStatusUpdate('Archived')}
                        className="flex w-full items-center px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                      >
                        Mark as Archived
                      </button>
                      <div className="h-px bg-slate-100 my-1"></div>
                      <button
                        type="button"
                        onClick={handleBulkDelete}
                        className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm font-medium text-red-600 hover:bg-red-50"
                      >
                        <FiTrash2 className="h-4 w-4" />
                        Delete Selected
                      </button>
                    </>
                  ) : (
                    <div className="px-4 py-3 text-center text-xs text-slate-400">
                      Select items below to use bulk actions.
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {canManage && (
            <button
              type="button"
              onClick={() => navigate('/products/new')}
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
            >
              <FiPlus className="h-4 w-4" />
              Add product
            </button>
          )}
        </div>
      </div>

      {/* ─── Main Content Card ─── */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        
        {/* Card Header (Tabs & Filters) */}
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-2.5">
          {/* Status Tabs */}
          <div className="flex items-center gap-1">
            {['All', 'Active', 'Draft', 'Archived'].map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setSelectedTab(tab)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  selectedTab === tab
                    ? 'bg-slate-100 text-slate-900'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {tab}
              </button>
            ))}
            <button
              type="button"
              onClick={() => handleComingSoon('Add tab')}
              className="px-2 py-1.5 text-xs font-semibold text-slate-400 hover:text-slate-950 transition"
              aria-label="Add custom tab"
            >
              +
            </button>
          </div>

          {/* Search Toggle & Quick Filters */}
          <div className="flex items-center gap-2">
            <div className="relative flex items-center">
              {isSearchOpen ? (
                <div className="flex items-center gap-2 animate-fade-in">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search products..."
                    className="h-8 w-48 rounded-lg border border-slate-300 px-3 text-xs outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setSearchTerm('');
                      setIsSearchOpen(false);
                    }}
                    className="text-xs font-medium text-slate-500 hover:text-slate-800"
                  >
                    Clear
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsSearchOpen(true)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition"
                  title="Search products"
                >
                  <FiSearch className="h-4 w-4" />
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => handleSort('name')}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition"
              title="Sort items"
            >
              {sortOrder === 'asc' ? (
                <FiArrowUp className="h-4 w-4" />
              ) : (
                <FiArrowDown className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        {/* ─── Table Content ─── */}
        {loading ? (
          <div className="py-20">
            <LoadingSpinner fullPage={false} />
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="py-16 text-center text-sm text-slate-500">
            No products found matching criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] table-auto text-left border-collapse">
              <thead className="bg-slate-50/50 text-[11px] font-semibold text-slate-500 uppercase border-b border-slate-100">
                <tr>
                  {canManage && (
                    <th className="w-12 py-3 px-4 text-center">
                      <input
                        type="checkbox"
                        onChange={handleSelectAll}
                        checked={
                          filteredProducts.length > 0 &&
                          selectedIds.length === filteredProducts.length
                        }
                        className="rounded border-slate-300 text-slate-900 focus:ring-slate-500"
                      />
                    </th>
                  )}
                  <th
                    className="py-3 px-4 font-semibold cursor-pointer hover:bg-slate-50/80 transition"
                    onClick={() => handleSort('name')}
                  >
                    <span className="flex items-center gap-1">
                      Product
                      {sortBy === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </span>
                  </th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                  <th className="py-3 px-4 font-semibold">Inventory</th>
                  <th className="py-3 px-4 font-semibold text-center">Sales channels</th>
                  <th className="py-3 px-4 font-semibold text-center">Markets</th>
                  <th className="py-3 px-4 font-semibold">Category</th>
                  <th className="py-3 px-4 font-semibold">Type</th>
                  <th className="py-3 px-4 font-semibold">Vendor</th>
                  {canManage && <th className="py-3 px-4 font-semibold text-right pr-6">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                {filteredProducts.map((item) => {
                  const isChecked = selectedIds.includes(item.id);
                  const isMto = item.procurementStrategy === 'MTO';
                  
                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-slate-50/50 transition-colors ${
                        isChecked ? 'bg-slate-50/30' : ''
                      }`}
                    >
                      {/* Checkbox cell */}
                      {canManage && (
                        <td className="py-3.5 px-4 text-center">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleSelectOne(item.id)}
                            className="rounded border-slate-300 text-slate-900 focus:ring-slate-500"
                          />
                        </td>
                      )}

                      {/* Product cell with thumbnail */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          {/* Shopify-style placeholder thumbnail */}
                          <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400">
                            <FiBox className="h-5 w-5 text-slate-400" />
                          </div>
                          <div>
                            {canManage ? (
                              <Link
                                to={`/products/edit/${item.id}`}
                                className="font-semibold text-slate-900 hover:text-slate-950 hover:underline block"
                              >
                                {item.name}
                              </Link>
                            ) : (
                              <span className="font-semibold text-slate-900 block">
                                {item.name}
                              </span>
                            )}
                            <span className="text-xs text-slate-400 font-mono block">
                              {item.sku || '-'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Status cell */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border ${
                            item.status === 'Active'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : item.status === 'Draft'
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-slate-100 text-slate-600 border-slate-200'
                          }`}
                        >
                          {item.status || 'Active'}
                        </span>
                      </td>

                      {/* Inventory cell */}
                      <td className="py-3.5 px-4">
                        {isMto ? (
                          <span className="text-slate-400 text-xs italic">
                            Inventory not tracked
                          </span>
                        ) : (
                          <span
                            className={`font-semibold ${
                              item.onHandQty > 0 ? 'text-slate-900' : 'text-red-600'
                            }`}
                          >
                            {item.onHandQty > 0
                              ? `${item.onHandQty} in stock`
                              : 'Out of stock'}
                          </span>
                        )}
                      </td>

                      {/* Sales channels (fixed demo) */}
                      <td className="py-3.5 px-4 text-center font-medium text-slate-600">
                        2
                      </td>

                      {/* Markets (fixed demo) */}
                      <td className="py-3.5 px-4 text-center font-medium text-slate-600">
                        2
                      </td>

                      {/* Category cell */}
                      <td className="py-3.5 px-4 text-slate-500 font-medium">
                        {item.category || '-'}
                      </td>

                      {/* Type cell */}
                      <td className="py-3.5 px-4 text-slate-500 font-medium">
                        {item.type || 'Standard'}
                      </td>

                      {/* Vendor cell */}
                      <td className="py-3.5 px-4 text-slate-500 font-medium">
                        {item.vendor?.name || '-'}
                      </td>

                      {/* Row Actions cell */}
                      {canManage && (
                        <td className="py-3.5 px-4 text-right pr-6">
                          <div className="inline-flex items-center justify-end gap-2.5">
                            <Link
                              to={`/products/edit/${item.id}`}
                              className="inline-flex h-7 w-7 items-center justify-center rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition"
                              title="Edit Product"
                            >
                              <FiEdit2 className="h-4 w-4" />
                            </Link>
                            <button
                              type="button"
                              onClick={() => handleDelete(item.id)}
                              className="inline-flex h-7 w-7 items-center justify-center rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 transition"
                              title="Delete Product"
                            >
                              <FiTrash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Products;
