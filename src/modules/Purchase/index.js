// src/modules/Purchase/index.js
import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import './Purchase.css';

const Purchase = () => {
  const [materials, setMaterials] = useState([]);
  const [formData, setFormData] = useState({
    material_id: '',
    quantity: '',
    cost_per_unit: '',
    gst_rate: '',
    invoice_ref: '',
    purchase_date: new Date().toISOString().split('T')[0],
    supplier_name: '',
    batch_number: '',
    transport_cost: '0',
    loading_charges: '0'
  });
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchMaterials();
  }, []);

  const fetchMaterials = async () => {
    try {
      const response = await api.purchase.getMaterials();
      setMaterials(response.materials || []);
    } catch (error) {
      console.error('Error fetching materials:', error);
      setMessage(`Error loading materials: ${error.message}`);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    if (name === 'material_id') {
      const selectedMaterial = materials.find(m => m.material_id === parseInt(value));
      if (selectedMaterial) {
        setFormData(prev => ({
          ...prev,
          gst_rate: selectedMaterial.gst_rate.toString()
        }));
      }
    }
  };

  const calculateTotals = () => {
    const quantity = parseFloat(formData.quantity) || 0;
    const costPerUnit = parseFloat(formData.cost_per_unit) || 0;
    const gstRate = parseFloat(formData.gst_rate) || 0;
    const transportCost = parseFloat(formData.transport_cost) || 0;
    const loadingCharges = parseFloat(formData.loading_charges) || 0;

    const materialCost = quantity * costPerUnit;
    const subtotal = materialCost + transportCost + loadingCharges;
    const gstAmount = subtotal * (gstRate / 100);
    const totalCost = subtotal + gstAmount;
    const landedCostPerUnit = quantity > 0 ? totalCost / quantity : 0;

    return {
      materialCost: materialCost.toFixed(2),
      subtotal: subtotal.toFixed(2),
      gstAmount: gstAmount.toFixed(2),
      totalCost: totalCost.toFixed(2),
      landedCostPerUnit: landedCostPerUnit.toFixed(2)
    };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const response = await api.purchase.addPurchase(formData);
      
      setMessage(`✅ Purchase added successfully! 
        Total Cost: ₹${response.total_cost?.toFixed(2)}
        Landed Cost per Unit: ₹${response.landed_cost_per_unit?.toFixed(2)}
        New Weighted Average: ₹${response.new_weighted_avg?.toFixed(2)}`);
      
      // Reset form
      setFormData({
        material_id: '',
        quantity: '',
        cost_per_unit: '',
        gst_rate: '',
        invoice_ref: '',
        purchase_date: new Date().toISOString().split('T')[0],
        supplier_name: '',
        batch_number: '',
        transport_cost: '0',
        loading_charges: '0'
      });
    } catch (error) {
      setMessage(`❌ Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const totals = calculateTotals();

  return (
    <div className="purchase-module">
      <div className="module-header">
        <h2>Purchase Entry</h2>
      </div>

      {message && (
        <div className={`message ${message.includes('✅') ? 'success' : 'error'}`}>
          {message}
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="purchase-form">
        <div className="form-section">
          <h3>Material Details</h3>
          <div className="form-row">
            <div className="form-group">
              <label>Material *</label>
              <select 
                name="material_id" 
                value={formData.material_id} 
                onChange={handleInputChange} 
                required
              >
                <option value="">Select Material</option>
                {materials.map(material => (
                  <option key={material.material_id} value={material.material_id}>
                    {material.material_name} (₹{material.current_cost}/{material.unit})
                  </option>
                ))}
              </select>
            </div>
            
            <div className="form-group">
              <label>Quantity *</label>
              <input
                type="number"
                name="quantity"
                value={formData.quantity}
                onChange={handleInputChange}
                step="0.01"
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Cost per Unit (₹) *</label>
              <input
                type="number"
                name="cost_per_unit"
                value={formData.cost_per_unit}
                onChange={handleInputChange}
                step="0.01"
                required
              />
            </div>
            
            <div className="form-group">
              <label>GST Rate (%) *</label>
              <input
                type="number"
                name="gst_rate"
                value={formData.gst_rate}
                onChange={handleInputChange}
                step="0.01"
                required
              />
            </div>
          </div>
        </div>

        <div className="form-section">
          <h3>Purchase Information</h3>
          <div className="form-row">
            <div className="form-group">
              <label>Invoice Reference *</label>
              <input
                type="text"
                name="invoice_ref"
                value={formData.invoice_ref}
                onChange={handleInputChange}
                required
              />
            </div>
            
            <div className="form-group">
              <label>Purchase Date *</label>
              <input
                type="date"
                name="purchase_date"
                value={formData.purchase_date}
                onChange={handleInputChange}
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Supplier Name</label>
              <input
                type="text"
                name="supplier_name"
                value={formData.supplier_name}
                onChange={handleInputChange}
              />
            </div>
            
            <div className="form-group">
              <label>Batch Number</label>
              <input
                type="text"
                name="batch_number"
                value={formData.batch_number}
                onChange={handleInputChange}
              />
            </div>
          </div>
        </div>

        <div className="form-section">
          <h3>Additional Charges</h3>
          <div className="form-row">
            <div className="form-group">
              <label>Transport Cost (₹)</label>
              <input
                type="number"
                name="transport_cost"
                value={formData.transport_cost}
                onChange={handleInputChange}
                step="0.01"
              />
            </div>
            
            <div className="form-group">
              <label>Loading/Unloading Charges (₹)</label>
              <input
                type="number"
                name="loading_charges"
                value={formData.loading_charges}
                onChange={handleInputChange}
                step="0.01"
              />
            </div>
          </div>
        </div>

        <div className="cost-summary">
          <h3>Cost Summary</h3>
          <div className="summary-grid">
            <div className="summary-row">
              <span>Material Cost:</span>
              <span>₹{totals.materialCost}</span>
            </div>
            <div className="summary-row">
              <span>Transport & Loading:</span>
              <span>₹{(parseFloat(formData.transport_cost) + parseFloat(formData.loading_charges)).toFixed(2)}</span>
            </div>
            <div className="summary-row">
              <span>Subtotal:</span>
              <span>₹{totals.subtotal}</span>
            </div>
            <div className="summary-row">
              <span>GST Amount:</span>
              <span>₹{totals.gstAmount}</span>
            </div>
            <div className="summary-row total">
              <span>Total Cost:</span>
              <span>₹{totals.totalCost}</span>
            </div>
            <div className="summary-row total">
              <span>Landed Cost per Unit:</span>
              <span>₹{totals.landedCostPerUnit}</span>
            </div>
          </div>
        </div>

        <div className="form-actions">
          <button type="submit" disabled={loading} className="submit-button">
            {loading ? 'Adding Purchase...' : 'Add Purchase'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default Purchase;
