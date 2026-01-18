import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }

    // Handle subscription expired
    if (error.response?.data?.code === 'SUBSCRIPTION_EXPIRED') {
      window.location.href = '/subscription';
    }

    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (data) => api.post('/auth/register', data),
  getProfile: () => api.get('/auth/profile'),
  updateProfile: (data) => api.put('/auth/profile', data),
};

// Products API
export const productsAPI = {
  getAll: (params) => api.get('/products', { params }),
  getById: (id) => api.get(`/products/${id}`),
  search: (query) => api.get(`/products/search?q=${query}`),
  getCategories: () => api.get('/products/categories'),
  create: (data) => api.post('/products', data),
  update: (id, data) => api.put(`/products/${id}`, data),
  delete: (id) => api.delete(`/products/${id}`),
  adjustStock: (id, data) => api.post(`/products/${id}/adjust-stock`, data),
};

// Sales API
export const salesAPI = {
  getAll: (params) => api.get('/sales', { params }),
  getById: (id) => api.get(`/sales/${id}`),
  create: (data) => api.post('/sales', data),
  void: (id, reason) => api.post(`/sales/${id}/void`, { reason }),
  getReport: (params) => api.get('/sales/report', { params }),
  getTopProducts: (params) => api.get('/sales/top-products', { params }),
  getByPaymentMethod: (params) => api.get('/sales/by-payment-method', { params }),
  getCashierPerformance: (params) => api.get('/sales/cashier-performance', { params }),
};

// Purchases API
export const purchasesAPI = {
  getAll: (params) => api.get('/purchases', { params }),
  getById: (id) => api.get(`/purchases/${id}`),
  create: (data) => api.post('/purchases', data),
};

// Suppliers API
export const suppliersAPI = {
  getAll: (params) => api.get('/suppliers', { params }),
  getById: (id) => api.get(`/suppliers/${id}`),
  create: (data) => api.post('/suppliers', data),
  update: (id, data) => api.put(`/suppliers/${id}`, data),
  delete: (id) => api.delete(`/suppliers/${id}`),
};

// Customers API
export const customersAPI = {
  getAll: (params) => api.get('/customers', { params }),
  getById: (id) => api.get(`/customers/${id}`),
  search: (query) => api.get(`/customers/search?q=${query}`),
  create: (data) => api.post('/customers', data),
  update: (id, data) => api.put(`/customers/${id}`, data),
  delete: (id) => api.delete(`/customers/${id}`),
};

// Expenses API
export const expensesAPI = {
  getAll: (params) => api.get('/expenses', { params }),
  create: (data) => api.post('/expenses', data),
  update: (id, data) => api.put(`/expenses/${id}`, data),
  delete: (id) => api.delete(`/expenses/${id}`),
};

// Dashboard API
export const dashboardAPI = {
  getStats: () => api.get('/dashboard/stats'),
  getOverview: () => api.get('/dashboard/stats'), // ADD THIS - alias for getStats
  getFinancialSummary: (params) => api.get('/dashboard/financial-summary', { params }),
};

// Users API
export const usersAPI = {
  getAll: (params) => api.get('/users', { params }),
  getById: (id) => api.get(`/users/${id}`),
  create: (data) => api.post('/users', data),
  update: (id, data) => api.put(`/users/${id}`, data),
  delete: (id) => api.delete(`/users/${id}`),
  resetPassword: (id, newPassword) => api.post(`/users/${id}/reset-password`, { newPassword }),
};

// Tenant API
export const tenantAPI = {
  getInfo: () => api.get('/tenant/info'),
  updateInfo: (data) => api.put('/tenant/info', data),
  updateMpesaSettings: (data) => api.put('/tenant/mpesa', data),
};

// Payments API
export const paymentsAPI = {
  getPlans: () => api.get('/payments/plans'),
  getSubscriptionInfo: () => api.get('/payments/subscription'),
  initiatePayment: (data) => api.post('/payments/initiate', data),
  checkPaymentStatus: (paymentId) => api.get(`/payments/status/${paymentId}`),
  getPaymentHistory: () => api.get('/payments/history'),
};

// Super Admin API
export const superAdminAPI = {
  getDashboardStats: () => api.get('/super-admin/stats'),
  getAllTenants: (params) => api.get('/super-admin/tenants', { params }),
  getTenantDetails: (tenantId) => api.get(`/super-admin/tenants/${tenantId}`),
  suspendTenant: (tenantId, reason) => api.post(`/super-admin/tenants/${tenantId}/suspend`, { reason }),
  activateTenant: (tenantId) => api.post(`/super-admin/tenants/${tenantId}/activate`),
  getAllPayments: (params) => api.get('/super-admin/payments', { params }),
};

export default api;
