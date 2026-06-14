import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { FiDownload, FiPlus, FiUpload } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { getProducts } from '../api/products';
import DataTable from '../components/DataTable';
import LoadingSpinner from '../components/LoadingSpinner';

const Products = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await getProducts();
        setProducts(res.data.data || res.data);
      } catch (error) {
        console.error('Products load failed', error);
        toast.error('Failed to load products.');
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  const columns = [
    { header: 'Name', accessor: 'name' },
    { header: 'SKU', accessor: 'sku' },
    { header: 'Category', accessor: 'category' },
    {
      header: 'Sales Price',
      accessor: (item) => `₹${Number(item.salesPrice ?? 0).toFixed(2)}`,
    },
    {
      header: 'Cost Price',
      accessor: (item) => `₹${Number(item.costPrice ?? 0).toFixed(2)}`,
    },
    { header: 'On Hand', accessor: 'onHandQty' },
    { header: 'Reserved', accessor: 'reservedQty' },
    {
      header: 'Procurement',
      accessor: (item) => `${item.procurementStrategy || '-'} / ${item.procurementType || '-'}`,
    },
    { header: 'Vendor', accessor: 'vendor.name' },
  ];

  const handleComingSoon = (label) => {
    toast(`${label} option is not available yet.`);
  };

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-gray-200 bg-white px-6 py-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-slate-900">Products</h2>
            <p className="text-sm text-slate-500">Browse products and inventory details.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => handleComingSoon('Export')}
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-slate-100 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-200"
            >
              <FiDownload className="h-4 w-4" />
              Export
            </button>
            <button
              type="button"
              onClick={() => handleComingSoon('Import')}
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-slate-100 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-200"
            >
              <FiUpload className="h-4 w-4" />
              Import
            </button>
            <button
              type="button"
              onClick={() => navigate('/products/new')}
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
            >
              <FiPlus className="h-4 w-4" />
              Add product
            </button>
          </div>
        </div>
      </div>
      {loading ? (
        <LoadingSpinner fullPage={false} />
      ) : (
        <DataTable columns={columns} data={products} emptyMessage="No products found." />
      )}
    </div>
  );
};

export default Products;
