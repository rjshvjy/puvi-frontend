// API Service for PUVI Oil Manufacturing System
// File Path: puvi-frontend/src/services/api/index.js

import axios from 'axios';
import qs from 'qs';

// Base configuration
const API_BASE_URL = 'https://puvi-backend.onrender.com';

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 seconds timeout
  headers: {
    'Content-Type': 'application/json',
  },
  // Use qs to serialize query parameters to fix material filtering issue
  paramsSerializer: params => qs.stringify(params, { arrayFormat: 'repeat' })
});

// Response interceptor to handle the standardized response format
apiClient.interceptors.response.use(
  (response) => {
    // Backend returns: { success: true/false, ...otherData }
    // We'll return the full response data, letting components handle it
    return response.data;
  },
  (error) => {
    // Handle network errors or other axios errors
    if (error.response && error.response.data) {
      // If backend sent an error response
      if (error.response.data.error) {
        return Promise.reject(new Error(error.response.data.error));
      }
      return Promise.reject(error);
    }
    return Promise.reject(error);
  }
);

// API service methods organized by module
const api = {
  // Purchase Module
  purchase: {
    getMaterials: (params) => apiClient.get('/api/materials', { params }),
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

  // Blending Module
  blending: {
    getOilTypes: () => apiClient.get('/api/oil_types_for_blending'),
    getBatchesForOilType: (oilType) => apiClient.get('/api/batches_for_oil_type', { params: { oil_type: oilType } }),
    createBlend: (data) => apiClient.post('/api/create_blend', data),
    getBlendHistory: (params) => apiClient.get('/api/blend_history', { params }),
  },

  // Material Sales Module
  sales: {
    getByproductTypes: () => apiClient.get('/api/byproduct_types'),
    getMaterialSalesInventory: (params) => apiClient.get('/api/material_sales_inventory', { params }),
    addMaterialSale: (data) => apiClient.post('/api/add_material_sale', data),
    getMaterialSalesHistory: (params) => apiClient.get('/api/material_sales_history', { params }),
    getCostReconciliationReport: () => apiClient.get('/api/cost_reconciliation_report'),
  },

  // Cost Management Module - NEW
  costManagement: {
    // Get all cost elements or by stage
    getCostElementsMaster: (params) => apiClient.get('/api/cost_elements/master', { params }),
    getCostElementsByStage: (stage) => apiClient.get('/api/cost_elements/by_stage', { params: { stage } }),
    
    // Time tracking with datetime inputs
    saveTimeTracking: (data) => apiClient.post('/api/cost_elements/time_tracking', data),
    
    // Cost calculations and validation
    calculateBatchCosts: (data) => apiClient.post('/api/cost_elements/calculate', data),
    saveBatchCosts: (data) => apiClient.post('/api/cost_elements/save_batch_costs', data),
    
    // Get batch cost summary with validation warnings
    getBatchCostSummary: (batchId) => apiClient.get(`/api/cost_elements/batch_summary/${batchId}`),
    
    // Validation report for management
    getValidationReport: (params) => apiClient.get('/api/cost_elements/validation_report', { params }),
    
    // Utility function for cost validation summary
    getCostValidationSummary: () => apiClient.get('/api/cost_validation_summary'),
  },

  // System endpoints
  system: {
    health: () => apiClient.get('/api/health'),
    systemInfo: () => apiClient.get('/api/system_info'),
  },
};

export default api;
