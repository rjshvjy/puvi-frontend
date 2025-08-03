import React, { useState, useEffect } from 'react';
import axios from 'axios';
import MaterialWriteoff from './MaterialWriteoff';

function App() {
  const [currentModule, setCurrentModule] = useState('purchase'); // 'purchase' or 'writeoff'
  const [materials, setMaterials] = useState([]);
  const [formData, setFormData] = useState({
    material_id: '',
    supplier_name: '',
    quantity: '',
    cost_per_unit: '',
    gst_rate: '5',
    invoice_ref: '',
    purchase_date: new Date().toISOString().split('T')[0],
    batch_number: '',
    transport_cost: '0',
    loading_charges: '0'
  });
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Function to format date from YYYY-MM-DD to DD-MM-YYYY for display
  const formatDateForDisplay = (dateStr) => {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-');
    return `${day}-${month}-${year}`;
  };

  // Function to get today's date in DD-MM-YYYY format
  const getTodayFormatted = () => {
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, '0');
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const yyyy = today.getFullYear();
    return `${dd}-${mm}-${yyyy}`;
  };

  useEffect(() => {
    axios.get('https://puvi-backend.onrender.com/api/materials')
      .then(res => setMaterials(res.data))
      .catch(err => setMessage(`Error: ${err.message}`));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await axios.post('https://puvi-backend.onrender.com/api/add_purchase', formData);
      setMessage(`✅ Purchase added successfully! New weighted average cost: ₹${res.data.new_weighted_avg?.toFixed(2) || 'N/A'}`);
      // Reset form except material and date
      setFormData({
        ...formData,
        supplier_name: '',
        quantity: '',
        cost_per_unit: '',
        invoice_ref: '',
        batch_number: '',
        transport_cost: '0',
        loading_charges: '0'
      });
    } catch (err) {
      setMessage(`❌ Error: ${err.response?.data?.error || err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateTotals = () => {
    const qty = parseFloat(formData.quantity) || 0;
    const cost = parseFloat(formData.cost_per_unit) || 0;
    const transport = parseFloat(formData.transport_cost) || 0;
    const loading = parseFloat(formData.loading_charges) || 0;
    const gst = parseFloat(formData.gst_rate) || 0;
    
    const materialCost = qty * cost;
    const subtotal = materialCost + transport + loading;
    const gstAmount = subtotal * (gst / 100);
    const total = subtotal + gstAmount;
    const costPerUnit = qty > 0 ? total / qty : 0;
    
    return {
      materialCost: materialCost.toFixed(2),
      subtotal: subtotal.toFixed(2),
      gstAmount: gstAmount.toFixed(2),
      total: total.toFixed(2),
      costPerUnit: costPerUnit.toFixed(2)
    };
  };

  const totals = calculateTotals();

  return (
    <div style={{ fontFamily: 'Arial, sans-serif' }}>
      {/* Header with Navigation */}
      <div style={{ backgroundColor: '#343a40', color: 'white', padding: '20px 0' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 20px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '15px' }}>
            PUVI Oil Manufacturing System
          </h1>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={() => setCurrentModule('purchase')}
              style={{
                padding: '10px 20px',
                backgroundColor: currentModule === 'purchase' ? '#007BFF' : 'transparent',
                color: 'white',
                border: '1px solid #007BFF',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: currentModule === 'purchase' ? 'bold' : 'normal'
              }}
            >
              Purchase Input
            </button>
            <button
              onClick={() => setCurrentModule('writeoff')}
              style={{
                padding: '10px 20px',
                backgroundColor: currentModule === 'writeoff' ? '#dc3545' : 'transparent',
                color: 'white',
                border: '1px solid #dc3545',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: currentModule === 'writeoff' ? 'bold' : 'normal'
              }}
            >
              Material Write-off
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      {currentModule === 'purchase' ? (
        <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '20px', marginBottom: '20px', color: '#666' }}>Purchase Input Module</h2>
          
          {message && (
            <div style={{ 
              padding: '15px', 
              marginBottom: '20px', 
              borderRadius: '4px',
              backgroundColor: message.startsWith('✅') ? '#d4edda' : '#f8d7da',
              color: message.startsWith('✅') ? '#155724' : '#721c24',
              border: `1px solid ${message.startsWith('✅') ? '#c3e6cb' : '#f5c6cb'}`
            }}>
              {message}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Material and Supplier Section */}
            <div style={{ backgroundColor: '#f8f9fa', padding: '20px', borderRadius: '8px' }}>
              <h3 style={{ fontSize: '18px', marginBottom: '15px', color: '#495057' }}>Material & Supplier Details</h3>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>Material *</label>
                  <select
                    value={formData.material_id}
                    onChange={e => {
                      const material = materials.find(m => m.material_id === parseInt(e.target.value));
                      setFormData({ 
                        ...formData, 
                        material_id: e.target.value,
                        gst_rate: material ? material.gst_rate.toString() : '5'
                      });
                    }}
                    style={{ width: '100%', padding: '10px', border: '1px solid #ced4da', borderRadius: '4px' }}
                    required
                  >
                    <option value="">Select Material</option>
                    {materials.map(mat => (
                      <option key={mat.material_id} value={mat.material_id}>
                        {mat.material_name} (₹{mat.current_cost})
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>Supplier Name *</label>
                  <input
                    type="text"
                    value={formData.supplier_name}
                    onChange={e => setFormData({ ...formData, supplier_name: e.target.value })}
                    style={{ width: '100%', padding: '10px', border: '1px solid #ced4da', borderRadius: '4px' }}
                    placeholder="Enter supplier name"
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>Purchase Date *</label>
                  <input
                    type="date"
                    value={formData.purchase_date}
                    onChange={e => setFormData({ ...formData, purchase_date: e.target.value })}
                    style={{ width: '100%', padding: '10px', border: '1px solid #ced4da', borderRadius: '4px' }}
                    required
                  />
                </div>
                
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>Batch/Lot Number</label>
                  <input
                    type="text"
                    value={formData.batch_number}
                    onChange={e => setFormData({ ...formData, batch_number: e.target.value })}
                    style={{ width: '100%', padding: '10px', border: '1px solid #ced4da', borderRadius: '4px' }}
                    placeholder="e.g., LOT-2025-001"
                  />
                </div>
              </div>
            </div>

            {/* Quantity and Cost Section */}
            <div style={{ backgroundColor: '#f8f9fa', padding: '20px', borderRadius: '8px' }}>
              <h3 style={{ fontSize: '18px', marginBottom: '15px', color: '#495057' }}>Quantity & Cost Details</h3>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>Quantity (Kg) *</label>
                  <input
                    type="number"
                    value={formData.quantity}
                    onChange={e => setFormData({ ...formData, quantity: e.target.value })}
                    style={{ width: '100%', padding: '10px', border: '1px solid #ced4da', borderRadius: '4px' }}
                    step="0.01"
                    min="0"
                    required
                  />
                </div>
                
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>Cost per Unit (₹) *</label>
                  <input
                    type="number"
                    value={formData.cost_per_unit}
                    onChange={e => setFormData({ ...formData, cost_per_unit: e.target.value })}
                    style={{ width: '100%', padding: '10px', border: '1px solid #ced4da', borderRadius: '4px' }}
                    step="0.01"
                    min="0"
                    required
                  />
                </div>
                
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>GST Rate (%) *</label>
                  <input
                    type="number"
                    value={formData.gst_rate}
                    onChange={e => setFormData({ ...formData, gst_rate: e.target.value })}
                    style={{ width: '100%', padding: '10px', border: '1px solid #ced4da', borderRadius: '4px' }}
                    step="0.01"
                    min="0"
                    max="100"
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>Transport Cost (₹)</label>
                  <input
                    type="number"
                    value={formData.transport_cost}
                    onChange={e => setFormData({ ...formData, transport_cost: e.target.value })}
                    style={{ width: '100%', padding: '10px', border: '1px solid #ced4da', borderRadius: '4px' }}
                    step="0.01"
                    min="0"
                  />
                </div>
                
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>Loading/Unloading (₹)</label>
                  <input
                    type="number"
                    value={formData.loading_charges}
                    onChange={e => setFormData({ ...formData, loading_charges: e.target.value })}
                    style={{ width: '100%', padding: '10px', border: '1px solid #ced4da', borderRadius: '4px' }}
                    step="0.01"
                    min="0"
                  />
                </div>
                
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>Invoice Reference *</label>
                  <input
                    type="text"
                    value={formData.invoice_ref}
                    onChange={e => setFormData({ ...formData, invoice_ref: e.target.value })}
                    style={{ width: '100%', padding: '10px', border: '1px solid #ced4da', borderRadius: '4px' }}
                    placeholder="INV-2025-001"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Purchase Summary */}
            <div style={{ backgroundColor: '#e9ecef', padding: '20px', borderRadius: '8px' }}>
              <h3 style={{ fontSize: '18px', marginBottom: '15px', color: '#495057' }}>Purchase Summary</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '10px', fontSize: '16px' }}>
                <span>Material Cost:</span>
                <span style={{ textAlign: 'right' }}>₹{totals.materialCost}</span>
                
                <span>Transport + Loading:</span>
                <span style={{ textAlign: 'right' }}>₹{(parseFloat(formData.transport_cost) + parseFloat(formData.loading_charges)).toFixed(2)}</span>
                
                <span>Subtotal:</span>
                <span style={{ textAlign: 'right' }}>₹{totals.subtotal}</span>
                
                <span>GST Amount:</span>
                <span style={{ textAlign: 'right' }}>₹{totals.gstAmount}</span>
                
                <span style={{ fontWeight: 'bold', fontSize: '18px', paddingTop: '10px', borderTop: '2px solid #6c757d' }}>
                  Total Amount:
                </span>
                <span style={{ textAlign: 'right', fontWeight: 'bold', fontSize: '18px', paddingTop: '10px', borderTop: '2px solid #6c757d' }}>
                  ₹{totals.total}
                </span>
                
                <span style={{ fontSize: '14px', color: '#6c757d' }}>Landed Cost per Kg:</span>
                <span style={{ textAlign: 'right', fontSize: '14px', color: '#6c757d' }}>₹{totals.costPerUnit}</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              style={{ 
                padding: '12px', 
                backgroundColor: isLoading ? '#6c757d' : '#007BFF', 
                color: 'white', 
                border: 'none', 
                borderRadius: '4px', 
                cursor: isLoading ? 'not-allowed' : 'pointer',
                fontSize: '16px',
                fontWeight: '600'
              }}
            >
              {isLoading ? 'Adding Purchase...' : 'Add Purchase'}
            </button>
          </form>
          
          <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '4px', fontSize: '14px', color: '#6c757d' }}>
            <strong>Note:</strong> All costs are excluding GST unless specified. The landed cost per kg includes all charges and GST.
          </div>
        </div>
      ) : (
        <MaterialWriteoff />
      )}
    </div>
  );
}

export default App;
