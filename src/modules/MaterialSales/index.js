// Material Sales Module for PUVI Oil Manufacturing System
// Handles by-product sales with FIFO allocation and cost reconciliation
// File Path: puvi-frontend/src/modules/MaterialSales/index.js

import React, { useState, useEffect } from 'react';
import api from '../../services/api';
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
  
  // Sale form data
  const [saleData, setSaleData] = useState({
    byproduct_type: 'oil_cake',
    oil_type: '',
    sale_date: new Date().toISOString().split('T')[0],
    buyer_name: '',
    invoice_number: '',
    quantity_sold: '',
    sale_rate: '',
    transport_cost: '0',
    notes: ''
  });
  
  // FIFO preview
  const [fifoPreview, setFifoPreview] = useState([]);
  
  // Load initial data
  useEffect(() => {
    fetchByproductTypes();
    fetchInventory('oil_cake');
    fetchSalesHistory();
  }, []);
  
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
  
  // Fetch available inventory
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
  
  // Handle form changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setSaleData(prev => ({
      ...prev,
      [name]: value
    }));
    
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
  
  // Calculate FIFO allocation preview
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
  
  // Calculate cost impact
  const calculateCostImpact = () => {
    if (!saleData.sale_rate || fifoPreview.length === 0) return null;
    
    const saleRate = parseFloat(saleData.sale_rate);
    let totalAdjustment = 0;
    
    fifoPreview.forEach(item => {
      const adjustment = (item.estimated_rate - saleRate) * item.allocation;
      totalAdjustment += adjustment;
    });
    
    return {
      totalAdjustment,
      isPositive: totalAdjustment < 0, // Negative adjustment means sold for more
      perKgImpact: totalAdjustment / parseFloat(saleData.quantity_sold || 1)
    };
  };
  
  // Handle form submission
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
      const response = await api.sales.addMaterialSale(saleData);
      
      if (response.success) {
        setMessage(`✅ Sale recorded successfully!
Sale ID: ${response.sale_id}
Quantity: ${response.quantity_sold} kg
Total Amount: ₹${response.total_amount.toFixed(2)}
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
        <h2>Material Sales Module</h2>
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
              <h3>Sale Details</h3>
              <form onSubmit={handleSubmit}>
                <div className="form-row">
                  <div className="form-group">
                    <label>By-Product Type *</label>
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
                    <label>Oil Type (Filter)</label>
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
                    <label>Sale Date *</label>
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
                    <label>Invoice Number</label>
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
                  <label>Buyer Name *</label>
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
                    <label>Quantity (kg) *</label>
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
                    <label>Sale Rate (₹/kg) *</label>
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
                  <label>Transport Cost (₹)</label>
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
                
                <div className="form-group">
                  <label>Notes</label>
                  <textarea
                    name="notes"
                    value={saleData.notes}
                    onChange={handleInputChange}
                    rows="3"
                    placeholder="Any additional notes..."
                    className="form-control"
                  />
                </div>
                
                {/* Cost Impact Summary */}
                {costImpact && (
                  <div className={`cost-impact-card ${costImpact.isPositive ? 'positive' : 'negative'}`}>
                    <h4>Cost Impact Preview</h4>
                    <div className="impact-row">
                      <span>Total Adjustment:</span>
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
                    <small>
                      {costImpact.isPositive 
                        ? 'Selling above estimate - Oil cost will decrease'
                        : 'Selling below estimate - Oil cost will increase'}
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
            
            {/* Right: Inventory & FIFO Preview */}
            <div className="inventory-preview-section">
              <h3>Available Inventory</h3>
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
              
              {/* FIFO Allocation Preview */}
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
          <h3>Sales History</h3>
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
          <h3>Cost Reconciliation Report</h3>
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
