// Cost Capture Component for PUVI Oil Manufacturing System
// File Path: puvi-frontend/src/modules/CostManagement/CostCapture.js
// Purpose: Reusable component for capturing costs at different production stages

import React, { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';

const CostCapture = ({ 
  module = 'batch',        // Module calling this component
  stage = 'drying',        // Stage of production (drying, crushing, batch)
  quantity = 0,            // Base quantity for calculations
  oilYield = 0,            // Oil yield for common costs calculation
  crushingHours = 0,       // Hours for time-based costs
  batchId = null,          // Batch ID if editing existing batch
  onCostsUpdate = null,    // Callback to parent with costs
  showSummary = true,      // Show cost summary at bottom
  allowOverride = true     // Allow rate overrides
}) => {
  const [costElements, setCostElements] = useState([]);
  const [costInputs, setCostInputs] = useState({});
  const [loading, setLoading] = useState(false);
  const [totalCost, setTotalCost] = useState(0);
  const [expandedCategories, setExpandedCategories] = useState({});
  const [error, setError] = useState(null);

  // Stage-specific element filtering
  const getStageSpecificElements = (elements, currentStage) => {
    return elements.filter(element => {
      const name = element.element_name.toLowerCase();
      
      if (currentStage === 'drying') {
        // Only drying-related costs
        return name.includes('drying') || 
               name.includes('loading after drying') || 
               name.includes('transport - outsourced');
      } else if (currentStage === 'crushing') {
        // Time-based and fixed costs (excluding drying)
        return !name.includes('drying') && 
               !name.includes('loading after drying') &&
               (element.calculation_method === 'per_hour' || 
                element.calculation_method === 'fixed' ||
                name.includes('common costs'));
      } else if (currentStage === 'batch') {
        // All costs for complete batch view
        return true;
      }
      
      return false;
    });
  };

  // Fetch applicable cost elements on mount or when stage changes
  useEffect(() => {
    fetchCostElements();
  }, [stage, module]);

  // Recalculate when inputs change
  useEffect(() => {
    calculateAllCosts();
  }, [quantity, oilYield, crushingHours, costInputs, costElements]);

  const fetchCostElements = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.costManagement.getCostElementsByStage(stage === 'crushing' ? 'batch' : stage);
      
      if (response.success) {
        // Filter elements based on stage
        const filteredElements = getStageSpecificElements(response.cost_elements, stage);
        
        // Initialize cost inputs for each element
        const initialInputs = {};
        filteredElements.forEach(element => {
          // Check if element should be applied by default
          let shouldApply = false;
          
          if (!element.is_optional) {
            // Required costs are checked by default
            shouldApply = true;
          } else if (stage === 'drying' && element.element_name.toLowerCase().includes('drying labour')) {
            // Drying labour should be checked by default in drying stage
            shouldApply = true;
          }
          
          initialInputs[element.element_id] = {
            isApplied: shouldApply,
            overrideRate: null,
            actualCost: null,
            quantity: 0,
            totalCost: 0
          };
        });
        
        setCostElements(filteredElements);
        setCostInputs(initialInputs);
        
        // Auto-expand categories with costs
        const categories = [...new Set(filteredElements.map(e => e.category))];
        const expanded = {};
        categories.forEach(cat => expanded[cat] = true);
        setExpandedCategories(expanded);
      }
    } catch (error) {
      console.error('Error fetching cost elements:', error);
      setError('Failed to load cost elements');
    } finally {
      setLoading(false);
    }
  };

  const calculateAllCosts = useCallback(() => {
    let total = 0;
    const updatedInputs = { ...costInputs };
    const costsArray = [];

    costElements.forEach(element => {
      const input = updatedInputs[element.element_id];
      if (!input) return;

      let elementQuantity = 0;
      let elementCost = 0;
      const rate = input.overrideRate !== null && input.overrideRate !== '' 
        ? parseFloat(input.overrideRate) 
        : element.default_rate;

      // Calculate based on calculation method
      switch (element.calculation_method) {
        case 'per_kg':
          if (element.element_name.toLowerCase().includes('common costs')) {
            // Common costs use oil yield
            elementQuantity = oilYield || 0;
          } else if (stage === 'drying' || element.element_name.toLowerCase().includes('drying')) {
            // Drying costs use seed quantity before drying
            elementQuantity = quantity || 0;
          } else {
            elementQuantity = quantity || 0;
          }
          elementCost = elementQuantity * rate;
          break;

        case 'per_hour':
          elementQuantity = crushingHours || 0;
          elementCost = elementQuantity * rate;
          break;

        case 'fixed':
          elementQuantity = 1;
          elementCost = input.isApplied ? rate : 0;
          break;

        case 'actual':
          // For costs like outsourced transport where user enters actual amount
          elementQuantity = 1;
          elementCost = input.actualCost || 0;
          break;

        case 'per_bag':
          elementQuantity = Math.ceil((quantity || 0) / 50); // Convert kg to bags (50kg per bag)
          elementCost = elementQuantity * rate;
          break;

        default:
          elementQuantity = quantity || 0;
          elementCost = elementQuantity * rate;
      }

      // Update the input with calculated values
      updatedInputs[element.element_id] = {
        ...input,
        quantity: elementQuantity,
        totalCost: elementCost
      };

      // Only add to total and array if applied
      if (input.isApplied) {
        total += elementCost;
        
        costsArray.push({
          element_id: element.element_id,
          element_name: element.element_name,
          category: element.category,
          quantity: elementQuantity,
          rate: rate,
          total_cost: elementCost,
          is_applied: true,
          is_optional: element.is_optional,
          calculation_method: element.calculation_method
        });
      }
    });

    setCostInputs(updatedInputs);
    setTotalCost(total);

    // Send updated costs to parent
    if (onCostsUpdate && typeof onCostsUpdate === 'function') {
      onCostsUpdate(costsArray);
    }
  }, [costElements, costInputs, quantity, oilYield, crushingHours, onCostsUpdate, stage]);

  const handleCheckboxChange = (elementId) => {
    setCostInputs(prev => ({
      ...prev,
      [elementId]: {
        ...prev[elementId],
        isApplied: !prev[elementId].isApplied
      }
    }));
  };

  const handleOverrideChange = (elementId, value) => {
    const parsedValue = value === '' ? null : value;
    setCostInputs(prev => ({
      ...prev,
      [elementId]: {
        ...prev[elementId],
        overrideRate: parsedValue
      }
    }));
  };

  const handleActualCostChange = (elementId, value) => {
    const parsedValue = value === '' ? 0 : parseFloat(value) || 0;
    setCostInputs(prev => ({
      ...prev,
      [elementId]: {
        ...prev[elementId],
        actualCost: parsedValue
      }
    }));
  };

  const toggleCategory = (category) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  // Group elements by category
  const elementsByCategory = costElements.reduce((acc, element) => {
    if (!acc[element.category]) {
      acc[element.category] = [];
    }
    acc[element.category].push(element);
    return acc;
  }, {});

  // Category colors
  const getCategoryColor = (category) => {
    const colors = {
      'Labor': '#d4edda',
      'Utilities': '#cce5ff',
      'Consumables': '#fff3cd',
      'Transport': '#f8d7da',
      'Quality': '#e2e3e5',
      'Maintenance': '#d1ecf1'
    };
    return colors[category] || '#f8f9fa';
  };

  // Get stage display name
  const getStageDisplayName = () => {
    switch (stage) {
      case 'drying':
        return 'Drying Stage';
      case 'crushing':
        return 'Crushing & Production';
      case 'batch':
        return 'Complete Batch';
      default:
        return stage.charAt(0).toUpperCase() + stage.slice(1);
    }
  };

  const styles = {
    container: {
      backgroundColor: '#ffffff',
      padding: '20px',
      borderRadius: '8px',
      border: '1px solid #dee2e6',
      marginBottom: '20px'
    },
    header: {
      fontSize: '18px',
      fontWeight: '600',
      marginBottom: '15px',
      color: '#495057',
      display: 'flex',
      alignItems: 'center',
      gap: '10px'
    },
    stageBadge: {
      padding: '4px 8px',
      backgroundColor: '#007bff',
      color: 'white',
      borderRadius: '4px',
      fontSize: '12px',
      fontWeight: 'normal'
    },
    categorySection: {
      marginBottom: '15px',
      border: '1px solid #dee2e6',
      borderRadius: '5px',
      overflow: 'hidden'
    },
    categoryHeader: {
      padding: '10px 15px',
      cursor: 'pointer',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      fontWeight: '600',
      fontSize: '14px'
    },
    categoryContent: {
      padding: '15px',
      backgroundColor: '#ffffff'
    },
    costItem: {
      display: 'grid',
      gridTemplateColumns: '30px 1fr 120px 120px 120px',
      gap: '10px',
      alignItems: 'center',
      padding: '8px 0',
      borderBottom: '1px solid #f0f0f0'
    },
    checkbox: {
      width: '18px',
      height: '18px',
      cursor: 'pointer'
    },
    elementName: {
      fontSize: '14px',
      color: '#495057'
    },
    input: {
      padding: '6px 10px',
      border: '1px solid #ced4da',
      borderRadius: '4px',
      fontSize: '14px',
      width: '100%'
    },
    calculated: {
      padding: '6px 10px',
      backgroundColor: '#e9ecef',
      borderRadius: '4px',
      fontSize: '14px',
      textAlign: 'right'
    },
    totalRow: {
      display: 'grid',
      gridTemplateColumns: '1fr 120px',
      gap: '10px',
      alignItems: 'center',
      padding: '15px',
      backgroundColor: '#f8f9fa',
      borderTop: '2px solid #dee2e6',
      marginTop: '20px'
    },
    totalLabel: {
      fontSize: '16px',
      fontWeight: '600',
      color: '#495057',
      textAlign: 'right'
    },
    totalAmount: {
      fontSize: '18px',
      fontWeight: 'bold',
      color: '#28a745',
      textAlign: 'right'
    },
    optional: {
      fontSize: '11px',
      color: '#6c757d',
      marginLeft: '5px'
    },
    required: {
      fontSize: '11px',
      color: '#dc3545',
      marginLeft: '5px'
    },
    unitInfo: {
      fontSize: '12px',
      color: '#6c757d',
      marginTop: '2px'
    },
    errorBox: {
      padding: '15px',
      backgroundColor: '#f8d7da',
      color: '#721c24',
      borderRadius: '4px',
      marginBottom: '15px'
    },
    emptyState: {
      padding: '20px',
      textAlign: 'center',
      color: '#6c757d'
    },
    quantityDisplay: {
      fontSize: '12px',
      color: '#6c757d',
      marginTop: '5px',
      padding: '5px',
      backgroundColor: '#f8f9fa',
      borderRadius: '3px'
    }
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={{ textAlign: 'center', padding: '20px' }}>
          Loading cost elements for {getStageDisplayName()}...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.container}>
        <div style={styles.errorBox}>
          ⚠️ {error}
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <h4 style={styles.header}>
        💰 Additional Cost Elements
        <span style={styles.stageBadge}>{getStageDisplayName()}</span>
      </h4>

      {/* Display current quantities for reference */}
      {(quantity > 0 || oilYield > 0 || crushingHours > 0) && (
        <div style={styles.quantityDisplay}>
          📊 Current Values: 
          {quantity > 0 && ` Seed Qty: ${quantity} kg`}
          {oilYield > 0 && ` | Oil Yield: ${oilYield} kg`}
          {crushingHours > 0 && ` | Crushing Hours: ${crushingHours}`}
        </div>
      )}

      {Object.keys(elementsByCategory).length === 0 ? (
        <div style={styles.emptyState}>
          No cost elements available for {getStageDisplayName()}
        </div>
      ) : (
        <>
          {Object.entries(elementsByCategory).map(([category, elements]) => (
            <div key={category} style={styles.categorySection}>
              <div 
                style={{
                  ...styles.categoryHeader,
                  backgroundColor: getCategoryColor(category)
                }}
                onClick={() => toggleCategory(category)}
              >
                <span>
                  {category} Costs ({elements.length})
                  {elements.filter(e => costInputs[e.element_id]?.isApplied).length > 0 && 
                    ` - ${elements.filter(e => costInputs[e.element_id]?.isApplied).length} selected`}
                </span>
                <span>{expandedCategories[category] ? '▼' : '▶'}</span>
              </div>

              {expandedCategories[category] && (
                <div style={styles.categoryContent}>
                  {elements.map(element => {
                    const input = costInputs[element.element_id] || {};
                    const isActualCost = element.calculation_method === 'actual';
                    const effectiveRate = input.overrideRate !== null && input.overrideRate !== ''
                      ? parseFloat(input.overrideRate)
                      : element.default_rate;
                    
                    return (
                      <div key={element.element_id} style={styles.costItem}>
                        <input
                          type="checkbox"
                          style={styles.checkbox}
                          checked={input.isApplied || false}
                          onChange={() => handleCheckboxChange(element.element_id)}
                          disabled={!element.is_optional}
                        />
                        
                        <div style={styles.elementName}>
                          {element.element_name}
                          {element.is_optional ? (
                            <span style={styles.optional}>(Optional)</span>
                          ) : (
                            <span style={styles.required}>(Required)</span>
                          )}
                          <div style={styles.unitInfo}>
                            {isActualCost ? (
                              'Enter actual amount'
                            ) : (
                              `${element.unit_type} - ₹${element.default_rate}/${element.unit_type}`
                            )}
                          </div>
                        </div>

                        {isActualCost ? (
                          <input
                            type="number"
                            style={{
                              ...styles.input,
                              backgroundColor: input.isApplied ? 'white' : '#f8f9fa'
                            }}
                            placeholder="Enter actual cost"
                            value={input.actualCost || ''}
                            onChange={(e) => handleActualCostChange(element.element_id, e.target.value)}
                            disabled={!input.isApplied}
                          />
                        ) : allowOverride ? (
                          <input
                            type="number"
                            style={{
                              ...styles.input,
                              backgroundColor: input.isApplied ? 'white' : '#f8f9fa',
                              fontWeight: input.overrideRate ? 'bold' : 'normal'
                            }}
                            placeholder={element.default_rate.toString()}
                            value={input.overrideRate || ''}
                            onChange={(e) => handleOverrideChange(element.element_id, e.target.value)}
                            disabled={!input.isApplied}
                            title="Override default rate"
                          />
                        ) : (
                          <div style={styles.calculated}>
                            ₹{element.default_rate}
                          </div>
                        )}

                        <div style={styles.calculated}>
                          {input.quantity ? input.quantity.toFixed(2) : '0.00'}
                          {element.calculation_method === 'per_hour' && ' hrs'}
                          {element.calculation_method === 'per_kg' && ' kg'}
                          {element.calculation_method === 'per_bag' && ' bags'}
                          {element.calculation_method === 'fixed' && ' unit'}
                        </div>

                        <div style={{
                          ...styles.calculated,
                          fontWeight: '600',
                          color: input.isApplied ? '#28a745' : '#6c757d',
                          backgroundColor: input.isApplied && input.totalCost > 0 ? '#d4edda' : '#e9ecef'
                        }}>
                          ₹{input.isApplied && input.totalCost ? input.totalCost.toFixed(2) : '0.00'}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}

          {showSummary && (
            <div style={styles.totalRow}>
              <div style={styles.totalLabel}>
                Total {getStageDisplayName()} Costs:
              </div>
              <div style={styles.totalAmount}>
                ₹{totalCost.toFixed(2)}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default CostCapture;
