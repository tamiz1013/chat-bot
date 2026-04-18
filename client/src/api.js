const API = '/api';

// Auth helper
function authHeaders() {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request(path, options = {}) {
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
      ...options.headers,
    },
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

// Auth
export const register = (name, email, password) =>
  request('/auth/register', { method: 'POST', body: JSON.stringify({ name, email, password }) });

export const login = (email, password) =>
  request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });

export const getMe = () => request('/auth/me');

// Bots
export const getBots = () => request('/bots');
export const getBot = (id) => request(`/bots/${id}`);
export const createBot = (data) =>
  request('/bots', { method: 'POST', body: JSON.stringify(data) });
export const updateBot = (id, data) =>
  request(`/bots/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteBot = (id) =>
  request(`/bots/${id}`, { method: 'DELETE' });

// Knowledge
export const addKnowledge = (botId, data) =>
  request(`/bots/${botId}/knowledge`, { method: 'POST', body: JSON.stringify(data) });
export const updateKnowledge = (botId, entryId, data) =>
  request(`/bots/${botId}/knowledge/${entryId}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteKnowledge = (botId, entryId) =>
  request(`/bots/${botId}/knowledge/${entryId}`, { method: 'DELETE' });

// API Keys
export const getKeys = (botId) => request(`/keys${botId ? `?botId=${botId}` : ''}`);
export const createKey = (botId, label) =>
  request('/keys', { method: 'POST', body: JSON.stringify({ botId, label }) });
export const revokeKey = (id) =>
  request(`/keys/${id}`, { method: 'DELETE' });

// Dashboard
export const getStats = () => request('/dashboard/stats');
export const getUsage = () => request('/dashboard/usage');
export const getConversations = (botId, page = 1) =>
  request(`/dashboard/conversations?botId=${botId || ''}&page=${page}`);

// Payments
export const getPaymentConfig = () => request('/payments/config');
export const createPayment = (plan, paymentMethod, network) =>
  request('/payments/create', { method: 'POST', body: JSON.stringify({ plan, paymentMethod, network }) });
export const submitPayment = (id, transactionId) =>
  request(`/payments/${id}/submit`, { method: 'PUT', body: JSON.stringify({ transactionId }) });
export const getMyTransactions = () => request('/payments/my');
export const cancelPayment = (id) => request(`/payments/${id}`, { method: 'DELETE' });

// Admin
export const adminGetStats = () => request('/admin/stats');
export const adminGetUsers = (page = 1, search = '') =>
  request(`/admin/users?page=${page}&search=${encodeURIComponent(search)}`);
export const adminUpdateUser = (id, data) =>
  request(`/admin/users/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const adminGetTransactions = (page = 1, status = '') =>
  request(`/admin/transactions?page=${page}&status=${status}`);
export const adminReviewTransaction = (id, action, adminNote = '') =>
  request(`/admin/transactions/${id}`, { method: 'PUT', body: JSON.stringify({ action, adminNote }) });
export const adminGetBots = (page = 1) => request(`/admin/bots?page=${page}`);
export const adminGetPaymentConfig = () => request('/admin/payment-config');
export const adminUpdatePaymentConfig = (data) =>
  request('/admin/payment-config', { method: 'PUT', body: JSON.stringify(data) });
