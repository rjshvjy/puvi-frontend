// Cost Management Utility Functions for PUVI Oil Manufacturing System
// File Path: puvi-frontend/src/modules/CostManagement/utils.js
// Purpose: Helper functions for cost calculations, formatting, and validation

/**
 * Calculate costs for drying stage
 * @param {number} quantity - Seed quantity before drying in kg
 * @param {Array} costElements - Array of cost elements
 * @returns {Array} Array of calculated costs
 */
export const calculateDryingCosts = (quantity, costElements = []) => {
  const dryingCosts = [];
  
  // Filter for drying-specific costs
  const dryingElements = costElements.filter(element => 
    element.element_name.includes('Drying') || 
    element.element_name.includes('Loading After Drying') ||
    (element.applicable_to === 'batch' && element.stage === 'drying')
  );
  
  dryingElements.forEach(element => {
    let cost = 0;
    let elementQuantity = quantity;
    
    if (element.calculation_method === 'per_kg') {
      cost = quantity * element.default_rate;
    } else if (element.calculation_method === 'actual') {
      // For actual costs, this will be entered by user
      cost = 0;
      elementQuantity = 1;
    }
    
    dryingCosts.push({
      element_id: element.element_id,
      element_name: element.element_name,
      category: element.category,
      quantity: elementQuantity,
      rate: element.default_rate,
      total_cost: cost,
      is_optional: element.is_optional
    });
  });
  
  return dryingCosts;
};

/**
 * Calculate time-based costs (crushing labour, electricity)
 * @param {number} hours - Rounded hours for billing
 * @param {Array} rates - Array of rate objects with element_name and rate
 * @returns {Object} Calculated time costs
 */
export const calculateTimeCosts = (hours, rates = []) => {
  const defaultRates = {
    'Crushing Labour': 150,
    'Electricity - Crushing': 75
  };
  
  const costs = {
    crushing_labour: 0,
    electricity: 0,
    total: 0,
    breakdown: []
  };
  
  // Use provided rates or defaults
  const crushingRate = rates.find(r => r.element_name === 'Crushing Labour')?.rate || defaultRates['Crushing Labour'];
  const electricityRate = rates.find(r => r.element_name === 'Electricity - Crushing')?.rate || defaultRates['Electricity - Crushing'];
  
  costs.crushing_labour = hours * crushingRate;
  costs.electricity = hours * electricityRate;
  costs.total = costs.crushing_labour + costs.electricity;
  
  costs.breakdown = [
    {
      element_name: 'Crushing Labour',
      hours: hours,
      rate: crushingRate,
      total: costs.crushing_labour
    },
    {
      element_name: 'Electricity - Crushing',
      hours: hours,
      rate: electricityRate,
      total: costs.electricity
    }
  ];
  
  return costs;
};

/**
 * Calculate fixed costs for a batch
 * @param {Array} costElements - Array of cost elements with fixed calculation method
 * @returns {Array} Array of fixed costs
 */
export const calculateFixedCosts = (costElements = []) => {
  const fixedCosts = [];
  
  const fixedElements = costElements.filter(element => 
    element.calculation_method === 'fixed'
  );
  
  fixedElements.forEach(element => {
    fixedCosts.push({
      element_id: element.element_id,
      element_name: element.element_name,
      category: element.category,
      quantity: 1,
      rate: element.default_rate,
      total_cost: element.default_rate,
      is_optional: element.is_optional
    });
  });
  
  return fixedCosts;
};

/**
 * Calculate variable costs based on quantity and rate
 * @param {number} quantity - Quantity in appropriate unit
 * @param {number} rate - Rate per unit
 * @param {string} method - Calculation method (per_kg, per_bag, per_hour)
 * @returns {number} Total cost
 */
export const calculateVariableCosts = (quantity, rate, method = 'per_kg') => {
  if (!quantity || !rate) return 0;
  
  switch (method) {
    case 'per_kg':
      return quantity * rate;
      
    case 'per_bag':
      // Convert kg to bags (50kg per bag)
      const bags = quantity / 50;
      return bags * rate;
      
    case 'per_hour':
      return quantity * rate;
      
    case 'per_unit':
      return quantity * rate;
      
    default:
      return quantity * rate;
  }
};

/**
 * Format currency in INR format
 * @param {number} amount - Amount to format
 * @param {boolean} showSymbol - Whether to show ₹ symbol
 * @returns {string} Formatted currency string
 */
export const formatCurrency = (amount, showSymbol = true) => {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return showSymbol ? '₹0.00' : '0.00';
  }
  
  const formatted = parseFloat(amount).toFixed(2);
  
  // Add Indian number formatting (lakhs and thousands)
  const parts = formatted.split('.');
  const integerPart = parts[0];
  const decimalPart = parts[1];
  
  // Add commas for Indian numbering system
  const lastThree = integerPart.substring(integerPart.length - 3);
  const otherNumbers = integerPart.substring(0, integerPart.length - 3);
  const formattedInteger = otherNumbers !== '' 
    ? otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + lastThree 
    : lastThree;
  
  const result = formattedInteger + '.' + decimalPart;
  return showSymbol ? '₹' + result : result;
};

/**
 * Validate cost data for completeness
 * @param {Array} costs - Array of cost objects
 * @returns {Object} Validation result with warnings
 */
export const validateCostData = (costs = []) => {
  const validation = {
    isValid: true,
    warnings: [],
    missingRequired: [],
    totalUnallocated: 0
  };
  
  // Check for required costs that are not applied
  const requiredCosts = costs.filter(c => !c.is_optional);
  requiredCosts.forEach(cost => {
    if (!cost.is_applied || cost.total_cost === 0) {
      validation.warnings.push({
        element: cost.element_name,
        message: `Required cost not applied: ${cost.element_name}`,
        severity: 'warning'
      });
      validation.missingRequired.push(cost.element_name);
      validation.totalUnallocated += cost.default_rate || 0;
    }
  });
  
  // Check for time-based costs without time tracking
  const timeCosts = costs.filter(c => c.calculation_method === 'per_hour');
  timeCosts.forEach(cost => {
    if (!cost.quantity || cost.quantity === 0) {
      validation.warnings.push({
        element: cost.element_name,
        message: `Time tracking missing for: ${cost.element_name}`,
        severity: 'warning'
      });
    }
  });
  
  // Phase 1: Don't block operations, just warn
  validation.isValid = true; // Always valid in Phase 1
  
  return validation;
};

/**
 * Calculate total costs from an array of cost objects
 * @param {Array} costArray - Array of cost objects with total_cost property
 * @returns {number} Sum of all costs
 */
export const calculateTotalCosts = (costArray = []) => {
  return costArray.reduce((sum, cost) => {
    const costValue = cost.is_applied !== false ? (cost.total_cost || 0) : 0;
    return sum + costValue;
  }, 0);
};

/**
 * Group costs by category
 * @param {Array} costs - Array of cost objects
 * @returns {Object} Costs grouped by category
 */
export const groupCostsByCategory = (costs = []) => {
  const grouped = {};
  
  costs.forEach(cost => {
    const category = cost.category || 'Other';
    if (!grouped[category]) {
      grouped[category] = {
        items: [],
        subtotal: 0
      };
    }
    grouped[category].items.push(cost);
    grouped[category].subtotal += cost.is_applied !== false ? (cost.total_cost || 0) : 0;
  });
  
  return grouped;
};

/**
 * Check if override is significant (>20% deviation)
 * @param {number} originalRate - Original rate
 * @param {number} overrideRate - Override rate
 * @returns {boolean} True if deviation is >20%
 */
export const isSignificantOverride = (originalRate, overrideRate) => {
  if (!originalRate || !overrideRate) return false;
  
  const deviation = Math.abs(overrideRate - originalRate) / originalRate;
  return deviation > 0.2; // 20% threshold
};

/**
 * Calculate percentage deviation
 * @param {number} originalValue - Original value
 * @param {number} newValue - New value
 * @returns {number} Percentage deviation
 */
export const calculateDeviation = (originalValue, newValue) => {
  if (!originalValue || originalValue === 0) return 0;
  
  const deviation = ((newValue - originalValue) / originalValue) * 100;
  return parseFloat(deviation.toFixed(2));
};

/**
 * Parse and safely convert to number
 * @param {any} value - Value to parse
 * @param {number} defaultValue - Default value if parsing fails
 * @returns {number} Parsed number
 */
export const safeParseFloat = (value, defaultValue = 0) => {
  if (value === null || value === undefined || value === '') {
    return defaultValue;
  }
  const parsed = parseFloat(value);
  return isNaN(parsed) ? defaultValue : parsed;
};

/**
 * Format date to DD-MM-YYYY (Indian format)
 * @param {string|Date} date - Date to format
 * @returns {string} Formatted date string
 */
export const formatIndianDate = (date) => {
  if (!date) return '';
  
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  
  return `${day}-${month}-${year}`;
};

/**
 * Get category color for visual display
 * @param {string} category - Cost category name
 * @returns {string} Background color for the category
 */
export const getCategoryColor = (category) => {
  const colors = {
    'Labor': '#d4edda',
    'Labour': '#d4edda',
    'Utilities': '#cce5ff',
    'Consumables': '#fff3cd',
    'Transport': '#f8d7da',
    'Quality': '#e2e3e5',
    'Maintenance': '#d1ecf1',
    'Other': '#f8f9fa'
  };
  
  return colors[category] || colors['Other'];
};

/**
 * Calculate cost per unit (used for oil cost per kg)
 * @param {number} totalCost - Total cost
 * @param {number} quantity - Quantity produced
 * @returns {number} Cost per unit
 */
export const calculateCostPerUnit = (totalCost, quantity) => {
  if (!quantity || quantity === 0) return 0;
  return totalCost / quantity;
};

/**
 * Prepare costs for API submission
 * @param {Array} costs - Array of cost objects from UI
 * @returns {Array} Formatted costs for API
 */
export const prepareCostsForAPI = (costs = []) => {
  return costs.map(cost => ({
    element_id: cost.element_id,
    element_name: cost.element_name,
    quantity: safeParseFloat(cost.quantity),
    rate: safeParseFloat(cost.rate),
    override_rate: cost.override_rate ? safeParseFloat(cost.override_rate) : null,
    is_applied: cost.is_applied !== false,
    override_reason: cost.override_reason || null
  }));
};

/**
 * Merge drying costs with batch costs
 * @param {Array} dryingCosts - Costs from drying stage
 * @param {Array} batchCosts - Other batch costs
 * @returns {Array} Merged cost array
 */
export const mergeCosts = (dryingCosts = [], batchCosts = []) => {
  const merged = [...dryingCosts];
  
  // Add batch costs that aren't already in drying costs
  batchCosts.forEach(batchCost => {
    const exists = merged.find(c => 
      c.element_name === batchCost.element_name || 
      c.element_id === batchCost.element_id
    );
    
    if (!exists) {
      merged.push(batchCost);
    }
  });
  
  return merged;
};

/**
 * Export summary for reporting
 * @param {Object} costSummary - Cost summary object
 * @returns {string} Formatted text for export
 */
export const exportCostSummary = (costSummary) => {
  let output = 'COST SUMMARY REPORT\n';
  output += '==================\n\n';
  
  output += `Batch Code: ${costSummary.batch_code || 'N/A'}\n`;
  output += `Production Date: ${formatIndianDate(costSummary.production_date)}\n`;
  output += `Oil Type: ${costSummary.oil_type || 'N/A'}\n\n`;
  
  output += 'COST BREAKDOWN:\n';
  output += '--------------\n';
  
  if (costSummary.costs) {
    const grouped = groupCostsByCategory(costSummary.costs);
    Object.entries(grouped).forEach(([category, data]) => {
      output += `\n${category}:\n`;
      data.items.forEach(item => {
        output += `  ${item.element_name}: ${formatCurrency(item.total_cost)}\n`;
      });
      output += `  Subtotal: ${formatCurrency(data.subtotal)}\n`;
    });
  }
  
  output += '\n--------------\n';
  output += `TOTAL COST: ${formatCurrency(costSummary.total_cost)}\n`;
  output += `Oil Yield: ${costSummary.oil_yield || 0} kg\n`;
  output += `Cost per kg: ${formatCurrency(costSummary.oil_cost_per_kg)}\n`;
  
  return output;
};

// Export all functions
export default {
  calculateDryingCosts,
  calculateTimeCosts,
  calculateFixedCosts,
  calculateVariableCosts,
  formatCurrency,
  validateCostData,
  calculateTotalCosts,
  groupCostsByCategory,
  isSignificantOverride,
  calculateDeviation,
  safeParseFloat,
  formatIndianDate,
  getCategoryColor,
  calculateCostPerUnit,
  prepareCostsForAPI,
  mergeCosts,
  exportCostSummary
};
