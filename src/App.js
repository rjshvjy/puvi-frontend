import React, { useState, useEffect } from 'react';
import axios from 'axios';

function App() {
  const [materials, setMaterials] = useState([]);
  const [formData, setFormData] = useState({
    material_id: '',
    quantity: '',
    cost_per_unit: '',
    gst_rate: '5',
    invoice_ref: ''
  });
  const [message, setMessage] = useState('');

  useEffect(() => {
    axios.get('https://puvi-backend.onrender.com/api/materials')
      .then(res => setMaterials(res.data))
      .catch(err => setMessage(`Error: ${err.message}`));
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    axios.post('https://puvi-backend.onrender.com/api/add_purchase', formData)
      .then(res => setMessage(`Success: New Avg $${res.data.new_weighted_avg || 'N/A'}`))
      .catch(err => setMessage(`Error: ${err.response?.data.error || err.message}`));
  };

  return (
    <div style={{ padding: '20px', maxWidth: '400px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '20px' }}>PUVI Purchase Input</h1>
      <form onSubmit={handleSubmit} method="POST" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <select
          value={formData.material_id}
          onChange={e => setFormData({ ...formData, material_id: e.target.value })}
          style={{ padding: '10px', border: '1px solid #ccc', borderRadius: '4px' }}
        >
          <option value="">Select Material</option>
          {materials.map(mat => (
            <option key={mat.material_id} value={mat.material_id}>
              {mat.material_name} (₹{mat.current_cost})
            </option>
          ))}
        </select>
        <input
          type="number"
          placeholder="Quantity"
          value={formData.quantity}
          onChange={e => setFormData({ ...formData, quantity: e.target.value })}
          style={{ padding: '10px', border: '1px solid #ccc', borderRadius: '4px' }}
        />
        <input
          type="number"
          placeholder="Cost per Unit (₹)"
          value={formData.cost_per_unit}
          onChange={e => setFormData({ ...formData, cost_per_unit: e.target.value })}
          style={{ padding: '10px', border: '1px solid #ccc', borderRadius: '4px' }}
        />
        <input
          type="number"
          placeholder="GST Rate (%)"
          value={formData.gst_rate}
          onChange={e => setFormData({ ...formData, gst_rate: e.target.value })}
          style={{ padding: '10px', border: '1px solid #ccc', borderRadius: '4px' }}
        />
        <input
          type="text"
          placeholder="Invoice Reference"
          value={formData.invoice_ref}
          onChange={e => setFormData({ ...formData, invoice_ref: e.target.value })}
          style={{ padding: '10px', border: '1px solid #ccc', borderRadius: '4px' }}
        />
        <button
          type="submit"
          style={{ padding: '10px', backgroundColor: '#007BFF', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
        >
          Add Purchase
        </button>
      </form>
      {message && <p style={{ marginTop: '15px' }}>{message}</p>}
    </div>
  );
}

export default App;
