import api from './axios';

export const getPurchaseOrders = () => api.get('/purchase-orders');

export const getPurchaseOrder = (id) => api.get(`/purchase-orders/${id}`);

export const createPurchaseOrder = (data) => api.post('/purchase-orders', data);

export const updatePurchaseOrder = (id, data) => api.put(`/purchase-orders/${id}`, data);

export const deletePurchaseOrder = (id) => api.delete(`/purchase-orders/${id}`);

export const confirmPurchaseOrder = (id) => api.post(`/purchase-orders/${id}/confirm`);

export const cancelPurchaseOrder = (id) => api.post(`/purchase-orders/${id}/cancel`);

export const receivePurchaseOrder = (id, lines) => api.post(`/purchase-orders/${id}/receive`, { lines });
