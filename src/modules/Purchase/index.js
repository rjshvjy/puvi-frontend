// File Path: puvi-frontend/src/modules/Purchase/index.js
// Purchase Module with Cost Management Integration
// Added: Seed Unloading and Transport-Seed Inward cost elements with override capability

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
    kg: { percentage: 60, items: [] },
    L: { percentage: 20, items: [] },
    Nos: { percentage: 20, items: [] }
  });
  
  // NEW - Cost Management States
  const [costElements, setCostElements] = useState({
    seedUnloading: { 
      element_id: null, 
      element_name: 'Seed Unloading', 
      default_rate: 0.12, 
      unit_type: 'Per Bag',
      override_rate: null 
    },
    transportInward: { 
      element_id: null, 
      element_name: 'Transport - Seed Inward', 
      default_rate: 1.0, 
      unit_type: 'Per Kg',
      override_rate: null 
    }
  });
  
  const [costOverrides, setCostOverrides] = useState({
    seedUnloading: { enabled: false, rate: '', quantity: 0, total: 0 },
    transportInward: { enabled: false, rate: '', quantity: 0, total: 0 }
  });
  
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchSuppliers();
    fetchCostElementsMaster(); // NEW - Fetch cost elements on load
  }, []);

  useEffect(() => {
    // Recalculate transport/handling allocation when items or percentages change
    allocateCharges();
    calculateAdditionalCosts(); // NEW - Calculate additional costs
  }, [items, invoiceData.transport_cost, invoiceData.handling_charges, uomGroups]);

  // NEW - Fetch cost elements from master
  const fetchCostElementsMaster = async () => {
    try {
      const response = await api.costManagement.getCostElementsByStage('purchase');
      if (response.success) {
        const elements = response.cost_elements;
        
        // Find seed unloading element
        const seedUnloadingElement = elements.find(e => 
          e.element_name === 'Seed Unloading' || e.element_name.includes('Unloading')
        );
        
        // Find transport inward element
        const transportElement = elements.find(e => 
          e.element_name === 'Transport - Seed Inward' || e.element_name.includes('Transport') && e.element_name.includes('Inward')
        );
        
        if (seedUnloadingElement) {
          setCostElements(prev => ({
            ...prev,
            seedUnloading: {
              ...prev.seedUnloading,
              element_id: seedUnloadingElement.element_id,
              default_rate: seedUnloadingElement.default_rate,
              unit_type: seedUnloadingElement.unit_type
            }
          }));
        }
        
        if (transportElement) {
          setCostElements(prev => ({
            ...prev,
            transportInward: {
              ...prev.transportInward,
              element_id: transportElement.element_id,
              default_rate: transportElement.default_rate,
              unit_type: transportElement.unit_type
            }
          }));
        }
      }
    } catch (error) {
      console.error('Error fetching cost elements:', error);
      // Continue with default rates if API fails
    }
  };

  // NEW - Calculate additional costs based on quantities
  const calculateAdditionalCosts = () => {
    // Calculate total quantity for seed items (kg based)
    let totalKgQuantity = 0;
    let totalBags = 0;
    
    items.forEach(item => {
      if (item.material_id && item.quantity) {
        const unit = getMaterialUnit(item.material_id);
        const quantity = parseFloat(item.quantity) || 0;
        
        if (unit === 'kg') {
          totalKgQuantity += quantity;
          // Assuming 50kg per bag for bag calculation
          totalBags += quantity / 50;
        }
      }
    });
    
    // Update cost overrides with calculated quantities
    setCostOverrides(prev => ({
      seedUnloading: {
        ...prev.seedUnloading,
        quantity: Math.ceil(totalBags), // Round up bags
        total: Math.ceil(totalBags) * (parseFloat(prev.seedUnloading.rate) || costElements.seedUnloading.default_rate)
      },
      transportInward: {
        ...prev.transportInward,
        quantity: totalKgQuantity,
        total: totalKgQuantity * (parseFloat(prev.transportInward.rate) || costElements.transportInward.default_rate)
      }
    }));
  };

  // NEW - Handle cost override changes
  const handleCostOverrideChange = (costType, field, value) => {
    setCostOverrides(prev => {
      const updated = { ...prev };
      
      if (field === 'enabled') {
        updated[costType].enabled = value;
        if (!value) {
          updated[costType].rate = '';
        }
      } else if (field === 'rate') {
        updated[costType].rate = value;
        const quantity = updated[costType].quantity;
        const rate = parseFloat(value) || costElements[costType].default_rate;
        updated[costType].total = quantity * rate;
      }
      
      return updated;
    });
  };

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

    items.forEach(item => {
      if (item.quantity && item.rate) {
        const amount = parseFloat(item.quantity) * parseFloat(item.rate);
        const itemTransport = parseFloat(item.transport_charges) || 0;
        const itemHandling = parseFloat(item.handling_charges) || 0;
        const taxableAmount = amount + itemTransport + itemHandling;
        const gstAmount = taxableAmount * (parseFloat(item.gst_rate) || 0) / 100;
        
        subtotal += amount;
        totalGst += gstAmount;
      }
    });

    const transportCost = parseFloat(invoiceData.transport_cost) || 0;
    const handlingCharges = parseFloat(invoiceData.handling_charges) || 0;
    
    // NEW - Include additional cost elements
    const seedUnloadingCost = costOverrides.seedUnloading.enabled ? costOverrides.seedUnloading.total : 0;
    const transportInwardCost = costOverrides.transportInward.enabled ? costOverrides.transportInward.total : 0;
    const additionalCosts = seedUnloadingCost + transportInwardCost;
    
    const grandTotal = subtotal + totalGst + transportCost + handlingCharges + additionalCosts;

    return {
      subtotal: subtotal.toFixed(2),
      totalGst: totalGst.toFixed(2),
      transportCost: transportCost.toFixed(2),
      handlingCharges: handlingCharges.toFixed(2),
      additionalCosts: additionalCosts.toFixed(2), // NEW
      seedUnloadingCost: seedUnloadingCost.toFixed(2), // NEW
      transportInwardCost: transportInwardCost.toFixed(2), // NEW
      grandTotal: grandTotal.toFixed(2)
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

    setLoading(true);
    setMessage('');

    try {
      // NEW - Prepare cost overrides for submission
      const costOverrideData = [];
      
      if (costOverrides.seedUnloading.enabled) {
        costOverrideData.push({
          element_id: costElements.seedUnloading.element_id,
          element_name: costElements.seedUnloading.element_name,
          quantity: costOverrides.seedUnloading.quantity,
          master_rate: costElements.seedUnloading.default_rate,
          override_rate: parseFloat(costOverrides.seedUnloading.rate) || costElements.seedUnloading.default_rate,
          total_cost: costOverrides.seedUnloading.total
        });
      }
      
      if (costOverrides.transportInward.enabled) {
        costOverrideData.push({
          element_id: costElements.transportInward.element_id,
          element_name: costElements.transportInward.element_name,
          quantity: costOverrides.transportInward.quantity,
          master_rate: costElements.transportInward.default_rate,
          override_rate: parseFloat(costOverrides.transportInward.rate) || costElements.transportInward.default_rate,
          total_cost: costOverrides.transportInward.total
        });
      }

      const payload = {
        ...invoiceData,
        items: validItems.map(item => ({
          material_id: parseInt(item.material_id),
          quantity: parseFloat(item.quantity),
          rate: parseFloat(item.rate),
          gst_rate: parseFloat(item.gst_rate),
          transport_charges: parseFloat(item.transport_charges),
          handling_charges: parseFloat(item.handling_charges)
        })),
        cost_overrides: costOverrideData // NEW - Include cost overrides
      };

      const response = await api.purchase.addPurchase(payload);
      
      // NEW - Log cost overrides if any were applied
      if (costOverrideData.length > 0 && response.purchase_id) {
        try {
          // Save cost override audit trail
          for (const override of costOverrideData) {
            if (override.override_rate !== override.master_rate) {
              await api.costManagement.saveBatchCosts({
                record_id: response.purchase_id,
                module: 'purchase',
                costs: [override],
                created_by: 'Purchase Module'
              });
            }
          }
        } catch (auditError) {
          console.error('Error logging cost overrides:', auditError);
          // Don't fail the purchase if audit logging fails
        }
      }
      
      if (response.traceable_codes) {
        setMessage(`✅ Purchase recorded successfully! 
Invoice: ${response.invoice_ref}
Total: ₹${response.total_cost}
Items: ${response.items_count}
Traceable Codes: ${response.traceable_codes.join(', ')}
${costOverrideData.length > 0 ? `Additional Costs Applied: ${costOverrideData.length} elements` : ''}`);
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
      
      // NEW - Reset cost overrides
      setCostOverrides({
        seedUnloading: { enabled: false, rate: '', quantity: 0, total: 0 },
        transportInward: { enabled: false, rate: '', quantity: 0, total: 0 }
      });
      
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
        <h2>Purchase Entry - Multi Item</h2>
        <div className="header-actions">
          <button 
            className="view-history-btn"
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
      </div>

      {message && (
        <div className={`message ${message.includes('✅') ? 'success' : 'error'}`}>
          {message}
        </div>
      )}

      {!showHistory ? (
        <form onSubmit={handleSubmit} className="purchase-form">
          {/* Header Section */}
          <div className="form-section">
            <h3>Invoice Details</h3>
            <div className="form-row">
              <div className="form-group">
                <label>Supplier *</label>
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
                <label>Invoice Reference *</label>
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
                <label>Purchase Date *</label>
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
          <div className="form-section">
            <div className="section-header">
              <h3>Items</h3>
              <button type="button" onClick={addItem} className="add-button">
                + Add Item
              </button>
            </div>

            <div className="items-table-container">
              <table className="items-table">
                <thead>
                  <tr>
                    <th style={{ width: '25%' }}>Material</th>
                    <th style={{ width: '10%' }}>Qty</th>
                    <th style={{ width: '8%' }}>Unit</th>
                    <th style={{ width: '10%' }}>Rate</th>
                    <th style={{ width: '12%' }}>Amount</th>
                    <th style={{ width: '8%' }}>GST%</th>
                    <th style={{ width: '10%' }}>GST Amt</th>
                    <th style={{ width: '8%' }}>Transport</th>
                    <th style={{ width: '8%' }}>Handling</th>
                    <th style={{ width: '12%' }}>Total</th>
                    <th style={{ width: '5%' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, index) => {
                    const amount = (parseFloat(item.quantity) || 0) * (parseFloat(item.rate) || 0);
                    const taxableAmount = amount + (parseFloat(item.transport_charges) || 0) + (parseFloat(item.handling_charges) || 0);
                    const gstAmount = taxableAmount * (parseFloat(item.gst_rate) || 0) / 100;
                    const total = taxableAmount + gstAmount;
                    const material = materials.find(m => m.material_id === parseInt(item.material_id));
                    
                    return (
                      <tr key={index}>
                        <td>
                          <select
                            value={item.material_id}
                            onChange={(e) => handleItemChange(index, 'material_id', e.target.value)}
                            disabled={!selectedSupplier}
                            className="form-control"
                          >
                            <option value="">Select Material</option>
                            {materials.map(material => (
                              <option key={material.material_id} value={material.material_id}>
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
                          />
                        </td>
                        <td className="unit">{getMaterialUnit(item.material_id)}</td>
                        <td>
                          <input
                            type="number"
                            value={item.rate}
                            onChange={(e) => handleItemChange(index, 'rate', e.target.value)}
                            step="0.01"
                            className="form-control text-right"
                          />
                        </td>
                        <td className="amount">₹{amount.toFixed(2)}</td>
                        <td>
                          <input
                            type="number"
                            value={item.gst_rate}
                            readOnly
                            className="form-control readonly text-center"
                          />
                        </td>
                        <td className="amount">₹{gstAmount.toFixed(2)}</td>
                        <td>
                          <input
                            type="number"
                            value={item.transport_charges}
                            onChange={(e) => handleItemChange(index, 'transport_charges', e.target.value)}
                            step="0.01"
                            className="form-control text-right"
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            value={item.handling_charges}
                            onChange={(e) => handleItemChange(index, 'handling_charges', e.target.value)}
                            step="0.01"
                            className="form-control text-right"
                          />
                        </td>
                        <td className="amount total">₹{total.toFixed(2)}</td>
                        <td>
                          {items.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeItem(index)}
                              className="remove-button"
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

          {/* Transport & Handling Allocation */}
          <div className="form-section">
            <h3>Transport & Handling Charges</h3>
            <div className="form-row">
              <div className="form-group">
                <label>Total Transport Cost (₹)</label>
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
                <label>Total Handling Charges (₹)</label>
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
                <h4>UOM Group Allocation</h4>
                <div className="uom-groups">
                  <div className="uom-group">
                    <label>Weight (kg)</label>
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
                    <label>Volume (L)</label>
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
                    <label>Count (Nos)</label>
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
                  <div className={`total-percentage ${totalPercentage !== 100 ? 'error' : ''}`}>
                    Total: {totalPercentage}%
                  </div>
                </div>
                {totalPercentage !== 100 && (
                  <div className="error-text">Total allocation must equal 100%</div>
                )}
              </div>
            )}
          </div>

          {/* NEW - Additional Cost Elements Section */}
          <div className="form-section" style={{ backgroundColor: '#f8f9fa', padding: '20px', borderRadius: '8px' }}>
            <h3>Additional Cost Elements</h3>
            
            {/* Seed Unloading Cost */}
            <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: 'white', borderRadius: '5px', border: '1px solid #dee2e6' }}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
                <input
                  type="checkbox"
                  id="seedUnloadingCheck"
                  checked={costOverrides.seedUnloading.enabled}
                  onChange={(e) => handleCostOverrideChange('seedUnloading', 'enabled', e.target.checked)}
                  style={{ marginRight: '10px' }}
                />
                <label htmlFor="seedUnloadingCheck" style={{ margin: 0, fontWeight: '600', fontSize: '16px' }}>
                  ☑ Seed Unloading (Per Bag)
                </label>
              </div>
              
              {costOverrides.seedUnloading.enabled && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '15px', marginTop: '10px' }}>
                  <div>
                    <label style={{ fontSize: '14px', color: '#6c757d' }}>Master Rate</label>
                    <div style={{ fontSize: '16px', fontWeight: '500' }}>
                      ₹{costElements.seedUnloading.default_rate}/bag
                    </div>
                  </div>
                  <div>
                    <label style={{ fontSize: '14px', color: '#6c757d' }}>Override Rate</label>
                    <input
                      type="number"
                      placeholder={costElements.seedUnloading.default_rate.toString()}
                      value={costOverrides.seedUnloading.rate}
                      onChange={(e) => handleCostOverrideChange('seedUnloading', 'rate', e.target.value)}
                      step="0.01"
                      style={{
                        width: '100%',
                        padding: '5px',
                        border: '1px solid #ced4da',
                        borderRadius: '4px',
                        fontWeight: costOverrides.seedUnloading.rate ? 'bold' : 'normal'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '14px', color: '#6c757d' }}>Bags</label>
                    <div style={{ fontSize: '16px', fontWeight: '500' }}>
                      {costOverrides.seedUnloading.quantity}
                    </div>
                  </div>
                  <div>
                    <label style={{ fontSize: '14px', color: '#6c757d' }}>Total Cost</label>
                    <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#28a745' }}>
                      ₹{costOverrides.seedUnloading.total.toFixed(2)}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Transport - Seed Inward Cost */}
            <div style={{ padding: '15px', backgroundColor: 'white', borderRadius: '5px', border: '1px solid #dee2e6' }}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
                <input
                  type="checkbox"
                  id="transportInwardCheck"
                  checked={costOverrides.transportInward.enabled}
                  onChange={(e) => handleCostOverrideChange('transportInward', 'enabled', e.target.checked)}
                  style={{ marginRight: '10px' }}
                />
                <label htmlFor="transportInwardCheck" style={{ margin: 0, fontWeight: '600', fontSize: '16px' }}>
                  ☑ Transport - Seed Inward (Per Kg)
                </label>
              </div>
              
              {costOverrides.transportInward.enabled && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '15px', marginTop: '10px' }}>
                  <div>
                    <label style={{ fontSize: '14px', color: '#6c757d' }}>Master Rate</label>
                    <div style={{ fontSize: '16px', fontWeight: '500' }}>
                      ₹{costElements.transportInward.default_rate}/kg
                    </div>
                  </div>
                  <div>
                    <label style={{ fontSize: '14px', color: '#6c757d' }}>Override Rate</label>
                    <input
                      type="number"
                      placeholder={costElements.transportInward.default_rate.toString()}
                      value={costOverrides.transportInward.rate}
                      onChange={(e) => handleCostOverrideChange('transportInward', 'rate', e.target.value)}
                      step="0.01"
                      style={{
                        width: '100%',
                        padding: '5px',
                        border: '1px solid #ced4da',
                        borderRadius: '4px',
                        fontWeight: costOverrides.transportInward.rate ? 'bold' : 'normal'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '14px', color: '#6c757d' }}>Quantity (kg)</label>
                    <div style={{ fontSize: '16px', fontWeight: '500' }}>
                      {costOverrides.transportInward.quantity.toFixed(2)}
                    </div>
                  </div>
                  <div>
                    <label style={{ fontSize: '14px', color: '#6c757d' }}>Total Cost</label>
                    <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#28a745' }}>
                      ₹{costOverrides.transportInward.total.toFixed(2)}
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {/* Info Note */}
            <div style={{ marginTop: '15px', padding: '10px', backgroundColor: '#d1ecf1', borderRadius: '5px', fontSize: '14px' }}>
              <strong>ℹ️ Note:</strong> These additional costs will be added to the landed cost of materials.
              Override rates if market rates differ from master rates.
            </div>
          </div>

          {/* Summary Section */}
          <div className="cost-summary">
            <h3>Invoice Summary</h3>
            <div className="summary-grid">
              <div className="summary-row">
                <span>Subtotal:</span>
                <span>₹{totals.subtotal}</span>
              </div>
              <div className="summary-row">
                <span>Total GST:</span>
                <span>₹{totals.totalGst}</span>
              </div>
              <div className="summary-row">
                <span>Transport Charges:</span>
                <span>₹{totals.transportCost}</span>
              </div>
              <div className="summary-row">
                <span>Handling Charges:</span>
                <span>₹{totals.handlingCharges}</span>
              </div>
              {/* NEW - Show additional costs in summary */}
              {costOverrides.seedUnloading.enabled && (
                <div className="summary-row">
                  <span>Seed Unloading:</span>
                  <span>₹{totals.seedUnloadingCost}</span>
                </div>
              )}
              {costOverrides.transportInward.enabled && (
                <div className="summary-row">
                  <span>Transport - Seed Inward:</span>
                  <span>₹{totals.transportInwardCost}</span>
                </div>
              )}
              <div className="summary-row total">
                <span>Grand Total:</span>
                <span>₹{totals.grandTotal}</span>
              </div>
            </div>
          </div>

          <div className="form-actions">
            <button type="submit" disabled={loading || totalPercentage !== 100} className="submit-button">
              {loading ? 'Saving Purchase...' : 'Save Purchase'}
            </button>
          </div>
        </form>
      ) : (
        <div className="purchase-history">
          <h3>Purchase History</h3>
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
                      <button className="view-details-btn">View</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default Purchase;
