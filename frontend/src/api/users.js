import api from './axios';

export const getUsers    = (params) => api.get('/users', { params });
export const getMfgUsers = ()       => api.get('/users', { params: { role: 'MANUFACTURING_USER' } });
