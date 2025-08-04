// src/services/api/index.js
import axios from 'axios';

// Base configuration
const API_BASE_URL = 'https://puvi-backend.onrender.com';

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 seconds timeout
  headers: {
    'Content-Type': 'application/json',
  },
});

// Response interceptor to handle the standardized response format
apiClient.interceptors.response.use(
  (response) => {
    // New backend format: { success: true/false, data: {...}, error: "...", count: n, summary: {...} }
    if (response.data && typeof response.data === 'object' && 'success' in response.data) {
      if (response.data.success) {
        // Return the actual data for successful responses
        return response.data;
      } else {
        // Throw error for unsuccessful responses
        return Promise.reject(new Error(response.data.error || 'Request failed'));
      }
    }
    // If response doesn't have our expected format, return as is
    return response.data;
  },
  (error) => {
    // Handle network errors or other axios errors
    if (error.response && error.response.data && error.response.data.error) {
      return Promise.reject(new Error(error.response.data.error));
    }
    return Promise.reject(error);
  }
);

// API service methods organized by module
const api = {
  // Purchase Module
  purchase: {
    getMaterials: () => apiClient.get('/api/materials'),
    addPurchase: (data) => apiClient.post('/api/add_purchase', data),
    getPurchaseHistory: (params) => apiClient.get('/api/purchase_history', { params }),
    getSuppliers: () => apiClient.get('/api/suppliers'),
  },

  // Material Writeoff Module
  writeoff: {
    getWriteoffReasons: () => apiClient.get('/api/writeoff_reasons'),
    getInventoryForWriteoff: (params) => apiClient.get('/api/inventory_for_writeoff', { params }),
    addWriteoff: (data) => apiClient.post('/api/add_writeoff', data),
    getWriteoffHistory: (params) => apiClient.get('/api/writeoff_history', { params }),
  },

  // Batch Production Module
  batch: {
    getSeedsForBatch: () => apiClient.get('/api/seeds_for_batch'),
    getCostElementsForBatch: () => apiClient.get('/api/cost_elements_for_batch'),
    getOilCakeRates: () => apiClient.get('/api/oil_cake_rates'),
    addBatch: (data) => apiClient.post('/api/add_batch', data),
    getBatchHistory: (params) => apiClient.get('/api/batch_history', { params }),
  },

  // Material Sales Module (to be implemented)
  sales: {
    getMaterialSalesInventory: () => apiClient.get('/api/material_sales_inventory'),
    addMaterialSale: (data) => apiClient.post('/api/add_material_sale', data),
    getMaterialSalesHistory: (params) => apiClient.get('/api/material_sales_history', { params }),
    allocateOilCakeSale: (data) => apiClient.post('/api/allocate_oil_cake_sale', data),
  },

  // System endpoints
  system: {
    health: () => apiClient.get('/api/health'),
    systemInfo: () => apiClient.get('/api/system_info'),
  },
};

export default api;
