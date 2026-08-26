// ===== ChatYa API Client =====
import axios from 'axios';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

const apiClient = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

// Attach JWT token to requests
apiClient.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('chatya_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Handle 401 (redirect to login)
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('chatya_token');
      localStorage.removeItem('chatya_user');
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/admin/login';
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;

// ===== Public Store API (no auth) =====
export const storeApi = {
  getStoreInfo: (slug: string) =>
    apiClient.get(`/store/${slug}`).then(r => r.data),

  getProducts: (slug: string, params?: {
    category_id?: number;
    search?: string;
    featured?: boolean;
    page?: number;
    limit?: number;
  }) => apiClient.get(`/store/${slug}/products`, { params }).then(r => r.data),

  getProduct: (slug: string, productSlug: string) =>
    apiClient.get(`/store/${slug}/products/${productSlug}`).then(r => r.data),

  getCategories: (slug: string) =>
    apiClient.get(`/store/${slug}/categories`).then(r => r.data),

  getPromotions: (slug: string) =>
    apiClient.get(`/store/${slug}/promotions`).then(r => r.data),

  createOrder: (slug: string, orderData: unknown) =>
    apiClient.post(`/store/${slug}/orders`, orderData).then(r => r.data),
};

// ===== Public Tracking API (no auth) =====
export const trackingApi = {
  getOrder: (token: string) =>
    apiClient.get(`/tracking/${token}`).then(r => r.data),
};

// ===== Admin Auth API =====
export const authApi = {
  login: (email: string, password: string) =>
    apiClient.post('/auth/login', { email, password }).then(r => r.data),

  refreshToken: (refreshToken: string) =>
    apiClient.post('/auth/refresh', { refresh_token: refreshToken }).then(r => r.data),

  getMe: () =>
    apiClient.get('/auth/me').then(r => r.data),
};

// ===== Admin Products API =====
export const productsApi = {
  getAll: (params?: { page?: number; limit?: number; category_id?: number; search?: string }) =>
    apiClient.get('/products', { params }).then(r => r.data),

  getOne: (id: number) =>
    apiClient.get(`/products/${id}`).then(r => r.data),

  create: (data: FormData) =>
    apiClient.post('/products', data, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data),

  update: (id: number, data: unknown) =>
    apiClient.put(`/products/${id}`, data).then(r => r.data),

  delete: (id: number) =>
    apiClient.delete(`/products/${id}`).then(r => r.data),

  addImage: (id: number, formData: FormData) =>
    apiClient.post(`/products/${id}/images`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data),

  deleteImage: (productId: number, imageId: number) =>
    apiClient.delete(`/products/${productId}/images/${imageId}`).then(r => r.data),
};

// ===== Admin Categories API =====
export const categoriesApi = {
  getAll: () => apiClient.get('/categories').then(r => r.data),
  create: (data: unknown) => apiClient.post('/categories', data).then(r => r.data),
  update: (id: number, data: unknown) => apiClient.put(`/categories/${id}`, data).then(r => r.data),
  delete: (id: number) => apiClient.delete(`/categories/${id}`).then(r => r.data),
};

// ===== Admin Orders API =====
export const ordersApi = {
  getAll: (params?: { status?: string; date_from?: string; date_to?: string; page?: number; limit?: number }) =>
    apiClient.get('/orders', { params }).then(r => r.data),

  getOne: (id: number) =>
    apiClient.get(`/orders/${id}`).then(r => r.data),

  updateStatus: (id: number, status: string, note?: string) =>
    apiClient.put(`/orders/${id}/status`, { status, note }).then(r => r.data),
};

// ===== Admin Customers API =====
export const customersApi = {
  getAll: (params?: { search?: string; page?: number; limit?: number }) =>
    apiClient.get('/customers', { params }).then(r => r.data),

  getOne: (id: number) =>
    apiClient.get(`/customers/${id}`).then(r => r.data),
};

// ===== Dashboard API =====
export const dashboardApi = {
  getSummary: () => apiClient.get('/dashboard/summary').then(r => r.data),
  getTopProducts: () => apiClient.get('/dashboard/top-products').then(r => r.data),
  getSalesChart: (period?: 'week' | 'month') =>
    apiClient.get('/dashboard/sales-chart', { params: { period } }).then(r => r.data),
  getRecentOrders: () => apiClient.get('/dashboard/recent-orders').then(r => r.data),
};

// ===== Admin Config API =====
export const configApi = {
  getCompany: () => apiClient.get('/config/company').then(r => r.data),
  updateCompany: (data: unknown) => apiClient.put('/config/company', data).then(r => r.data),
  getPaymentMethods: () => apiClient.get('/config/payment-methods').then(r => r.data),
  createPaymentMethod: (data: unknown) => apiClient.post('/config/payment-methods', data).then(r => r.data),
  updatePaymentMethod: (id: number, data: unknown) => apiClient.put(`/config/payment-methods/${id}`, data).then(r => r.data),
  deletePaymentMethod: (id: number) => apiClient.delete(`/config/payment-methods/${id}`).then(r => r.data),
  getOrderStatuses: () => apiClient.get('/config/order-statuses').then(r => r.data),
  createOrderStatus: (data: unknown) => apiClient.post('/config/order-statuses', data).then(r => r.data),
  updateOrderStatus: (id: number, data: unknown) => apiClient.put(`/config/order-statuses/${id}`, data).then(r => r.data),
};
