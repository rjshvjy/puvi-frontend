import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import './MaterialWriteoff.css';

const MaterialWriteoff = () => {
  const [inventoryItems, setInventoryItems] = useState([]);
  const [writeoffReasons, setWriteoffReasons] = useState([]);
  const [writeoffHistory, setWriteoffHistory] = useState([]);
  const [selectedMaterial, setSelectedMaterial] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [activeTab, setActiveTab] = useState('new'); // 'new' or 'history'
  const [summary, setSummary] = useState(null);
  
  const [writeoffData, setWriteoffData] = useState({
    quantity: '',
    scrap_value: '0',
    reason_code: '',
    reason_description: '',
    writeoff_date: new Date().toISOString().split('T')[0],
    notes: '',
    created_by: ''
  });

  // Fetch data on component mount
  useEffect(() => {
    fetchInventoryItems();
    fetchWriteoffReasons();
    fetchWriteoffHistory();
  }, []);

  const fetchInventoryItems = async () => {
    try {
      const response = await api.writeoff.getInventoryForWriteoff();
      if (response.success) {
        setInventoryItems(response.inventory_items || []);
      }
    } catch (error) {
      console.error('Error fetching inventory:', error);
      setMessage('Error loading inventory items');
    }
  };

  const fetchWriteoffReasons = async () => {
    try {
      const response = await api.writeoff.getWriteoffReasons();
      // FIX: Extract the reasons array from the response object
      if (response.success) {
        setWriteoffReasons(response.reasons || []);
      } else {
        setWriteoffReasons([]);
      }
    } catch (error) {
      console.error('Error fetching writeoff reasons:', error);
      setWriteoffReasons([]);
    }
  };

  const fetchWriteoffHistory = async () => {
    try {
      const response = await api.writeoff.getWriteoffHistory();
      if (response.success) {
        setWriteoffHistory(response.writeoffs || []);
        setSummary(response.summary || null);
      }
    } catch (error) {
      console.error('Error fetching writeoff history:', error);
      setWriteoffHistory([]);
    }
  };

  const handleMaterialSelect = (item) => {
    setSelectedMaterial(item);
    setWriteoffData({
      ...writeoffData,
      material_id: item.material_id
    });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setWriteoffData(prev => ({
      ...prev,
      [name]: value
    }));

    // If reason code changes, update description
    if (name === 'reason_code') {
      const selectedReason = writeoffReasons.find(r => r.reason_code === value);
      if (selectedReason) {
        setWriteoffData(prev => ({
          ...prev,
          reason_description: selectedReason.reason_description
        }));
      }
    }
  };

  const calculateWriteoffValue = () => {
    if (!selectedMaterial || !writeoffData.quantity) return { total: 0, scrap: 0, net: 0 };
    
    const qty = parseFloat(writeoffData.quantity) || 0;
    const avgCost = parseFloat(selectedMaterial.weighted_avg_cost) || 0;
    const scrapValue = parseFloat(writeoffData.scrap_value) || 0;
    
    const totalCost = qty * avgCost;
    const netLoss = totalCost - scrapValue;
    
    return {
      total: totalCost.toFixed(2),
      scrap: scrapValue.toFixed(2),
      net: netLoss.toFixed(2)
    };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedMaterial) {
      setMessage('Please select a material first');
      return;
    }

    const qty = parseFloat(writeoffData.quantity);
    if (qty > selectedMaterial.available_quantity) {
      setMessage(`Cannot write off more than available quantity (${selectedMaterial.available_quantity} ${selectedMaterial.unit})`);
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const response = await api.writeoff.addWriteoff({
        ...writeoffData,
        material_id: selectedMaterial.material_id
      });

      if (response.success) {
        setMessage(`✅ Writeoff recorded successfully! 
          Written off: ${response.quantity_written_off} ${selectedMaterial.unit}
          Net Loss: ₹${response.net_loss.toFixed(2)}
          New Balance: ${response.new_stock_balance} ${selectedMaterial.unit}`);
        
        // Reset form
        setSelectedMaterial(null);
        setWriteoffData({
          quantity: '',
          scrap_value: '0',
          reason_code: '',
          reason_description: '',
          writeoff_date: new Date().toISOString().split('T')[0],
          notes: '',
          created_by: ''
        });
        
        // Refresh data
        fetchInventoryItems();
        fetchWriteoffHistory();
      } else {
        setMessage(`❌ Error: ${response.error || 'Failed to record writeoff'}`);
      }
    } catch (error) {
      setMessage(`❌ Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const values = calculateWriteoffValue();

  // Group reasons by category for better display
  // Add safety check for array
  const reasonsByCategory = Array.isArray(writeoffReasons) 
    ? writeoffReasons.reduce((acc, reason) => {
        const category = reason.category || 'Other';
        if (!acc[category]) acc[category] = [];
        acc[category].push(reason);
        return acc;
      }, {})
    : {};

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto', fontFamily: 'Arial, sans-serif' }}>
      <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '20px', color: '#333' }}>
        Material Write-off Module
      </h2>

      {/* Tab Navigation */}
      <div style={{ marginBottom: '20px', borderBottom: '1px solid #ddd' }}>
        <button 
          onClick={() => setActiveTab('new')}
          style={{
            padding: '10px 20px',
            border: 'none',
            background: activeTab === 'new' ? '#dc3545' : 'transparent',
            color: activeTab === 'new' ? 'white' : '#333',
            cursor: 'pointer',
            borderRadius: '5px 5px 0 0',
            marginRight: '5px',
            fontSize: '16px',
            fontWeight: activeTab === 'new' ? 'bold' : 'normal'
          }}
        >
          New Write-off
        </button>
        <button 
          onClick={() => setActiveTab('history')}
          style={{
            padding: '10px 20px',
            border: 'none',
            background: activeTab === 'history' ? '#dc3545' : 'transparent',
            color: activeTab === 'history' ? 'white' : '#333',
            cursor: 'pointer',
            borderRadius: '5px 5px 0 0',
            fontSize: '16px',
            fontWeight: activeTab === 'history' ? 'bold' : 'normal'
          }}
        >
          Write-off History
        </button>
      </div>

      {message && (
        <div style={{
          padding: '15px',
          marginBottom: '20px',
          borderRadius: '4px',
          backgroundColor: message.includes('✅') ? '#d4edda' : '#f8d7da',
          color: message.includes('✅') ? '#155724' : '#721c24',
          border: `1px solid ${message.includes('✅') ? '#c3e6cb' : '#f5c6cb'}`,
          whiteSpace: 'pre-line'
        }}>
          {message}
        </div>
      )}

      {activeTab === 'new' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          {/* Material Selection */}
          <div style={{ backgroundColor: '#f8f9fa', padding: '20px', borderRadius: '8px' }}>
            <h3 style={{ fontSize: '18px', marginBottom: '15px', color: '#495057' }}>Select Material</h3>
            {inventoryItems.length === 0 ? (
              <p style={{ color: '#666' }}>No materials available in inventory</p>
            ) : (
              <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                {inventoryItems.map((item) => (
                  <div
                    key={item.material_id}
                    onClick={() => handleMaterialSelect(item)}
                    style={{
                      padding: '15px',
                      marginBottom: '10px',
                      backgroundColor: selectedMaterial?.material_id === item.material_id ? '#dc3545' : 'white',
                      color: selectedMaterial?.material_id === item.material_id ? 'white' : 'black',
                      borderRadius: '5px',
                      cursor: 'pointer',
                      border: '1px solid #ddd',
                      transition: 'all 0.2s'
                    }}
                  >
                    <strong>{item.material_name}</strong>
                    <div style={{ fontSize: '14px', marginTop: '5px', opacity: 0.9 }}>
                      Category: {item.category}<br />
                      Available: {item.available_quantity} {item.unit}<br />
                      Avg Cost: ₹{item.weighted_avg_cost.toFixed(2)}/{item.unit}<br />
                      Last Updated: {item.last_updated}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Write-off Form */}
          <div style={{ backgroundColor: '#f8f9fa', padding: '20px', borderRadius: '8px' }}>
            <h3 style={{ fontSize: '18px', marginBottom: '15px', color: '#495057' }}>Write-off Details</h3>
            {selectedMaterial ? (
              <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: '15px', padding: '10px', backgroundColor: '#fff3cd', borderRadius: '5px' }}>
                  <strong>Selected Material:</strong><br />
                  {selectedMaterial.material_name}<br />
                  Available: {selectedMaterial.available_quantity} {selectedMaterial.unit}<br />
                  Cost: ₹{selectedMaterial.weighted_avg_cost.toFixed(2)}/{selectedMaterial.unit}
                </div>

                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>
                    Write-off Quantity ({selectedMaterial.unit}): *
                  </label>
                  <input
                    type="number"
                    name="quantity"
                    value={writeoffData.quantity}
                    onChange={handleInputChange}
                    step="0.01"
                    min="0"
                    max={selectedMaterial.available_quantity}
                    required
                    style={{ width: '100%', padding: '10px', border: '1px solid #ced4da', borderRadius: '4px' }}
                  />
                </div>

                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>Write-off Reason: *</label>
                  <select
                    name="reason_code"
                    value={writeoffData.reason_code}
                    onChange={handleInputChange}
                    required
                    style={{ width: '100%', padding: '10px', border: '1px solid #ced4da', borderRadius: '4px' }}
                  >
                    <option value="">Select Reason</option>
                    {Object.entries(reasonsByCategory).map(([category, reasons]) => (
                      <optgroup key={category} label={category}>
                        {Array.isArray(reasons) && reasons.map(reason => (
                          <option key={reason.reason_code} value={reason.reason_code}>
                            {reason.reason_description}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>

                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>Scrap Recovery Value (₹):</label>
                  <input
                    type="number"
                    name="scrap_value"
                    value={writeoffData.scrap_value}
                    onChange={handleInputChange}
                    step="0.01"
                    min="0"
                    style={{ width: '100%', padding: '10px', border: '1px solid #ced4da', borderRadius: '4px' }}
                  />
                </div>

                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>Write-off Date: *</label>
                  <input
                    type="date"
                    name="writeoff_date"
                    value={writeoffData.writeoff_date}
                    onChange={handleInputChange}
                    required
                    style={{ width: '100%', padding: '10px', border: '1px solid #ced4da', borderRadius: '4px' }}
                  />
                </div>

                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>Authorized By:</label>
                  <input
                    type="text"
                    name="created_by"
                    value={writeoffData.created_by}
                    onChange={handleInputChange}
                    placeholder="Name of person authorizing"
                    style={{ width: '100%', padding: '10px', border: '1px solid #ced4da', borderRadius: '4px' }}
                  />
                </div>

                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>Notes:</label>
                  <textarea
                    name="notes"
                    value={writeoffData.notes}
                    onChange={handleInputChange}
                    rows="3"
                    style={{ width: '100%', padding: '10px', border: '1px solid #ced4da', borderRadius: '4px' }}
                  />
                </div>

                {/* Value Summary */}
                {writeoffData.quantity && (
                  <div style={{ 
                    marginBottom: '15px', 
                    padding: '15px', 
                    backgroundColor: '#f8d7da', 
                    borderRadius: '5px',
                    border: '1px solid #f5c6cb'
                  }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '10px' }}>
                      <span>Material Value:</span>
                      <span style={{ textAlign: 'right' }}>₹{values.total}</span>
                      
                      <span>Less: Scrap Recovery:</span>
                      <span style={{ textAlign: 'right' }}>₹{values.scrap}</span>
                      
                      <span style={{ fontWeight: 'bold', paddingTop: '5px', borderTop: '1px solid #dc3545' }}>
                        Net Loss:
                      </span>
                      <span style={{ textAlign: 'right', fontWeight: 'bold', paddingTop: '5px', borderTop: '1px solid #dc3545' }}>
                        ₹{values.net}
                      </span>
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    width: '100%',
                    padding: '12px',
                    backgroundColor: loading ? '#6c757d' : '#dc3545',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    fontSize: '16px',
                    fontWeight: '600'
                  }}
                >
                  {loading ? 'Recording...' : 'Record Write-off'}
                </button>
              </form>
            ) : (
              <p style={{ textAlign: 'center', color: '#666', marginTop: '50px' }}>
                Select a material from the left to record write-off
              </p>
            )}
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div>
          {/* Summary Cards */}
          {summary && (
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: '1fr 1fr 1fr 1fr', 
              gap: '15px', 
              marginBottom: '20px' 
            }}>
              <div style={{ 
                backgroundColor: '#f8f9fa', 
                padding: '20px', 
                borderRadius: '8px',
                textAlign: 'center',
                border: '1px solid #dee2e6'
              }}>
                <div style={{ fontSize: '14px', color: '#6c757d' }}>Total Write-offs</div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#dc3545' }}>
                  {summary.total_writeoffs}
                </div>
              </div>
              
              <div style={{ 
                backgroundColor: '#f8f9fa', 
                padding: '20px', 
                borderRadius: '8px',
                textAlign: 'center',
                border: '1px solid #dee2e6'
              }}>
                <div style={{ fontSize: '14px', color: '#6c757d' }}>Total Cost</div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#dc3545' }}>
                  ₹{summary.total_cost.toFixed(2)}
                </div>
              </div>
              
              <div style={{ 
                backgroundColor: '#f8f9fa', 
                padding: '20px', 
                borderRadius: '8px',
                textAlign: 'center',
                border: '1px solid #dee2e6'
              }}>
                <div style={{ fontSize: '14px', color: '#6c757d' }}>Scrap Recovered</div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#28a745' }}>
                  ₹{summary.total_scrap_recovered.toFixed(2)}
                </div>
              </div>
              
              <div style={{ 
                backgroundColor: '#f8f9fa', 
                padding: '20px', 
                borderRadius: '8px',
                textAlign: 'center',
                border: '1px solid #dee2e6'
              }}>
                <div style={{ fontSize: '14px', color: '#6c757d' }}>Net Loss</div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#dc3545' }}>
                  ₹{summary.total_net_loss.toFixed(2)}
                </div>
              </div>
            </div>
          )}

          {/* History Table */}
          <div style={{ backgroundColor: '#f8f9fa', padding: '20px', borderRadius: '8px' }}>
            <h3 style={{ fontSize: '18px', marginBottom: '15px', color: '#495057' }}>Write-off History</h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: 'white' }}>
                <thead>
                  <tr style={{ backgroundColor: '#dc3545', color: 'white' }}>
                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>Date</th>
                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>Material</th>
                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>Category</th>
                    <th style={{ padding: '12px', textAlign: 'center', borderBottom: '2px solid #dee2e6' }}>Quantity</th>
                    <th style={{ padding: '12px', textAlign: 'center', borderBottom: '2px solid #dee2e6' }}>Reason</th>
                    <th style={{ padding: '12px', textAlign: 'right', borderBottom: '2px solid #dee2e6' }}>Total Cost</th>
                    <th style={{ padding: '12px', textAlign: 'right', borderBottom: '2px solid #dee2e6' }}>Scrap Value</th>
                    <th style={{ padding: '12px', textAlign: 'right', borderBottom: '2px solid #dee2e6' }}>Net Loss</th>
                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>Authorized By</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.isArray(writeoffHistory) && writeoffHistory.map((writeoff) => (
                    <tr key={writeoff.writeoff_id} style={{ borderBottom: '1px solid #dee2e6' }}>
                      <td style={{ padding: '12px' }}>{writeoff.writeoff_date_display}</td>
                      <td style={{ padding: '12px' }}>{writeoff.material_name}</td>
                      <td style={{ padding: '12px' }}>{writeoff.category}</td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        {writeoff.quantity} {writeoff.unit}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        <span style={{
                          padding: '4px 8px',
                          borderRadius: '3px',
                          fontSize: '13px',
                          backgroundColor: '#e9ecef',
                          color: '#495057'
                        }}>
                          {writeoff.reason_description || writeoff.reason_code}
                        </span>
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right' }}>
                        ₹{writeoff.total_cost.toFixed(2)}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right' }}>
                        ₹{writeoff.scrap_value.toFixed(2)}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right', color: '#dc3545', fontWeight: 'bold' }}>
                        ₹{writeoff.net_loss.toFixed(2)}
                      </td>
                      <td style={{ padding: '12px' }}>{writeoff.created_by || '-'}</td>
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

export default MaterialWriteoff;
