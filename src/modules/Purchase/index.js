// src/modules/Purchase/index.js
import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import './Purchase.css';

const Purchase = () => {
  const [suppliers, setSuppliers] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [selectedSupplier, setSelectedSupplier] = useState('');
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
  
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchSuppliers();
  }, []);

  useEffect(() => {
    if (selectedSupplier) {
      fetchMaterialsForSupplier(selectedSupplier);
    }
  }, [selectedSupplier]);

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
    const grandTotal = subtotal + totalGst + transportCost + handlingCharges;

    return {
      subtotal: subtotal.toFixed(2),
      totalGst: totalGst.toFixed(2),
      transportCost: transportCost.toFixed(2),
      handlingCharges: handlingCharges.toFixed(2),
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
      
      setMessage(`✅ Purchase recorded successfully! 
        Invoice: ${response.invoice_ref}
        Total: ₹${response.total_cost}
        Items: ${response.items_count}`);
      
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

  return (
    <div className="purchase-module">
      <div className="module-header">
        <h2>Purchase Entry - Multi Item</h2>
      </div>

      {message && (
        <div className={`message ${message.includes('✅') ? 'success' : 'error'}`}>
          {message}
        </div>
      )}

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
              >
                <option value="">Select Supplier</option>
                {suppliers.map(supplier => (
                  <option key={supplier.supplier_id} value={supplier.supplier_id}>
                    {supplier.supplier_name} ({supplier.material_count} materials)
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

          <div className="items-table">
            <table>
              <thead>
                <tr>
                  <th>Material</th>
                  <th>Qty</th>
                  <th>Unit</th>
                  <th>Rate</th>
                  <th>Amount</th>
                  <th>GST%</th>
                  <th>GST Amt</th>
                  <th>Transport</th>
                  <th>Handling</th>
                  <th>Total</th>
                  <th></th>
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
                        >
                          <option value="">Select Material</option>
                          {materials.map(material => (
                            <option key={material.material_id} value={material.material_id}>
                              {material.material_name}
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
                        />
                      </td>
                      <td className="unit">{getMaterialUnit(item.material_id)}</td>
                      <td>
                        <input
                          type="number"
                          value={item.rate}
                          onChange={(e) => handleItemChange(index, 'rate', e.target.value)}
                          step="0.01"
                        />
                      </td>
                      <td className="amount">₹{amount.toFixed(2)}</td>
                      <td>
                        <input
                          type="number"
                          value={item.gst_rate}
                          readOnly
                          className="readonly"
                        />
                      </td>
                      <td className="amount">₹{gstAmount.toFixed(2)}</td>
                      <td>
                        <input
                          type="number"
                          value={item.transport_charges}
                          onChange={(e) => handleItemChange(index, 'transport_charges', e.target.value)}
                          step="0.01"
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          value={item.handling_charges}
                          onChange={(e) => handleItemChange(index, 'handling_charges', e.target.value)}
                          step="0.01"
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
              />
            </div>
          </div>

          {(parseFloat(invoiceData.transport_cost) > 0 || parseFloat(invoiceData.handling_charges) > 0) && (
            <div className="allocation-settings">
              <h4>UOM Group Allocation</h4>
              <div className="uom-groups">
                <div className="uom-group">
                  <label>Weight (kg)</label>
                  <input
                    type="number"
                    value={uomGroups.kg.percentage}
                    onChange={(e) => handleGroupPercentageChange('kg', e.target.value)}
                    min="0"
                    max="100"
                  />
                  <span>%</span>
                </div>
                <div className="uom-group">
                  <label>Volume (L)</label>
                  <input
                    type="number"
                    value={uomGroups.L.percentage}
                    onChange={(e) => handleGroupPercentageChange('L', e.target.value)}
                    min="0"
                    max="100"
                  />
                  <span>%</span>
                </div>
                <div className="uom-group">
                  <label>Count (Nos)</label>
                  <input
                    type="number"
                    value={uomGroups.Nos.percentage}
                    onChange={(e) => handleGroupPercentageChange('Nos', e.target.value)}
                    min="0"
                    max="100"
                  />
                  <span>%</span>
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
    </div>
  );
};

export default Purchase;
