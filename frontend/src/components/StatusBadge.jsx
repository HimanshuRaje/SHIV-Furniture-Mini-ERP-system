import React from 'react';

const statusConfig = {
  DRAFT: { bg: 'bg-gray-100', text: 'text-gray-700', dot: 'bg-gray-400' },
  CONFIRMED: { bg: 'bg-blue-100', text: 'text-blue-700', dot: 'bg-blue-400' },
  PARTIALLY_DELIVERED: { bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-400' },
  PARTIALLY_RECEIVED: { bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-400' },
  FULLY_DELIVERED: { bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-400' },
  FULLY_RECEIVED: { bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-400' },
  CANCELLED: { bg: 'bg-rose-100', text: 'text-rose-700', dot: 'bg-rose-400' },
  IN_PROGRESS: { bg: 'bg-indigo-100', text: 'text-indigo-700', dot: 'bg-indigo-400' },
  DONE: { bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-400' },
  PENDING: { bg: 'bg-gray-100', text: 'text-gray-700', dot: 'bg-gray-400' },
};

const StatusBadge = ({ status }) => {
  const config = statusConfig[status] || statusConfig.DRAFT;
  let label = status?.replace(/_/g, ' ') || 'UNKNOWN';
  if (status === 'CONFIRMED') {
    label = 'PENDING';
  } else if (status === 'FULLY_RECEIVED') {
    label = 'RECEIVED';
  }

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${config.bg} ${config.text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${config.dot}`} />
      {label}
    </span>
  );
};

export default StatusBadge;
