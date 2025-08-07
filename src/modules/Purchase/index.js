// File Path: puvi-frontend/src/modules/Purchase/index.js
// Purchase Module with Cost Management Integration - Fixed UI Version
// Session 3: UI issues resolved with CostElementRow component

import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import './Purchase.css';

const Purchase = () => {
  const [suppliers, setSuppliers] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [purchaseHistory, setPurchaseHistory] = useState([]);
  const [invoiceData, setInvoiceData] = useState({
    supplier_id: '',
    invoice_ref: '',
    purchase_date: new Date().toISOString().split('T')[0],
    transport_cost: '0',
    handling_charges: '0'
  });
  
  const [items, setItems] = useState([{
    material_id: '',
    quantity: '',
    rate: '',
    gst_rate: '',
    transport_charges: '0',
    handling_charges: '0'
  }]);
  
  const [uomGroups, setUomGroups] = useState({
    kg: { percentage: 100, items: [] },
    L: { percentage: 0, items: [] },
    Nos: { percentage: 0, items: [] }
  });
  
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchSuppliers();
  }, []);

  useEffect(() => {
    // Recalculate transport/handling allocation when items or percentages change
    allocateCharges();
  }, [items, invoiceData.transport_cost, invoiceData.handling_charges, uomGroups]);

  const fetchSuppliers = async () => {
    try {
      const response = await api.purchase.getSuppliers();
      setSuppliers(response.suppliers || []);
    } catch (error) {
      setMessage(`Error loading suppliers: ${error.message}`);
    }
  };

  const fetchMaterialsForSupplier = async (supplierId) => {
    try {
      const response = await api.purchase.getMaterials({ supplier_id: supplierId });
      setMaterials(response.materials || []);
    } catch (error) {
      setMessage(`Error loading materials: ${error.message}`);
    }
  };

  const fetchPurchaseHistory = async () => {
    try {
      const response = await api.purchase.getPurchaseHistory({ limit: 20 });
      setPurchaseHistory(response.purchases || []);
    } catch (error) {
      setMessage(`Error loading purchase history: ${error.message}`);
    }
  };

  const handleSupplierChange = (e) => {
    const supplierId = e.target.value;
    setSelectedSupplier(supplierId);
    setInvoiceData({ ...invoiceData, supplier_id: supplierId });
    
    // Reset items when supplier changes
    setItems([{
      material_id: '',
      quantity: '',
      rate: '',
      gst_rate: '',
      transport_charges: '0',
      handling_charges: '0'
    }]);
    
    // Clear materials first, then fetch if supplier selected
    setMaterials([]);
    
    if (supplierId) {
      fetchMaterialsForSupplier(supplierId);
    }
  };

  const handleInvoiceChange = (e) => {
    const { name, value } = e.target;
    setInvoiceData({ ...invoiceData, [name]: value });
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = value;
    
    // Auto-fill GST rate when material is selected
    if (field === 'material_id') {
      const material = materials.find(m => m.material_id === parseInt(value));
      if (material) {
        newItems[index].rate = material.current_cost.toString();
        newItems[index].gst_rate = material.gst_rate.toString();
      }
    }
    
    setItems(newItems);
  };

  const addItem = () => {
    setItems([...items, {
      material_id: '',
      quantity: '',
      rate: '',
      gst_rate: '',
      transport_charges: '0',
      handling_charges: '0'
    }]);
  };

  const removeItem = (index) => {
    if (items.length > 1) {
      const newItems = items.filter((_, i) => i !== index);
      setItems(newItems);
    }
  };

  const getMaterialUnit = (materialId) => {
    const material = materials.find(m => m.material_id === parseInt(materialId));
    return material ? material.unit : '';
  };

  const allocateCharges = () => {
    // Group items by UOM
    const groups = { kg: [], L: [], Nos: [] };
    
    items.forEach((item, index) => {
      if (item.material_id && item.quantity) {
        const unit = getMaterialUnit(item.material_id);
        const groupKey = unit === 'kg' ? 'kg' : unit === 'L' || unit === 'Liters' ? 'L' : 'Nos';
        groups[groupKey].push({ index, quantity: parseFloat(item.quantity) || 0 });
      }
    });

    // Calculate allocations
    const transportTotal = parseFloat(invoiceData.transport_cost) || 0;
    const handlingTotal = parseFloat(invoiceData.handling_charges) || 0;

    const newItems = [...items];

    Object.keys(groups).forEach(groupKey => {
      const groupItems = groups[groupKey];
      const groupPercentage = uomGroups[groupKey].percentage / 100;
      const groupTransport = transportTotal * groupPercentage;
      const groupHandling = handlingTotal * groupPercentage;
      
      const totalQuantity = groupItems.reduce((sum, item) => sum + item.quantity, 0);
      
      groupItems.forEach(({ index, quantity }) => {
        if (totalQuantity > 0) {
          const proportion = quantity / totalQuantity;
          newItems[index].transport_charges = (groupTransport * proportion).toFixed(2);
          newItems[index].handling_charges = (groupHandling * proportion).toFixed(2);
        }
      });
    });

    setItems(newItems);
  };

  const handleGroupPercentageChange = (group, value) => {
    const newPercentage = parseFloat(value) || 0;
    const newGroups = { ...uomGroups };
    newGroups[group].percentage = newPercentage;
    
    // Calculate total percentage
    const total = Object.values(newGroups).reduce((sum, g) => sum + g.percentage, 0);
    
    if (total <= 100) {
      setUomGroups(newGroups);
    }
  };

  const calculateTotals = () => {
    let subtotal = 0;
    let totalGst = 0;
    let totalAllocatedTransport = 0;
    let totalAllocatedHandling = 0;

    items.forEach(item => {
      if (item.quantity && item.rate) {
        const amount = parseFloat(item.quantity) * parseFloat(item.rate);
        const itemTransport = parseFloat(item.transport_charges) || 0;
        const itemHandling = parseFloat(item.handling_charges) || 0;
        const taxableAmount = amount + itemTransport + itemHandling;
        const gstAmount = taxableAmount * (parseFloat(item.gst_rate) || 0) / 100;
        
        subtotal += amount;
        totalGst += gstAmount;
        totalAllocatedTransport += itemTransport;
        totalAllocatedHandling += itemHandling;
      }
    });

    const transportCost = parseFloat(invoiceData.transport_cost) || 0;
    const handlingCharges = parseFloat(invoiceData.handling_charges) || 0;
    
    const grandTotal = subtotal + totalGst + transportCost + handlingCharges;

    return {
      subtotal: subtotal.toFixed(2),
      totalGst: totalGst.toFixed(2),
      transportCost: transportCost.toFixed(2),
      handlingCharges: handlingCharges.toFixed(2),
      grandTotal: grandTotal.toFixed(2),
      totalAllocatedTransport: totalAllocatedTransport.toFixed(2),
      totalAllocatedHandling: totalAllocatedHandling.toFixed(2)
    };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!invoiceData.supplier_id || !invoiceData.invoice_ref) {
      setMessage('Please select supplier and enter invoice reference');
      return;
    }

    const validItems = items.filter(item => 
      item.material_id && item.quantity && item.rate
    );

    if (validItems.length === 0) {
      setMessage('Please add at least one item with quantity and rate');
      return;
    }

    // Validate transport and handling allocation
    const totals = calculateTotals();
    const transportCost = parseFloat(invoiceData.transport_cost) || 0;
    const handlingCharges = parseFloat(invoiceData.handling_charges) || 0;
    const allocatedTransport = parseFloat(totals.totalAllocatedTransport) || 0;
    const allocatedHandling = parseFloat(totals.totalAllocatedHandling) || 0;
    
    // Check if there's a mismatch in allocation (tolerance of 0.01 for rounding)
    if (transportCost > 0 && Math.abs(transportCost - allocatedTransport) > 0.01) {
      setMessage(`❌ Transport cost allocation mismatch! 
Total Transport: ₹${transportCost.toFixed(2)} 
Allocated to items: ₹${allocatedTransport.toFixed(2)}
Please ensure UOM allocation totals 100% and all items have proper units.`);
      return;
    }
    
    if (handlingCharges > 0 && Math.abs(handlingCharges - allocatedHandling) > 0.01) {
      setMessage(`❌ Handling charges allocation mismatch! 
Total Handling: ₹${handlingCharges.toFixed(2)} 
Allocated to items: ₹${allocatedHandling.toFixed(2)}
Please ensure UOM allocation totals 100% and all items have proper units.`);
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const payload = {
        ...invoiceData,
        items: validItems.map(item => ({
          material_id: parseInt(item.material_id),
          quantity: parseFloat(item.quantity),
          rate: parseFloat(item.rate),
          gst_rate: parseFloat(item.gst_rate),
          transport_charges: parseFloat(item.transport_charges),
          handling_charges: parseFloat(item.handling_charges)
        }))
      };

      const response = await api.purchase.addPurchase(payload);
      
      if (response.traceable_codes) {
        setMessage(`✅ Purchase recorded successfully! 
Invoice: ${response.invoice_ref}
Total: ₹${response.total_cost}
Items: ${response.items_count}
Traceable Codes: ${response.traceable_codes.join(', ')}`);
      } else {
        setMessage(`✅ Purchase recorded successfully! 
Invoice: ${response.invoice_ref}
Total: ₹${response.total_cost}
Items: ${response.items_count}`);
      }
      
      // Reset form
      setInvoiceData({
        supplier_id: '',
        invoice_ref: '',
        purchase_date: new Date().toISOString().split('T')[0],
        transport_cost: '0',
        handling_charges: '0'
      });
      setItems([{
        material_id: '',
        quantity: '',
        rate: '',
        gst_rate: '',
        transport_charges: '0',
        handling_charges: '0'
      }]);
      setSelectedSupplier('');
      
    } catch (error) {
      setMessage(`❌ Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const totals = calculateTotals();
  const totalPercentage = Object.values(uomGroups).reduce((sum, g) => sum + g.percentage, 0);

  // Format date for display
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB'); // DD/MM/YYYY format
  };

  return (
    <div className="purchase-module">
      <div className="module-header">
        <h2 className="module-title">Purchase Entry – Multi Item</h2>
        <button 
          className="btn-secondary"
          onClick={() => {
            setShowHistory(!showHistory);
            if (!showHistory && purchaseHistory.length === 0) {
              fetchPurchaseHistory();
            }
          }}
        >
          {showHistory ? 'Hide History' : 'View History'}
        </button>
      </div>

      {message && (
        <div className={`message ${message.includes('✅') ? 'success' : 'error'}`}>
          {message}
        </div>
      )}

      {!showHistory ? (
        <form onSubmit={handleSubmit} className="purchase-form">
          {/* Invoice Details Section */}
          <div className="form-card">
            <h3 className="section-title">Invoice Details</h3>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Supplier *</label>
                <select 
                  value={selectedSupplier}
                  onChange={handleSupplierChange}
                  required
                  className="form-control"
                >
                  <option value="">Select Supplier</option>
                  {suppliers.map(supplier => (
                    <option key={supplier.supplier_id} value={supplier.supplier_id}>
                      {supplier.supplier_name} 
                      {supplier.short_code && ` (${supplier.short_code})`}
                      {` - ${supplier.material_count} materials`}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="form-group">
                <label className="form-label">Invoice Reference *</label>
                <input
                  type="text"
                  name="invoice_ref"
                  value={invoiceData.invoice_ref}
                  onChange={handleInvoiceChange}
                  required
                  className="form-control"
                  placeholder="Enter invoice number"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Purchase Date *</label>
                <input
                  type="date"
                  name="purchase_date"
                  value={invoiceData.purchase_date}
                  onChange={handleInvoiceChange}
                  required
                  className="form-control"
                />
              </div>
            </div>
          </div>

          {/* Items Section */}
          <div className="form-card">
            <div className="section-header">
              <h3 className="section-title">Items</h3>
              <button type="button" onClick={addItem} className="btn-primary">
                + Add Item
              </button>
            </div>

            <div className="items-table-container">
              <table className="items-table" style={{ minWidth: '1450px', tableLayout: 'auto' }}>
                <thead>
                  <tr>
                    <th style={{ minWidth: '350px' }}>Material</th>
                    <th style={{ minWidth: '100px' }}>Quantity</th>
                    <th style={{ minWidth: '60px' }}>Unit</th>
                    <th style={{ minWidth: '100px' }}>Rate</th>
                    <th style={{ minWidth: '120px' }}>Amount</th>
                    <th style={{ minWidth: '80px' }}>GST %</th>
                    <th style={{ minWidth: '120px' }}>GST Amt</th>
                    <th style={{ minWidth: '100px' }}>Transport</th>
                    <th style={{ minWidth: '100px' }}>Handling</th>
                    <th style={{ minWidth: '120px' }}>Total</th>
                    <th style={{ minWidth: '50px' }} aria-label="Actions"></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, index) => {
                    const amount = (parseFloat(item.quantity) || 0) * (parseFloat(item.rate) || 0);
                    const taxableAmount = amount + (parseFloat(item.transport_charges) || 0) + (parseFloat(item.handling_charges) || 0);
                    const gstAmount = taxableAmount * (parseFloat(item.gst_rate) || 0) / 100;
                    const total = taxableAmount + gstAmount;
                    
                    return (
                      <tr key={index}>
                        <td>
                          <select
                            value={item.material_id}
                            onChange={(e) => handleItemChange(index, 'material_id', e.target.value)}
                            disabled={!selectedSupplier}
                            className="form-control material-select"
                            style={{ minWidth: '340px' }}
                            title={item.material_id ? materials.find(m => m.material_id === parseInt(item.material_id))?.material_name : 'Select Material'}
                          >
                            <option value="">Select Material</option>
                            {materials.map(material => (
                              <option key={material.material_id} value={material.material_id} title={material.material_name}>
                                {material.material_name}
                                {material.short_code && ` (${material.short_code})`}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                            step="0.01"
                            className="form-control text-right"
                            placeholder="0.00"
                          />
                        </td>
                        <td className="unit-cell">{getMaterialUnit(item.material_id) || '-'}</td>
                        <td>
                          <input
                            type="number"
                            value={item.rate}
                            onChange={(e) => handleItemChange(index, 'rate', e.target.value)}
                            step="0.01"
                            className="form-control text-right"
                            placeholder="0.00"
                          />
                        </td>
                        <td className="amount-cell">₹{amount.toFixed(2)}</td>
                        <td>
                          <input
                            type="number"
                            value={item.gst_rate}
                            readOnly
                            className="form-control readonly text-center"
                            tabIndex="-1"
                          />
                        </td>
                        <td className="amount-cell">₹{gstAmount.toFixed(2)}</td>
                        <td>
                          <input
                            type="number"
                            value={item.transport_charges}
                            onChange={(e) => handleItemChange(index, 'transport_charges', e.target.value)}
                            step="0.01"
                            className="form-control text-right"
                            placeholder="0.00"
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            value={item.handling_charges}
                            onChange={(e) => handleItemChange(index, 'handling_charges', e.target.value)}
                            step="0.01"
                            className="form-control text-right"
                            placeholder="0.00"
                          />
                        </td>
                        <td className="total-cell">₹{total.toFixed(2)}</td>
                        <td className="action-cell">
                          {items.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeItem(index)}
                              className="btn-remove"
                              aria-label="Remove item"
                              title="Remove item"
                            >
                              ×
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Transport & Handling Charges */}
          <div className="form-card">
            <h3 className="section-title">Transport & Handling Charges</h3>
            <div className="form-grid-2col">
              <div className="form-group">
                <label className="form-label">Total Transport Cost (₹)</label>
                <input
                  type="number"
                  name="transport_cost"
                  value={invoiceData.transport_cost}
                  onChange={handleInvoiceChange}
                  step="0.01"
                  className="form-control"
                />
              </div>
              
              <div className="form-group">
                <label className="form-label">Total Handling Charges (₹)</label>
                <input
                  type="number"
                  name="handling_charges"
                  value={invoiceData.handling_charges}
                  onChange={handleInvoiceChange}
                  step="0.01"
                  className="form-control"
                />
              </div>
            </div>

            {(parseFloat(invoiceData.transport_cost) > 0 || parseFloat(invoiceData.handling_charges) > 0) && (
              <div className="allocation-settings">
                <h4 className="subsection-title">UOM Group Allocation</h4>
                
                <div className="uom-help-text">
                  <span className="uom-help-icon">💡</span>
                  <div className="uom-help-content">
                    <strong>How to use UOM Group Allocation:</strong>
                    <ul>
                      <li>Distribute transport & handling costs across different unit types</li>
                      <li>Weight (kg): For seed/grain materials - default 100% allocation</li>
                      <li>Volume (L): For liquid materials like oil - set if you have liquid items</li>
                      <li>Count (Nos): For packed items/tools - set if you have count-based items</li>
                      <li><strong>⚠️ Total must equal 100% or costs will be lost!</strong></li>
                      <li>Costs are allocated proportionally within each group based on quantity</li>
                    </ul>
                  </div>
                </div>
                
                {/* Allocation Mismatch Warning */}
                {(() => {
                  const transportCost = parseFloat(invoiceData.transport_cost) || 0;
                  const handlingCharges = parseFloat(invoiceData.handling_charges) || 0;
                  const allocatedTransport = parseFloat(totals.totalAllocatedTransport) || 0;
                  const allocatedHandling = parseFloat(totals.totalAllocatedHandling) || 0;
                  
                  const hasTransportMismatch = transportCost > 0 && Math.abs(transportCost - allocatedTransport) > 0.01;
                  const hasHandlingMismatch = handlingCharges > 0 && Math.abs(handlingCharges - allocatedHandling) > 0.01;
                  
                  if (hasTransportMismatch || hasHandlingMismatch) {
                    return (
                      <div className="allocation-warning">
                        <span className="warning-icon">⚠️</span>
                        <div className="warning-content">
                          <strong>Cost Allocation Mismatch!</strong>
                          {hasTransportMismatch && (
                            <div>Transport: ₹{transportCost.toFixed(2)} entered but only ₹{allocatedTransport.toFixed(2)} allocated to items</div>
                          )}
                          {hasHandlingMismatch && (
                            <div>Handling: ₹{handlingCharges.toFixed(2)} entered but only ₹{allocatedHandling.toFixed(2)} allocated to items</div>
                          )}
                          <div><strong>Fix this before saving or costs will be lost!</strong></div>
                        </div>
                      </div>
                    );
                  }
                  return null;
                })()}
                
                <div className="uom-groups">
                  <div className="uom-group">
                    <label className="uom-label">Weight (kg)</label>
                    <div className="input-group">
                      <input
                        type="number"
                        value={uomGroups.kg.percentage}
                        onChange={(e) => handleGroupPercentageChange('kg', e.target.value)}
                        min="0"
                        max="100"
                        className="form-control"
                      />
                      <span className="input-addon">%</span>
                    </div>
                  </div>
                  <div className="uom-group">
                    <label className="uom-label">Volume (L)</label>
                    <div className="input-group">
                      <input
                        type="number"
                        value={uomGroups.L.percentage}
                        onChange={(e) => handleGroupPercentageChange('L', e.target.value)}
                        min="0"
                        max="100"
                        className="form-control"
                      />
                      <span className="input-addon">%</span>
                    </div>
                  </div>
                  <div className="uom-group">
                    <label className="uom-label">Count (Nos)</label>
                    <div className="input-group">
                      <input
                        type="number"
                        value={uomGroups.Nos.percentage}
                        onChange={(e) => handleGroupPercentageChange('Nos', e.target.value)}
                        min="0"
                        max="100"
                        className="form-control"
                      />
                      <span className="input-addon">%</span>
                    </div>
                  </div>
                  <div className={`total-percentage ${totalPercentage !== 100 ? 'error' : 'success'}`}>
                    Total: {totalPercentage}%
                  </div>
                </div>
                {totalPercentage !== 100 && (
                  <div className="error-text">Total allocation must equal 100%</div>
                )}
              </div>
            )}
          </div>

          {/* Summary Section */}
          <div className="form-card summary-card">
            <h3 className="section-title">Invoice Summary</h3>
            <div className="summary-grid">
              <div className="summary-row">
                <span className="summary-label">Subtotal:</span>
                <span className="summary-value">₹{totals.subtotal}</span>
              </div>
              <div className="summary-row">
                <span className="summary-label">Total GST:</span>
                <span className="summary-value">₹{totals.totalGst}</span>
              </div>
              <div className="summary-row">
                <span className="summary-label">Transport Charges:</span>
                <span className="summary-value">₹{totals.transportCost}</span>
              </div>
              <div className="summary-row">
                <span className="summary-label">Handling Charges:</span>
                <span className="summary-value">₹{totals.handlingCharges}</span>
              </div>
              <div className="summary-row total">
                <span className="summary-label">Grand Total:</span>
                <span className="summary-value">₹{totals.grandTotal}</span>
              </div>
            </div>
          </div>

          <div className="form-actions">
            <button type="submit" disabled={loading || totalPercentage !== 100} className="btn-submit">
              {loading ? 'Saving Purchase...' : 'Save Purchase'}
            </button>
          </div>
        </form>
      ) : (
        <div className="purchase-history">
          <div className="form-card">
            <h3 className="section-title">Purchase History</h3>
            <div className="history-table-container">
              <table className="history-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Invoice</th>
                    <th>Supplier</th>
                    <th>Items</th>
                    <th>Total</th>
                    <th>Traceable Code</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {purchaseHistory.map((purchase) => (
                    <tr key={purchase.purchase_id}>
                      <td>{formatDate(purchase.purchase_date)}</td>
                      <td>{purchase.invoice_ref}</td>
                      <td>{purchase.supplier_name}</td>
                      <td>{purchase.item_count}</td>
                      <td>₹{purchase.total_cost.toFixed(2)}</td>
                      <td className="traceable-code">
                        {purchase.traceable_code || '-'}
                      </td>
                      <td>
                        <button className="btn-view">View</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Purchase;
