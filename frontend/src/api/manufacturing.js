import api from './axios';

export const getManufacturingOrders = () => api.get('/manufacturing-orders');

export const getManufacturingOrder = (id) => api.get(`/manufacturing-orders/${id}`);

export const createManufacturingOrder = (data) => api.post('/manufacturing-orders', data);

export const updateManufacturingOrder = (id, data) => api.put(`/manufacturing-orders/${id}`, data);

export const deleteManufacturingOrder = (id) => api.delete(`/manufacturing-orders/${id}`);

export const confirmMO = (id) => api.post(`/manufacturing-orders/${id}/confirm`);

export const startMO = (id) => api.post(`/manufacturing-orders/${id}/start`);

export const completeMO = (id) => api.post(`/manufacturing-orders/${id}/complete`);

export const cancelMO = (id) => api.post(`/manufacturing-orders/${id}/cancel`);

export const updateWorkOrder = (woId, data) => api.put(`/manufacturing-orders/work-orders/${woId}`, data);
