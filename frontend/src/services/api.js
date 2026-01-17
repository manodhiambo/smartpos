import axios from 'axios';
import toast from 'react-hot-toast';

const API_BASE_URL = process.env.REACT_APP_API_URL;

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - Add token to requests
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

// Response interceptor - Handle errors globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      const { status, data } = error.response;

      // Handle specific status codes
      switch (status) {
        case 401:
          // Unauthorized - clear token and redirect to login
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          if (window.location.pathname !== '/login') {
            window.location.href = '/login';
          }
          toast.error('Session expired. Please login again.');
          break;
        case 403:
          toast.error('You do not have permission to perform this action.');
          break;
        case 404:
          toast.error(data.message || 'Resource not found.');
          break;
        case 500:
          toast.error('Server error. Please try again later.');
          break;
        default:
          toast.error(data.message || 'An error occurred.');
      }
    } else if (error.request) {
      toast.error('Network error. Please check your connection.');
    } else {
      toast.error('An unexpected error occurred.');
    }

    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getProfile: () => api.get('/auth/profile'),
  updateProfile: (data) => api.put('/auth/profile', data),
  logout: () => api.post('/auth/logout'),
};

// Products API
export const productsAPI = {
  getAll: (params) => api.get('/products', { params }),
  getById: (id) => api.get(`/products/${id}`),
  getByBarcode: (barcode) => api.get(`/products/barcode/${barcode}`),
  search: (query) => api.get('/products/search', { params: { q: query } }),
  create: (data) => api.post('/products', data),
  update: (id, data) => api.put(`/products/${id}`, data),
  delete: (id) => api.delete(`/products/${id}`),
  getLowStock: () => api.get('/products/low-stock'),
  getCategories: () => api.get('/products/categories'),
};

// Sales API
export const salesAPI = {
  create: (data) => api.post('/sales', data),
  getAll: (params) => api.get('/sales', { params }),
  getById: (id) => api.get(`/sales/${id}`),
  getByReceipt: (receiptNo) => api.get(`/sales/receipt/${receiptNo}`),
  getTodaySummary: () => api.get('/sales/summary/today'),
  getReport: (params) => api.get('/sales/report', { params }),
  getTopProducts: (params) => api.get('/sales/top-products', { params }),
  getCashierPerformance: (params) => api.get('/sales/cashier-performance', { params }),
  getByPaymentMethod: (params) => api.get('/sales/payment-methods', { params }),
  void: (id, reason) => api.post(`/sales/${id}/void`, { reason }),
};

// Purchases API
export const purchasesAPI = {
  create: (data) => api.post('/purchases', data),
  getAll: (params) => api.get('/purchases', { params }),
  getById: (id) => api.get(`/purchases/${id}`),
  makePayment: (id, data) => api.post(`/purchases/${id}/payment`, data),
  getSummary: (params) => api.get('/purchases/summary', { params }),
};

// Suppliers API
export const suppliersAPI = {
  create: (data) => api.post('/suppliers', data),
  getAll: (params) => api.get('/suppliers', { params }),
  getById: (id) => api.get(`/suppliers/${id}`),
  update: (id, data) => api.put(`/suppliers/${id}`, data),
  delete: (id) => api.delete(`/suppliers/${id}`),
  getWithBalance: () => api.get('/suppliers/with-balance'),
  getStatement: (id, params) => api.get(`/suppliers/${id}/statement`, { params }),
};

// Customers API
export const customersAPI = {
  create: (data) => api.post('/customers', data),
  getAll: (params) => api.get('/customers', { params }),
  getById: (id) => api.get(`/customers/${id}`),
  search: (query) => api.get('/customers/search', { params: { q: query } }),
  update: (id, data) => api.put(`/customers/${id}`, data),
  delete: (id) => api.delete(`/customers/${id}`),
  getPurchaseHistory: (id, params) => api.get(`/customers/${id}/purchases`, { params }),
};

// Expenses API
export const expensesAPI = {
  create: (data) => api.post('/expenses', data),
  getAll: (params) => api.get('/expenses', { params }),
  getById: (id) => api.get(`/expenses/${id}`),
  update: (id, data) => api.put(`/expenses/${id}`, data),
  delete: (id) => api.delete(`/expenses/${id}`),
  getSummary: (params) => api.get('/expenses/summary', { params }),
  getTotal: (params) => api.get('/expenses/total', { params }),
  getCategories: () => api.get('/expenses/categories'),
};

// Dashboard API
export const dashboardAPI = {
  getOverview: () => api.get('/dashboard/overview'),
  getSalesAnalytics: (params) => api.get('/dashboard/sales-analytics', { params }),
  getInventoryAlerts: () => api.get('/dashboard/inventory-alerts'),
  getFinancialSummary: (params) => api.get('/dashboard/financial-summary', { params }),
  getHourlySales: () => api.get('/dashboard/hourly-sales'),
};

// Users API
export const usersAPI = {
  create: (data) => api.post('/users', data),
  getAll: (params) => api.get('/users', { params }),
  getById: (id) => api.get(`/users/${id}`),
  update: (id, data) => api.put(`/users/${id}`, data),
  delete: (id) => api.delete(`/users/${id}`),
  resetPassword: (id, newPassword) => api.post(`/users/${id}/reset-password`, { newPassword }),
};

// Tenant API
export const tenantAPI = {
  getInfo: () => api.get('/tenant/info'),
  updateInfo: (data) => api.put('/tenant/info', data),
  updateMpesaSettings: (data) => api.put('/tenant/mpesa-settings', data),
};

export default api;
