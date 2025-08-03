import React, { useState, useEffect } from 'react';
import axios from 'axios';

const QualityCheck = () => {
  const [pendingPurchases, setPendingPurchases] = useState([]);
  const [qualityHistory, setQualityHistory] = useState([]);
  const [selectedPurchase, setSelectedPurchase] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [activeTab, setActiveTab] = useState('pending'); // 'pending' or 'history'
  
  const [qcData, setQcData] = useState({
    moisture_percent: '',
    foreign_matter_percent: '',
    oil_content_percent: '',
    status: 'Pass',
    checked_date: new Date().toISOString().split('T')[0],
    checked_by: '',
    notes: ''
  });

  // Fetch pending purchases on component mount
  useEffect(() => {
    fetchPendingPurchases();
    fetchQualityHistory();
  }, []);

  const fetchPendingPurchases = async () => {
    try {
      const response = await axios.get('https://puvi-backend.onrender.com/api/pending_quality_checks');
      if (response.data.success) {
        setPendingPurchases(response.data.pending_purchases);
      }
    } catch (error) {
      console.error('Error fetching pending purchases:', error);
      setMessage('Error loading pending purchases');
    }
  };

  const fetchQualityHistory = async () => {
    try {
      const response = await axios.get('https://puvi-backend.onrender.com/api/quality_check_history');
      if (response.data.success) {
        setQualityHistory(response.data.quality_checks);
      }
    } catch (error) {
      console.error('Error fetching quality history:', error);
    }
  };

  const handlePurchaseSelect = (purchase) => {
    setSelectedPurchase(purchase);
    setQcData({
      ...qcData,
      purchase_id: purchase.purchase_id
    });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setQcData(prev => ({
      ...prev,
      [name]: value
    }));

    // Auto-determine status based on quality parameters
    if (name === 'moisture_percent' || name === 'foreign_matter_percent') {
      const moisture = name === 'moisture_percent' ? parseFloat(value) : parseFloat(qcData.moisture_percent);
      const foreignMatter = name === 'foreign_matter_percent' ? parseFloat(value) : parseFloat(qcData.foreign_matter_percent);
      
      if (!isNaN(moisture) && !isNaN(foreignMatter)) {
        if (moisture > 15 || foreignMatter > 5) {
          setQcData(prev => ({ ...prev, status: 'Reject' }));
        } else if (moisture > 12 || foreignMatter > 3) {
          setQcData(prev => ({ ...prev, status: 'Conditional' }));
        } else {
          setQcData(prev => ({ ...prev, status: 'Pass' }));
        }
      }
    }
  };

  const calculateRejectionQuantity = () => {
    if (!selectedPurchase || qcData.status === 'Pass') return 0;
    
    const totalQty = parseFloat(selectedPurchase.quantity);
    
    if (qcData.status === 'Reject') return totalQty;
    
    // Conditional - calculate based on parameters
    const moisture = parseFloat(qcData.moisture_percent) || 0;
    const foreignMatter = parseFloat(qcData.foreign_matter_percent) || 0;
    
    const rejectionPercent = Math.min(
      Math.max(moisture - 12, 0) * 2 + foreignMatter * 3,
      50
    );
    
    return (totalQty * rejectionPercent / 100).toFixed(2);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedPurchase) {
      setMessage('Please select a purchase first');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const response = await axios.post('https://puvi-backend.onrender.com/api/quality_check', {
        ...qcData,
        purchase_id: selectedPurchase.purchase_id
      });

      if (response.data.success) {
        setMessage(`✅ Quality check recorded successfully! 
          Accepted: ${response.data.accepted_quantity} ${selectedPurchase.unit}
          ${response.data.rejection_quantity > 0 ? `, Rejected: ${response.data.rejection_quantity} ${selectedPurchase.unit}` : ''}`);
        
        // Reset form
        setSelectedPurchase(null);
        setQcData({
          moisture_percent: '',
          foreign_matter_percent: '',
          oil_content_percent: '',
          status: 'Pass',
          checked_date: new Date().toISOString().split('T')[0],
          checked_by: '',
          notes: ''
        });
        
        // Refresh lists
        fetchPendingPurchases();
        fetchQualityHistory();
      } else {
        setMessage(`❌ Error: ${response.data.error || 'Failed to record quality check'}`);
      }
    } catch (error) {
      setMessage(`❌ Error: ${error.response?.data?.error || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto', fontFamily: 'Arial, sans-serif' }}>
      <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '20px', color: '#333' }}>
        Quality Check Module
      </h2>

      {/* Tab Navigation */}
      <div style={{ marginBottom: '20px', borderBottom: '1px solid #ddd' }}>
        <button 
          onClick={() => setActiveTab('pending')}
          style={{
            padding: '10px 20px',
            border: 'none',
            background: activeTab === 'pending' ? '#007BFF' : 'transparent',
            color: activeTab === 'pending' ? 'white' : '#333',
            cursor: 'pointer',
            borderRadius: '5px 5px 0 0',
            marginRight: '5px',
            fontSize: '16px',
            fontWeight: activeTab === 'pending' ? 'bold' : 'normal'
          }}
        >
          Pending Checks ({pendingPurchases.length})
        </button>
        <button 
          onClick={() => setActiveTab('history')}
          style={{
            padding: '10px 20px',
            border: 'none',
            background: activeTab === 'history' ? '#007BFF' : 'transparent',
            color: activeTab === 'history' ? 'white' : '#333',
            cursor: 'pointer',
            borderRadius: '5px 5px 0 0',
            fontSize: '16px',
            fontWeight: activeTab === 'history' ? 'bold' : 'normal'
          }}
        >
          Quality History
        </button>
      </div>

      {message && (
        <div style={{
          padding: '15px',
          marginBottom: '20px',
          borderRadius: '4px',
          backgroundColor: message.includes('✅') ? '#d4edda' : '#f8d7da',
          color: message.includes('✅') ? '#155724' : '#721c24',
          border: `1px solid ${message.includes('✅') ? '#c3e6cb' : '#f5c6cb'}`
        }}>
          {message}
        </div>
      )}

      {activeTab === 'pending' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          {/* Pending Purchases List */}
          <div style={{ backgroundColor: '#f8f9fa', padding: '20px', borderRadius: '8px' }}>
            <h3 style={{ fontSize: '18px', marginBottom: '15px', color: '#495057' }}>Pending Quality Checks</h3>
            {pendingPurchases.length === 0 ? (
              <p style={{ color: '#666' }}>No pending quality checks</p>
            ) : (
              <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                {pendingPurchases.map((purchase) => (
                  <div
                    key={purchase.purchase_id}
                    onClick={() => handlePurchaseSelect(purchase)}
                    style={{
                      padding: '15px',
                      marginBottom: '10px',
                      backgroundColor: selectedPurchase?.purchase_id === purchase.purchase_id ? '#007BFF' : 'white',
                      color: selectedPurchase?.purchase_id === purchase.purchase_id ? 'white' : 'black',
                      borderRadius: '5px',
                      cursor: 'pointer',
                      border: '1px solid #ddd',
                      transition: 'all 0.2s'
                    }}
                  >
                    <strong>{purchase.material_name}</strong>
                    <div style={{ fontSize: '14px', marginTop: '5px', opacity: 0.9 }}>
                      Supplier: {purchase.supplier_name}<br />
                      Date: {purchase.purchase_date_display}<br />
                      Quantity: {purchase.quantity} {purchase.unit}<br />
                      Batch: {purchase.batch_number || 'N/A'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quality Check Form */}
          <div style={{ backgroundColor: '#f8f9fa', padding: '20px', borderRadius: '8px' }}>
            <h3 style={{ fontSize: '18px', marginBottom: '15px', color: '#495057' }}>Quality Check Entry</h3>
            {selectedPurchase ? (
              <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: '15px', padding: '10px', backgroundColor: '#e3f2fd', borderRadius: '5px' }}>
                  <strong>Selected Purchase:</strong><br />
                  {selectedPurchase.material_name} - {selectedPurchase.quantity} {selectedPurchase.unit}<br />
                  Supplier: {selectedPurchase.supplier_name}
                </div>

                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>Moisture %: *</label>
                  <input
                    type="number"
                    name="moisture_percent"
                    value={qcData.moisture_percent}
                    onChange={handleInputChange}
                    step="0.01"
                    min="0"
                    max="100"
                    required
                    style={{ width: '100%', padding: '10px', border: '1px solid #ced4da', borderRadius: '4px' }}
                  />
                </div>

                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>Foreign Matter %: *</label>
                  <input
                    type="number"
                    name="foreign_matter_percent"
                    value={qcData.foreign_matter_percent}
                    onChange={handleInputChange}
                    step="0.01"
                    min="0"
                    max="100"
                    required
                    style={{ width: '100%', padding: '10px', border: '1px solid #ced4da', borderRadius: '4px' }}
                  />
                </div>

                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>Oil Content %: *</label>
                  <input
                    type="number"
                    name="oil_content_percent"
                    value={qcData.oil_content_percent}
                    onChange={handleInputChange}
                    step="0.01"
                    min="0"
                    max="100"
                    required
                    style={{ width: '100%', padding: '10px', border: '1px solid #ced4da', borderRadius: '4px' }}
                  />
                </div>

                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>Status:</label>
                  <select
                    name="status"
                    value={qcData.status}
                    onChange={handleInputChange}
                    style={{ width: '100%', padding: '10px', border: '1px solid #ced4da', borderRadius: '4px' }}
                  >
                    <option value="Pass">Pass</option>
                    <option value="Conditional">Conditional</option>
                    <option value="Reject">Reject</option>
                  </select>
                </div>

                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>Check Date: *</label>
                  <input
                    type="date"
                    name="checked_date"
                    value={qcData.checked_date}
                    onChange={handleInputChange}
                    required
                    style={{ width: '100%', padding: '10px', border: '1px solid #ced4da', borderRadius: '4px' }}
                  />
                </div>

                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>Checked By:</label>
                  <input
                    type="text"
                    name="checked_by"
                    value={qcData.checked_by}
                    onChange={handleInputChange}
                    placeholder="Inspector name"
                    style={{ width: '100%', padding: '10px', border: '1px solid #ced4da', borderRadius: '4px' }}
                  />
                </div>

                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>Notes:</label>
                  <textarea
                    name="notes"
                    value={qcData.notes}
                    onChange={handleInputChange}
                    rows="3"
                    style={{ width: '100%', padding: '10px', border: '1px solid #ced4da', borderRadius: '4px' }}
                  />
                </div>

                {/* Preview rejection quantity */}
                {qcData.status !== 'Pass' && (
                  <div style={{ 
                    marginBottom: '15px', 
                    padding: '10px', 
                    backgroundColor: '#fff3cd', 
                    borderRadius: '5px',
                    border: '1px solid #ffeeba'
                  }}>
                    <strong>Estimated Rejection:</strong> {calculateRejectionQuantity()} {selectedPurchase.unit}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    width: '100%',
                    padding: '12px',
                    backgroundColor: loading ? '#6c757d' : '#28a745',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    fontSize: '16px',
                    fontWeight: '600'
                  }}
                >
                  {loading ? 'Recording...' : 'Record Quality Check'}
                </button>
              </form>
            ) : (
              <p style={{ textAlign: 'center', color: '#666', marginTop: '50px' }}>
                Select a purchase from the left to perform quality check
              </p>
            )}
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div style={{ backgroundColor: '#f8f9fa', padding: '20px', borderRadius: '8px' }}>
          <h3 style={{ fontSize: '18px', marginBottom: '15px', color: '#495057' }}>Quality Check History</h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: 'white' }}>
              <thead>
                <tr style={{ backgroundColor: '#007BFF', color: 'white' }}>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>Date</th>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>Material</th>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>Supplier</th>
                  <th style={{ padding: '12px', textAlign: 'center', borderBottom: '2px solid #dee2e6' }}>Moisture %</th>
                  <th style={{ padding: '12px', textAlign: 'center', borderBottom: '2px solid #dee2e6' }}>FM %</th>
                  <th style={{ padding: '12px', textAlign: 'center', borderBottom: '2px solid #dee2e6' }}>Oil %</th>
                  <th style={{ padding: '12px', textAlign: 'center', borderBottom: '2px solid #dee2e6' }}>Status</th>
                  <th style={{ padding: '12px', textAlign: 'right', borderBottom: '2px solid #dee2e6' }}>Accepted</th>
                  <th style={{ padding: '12px', textAlign: 'right', borderBottom: '2px solid #dee2e6' }}>Rejected</th>
                  <th style={{ padding: '12px', textAlign: 'center', borderBottom: '2px solid #dee2e6' }}>Accept %</th>
                </tr>
              </thead>
              <tbody>
                {qualityHistory.map((check) => (
                  <tr key={check.qc_id} style={{ borderBottom: '1px solid #dee2e6' }}>
                    <td style={{ padding: '12px' }}>{check.checked_date_display}</td>
                    <td style={{ padding: '12px' }}>{check.material_name}</td>
                    <td style={{ padding: '12px' }}>{check.supplier_name}</td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>{check.moisture_percent}</td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>{check.foreign_matter_percent}</td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>{check.oil_content_percent}</td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '3px',
                        fontSize: '14px',
                        backgroundColor: check.status === 'Pass' ? '#d4edda' : 
                                       check.status === 'Reject' ? '#f8d7da' : '#fff3cd',
                        color: check.status === 'Pass' ? '#155724' : 
                               check.status === 'Reject' ? '#721c24' : '#856404'
                      }}>
                        {check.status}
                      </span>
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right' }}>
                      {parseFloat(check.accepted_quantity).toFixed(2)} {check.unit}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right' }}>
                      {parseFloat(check.rejection_quantity).toFixed(2)} {check.unit}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      {check.acceptance_rate.toFixed(1)}%
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

export default QualityCheck;
