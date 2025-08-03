import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';
import MaterialWriteoff from './MaterialWriteoff';
import BatchProduction from './BatchProduction';

const PurchaseModule = () => {
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
      const response = await axios.get('https://puvi-backend.onrender.com/api/materials');
      setMaterials(response.data);
    } catch (error) {
      console.error('Error fetching materials:', error);
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
      const response = await axios.post('https://puvi-backend.onrender.com/api/add_purchase', formData);
      
      if (response.data) {
        setMessage(`✅ Purchase added successfully! 
          Total Cost: ₹${response.data.total_cost.toFixed(2)}
          Landed Cost per Unit: ₹${response.data.landed_cost_per_unit.toFixed(2)}
          New Weighted Average: ₹${response.data.new_weighted_avg.toFixed(2)}`);
        
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
      }
    } catch (error) {
      setMessage(`❌ Error: ${error.response?.data?.error || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const totals = calculateTotals();

  return (
    <div className="form-container">
      <h2>Purchase Entry</h2>
      {message && (
        <div className={`message ${message.includes('✅') ? 'success' : 'error'}`} style={{ whiteSpace: 'pre-line' }}>
          {message}
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <div className="form-row">
          <div className="form-group">
            <label>Material *</label>
            <select name="material_id" value={formData.material_id} onChange={handleInputChange} required>
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

        <div className="totals-section">
          <h3>Cost Summary</h3>
          <div className="totals-grid">
            <span>Material Cost:</span>
            <span>₹{totals.materialCost}</span>
            
            <span>Transport & Loading:</span>
            <span>₹{(parseFloat(formData.transport_cost) + parseFloat(formData.loading_charges)).toFixed(2)}</span>
            
            <span>Subtotal:</span>
            <span>₹{totals.subtotal}</span>
            
            <span>GST Amount:</span>
            <span>₹{totals.gstAmount}</span>
            
            <span className="total">Total Cost:</span>
            <span className="total">₹{totals.totalCost}</span>
            
            <span className="total">Landed Cost per Unit:</span>
            <span className="total">₹{totals.landedCostPerUnit}</span>
          </div>
        </div>

        <button type="submit" disabled={loading}>
          {loading ? 'Adding Purchase...' : 'Add Purchase'}
        </button>
      </form>
    </div>
  );
};

function App() {
  const [activeModule, setActiveModule] = useState('info');

  return (
    <div className="app">
      <header>
        <h1>PUVI Oil Manufacturing System</h1>
        <p>Cost Management & Inventory Tracking</p>
      </header>

      <nav style={{ 
        display: 'flex', 
        gap: '10px', 
        marginBottom: '20px',
        flexWrap: 'wrap',
        justifyContent: 'center'
      }}>
        <button 
          onClick={() => setActiveModule('info')}
          style={{
            padding: '10px 20px',
            backgroundColor: activeModule === 'info' ? '#2c3e50' : '#ecf0f1',
            color: activeModule === 'info' ? 'white' : '#2c3e50',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            fontWeight: activeModule === 'info' ? 'bold' : 'normal'
          }}
        >
          System Info
        </button>
        
        <button 
          onClick={() => setActiveModule('purchase')}
          style={{
            padding: '10px 20px',
            backgroundColor: activeModule === 'purchase' ? '#3498db' : '#ecf0f1',
            color: activeModule === 'purchase' ? 'white' : '#2c3e50',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            fontWeight: activeModule === 'purchase' ? 'bold' : 'normal'
          }}
        >
          Purchase
        </button>
        
        <button 
          onClick={() => setActiveModule('writeoff')}
          style={{
            padding: '10px 20px',
            backgroundColor: activeModule === 'writeoff' ? '#e74c3c' : '#ecf0f1',
            color: activeModule === 'writeoff' ? 'white' : '#2c3e50',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            fontWeight: activeModule === 'writeoff' ? 'bold' : 'normal'
          }}
        >
          Material Writeoff
        </button>
        
        <button 
          onClick={() => setActiveModule('batch')}
          style={{
            padding: '10px 20px',
            backgroundColor: activeModule === 'batch' ? '#27ae60' : '#ecf0f1',
            color: activeModule === 'batch' ? 'white' : '#2c3e50',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            fontWeight: activeModule === 'batch' ? 'bold' : 'normal',
            position: 'relative'
          }}
        >
          Batch Production
          <span style={{
            position: 'absolute',
            top: '-8px',
            right: '-8px',
            backgroundColor: '#f39c12',
            color: 'white',
            borderRadius: '50%',
            width: '20px',
            height: '20px',
            fontSize: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 'bold'
          }}>!</span>
        </button>
        
        <button 
          disabled
          style={{
            padding: '10px 20px',
            backgroundColor: '#95a5a6',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'not-allowed',
            opacity: 0.6
          }}
        >
          Oil Cake Sales (Coming Soon)
        </button>
      </nav>

      {activeModule === 'info' && (
        <div className="info-section">
          <h3>System Status</h3>
          <ul>
            <li>✅ Purchase Module - Operational</li>
            <li>✅ Material Writeoff - Operational</li>
            <li>⚠️ Batch Production - <strong style={{ color: '#f39c12' }}>Needs Testing!</strong></li>
            <li>🔜 Oil Cake Sales - Next to implement</li>
            <li>📋 Blending Module - Planned</li>
            <li>📦 SKU Production - Planned</li>
          </ul>
          
          <h3 style={{ marginTop: '20px' }}>Quick Links</h3>
          <ul>
            <li>Frontend: <a href="https://puvi-frontend.vercel.app" target="_blank" rel="noopener noreferrer">https://puvi-frontend.vercel.app</a></li>
            <li>Backend API: <a href="https://puvi-backend.onrender.com" target="_blank" rel="noopener noreferrer">https://puvi-backend.onrender.com</a></li>
          </ul>
          
          <h3 style={{ marginTop: '20px' }}>Testing Priority</h3>
          <div style={{
            backgroundColor: '#fff3cd',
            border: '1px solid #ffeaa7',
            borderRadius: '5px',
            padding: '15px',
            marginTop: '10px'
          }}>
            <strong>⚠️ Important:</strong> The Batch Production module has been implemented but NOT tested yet. 
            Please test it thoroughly before proceeding with Oil Cake Sales module development.
          </div>
        </div>
      )}

      {activeModule === 'purchase' && <PurchaseModule />}
      {activeModule === 'writeoff' && <MaterialWriteoff />}
      {activeModule === 'batch' && <BatchProduction />}
    </div>
  );
}

export default App;
