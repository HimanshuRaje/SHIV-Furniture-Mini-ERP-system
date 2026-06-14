import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import StatusBadge from '../components/StatusBadge';
import { getPurchaseOrders } from '../api/purchase';
import DataTable from '../components/DataTable';
import LoadingSpinner from '../components/LoadingSpinner';

const formatDate = (value) => {
  return value ? new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '-';
};

const PurchaseOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const res = await getPurchaseOrders();
        setOrders(res.data.data || res.data);
      } catch (error) {
        console.error('Purchase orders load failed', error);
        toast.error('Failed to load purchase orders.');
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, []);

  const columns = [
    { header: 'Order #', accessor: 'id' },
    { header: 'Vendor', accessor: 'vendor.name' },
    { header: 'Status', accessor: (item) => <StatusBadge status={item.status} /> },
    { header: 'Order Date', accessor: (item) => formatDate(item.orderDate) },
    { header: 'Created By', accessor: 'createdBy.name' },
    { header: 'Lines', accessor: (item) => item.lines?.length ?? 0 },
    {
      header: 'Total Qty',
      accessor: (item) => item.lines?.reduce((sum, line) => sum + (line.qty || 0), 0) ?? 0,
    },
    {
      header: 'Total Cost',
      accessor: (item) => {
        const total = item.lines?.reduce(
          (sum, line) => sum + (Number(line.unitCost || 0) * (line.qty || 0)),
          0
        );
        return `₹${Number(total || 0).toFixed(2)}`;
      },
    },
  ];

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-gray-200 bg-white px-6 py-6 shadow-sm">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">Purchase Orders</h2>
          <p className="text-sm text-slate-500">Review purchase orders and receipt status.</p>
        </div>
      </div>
      {loading ? (
        <LoadingSpinner fullPage={false} />
      ) : (
        <DataTable columns={columns} data={orders} emptyMessage="No purchase orders found." />
      )}
    </div>
  );
};

export default PurchaseOrders;

