// File Path: puvi-frontend/src/modules/MaterialSales/index.js
// Material Sales Module with Packing Cost Integration - Updated UI
// Session 3: UI standardized with CostElementRow component
// IMPORTANT: FIFO logic unchanged and working perfectly

import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import CostElementRow from '../../components/CostManagement/CostElementRow';
import './MaterialSales.css';

const MaterialSales = () => {
  const [activeTab, setActiveTab] = useState('new');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  
  // Data states
  const [byproductTypes, setByproductTypes] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [salesHistory, setSalesHistory] = useState([]);
  const [reconciliationData, setReconciliationData] = useState([]);
  const [oilTypes, setOilTypes] = useState([]);
  const [summary, setSummary] = useState(null);
  
  // Cost elements state for packing cost
  const [packingCostElement, setPackingCostElement] = useState({
    element_id: null,
    element_name: 'Sacks/Bags',
    default_rate: 0.3,
    unit_type: 'Per Kg'
  });
  
  // Sale form data with packing cost fields
  const [saleData, setSaleData] = useState({
    byproduct_type: 'oil_cake',
    oil_type: '',
    sale_date: new Date().toISOString().split('T')[0],
    buyer_name: '',
    invoice_number: '',
    quantity_sold: '',
    sale_rate: '',
    transport_cost: '0',
    packing_cost_enabled: false,
    packing_cost_rate: '',
    packing_cost_total: '0',
    notes: ''
  });
  
  // FIFO preview
  const [fifoPreview, setFifoPreview] = useState([]);
  
  // Load initial data
  useEffect(() => {
    fetchByproductTypes();
    fetchInventory('oil_cake');
    fetchSalesHistory();
    fetchPackingCostElement();
  }, []);
  
  // Fetch packing cost element from master
  const fetchPackingCostElement = async () => {
    try {
      const response = await api.costManagement.getCostElementsByStage('sales');
      if (response.success) {
        const elements = response.cost_elements;
        
        // Find sacks/bags element
        const packingElement = elements.find(e => 
          e.element_name === 'Sacks/Bags' || 
          e.element_name.toLowerCase().includes('sack') || 
          e.element_name.toLowerCase().includes('bag') ||
          e.element_name.toLowerCase().includes('packing')
        );
        
        if (packingElement) {
          setPackingCostElement({
            element_id: packingElement.element_id,
            element_name: packingElement.element_name,
            default_rate: packingElement.default_rate,
            unit_type: packingElement.unit_type
          });
        }
      }
    } catch (error) {
      console.error('Error fetching packing cost element:', error);
      // Continue with default rate if API fails
    }
  };
  
  // Fetch by-product types
  const fetchByproductTypes = async () => {
    try {
      const response = await api.sales.getByproductTypes();
      if (response.success) {
        setByproductTypes(response.byproduct_types);
      }
    } catch (error) {
      console.error('Error fetching byproduct types:', error);
    }
  };
  
  // Fetch available inventory - UNCHANGED FIFO LOGIC
  const fetchInventory = async (type, oilType = null) => {
    try {
      const params = { type };
      if (oilType) params.oil_type = oilType;
      
      const response = await api.sales.getMaterialSalesInventory(params);
      if (response.success) {
        setInventory(response.inventory_items);
        setOilTypes(response.oil_types || []);
        setSummary(response.summary);
      }
    } catch (error) {
      console.error('Error fetching inventory:', error);
      setMessage('Error loading inventory');
    }
  };
  
  // Fetch sales history
  const fetchSalesHistory = async () => {
    try {
      const response = await api.sales.getMaterialSalesHistory({ limit: 50 });
      if (response.success) {
        setSalesHistory(response.sales);
      }
    } catch (error) {
      console.error('Error fetching sales history:', error);
    }
  };
  
  // Fetch reconciliation report
  const fetchReconciliationReport = async () => {
    try {
      const response = await api.sales.getCostReconciliationReport();
      if (response.success) {
        setReconciliationData(response.reconciliation_data);
      }
    } catch (error) {
      console.error('Error fetching reconciliation report:', error);
    }
  };
  
  // Handle form changes with packing cost logic
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (type === 'checkbox') {
      setSaleData(prev => {
        const updated = { ...prev, [name]: checked };
        
        // If disabling packing cost, reset the values
        if (name === 'packing_cost_enabled' && !checked) {
          updated.packing_cost_rate = '';
          updated.packing_cost_total = '0';
        } else if (name === 'packing_cost_enabled' && checked) {
          // Calculate packing cost with default rate when enabled
          const quantity = parseFloat(prev.quantity_sold) || 0;
          const rate = packingCostElement.default_rate;
          updated.packing_cost_total = (quantity * rate).toFixed(2);
        }
        
        return updated;
      });
    } else {
      setSaleData(prev => {
        const updated = { ...prev, [name]: value };
        
        // Calculate packing cost when quantity changes
        if (name === 'quantity_sold' && prev.packing_cost_enabled) {
          const quantity = parseFloat(value) || 0;
          const rate = parseFloat(prev.packing_cost_rate) || packingCostElement.default_rate;
          updated.packing_cost_total = (quantity * rate).toFixed(2);
        }
        
        // Calculate packing cost when rate changes
        if (name === 'packing_cost_rate' && prev.packing_cost_enabled) {
          const quantity = parseFloat(prev.quantity_sold) || 0;
          const rate = parseFloat(value) || packingCostElement.default_rate;
          updated.packing_cost_total = (quantity * rate).toFixed(2);
        }
        
        return updated;
      });
    }
    
    // If byproduct type changes, fetch new inventory
    if (name === 'byproduct_type') {
      fetchInventory(value, saleData.oil_type);
      setFifoPreview([]);
    }
    
    // If oil type changes, filter inventory
    if (name === 'oil_type') {
      fetchInventory(saleData.byproduct_type, value);
    }
    
    // Calculate FIFO preview when quantity changes
    if (name === 'quantity_sold' && value) {
      calculateFifoPreview(parseFloat(value));
    }
  };
  
  // Handle packing cost override changes from CostElementRow
  const handlePackingCostToggle = (enabled) => {
    setSaleData(prev => {
      const updated = { ...prev, packing_cost_enabled: enabled };
      
      if (!enabled) {
        updated.packing_cost_rate = '';
        updated.packing_cost_total = '0';
      } else {
        const quantity = parseFloat(prev.quantity_sold) || 0;
        const rate = packingCostElement.default_rate;
        updated.packing_cost_total = (quantity * rate).toFixed(2);
      }
      
      return updated;
    });
  };
  
  const handlePackingRateChange = (rate) => {
    setSaleData(prev => {
      const quantity = parseFloat(prev.quantity_sold) || 0;
      const effectiveRate = parseFloat(rate) || packingCostElement.default_rate;
      
      return {
        ...prev,
        packing_cost_rate: rate,
        packing_cost_total: (quantity * effectiveRate).toFixed(2)
      };
    });
  };
  
  // Calculate FIFO allocation preview - CRITICAL: DO NOT MODIFY
  const calculateFifoPreview = (quantityToSell) => {
    const preview = [];
    let remaining = quantityToSell;
    
    for (const item of inventory) {
      if (remaining <= 0) break;
      
      const allocation = Math.min(remaining, item.quantity_remaining);
      if (allocation > 0) {
        preview.push({
          batch_code: item.batch_code,
          batch_id: item.batch_id,
          allocation: allocation,
          estimated_rate: item.estimated_rate,
          age_days: item.age_days,
          traceable_code: item.traceable_code
        });
        remaining -= allocation;
      }
    }
    
    setFifoPreview(preview);
    
    if (remaining > 0) {
      setMessage(`⚠️ Warning: Only ${quantityToSell - remaining} kg available in inventory`);
    }
  };
  
  // Calculate cost impact with packing cost - CRITICAL: RETROACTIVE LOGIC PRESERVED
  const calculateCostImpact = () => {
    if (!saleData.sale_rate || fifoPreview.length === 0) return null;
    
    const saleRate = parseFloat(saleData.sale_rate);
    const packingCost = saleData.packing_cost_enabled ? parseFloat(saleData.packing_cost_total) : 0;
    const quantitySold = parseFloat(saleData.quantity_sold) || 1;
    let totalAdjustment = 0;
    
    fifoPreview.forEach(item => {
      const adjustment = (item.estimated_rate - saleRate) * item.allocation;
      totalAdjustment += adjustment;
    });
    
    // Add packing cost impact (it increases oil cost)
    totalAdjustment += packingCost;
    
    return {
      totalAdjustment,
      packingCostImpact: packingCost,
      isPositive: totalAdjustment < 0, // Negative adjustment means sold for more
      perKgImpact: totalAdjustment / quantitySold,
      netRevenue: (saleRate * quantitySold) - packingCost - (parseFloat(saleData.transport_cost) || 0)
    };
  };
  
  // Handle form submission with packing cost
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!saleData.buyer_name || !saleData.quantity_sold || !saleData.sale_rate) {
      setMessage('❌ Please fill in all required fields');
      return;
    }
    
    if (fifoPreview.length === 0) {
      setMessage('❌ No inventory available for allocation');
      return;
    }
    
    setLoading(true);
    setMessage('');
    
    try {
      // Prepare submission data with packing cost
      const submissionData = {
        ...saleData,
        packing_cost: saleData.packing_cost_enabled ? parseFloat(saleData.packing_cost_total) : 0,
        packing_cost_rate: saleData.packing_cost_enabled ? 
          (parseFloat(saleData.packing_cost_rate) || packingCostElement.default_rate) : 0
      };
      
      const response = await api.sales.addMaterialSale(submissionData);
      
      // Log packing cost override if different from master
      if (response.success && saleData.packing_cost_enabled && saleData.packing_cost_rate) {
        const usedRate = parseFloat(saleData.packing_cost_rate);
        if (usedRate !== packingCostElement.default_rate) {
          try {
            await api.costManagement.saveBatchCosts({
              record_id: response.sale_id,
              module: 'material_sales',
              costs: [{
                element_id: packingCostElement.element_id,
                element_name: packingCostElement.element_name,
                quantity: parseFloat(saleData.quantity_sold),
                master_rate: packingCostElement.default_rate,
                override_rate: usedRate,
                total_cost: parseFloat(saleData.packing_cost_total)
              }],
              created_by: 'Material Sales Module'
            });
          } catch (auditError) {
            console.error('Error logging packing cost override:', auditError);
          }
        }
      }
      
      if (response.success) {
        const packingInfo = saleData.packing_cost_enabled ? 
          `\nPacking Cost: ₹${saleData.packing_cost_total}` : '';
        
        setMessage(`✅ Sale recorded successfully!
Sale ID: ${response.sale_id}
Quantity: ${response.quantity_sold} kg
Total Amount: ₹${response.total_amount.toFixed(2)}${packingInfo}
Batches Allocated: ${response.allocations.length}
Cost Adjustment: ₹${response.total_cost_adjustment.toFixed(2)}`);
        
        // Reset form
        setSaleData({
          byproduct_type: 'oil_cake',
          oil_type: '',
          sale_date: new Date().toISOString().split('T')[0],
          buyer_name: '',
          invoice_number: '',
          quantity_sold: '',
          sale_rate: '',
          transport_cost: '0',
          packing_cost_enabled: false,
          packing_cost_rate: '',
          packing_cost_total: '0',
          notes: ''
        });
        setFifoPreview([]);
        
        // Refresh data
        fetchInventory(saleData.byproduct_type);
        fetchSalesHistory();
      } else {
        setMessage(`❌ Error: ${response.error}`);
      }
    } catch (error) {
      setMessage(`❌ Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  const costImpact = calculateCostImpact();
  
  // Get by-product display name
  const getByproductName = (code) => {
    const type = byproductTypes.find(t => t.type_code === code);
    return type ? type.type_name : code;
  };
  
  // Format date for display
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB');
  };
  
  return (
    <div className="material-sales-container">
      <div className="module-header">
        <h2 className="module-title">Material Sales Module</h2>
        <p className="module-subtitle">By-product sales with cost reconciliation</p>
      </div>
      
      {/* Tab Navigation */}
      <div className="tab-navigation">
        <button 
          className={`tab-button ${activeTab === 'new' ? 'active' : ''}`}
          onClick={() => setActiveTab('new')}
        >
          New Sale
        </button>
        <button 
          className={`tab-button ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('history');
            if (salesHistory.length === 0) fetchSalesHistory();
          }}
        >
          Sales History
        </button>
        <button 
          className={`tab-button ${activeTab === 'reconciliation' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('reconciliation');
            if (reconciliationData.length === 0) fetchReconciliationReport();
          }}
        >
          Cost Reconciliation
        </button>
      </div>
      
      {message && (
        <div className={`message ${message.includes('✅') ? 'success' : message.includes('⚠️') ? 'warning' : 'error'}`}>
          {message}
        </div>
      )}
      
      {/* New Sale Tab */}
      {activeTab === 'new' && (
        <div className="tab-content">
          <div className="sale-form-grid">
            {/* Left: Form */}
            <div className="sale-form-section">
              <h3 className="section-title">Sale Details</h3>
              <form onSubmit={handleSubmit}>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">By-Product Type *</label>
                    <select
                      name="byproduct_type"
                      value={saleData.byproduct_type}
                      onChange={handleInputChange}
                      className="form-control"
                    >
                      <option value="oil_cake">Oil Cake</option>
                      <option value="sludge">Sludge</option>
                    </select>
                  </div>
                  
                  <div className="form-group">
                    <label className="form-label">Oil Type (Filter)</label>
                    <select
                      name="oil_type"
                      value={saleData.oil_type}
                      onChange={handleInputChange}
                      className="form-control"
                    >
                      <option value="">All Types</option>
                      {oilTypes.map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>
                </div>
                
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Sale Date *</label>
                    <input
                      type="date"
                      name="sale_date"
                      value={saleData.sale_date}
                      onChange={handleInputChange}
                      required
                      className="form-control"
                    />
                  </div>
                  
                  <div className="form-group">
                    <label className="form-label">Invoice Number</label>
                    <input
                      type="text"
                      name="invoice_number"
                      value={saleData.invoice_number}
                      onChange={handleInputChange}
                      placeholder="Auto-generated if empty"
                      className="form-control"
                    />
                  </div>
                </div>
                
                <div className="form-group">
                  <label className="form-label">Buyer Name *</label>
                  <input
                    type="text"
                    name="buyer_name"
                    value={saleData.buyer_name}
                    onChange={handleInputChange}
                    required
                    placeholder="Enter buyer/customer name"
                    className="form-control"
                  />
                </div>
                
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Quantity (kg) *</label>
                    <input
                      type="number"
                      name="quantity_sold"
                      value={saleData.quantity_sold}
                      onChange={handleInputChange}
                      required
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      className="form-control"
                    />
                  </div>
                  
                  <div className="form-group">
                    <label className="form-label">Sale Rate (₹/kg) *</label>
                    <input
                      type="number"
                      name="sale_rate"
                      value={saleData.sale_rate}
                      onChange={handleInputChange}
                      required
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      className="form-control"
                    />
                  </div>
                </div>
                
                <div className="form-group">
                  <label className="form-label">Transport Cost (₹)</label>
                  <input
                    type="number"
                    name="transport_cost"
                    value={saleData.transport_cost}
                    onChange={handleInputChange}
                    step="0.01"
                    min="0"
                    className="form-control"
                  />
                </div>
                
                {/* Packing Cost Section - Updated with CostElementRow */}
                <div className="cost-element-section">
                  <h4 className="subsection-title">Additional Costs</h4>
                  <CostElementRow
                    elementName="Sacks/Bags Packing Cost"
                    masterRate={packingCostElement.default_rate}
                    unitType="Per Kg"
                    quantity={parseFloat(saleData.quantity_sold) || 0}
                    enabled={saleData.packing_cost_enabled}
                    category="Material"
                    overrideRate={saleData.packing_cost_rate}
                    onToggle={handlePackingCostToggle}
                    onOverrideChange={handlePackingRateChange}
                    icon="📦"
                    helpText="Cost for packing materials (sacks/bags) used for by-product sales"
                    variant="default"
                  />
                  
                  {saleData.packing_cost_enabled && (
                    <div className="cost-warning-note">
                      <span className="warning-icon">⚠️</span>
                      <span className="warning-text">
                        Packing cost will be deducted from sale revenue and will increase the net oil cost retroactively.
                      </span>
                    </div>
                  )}
                </div>
                
                <div className="form-group">
                  <label className="form-label">Notes</label>
                  <textarea
                    name="notes"
                    value={saleData.notes}
                    onChange={handleInputChange}
                    rows="3"
                    placeholder="Any additional notes..."
                    className="form-control"
                  />
                </div>
                
                {/* Cost Impact Summary with packing cost */}
                {costImpact && (
                  <div className={`cost-impact-card ${costImpact.isPositive ? 'positive' : 'negative'}`}>
                    <h4>Cost Impact Preview</h4>
                    {saleData.packing_cost_enabled && (
                      <div className="impact-row highlight">
                        <span>Packing Cost Impact:</span>
                        <span className="impact-value negative">
                          +₹{costImpact.packingCostImpact.toFixed(2)}
                        </span>
                      </div>
                    )}
                    <div className="impact-row">
                      <span>Sale Rate Adjustment:</span>
                      <span className="impact-value">
                        {costImpact.totalAdjustment - costImpact.packingCostImpact > 0 ? '+' : ''}
                        ₹{(costImpact.totalAdjustment - costImpact.packingCostImpact).toFixed(2)}
                      </span>
                    </div>
                    <div className="impact-row total">
                      <span>Total Oil Cost Impact:</span>
                      <span className="impact-value">
                        {costImpact.isPositive ? '↓' : '↑'} ₹{Math.abs(costImpact.totalAdjustment).toFixed(2)}
                      </span>
                    </div>
                    <div className="impact-row">
                      <span>Per kg Oil Cost Impact:</span>
                      <span className="impact-value">
                        {costImpact.isPositive ? '-' : '+'} ₹{Math.abs(costImpact.perKgImpact).toFixed(2)}
                      </span>
                    </div>
                    <div className="impact-row success-row">
                      <span>Net Revenue:</span>
                      <span className="impact-value">
                        ₹{costImpact.netRevenue.toFixed(2)}
                      </span>
                    </div>
                    <small className="impact-note">
                      {costImpact.isPositive 
                        ? 'Net positive impact - Oil cost will decrease'
                        : 'Net negative impact - Oil cost will increase'}
                    </small>
                  </div>
                )}
                
                <button
                  type="submit"
                  disabled={loading || fifoPreview.length === 0}
                  className="submit-button"
                >
                  {loading ? 'Recording Sale...' : 'Record Sale'}
                </button>
              </form>
            </div>
            
            {/* Right: Inventory & FIFO Preview - UNCHANGED */}
            <div className="inventory-preview-section">
              <h3 className="section-title">Available Inventory</h3>
              {summary && (
                <div className="inventory-summary">
                  <div className="summary-stat">
                    <span className="stat-label">Total Available:</span>
                    <span className="stat-value">{summary.total_quantity.toFixed(2)} kg</span>
                  </div>
                  <div className="summary-stat">
                    <span className="stat-label">Estimated Value:</span>
                    <span className="stat-value">₹{summary.total_estimated_value.toFixed(2)}</span>
                  </div>
                  <div className="summary-stat">
                    <span className="stat-label">Oldest Stock:</span>
                    <span className="stat-value">{summary.oldest_stock_days} days</span>
                  </div>
                </div>
              )}
              
              <div className="inventory-list">
                {inventory.length === 0 ? (
                  <div className="no-inventory">No inventory available</div>
                ) : (
                  inventory.slice(0, 5).map((item, index) => (
                    <div key={item.inventory_id} className="inventory-item">
                      <div className="item-header">
                        <span className="batch-code">{item.batch_code}</span>
                        <span className="age-badge">{item.age_days} days old</span>
                      </div>
                      <div className="item-details">
                        <div>{item.oil_type} • {item.quantity_remaining.toFixed(2)} kg available</div>
                        <div>Est. Rate: ₹{item.estimated_rate.toFixed(2)}/kg</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
              
              {/* FIFO Allocation Preview - CRITICAL: UNCHANGED */}
              {fifoPreview.length > 0 && (
                <div className="fifo-preview">
                  <h4>FIFO Allocation Preview</h4>
                  <div className="allocation-list">
                    {fifoPreview.map((item, index) => (
                      <div key={index} className="allocation-item">
                        <div className="allocation-header">
                          <span className="batch-code">{item.batch_code}</span>
                          <span className="allocation-qty">{item.allocation.toFixed(2)} kg</span>
                        </div>
                        <div className="allocation-details">
                          <div>Est: ₹{item.estimated_rate.toFixed(2)}/kg</div>
                          <div>Age: {item.age_days} days</div>
                          {saleData.sale_rate && (
                            <div className={parseFloat(saleData.sale_rate) > item.estimated_rate ? 'positive' : 'negative'}>
                              Diff: {parseFloat(saleData.sale_rate) > item.estimated_rate ? '+' : ''}
                              ₹{(parseFloat(saleData.sale_rate) - item.estimated_rate).toFixed(2)}/kg
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Sales History Tab */}
      {activeTab === 'history' && (
        <div className="tab-content">
          <h3 className="section-title">Sales History</h3>
          <div className="history-table-container">
            <table className="history-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Invoice</th>
                  <th>Buyer</th>
                  <th>Type</th>
                  <th>Oil Type</th>
                  <th>Quantity</th>
                  <th>Rate</th>
                  <th>Amount</th>
                  <th>Packing</th>
                  <th>Batches</th>
                  <th>Adjustment</th>
                </tr>
              </thead>
              <tbody>
                {salesHistory.map(sale => (
                  <tr key={sale.sale_id}>
                    <td>{formatDate(sale.sale_date)}</td>
                    <td>{sale.invoice_number}</td>
                    <td>{sale.buyer_name}</td>
                    <td>
                      <span className="type-badge">
                        {getByproductName(sale.byproduct_type)}
                      </span>
                    </td>
                    <td>{sale.oil_type}</td>
                    <td className="text-right">{sale.quantity_sold.toFixed(2)} kg</td>
                    <td className="text-right">₹{sale.sale_rate.toFixed(2)}</td>
                    <td className="text-right">₹{sale.total_amount.toFixed(2)}</td>
                    <td className="text-right">
                      {sale.packing_cost ? `₹${sale.packing_cost.toFixed(2)}` : '-'}
                    </td>
                    <td className="text-center">{sale.batch_count}</td>
                    <td className={`text-right ${sale.total_adjustment > 0 ? 'negative' : 'positive'}`}>
                      {sale.total_adjustment > 0 ? '+' : ''}₹{sale.total_adjustment.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      
      {/* Cost Reconciliation Tab */}
      {activeTab === 'reconciliation' && (
        <div className="tab-content">
          <h3 className="section-title">Cost Reconciliation Report</h3>
          <div className="reconciliation-grid">
            {reconciliationData.map(batch => (
              <div key={batch.batch_id} className="reconciliation-card">
                <div className="card-header">
                  <h4>{batch.batch_code}</h4>
                  <span className="oil-type">{batch.oil_type}</span>
                </div>
                
                <div className="card-body">
                  <div className="reconciliation-row">
                    <span>Production Date:</span>
                    <span>{batch.production_date}</span>
                  </div>
                  <div className="reconciliation-row">
                    <span>Oil Yield:</span>
                    <span>{batch.oil_yield.toFixed(2)} kg</span>
                  </div>
                  <div className="reconciliation-row">
                    <span>Current Oil Cost:</span>
                    <span>₹{batch.current_oil_cost.toFixed(2)}/kg</span>
                  </div>
                  
                  {batch.cake_details.sold_quantity > 0 && (
                    <div className="byproduct-section">
                      <h5>Oil Cake</h5>
                      <div className="reconciliation-row">
                        <span>Sold:</span>
                        <span>{batch.cake_details.sold_quantity.toFixed(2)} kg</span>
                      </div>
                      <div className="reconciliation-row">
                        <span>Estimated Rate:</span>
                        <span>₹{batch.cake_details.estimated_rate.toFixed(2)}</span>
                      </div>
                      <div className="reconciliation-row">
                        <span>Actual Rate:</span>
                        <span>₹{batch.cake_details.actual_rate.toFixed(2)}</span>
                      </div>
                      <div className="reconciliation-row highlight">
                        <span>Adjustment:</span>
                        <span className={batch.cake_details.adjustment > 0 ? 'negative' : 'positive'}>
                          {batch.cake_details.adjustment > 0 ? '+' : ''}₹{batch.cake_details.adjustment.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  )}
                  
                  {batch.sludge_details.sold_quantity > 0 && (
                    <div className="byproduct-section">
                      <h5>Sludge</h5>
                      <div className="reconciliation-row">
                        <span>Sold:</span>
                        <span>{batch.sludge_details.sold_quantity.toFixed(2)} kg</span>
                      </div>
                      <div className="reconciliation-row">
                        <span>Estimated Rate:</span>
                        <span>₹{batch.sludge_details.estimated_rate.toFixed(2)}</span>
                      </div>
                      <div className="reconciliation-row">
                        <span>Actual Rate:</span>
                        <span>₹{batch.sludge_details.actual_rate.toFixed(2)}</span>
                      </div>
                      <div className="reconciliation-row highlight">
                        <span>Adjustment:</span>
                        <span className={batch.sludge_details.adjustment > 0 ? 'negative' : 'positive'}>
                          {batch.sludge_details.adjustment > 0 ? '+' : ''}₹{batch.sludge_details.adjustment.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  )}
                  
                  <div className="reconciliation-row total">
                    <span>Total Impact on Oil Cost:</span>
                    <span className={batch.total_adjustment > 0 ? 'negative' : 'positive'}>
                      {batch.total_adjustment > 0 ? '+' : ''}₹{batch.total_adjustment.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default MaterialSales;
