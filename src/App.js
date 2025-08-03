import React, { useState } from 'react';
import axios from 'axios';

// Backend URL - Update this if your Render URL is different
const API_URL = process.env.REACT_APP_API_URL || 'https://puvi-backend.onrender.com';

function App() {
  const [formData, setFormData] = useState({
    material_id: '1',
    quantity: '',
    cost_per_unit: '',
    gst_rate: '5.00',
    invoice_ref: ''
  });
  
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Sample materials - In production, these would be fetched from the database
  const materials = [
    { id: 1, name: 'Groundnut Seeds UP PATTANI', gst: 5.00 },
    { id: 2, name: 'Bulk Groundnut Oil', gst: 5.00 },
    { id: 3, name: '1L PET Bottle', gst: 18.00 }
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Update GST rate when material changes
    if (name === 'material_id') {
      const selectedMaterial = materials.find(m => m.id === parseInt(value));
      setFormData({
        ...formData,
        material_id: value,
        gst_rate: selectedMaterial ? selectedMaterial.gst.toFixed(2) : '5.00'
      });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage('');

    try {
      const response = await axios.post(`${API_URL}/api/add_purchase`, {
        material_id: parseInt(formData.material_id),
        quantity: parseFloat(formData.quantity),
        cost_per_unit: parseFloat(formData.cost_per_unit),
        gst_rate: parseFloat(formData.gst_rate),
        invoice_ref: formData.invoice_ref
      });

      setMessage(`✅ Purchase added successfully! New weighted average cost: ₹${response.data.new_weighted_avg.toFixed(2)}`);
      
      // Reset form except material selection
      setFormData({
        ...formData,
        quantity: '',
        cost_per_unit: '',
        invoice_ref: ''
      });
    } catch (error) {
      setMessage(`❌ Error: ${error.response?.data?.error || 'Failed to add purchase. Backend might be sleeping - please try again in 30 seconds.'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateTotal = () => {
    const qty = parseFloat(formData.quantity) || 0;
    const cost = parseFloat(formData.cost_per_unit) || 0;
    const gst = parseFloat(formData.gst_rate) || 0;
    const subtotal = qty * cost;
    const gstAmount = subtotal * (gst / 100);
    const total = subtotal + gstAmount;
    
    return {
      subtotal: subtotal.toFixed(2),
      gstAmount: gstAmount.toFixed(2),
      total: total.toFixed(2)
    };
  };

  const totals = calculateTotal();

  return (
    <div className="app">
      <header>
        <h1>PUVI Oil Manufacturing System</h1>
        <p>Purchase Input Module</p>
      </header>

      <main>
        <div className="form-container">
          <h2>Add New Purchase</h2>
          
          {message && (
            <div className={`message ${message.startsWith('✅') ? 'success' : 'error'}`}>
              {message}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="material_id">Material</label>
              <select
                id="material_id"
                name="material_id"
                value={formData.material_id}
                onChange={handleChange}
                required
              >
                {materials.map(material => (
                  <option key={material.id} value={material.id}>
                    {material.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="quantity">Quantity (Kg)</label>
                <input
                  type="number"
                  id="quantity"
                  name="quantity"
                  value={formData.quantity}
                  onChange={handleChange}
                  step="0.01"
                  min="0"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="cost_per_unit">Cost per Unit (₹)</label>
                <input
                  type="number"
                  id="cost_per_unit"
                  name="cost_per_unit"
                  value={formData.cost_per_unit}
                  onChange={handleChange}
                  step="0.01"
                  min="0"
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="gst_rate">GST Rate (%)</label>
                <input
                  type="number"
                  id="gst_rate"
                  name="gst_rate"
                  value={formData.gst_rate}
                  onChange={handleChange}
                  step="0.01"
                  min="0"
                  max="100"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="invoice_ref">Invoice Reference</label>
                <input
                  type="text"
                  id="invoice_ref"
                  name="invoice_ref"
                  value={formData.invoice_ref}
                  onChange={handleChange}
                  placeholder="INV-2025-001"
                  required
                />
              </div>
            </div>

            <div className="totals-section">
              <h3>Purchase Summary</h3>
              <div className="totals-grid">
                <span>Subtotal:</span>
                <span>₹{totals.subtotal}</span>
                <span>GST Amount:</span>
                <span>₹{totals.gstAmount}</span>
                <span className="total">Total:</span>
                <span className="total">₹{totals.total}</span>
              </div>
            </div>

            <button type="submit" disabled={isLoading}>
              {isLoading ? 'Adding Purchase...' : 'Add Purchase'}
            </button>
          </form>
        </div>

        <div className="info-section">
          <h3>📝 Notes:</h3>
          <ul>
            <li>All costs are excluding GST unless specified</li>
            <li>Inventory will be automatically updated with weighted average cost</li>
            <li>Material current cost will be updated after each purchase</li>
            <li>First request may take 30-50 seconds if backend is sleeping (free tier)</li>
          </ul>
        </div>
      </main>
    </div>
  );
}

export default App;
