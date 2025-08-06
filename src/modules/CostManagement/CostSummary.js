// Cost Summary Display Component for PUVI Oil Manufacturing System
// File Path: puvi-frontend/src/modules/CostManagement/CostSummary.js
// Purpose: Clean, reusable component for displaying cost breakdowns

import React, { useMemo } from 'react';
import { 
  formatCurrency, 
  groupCostsByCategory, 
  getCategoryColor,
  calculateTotalCosts 
} from './utils';

const CostSummary = ({
  costs = [],
  batchData = {},
  showHeader = true,
  showBreakdown = true,
  showTotals = true,
  showPerKg = true,
  printMode = false,
  className = '',
  title = 'Cost Summary'
}) => {
  
  // Group costs by category
  const groupedCosts = useMemo(() => {
    return groupCostsByCategory(costs);
  }, [costs]);
  
  // Calculate totals
  const totals = useMemo(() => {
    const baseCost = batchData.seed_cost || batchData.base_cost || 0;
    const extendedCost = calculateTotalCosts(costs);
    const totalProduction = baseCost + extendedCost;
    const cakeRevenue = batchData.cake_revenue || 0;
    const sludgeRevenue = batchData.sludge_revenue || 0;
    const netOilCost = totalProduction - cakeRevenue - sludgeRevenue;
    const oilYield = batchData.oil_yield || 0;
    const costPerKg = oilYield > 0 ? netOilCost / oilYield : 0;
    
    return {
      baseCost,
      extendedCost,
      totalProduction,
      cakeRevenue,
      sludgeRevenue,
      netOilCost,
      costPerKg
    };
  }, [costs, batchData]);
  
  const styles = {
    container: {
      backgroundColor: '#ffffff',
      borderRadius: '8px',
      padding: printMode ? '20px' : '25px',
      border: printMode ? '1px solid #000' : '1px solid #dee2e6',
      fontFamily: printMode ? 'serif' : 'inherit',
      pageBreakInside: 'avoid'
    },
    header: {
      marginBottom: '20px',
      paddingBottom: '15px',
      borderBottom: '2px solid #dee2e6'
    },
    title: {
      fontSize: printMode ? '20px' : '18px',
      fontWeight: '600',
      color: '#495057',
      marginBottom: '10px'
    },
    batchInfo: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: '10px',
      fontSize: '14px',
      color: '#6c757d'
    },
    categorySection: {
      marginBottom: '20px'
    },
    categoryHeader: {
      padding: '10px 15px',
      borderRadius: '5px',
      marginBottom: '10px',
      fontWeight: '600',
      fontSize: '15px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    },
    costItem: {
      display: 'grid',
      gridTemplateColumns: '2fr 100px 100px 120px',
      gap: '10px',
      padding: '8px 15px',
      borderBottom: '1px solid #f0f0f0',
      fontSize: '14px',
      alignItems: 'center'
    },
    costItemName: {
      color: '#495057'
    },
    costItemQuantity: {
      textAlign: 'center',
      color: '#6c757d'
    },
    costItemRate: {
      textAlign: 'right',
      color: '#6c757d'
    },
    costItemTotal: {
      textAlign: 'right',
      fontWeight: '500',
      color: '#495057'
    },
    subtotalRow: {
      display: 'grid',
      gridTemplateColumns: '2fr 100px 100px 120px',
      gap: '10px',
      padding: '10px 15px',
      backgroundColor: '#f8f9fa',
      borderTop: '1px solid #dee2e6',
      fontWeight: '600',
      fontSize: '14px'
    },
    totalsSection: {
      marginTop: '20px',
      paddingTop: '20px',
      borderTop: '2px solid #dee2e6'
    },
    totalRow: {
      display: 'grid',
      gridTemplateColumns: '1fr auto',
      gap: '20px',
      padding: '10px 0',
      fontSize: '15px',
      alignItems: 'center'
    },
    totalLabel: {
      color: '#495057'
    },
    totalAmount: {
      fontWeight: '600',
      textAlign: 'right'
    },
    grandTotal: {
      backgroundColor: '#343a40',
      color: 'white',
      padding: '15px',
      borderRadius: '5px',
      marginTop: '10px',
      display: 'grid',
      gridTemplateColumns: '1fr auto',
      gap: '20px',
      fontSize: '18px',
      fontWeight: 'bold'
    },
    perKgRow: {
      backgroundColor: '#495057',
      color: 'white',
      padding: '12px 15px',
      borderRadius: '5px',
      marginTop: '10px',
      display: 'grid',
      gridTemplateColumns: '1fr auto',
      gap: '20px',
      fontSize: '16px'
    },
    revenueRow: {
      backgroundColor: '#d4edda',
      padding: '10px',
      borderRadius: '4px',
      marginBottom: '5px'
    },
    noCosts: {
      padding: '40px',
      textAlign: 'center',
      color: '#6c757d',
      fontSize: '16px'
    },
    printOnly: {
      display: printMode ? 'block' : 'none'
    },
    badge: {
      padding: '2px 6px',
      borderRadius: '3px',
      fontSize: '11px',
      marginLeft: '8px',
      fontWeight: '500'
    }
  };
  
  // Render cost item row
  const renderCostItem = (cost) => {
    const quantity = cost.quantity || 0;
    const rate = cost.rate || 0;
    const total = cost.total_cost || 0;
    
    // Format quantity based on calculation method
    let quantityDisplay = quantity.toFixed(2);
    if (cost.calculation_method === 'per_hour') {
      quantityDisplay = `${quantity.toFixed(2)} hrs`;
    } else if (cost.calculation_method === 'per_kg') {
      quantityDisplay = `${quantity.toFixed(2)} kg`;
    } else if (cost.calculation_method === 'fixed') {
      quantityDisplay = 'Fixed';
    }
    
    return (
      <div key={cost.element_id || cost.element_name} style={styles.costItem}>
        <div style={styles.costItemName}>
          {cost.element_name}
          {cost.is_optional && (
            <span style={{ ...styles.badge, backgroundColor: '#fff3cd', color: '#856404' }}>
              Optional
            </span>
          )}
          {cost.override_rate && (
            <span style={{ ...styles.badge, backgroundColor: '#cce5ff', color: '#004085' }}>
              Override
            </span>
          )}
        </div>
        <div style={styles.costItemQuantity}>{quantityDisplay}</div>
        <div style={styles.costItemRate}>{formatCurrency(rate, false)}</div>
        <div style={styles.costItemTotal}>{formatCurrency(total)}</div>
      </div>
    );
  };
  
  // Empty state
  if (!costs || costs.length === 0) {
    return (
      <div style={styles.container} className={className}>
        <div style={styles.noCosts}>
          No cost elements to display
        </div>
      </div>
    );
  }
  
  return (
    <div style={styles.container} className={className}>
      {/* Header Section */}
      {showHeader && (
        <div style={styles.header}>
          <h3 style={styles.title}>{title}</h3>
          {batchData.batch_code && (
            <div style={styles.batchInfo}>
              <div><strong>Batch:</strong> {batchData.batch_code}</div>
              <div><strong>Oil Type:</strong> {batchData.oil_type}</div>
              <div><strong>Production Date:</strong> {batchData.production_date}</div>
              <div><strong>Oil Yield:</strong> {batchData.oil_yield} kg</div>
            </div>
          )}
        </div>
      )}
      
      {/* Cost Breakdown by Category */}
      {showBreakdown && (
        <div>
          {/* Column Headers */}
          <div style={{ ...styles.costItem, fontWeight: '600', borderBottom: '2px solid #dee2e6' }}>
            <div>Cost Element</div>
            <div style={{ textAlign: 'center' }}>Quantity</div>
            <div style={{ textAlign: 'right' }}>Rate (₹)</div>
            <div style={{ textAlign: 'right' }}>Total (₹)</div>
          </div>
          
          {/* Base/Seed Cost if available */}
          {batchData.seed_cost > 0 && (
            <div style={styles.categorySection}>
              <div style={{
                ...styles.categoryHeader,
                backgroundColor: '#e9ecef'
              }}>
                <span>Base Material Cost</span>
                <span>{formatCurrency(batchData.seed_cost)}</span>
              </div>
            </div>
          )}
          
          {/* Extended Costs by Category */}
          {Object.entries(groupedCosts).map(([category, data]) => (
            <div key={category} style={styles.categorySection}>
              <div style={{
                ...styles.categoryHeader,
                backgroundColor: getCategoryColor(category)
              }}>
                <span>{category} Costs ({data.items.length})</span>
                <span>{formatCurrency(data.subtotal)}</span>
              </div>
              
              {data.items.map(cost => renderCostItem(cost))}
              
              {/* Category Subtotal */}
              <div style={styles.subtotalRow}>
                <div style={{ gridColumn: 'span 3' }}>
                  {category} Subtotal
                </div>
                <div style={{ textAlign: 'right' }}>
                  {formatCurrency(data.subtotal)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Totals Section */}
      {showTotals && (
        <div style={styles.totalsSection}>
          {/* Base Cost */}
          {totals.baseCost > 0 && (
            <div style={styles.totalRow}>
              <div style={styles.totalLabel}>Base Production Cost:</div>
              <div style={styles.totalAmount}>{formatCurrency(totals.baseCost)}</div>
            </div>
          )}
          
          {/* Extended Costs Total */}
          <div style={styles.totalRow}>
            <div style={styles.totalLabel}>Extended Costs Total:</div>
            <div style={styles.totalAmount}>{formatCurrency(totals.extendedCost)}</div>
          </div>
          
          {/* Total Production Cost */}
          <div style={styles.grandTotal}>
            <div>Total Production Cost:</div>
            <div>{formatCurrency(totals.totalProduction)}</div>
          </div>
          
          {/* Revenue Deductions */}
          {totals.cakeRevenue > 0 && (
            <div style={{ ...styles.totalRow, ...styles.revenueRow }}>
              <div>Less: Oil Cake Revenue</div>
              <div style={{ fontWeight: '600' }}>
                -{formatCurrency(totals.cakeRevenue)}
              </div>
            </div>
          )}
          
          {totals.sludgeRevenue > 0 && (
            <div style={{ ...styles.totalRow, ...styles.revenueRow }}>
              <div>Less: Sludge Revenue</div>
              <div style={{ fontWeight: '600' }}>
                -{formatCurrency(totals.sludgeRevenue)}
              </div>
            </div>
          )}
          
          {/* Net Oil Cost */}
          <div style={styles.grandTotal}>
            <div>Net Oil Cost:</div>
            <div>{formatCurrency(totals.netOilCost)}</div>
          </div>
          
          {/* Cost per kg */}
          {showPerKg && batchData.oil_yield > 0 && (
            <div style={styles.perKgRow}>
              <div>Cost per kg Oil ({batchData.oil_yield} kg):</div>
              <div>{formatCurrency(totals.costPerKg)}/kg</div>
            </div>
          )}
        </div>
      )}
      
      {/* Print Mode Footer */}
      {printMode && (
        <div style={styles.printOnly}>
          <hr style={{ marginTop: '30px', marginBottom: '10px' }} />
          <div style={{ fontSize: '12px', color: '#6c757d', textAlign: 'center' }}>
            Generated on: {new Date().toLocaleString('en-GB')} | PUVI Oil Manufacturing System
          </div>
        </div>
      )}
    </div>
  );
};

export default CostSummary;
