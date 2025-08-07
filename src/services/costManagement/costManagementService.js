// Cost Management Service Layer
// File Path: puvi-frontend/src/services/costManagement/costManagementService.js
// Purpose: Centralized cost calculations, validations, and utilities

import api from '../api';

// Cache for master rates to reduce API calls
let masterRatesCache = null;
let cacheTimestamp = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Cost Management Service
 * Provides all cost-related calculations and utilities
 */
const costManagementService = {
  
  // ==================== MASTER RATES MANAGEMENT ====================
  
  /**
   * Get all master rates with caching
   * @param {boolean} forceRefresh - Force refresh cache
   * @returns {Promise<Array>} Array of cost elements
   */
  async getMasterRates(forceRefresh = false) {
    const now = Date.now();
    
    // Return cached data if valid
    if (!forceRefresh && masterRatesCache && cacheTimestamp && (now - cacheTimestamp < CACHE_DURATION)) {
      return masterRatesCache;
    }
    
    try {
      const response = await api.costManagement.getCostElementsMaster();
      if (response.success) {
        masterRatesCache = response.cost_elements;
        cacheTimestamp = now;
        return response.cost_elements;
      }
      return [];
    } catch (error) {
      console.error('Error fetching master rates:', error);
      return masterRatesCache || [];
    }
  },
  
  /**
   * Get rate for specific element
   * @param {string} elementName - Name of cost element
   * @returns {Promise<number>} Rate value
   */
  async getRateByElement(elementName) {
    const rates = await this.getMasterRates();
    const element = rates.find(r => r.element_name === elementName);
    return element ? element.default_rate : 0;
  },
  
  /**
   * Get rates for specific stage
   * @param {string} stage - Stage name (drying, crushing, batch)
   * @returns {Promise<Array>} Filtered cost elements
   */
  async getRatesByStage(stage) {
    try {
      const response = await api.costManagement.getCostElementsByStage(stage);
      if (response.success) {
        return response.cost_elements;
      }
      return [];
    } catch (error) {
      console.error('Error fetching stage rates:', error);
      return [];
    }
  },
  
  /**
   * Clear rates cache
   */
  clearCache() {
    masterRatesCache = null;
    cacheTimestamp = null;
  },
  
  // ==================== COST CALCULATIONS ====================
  
  /**
   * Calculate drying stage costs
   * @param {number} seedQuantity - Quantity before drying in kg
   * @param {Object} overrides - Rate overrides
   * @returns {Object} Calculated costs
   */
  calculateDryingCosts(seedQuantity, overrides = {}) {
    const costs = [];
    let total = 0;
    
    // Drying Labour (Required)
    const dryingLabourRate = overrides.dryingLabour || 0.9;
    const dryingLabourCost = seedQuantity * dryingLabourRate;
    costs.push({
      element_name: 'Drying Labour',
      quantity: seedQuantity,
      rate: dryingLabourRate,
      total_cost: dryingLabourCost,
      is_required: true
    });
    total += dryingLabourCost;
    
    // Loading After Drying (Optional)
    if (overrides.loadingAfterDrying !== null) {
      const loadingRate = overrides.loadingAfterDrying || 0.12;
      const loadingCost = seedQuantity * loadingRate;
      costs.push({
        element_name: 'Loading After Drying',
        quantity: seedQuantity,
        rate: loadingRate,
        total_cost: loadingCost,
        is_required: false
      });
      total += loadingCost;
    }
    
    // Transport - Outsourced (Actual amount)
    if (overrides.transportOutsourced) {
      costs.push({
        element_name: 'Transport - Outsourced Unit',
        quantity: 1,
        rate: overrides.transportOutsourced,
        total_cost: overrides.transportOutsourced,
        is_required: false
      });
      total += overrides.transportOutsourced;
    }
    
    return {
      costs,
      total,
      stage: 'drying'
    };
  },
  
  /**
   * Calculate time-based costs
   * @param {number} hours - Rounded hours
   * @param {Object} overrides - Rate overrides
   * @returns {Object} Calculated costs
   */
  calculateTimeCosts(hours, overrides = {}) {
    const costs = [];
    let total = 0;
    
    if (hours <= 0) {
      return { costs, total, stage: 'time' };
    }
    
    // Crushing Labour
    const labourRate = overrides.crushingLabour || 150;
    const labourCost = hours * labourRate;
    costs.push({
      element_name: 'Crushing Labour',
      quantity: hours,
      rate: labourRate,
      total_cost: labourCost,
      is_required: true
    });
    total += labourCost;
    
    // Electricity - Crushing
    const electricityRate = overrides.electricity || 75;
    const electricityCost = hours * electricityRate;
    costs.push({
      element_name: 'Electricity - Crushing',
      quantity: hours,
      rate: electricityRate,
      total_cost: electricityCost,
      is_required: true
    });
    total += electricityCost;
    
    return {
      costs,
      total,
      stage: 'time'
    };
  },
  
  /**
   * Calculate fixed batch costs
   * @param {Object} overrides - Rate overrides
   * @returns {Object} Calculated costs
   */
  calculateFixedCosts(overrides = {}) {
    const costs = [];
    let total = 0;
    
    // Required fixed costs
    const requiredFixed = [
      { name: 'Filtering Labour', defaultRate: 550 },
      { name: 'Filter Cloth', defaultRate: 120 },
      { name: 'Quality Testing', defaultRate: 1000 },
      { name: 'Cleaning Materials', defaultRate: 150 }
    ];
    
    requiredFixed.forEach(item => {
      const rate = overrides[item.name.replace(/\s+/g, '')] || item.defaultRate;
      costs.push({
        element_name: item.name,
        quantity: 1,
        rate: rate,
        total_cost: rate,
        is_required: true
      });
      total += rate;
    });
    
    // Optional: Machine Maintenance
    if (overrides.machineMaintenance !== null) {
      const maintenanceRate = overrides.machineMaintenance || 500;
      costs.push({
        element_name: 'Machine Maintenance',
        quantity: 1,
        rate: maintenanceRate,
        total_cost: maintenanceRate,
        is_required: false
      });
      total += maintenanceRate;
    }
    
    return {
      costs,
      total,
      stage: 'fixed'
    };
  },
  
  /**
   * Calculate common costs (per kg oil)
   * @param {number} oilYield - Oil yield in kg
   * @param {number} rate - Rate per kg (default 2)
   * @returns {Object} Calculated costs
   */
  calculateCommonCosts(oilYield, rate = 2) {
    const totalCost = oilYield * rate;
    return {
      costs: [{
        element_name: 'Common Costs',
        quantity: oilYield,
        rate: rate,
        total_cost: totalCost,
        is_required: true
      }],
      total: totalCost,
      stage: 'common'
    };
  },
  
  /**
   * Calculate total batch costs
   * @param {Object} params - Batch parameters
   * @returns {Object} Complete cost breakdown
   */
  calculateBatchCosts(params) {
    const {
      seedQuantity,
      seedCost,
      oilYield,
      crushingHours,
      dryingOverrides = {},
      timeOverrides = {},
      fixedOverrides = {},
      commonCostRate = 2
    } = params;
    
    // Calculate all cost components
    const drying = this.calculateDryingCosts(seedQuantity, dryingOverrides);
    const time = this.calculateTimeCosts(crushingHours, timeOverrides);
    const fixed = this.calculateFixedCosts(fixedOverrides);
    const common = this.calculateCommonCosts(oilYield, commonCostRate);
    
    // Aggregate all costs
    const allCosts = [
      ...drying.costs,
      ...time.costs,
      ...fixed.costs,
      ...common.costs
    ];
    
    const totalExtendedCosts = drying.total + time.total + fixed.total + common.total;
    const totalProductionCost = seedCost + totalExtendedCosts;
    
    return {
      seedCost,
      dryingCosts: drying,
      timeCosts: time,
      fixedCosts: fixed,
      commonCosts: common,
      allCosts,
      totalExtendedCosts,
      totalProductionCost,
      costPerKg: oilYield > 0 ? totalProductionCost / oilYield : 0
    };
  },
  
  /**
   * Calculate cost with override
   * @param {number} quantity - Quantity
   * @param {number} masterRate - Default rate
   * @param {number} overrideRate - Override rate (optional)
   * @returns {Object} Calculation result
   */
  calculateWithOverride(quantity, masterRate, overrideRate = null) {
    const effectiveRate = overrideRate !== null && overrideRate !== '' 
      ? parseFloat(overrideRate) 
      : masterRate;
    
    const totalCost = quantity * effectiveRate;
    const hasOverride = overrideRate !== null && overrideRate !== '' && overrideRate !== masterRate;
    
    return {
      quantity,
      masterRate,
      effectiveRate,
      totalCost,
      hasOverride,
      overridePercentage: hasOverride ? ((effectiveRate - masterRate) / masterRate * 100) : 0
    };
  },
  
  /**
   * Calculate oil cost per kg after byproduct revenues
   * @param {Object} params - Calculation parameters
   * @returns {Object} Net cost calculations
   */
  calculateNetOilCost(params) {
    const {
      totalProductionCost,
      oilYield,
      cakeYield = 0,
      cakeRate = 0,
      sludgeYield = 0,
      sludgeRate = 0
    } = params;
    
    const cakeRevenue = cakeYield * cakeRate;
    const sludgeRevenue = sludgeYield * sludgeRate;
    const totalRevenue = cakeRevenue + sludgeRevenue;
    
    const netOilCost = totalProductionCost - totalRevenue;
    const costPerKg = oilYield > 0 ? netOilCost / oilYield : 0;
    
    return {
      totalProductionCost,
      cakeRevenue,
      sludgeRevenue,
      totalRevenue,
      netOilCost,
      costPerKg,
      revenuePercentage: totalProductionCost > 0 ? (totalRevenue / totalProductionCost * 100) : 0
    };
  },
  
  // ==================== VALIDATION FUNCTIONS ====================
  
  /**
   * Validate override rate
   * @param {number} originalRate - Original rate
   * @param {number} newRate - New override rate
   * @returns {Object} Validation result
   */
  validateOverride(originalRate, newRate) {
    const deviation = Math.abs(((newRate - originalRate) / originalRate) * 100);
    const isSignificant = deviation > 20;
    
    return {
      isValid: newRate > 0,
      deviation,
      isSignificant,
      requiresReason: isSignificant,
      message: isSignificant 
        ? `Override deviates by ${deviation.toFixed(1)}% from master rate`
        : null
    };
  },
  
  /**
   * Check for missing required costs
   * @param {Array} capturedCosts - Array of captured cost elements
   * @param {string} stage - Production stage
   * @returns {Object} Validation result
   */
  async validateRequiredCosts(capturedCosts, stage) {
    const requiredElements = await this.getRatesByStage(stage);
    const required = requiredElements.filter(e => !e.is_optional);
    
    const capturedNames = capturedCosts.map(c => c.element_name);
    const missing = required.filter(r => !capturedNames.includes(r.element_name));
    
    return {
      isComplete: missing.length === 0,
      missingCount: missing.length,
      missingElements: missing,
      completionPercentage: required.length > 0 
        ? ((required.length - missing.length) / required.length * 100) 
        : 100
    };
  },
  
  /**
   * Generate cost warnings for batch
   * @param {Object} batch - Batch data
   * @returns {Array} Array of warnings
   */
  generateCostWarnings(batch) {
    const warnings = [];
    
    // Check for missing time tracking
    if (!batch.crushingHours || batch.crushingHours === 0) {
      warnings.push({
        type: 'missing_time',
        message: 'No time tracking recorded for crushing process',
        severity: 'high'
      });
    }
    
    // Check for missing common costs
    if (!batch.commonCostsApplied) {
      const expectedCommon = batch.oilYield * 2;
      warnings.push({
        type: 'missing_common',
        message: `Common costs not allocated (Expected: ₹${expectedCommon.toFixed(2)})`,
        severity: 'medium',
        amount: expectedCommon
      });
    }
    
    // Check yield percentages
    const totalYieldPercent = batch.oilYieldPercent + batch.cakeYieldPercent + (batch.sludgeYieldPercent || 0);
    if (totalYieldPercent > 110) {
      warnings.push({
        type: 'yield_anomaly',
        message: `Total yield ${totalYieldPercent.toFixed(1)}% exceeds expected range`,
        severity: 'low'
      });
    }
    
    return warnings;
  },
  
  // ==================== UTILITY FUNCTIONS ====================
  
  /**
   * Format currency
   * @param {number} amount - Amount to format
   * @returns {string} Formatted currency
   */
  formatCurrency(amount) {
    return `₹${(amount || 0).toFixed(2)}`;
  },
  
  /**
   * Format quantity with unit
   * @param {number} quantity - Quantity
   * @param {string} unit - Unit type
   * @returns {string} Formatted quantity
   */
  formatQuantity(quantity, unit) {
    const formatted = (quantity || 0).toFixed(2);
    switch (unit) {
      case 'per_kg':
        return `${formatted} kg`;
      case 'per_hour':
        return `${formatted} hrs`;
      case 'per_bag':
        return `${formatted} bags`;
      case 'fixed':
        return '1 unit';
      default:
        return formatted;
    }
  },
  
  /**
   * Calculate percentage
   * @param {number} part - Part value
   * @param {number} whole - Whole value
   * @returns {number} Percentage
   */
  calculatePercentage(part, whole) {
    if (whole === 0) return 0;
    return (part / whole) * 100;
  },
  
  /**
   * Get cost category color
   * @param {string} category - Category name
   * @returns {string} Color code
   */
  getCategoryColor(category) {
    const colors = {
      'Labor': '#d4edda',
      'Utilities': '#cce5ff',
      'Consumables': '#fff3cd',
      'Transport': '#f8d7da',
      'Quality': '#e2e3e5',
      'Maintenance': '#d1ecf1'
    };
    return colors[category] || '#f8f9fa';
  },
  
  /**
   * Group costs by category
   * @param {Array} costs - Array of costs
   * @returns {Object} Grouped costs
   */
  groupCostsByCategory(costs) {
    return costs.reduce((acc, cost) => {
      const category = cost.category || 'Other';
      if (!acc[category]) {
        acc[category] = {
          costs: [],
          total: 0
        };
      }
      acc[category].costs.push(cost);
      acc[category].total += cost.total_cost;
      return acc;
    }, {});
  },
  
  /**
   * Calculate cost variance
   * @param {number} actual - Actual cost
   * @param {number} estimated - Estimated cost
   * @returns {Object} Variance details
   */
  calculateVariance(actual, estimated) {
    const variance = actual - estimated;
    const variancePercent = estimated > 0 ? (variance / estimated * 100) : 0;
    
    return {
      variance,
      variancePercent,
      isOverBudget: variance > 0,
      status: Math.abs(variancePercent) < 5 ? 'on-target' : 
              variance > 0 ? 'over-budget' : 'under-budget'
    };
  },
  
  // ==================== REPORTING FUNCTIONS ====================
  
  /**
   * Generate cost summary report
   * @param {Array} batches - Array of batches
   * @returns {Object} Summary report
   */
  generateCostSummary(batches) {
    if (!batches || batches.length === 0) {
      return {
        totalBatches: 0,
        averageCostPerKg: 0,
        totalProduction: 0,
        totalCosts: 0
      };
    }
    
    const totalBatches = batches.length;
    const totalProduction = batches.reduce((sum, b) => sum + (b.oil_yield || 0), 0);
    const totalCosts = batches.reduce((sum, b) => sum + (b.total_production_cost || 0), 0);
    const averageCostPerKg = totalProduction > 0 ? totalCosts / totalProduction : 0;
    
    // Group by oil type
    const byOilType = {};
    batches.forEach(batch => {
      if (!byOilType[batch.oil_type]) {
        byOilType[batch.oil_type] = {
          count: 0,
          totalProduction: 0,
          totalCost: 0
        };
      }
      byOilType[batch.oil_type].count++;
      byOilType[batch.oil_type].totalProduction += batch.oil_yield || 0;
      byOilType[batch.oil_type].totalCost += batch.total_production_cost || 0;
    });
    
    // Calculate averages per oil type
    Object.keys(byOilType).forEach(type => {
      const data = byOilType[type];
      data.averageCostPerKg = data.totalProduction > 0 
        ? data.totalCost / data.totalProduction 
        : 0;
    });
    
    return {
      totalBatches,
      totalProduction,
      totalCosts,
      averageCostPerKg,
      byOilType,
      dateRange: {
        from: batches[batches.length - 1]?.production_date,
        to: batches[0]?.production_date
      }
    };
  },
  
  /**
   * Identify cost optimization opportunities
   * @param {Array} batches - Array of batches
   * @returns {Array} Optimization suggestions
   */
  identifyOptimizations(batches) {
    const suggestions = [];
    const summary = this.generateCostSummary(batches);
    
    // Check for high-cost oil types
    Object.entries(summary.byOilType).forEach(([type, data]) => {
      if (data.averageCostPerKg > summary.averageCostPerKg * 1.2) {
        suggestions.push({
          type: 'high_cost_oil_type',
          oilType: type,
          message: `${type} oil has 20% higher cost than average`,
          potentialSaving: (data.averageCostPerKg - summary.averageCostPerKg) * data.totalProduction
        });
      }
    });
    
    // Check for batches with no time tracking
    const noTimeTracking = batches.filter(b => !b.crushing_hours || b.crushing_hours === 0);
    if (noTimeTracking.length > 0) {
      suggestions.push({
        type: 'missing_time_tracking',
        count: noTimeTracking.length,
        message: `${noTimeTracking.length} batches missing time tracking`,
        potentialSaving: noTimeTracking.length * 225 // Avg 1 hour * (150+75)
      });
    }
    
    return suggestions;
  }
};

// Export the service
export default costManagementService;
