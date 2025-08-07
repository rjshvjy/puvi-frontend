/**
 * MaterialWriteoff Component v2.0.0
 * Last Modified: August 8, 2025
 * Features: Category filtering, search functionality, fixed API response handling
 */

import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import './MaterialWriteoff.css';

const MaterialWriteoff = () => {
  const [inventoryItems, setInventoryItems] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
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

  // Handle category filter change
  useEffect(() => {
    if (selectedCategory) {
      fetchInventoryItems(selectedCategory);
    } else {
      fetchInventoryItems();
    }
    setSearchTerm(''); // Clear search when category changes
  }, [selectedCategory]);

  // Handle search filter (client-side)
  useEffect(() => {
    if (searchTerm) {
      const filtered = inventoryItems.filter(item =>
        item.material_name.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredItems(filtered);
    } else {
      setFilteredItems(inventoryItems);
    }
  }, [searchTerm, inventoryItems]);

  const fetchInventoryItems = async (category = null) => {
    try {
      const params = category ? { category } : {};
      const response = await api.writeoff.getInventoryForWriteoff(params);
      if (response.success) {
        setInventoryItems(response.inventory_items || []);
        setFilteredItems(response.inventory_items || []);
        // Extract categories from category_summary if not already loaded
        if (!categories.length && response.category_summary) {
          setCategories(response.category_summary);
        }
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
    <div className="writeoff-container">
      <h2 className="writeoff-title">Material Write-off Module</h2>

      {/* Tab Navigation */}
      <div className="tab-navigation">
        <button 
          onClick={() => setActiveTab('new')}
          className={`tab-button ${activeTab === 'new' ? 'active' : ''}`}
        >
          New Write-off
        </button>
        <button 
          onClick={() => setActiveTab('history')}
          className={`tab-button ${activeTab === 'history' ? 'active' : ''}`}
        >
          Write-off History
        </button>
      </div>

      {message && (
        <div className={`message-alert ${message.includes('✅') ? 'success' : 'error'}`}>
          {message}
        </div>
      )}

      {activeTab === 'new' && (
        <div className="writeoff-grid">
          {/* Material Selection */}
          <div className="panel">
            <h3 className="panel-title">Select Material</h3>
            
            {/* Filter Controls */}
            <div className="filter-controls">
              <div className="form-group">
                <label className="filter-label">Category:</label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="form-select"
                >
                  <option value="">All Categories</option>
                  {categories.map((cat) => (
                    <option key={cat.category} value={cat.category}>
                      {cat.category} ({cat.material_count} items)
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="form-group">
                <label className="filter-label">Search:</label>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by material name..."
                  className="form-input"
                />
              </div>
              
              <div className="filter-info">
                Showing {filteredItems.length} of {inventoryItems.length} materials
              </div>
            </div>

            {filteredItems.length === 0 ? (
              <p className="empty-state">
                {searchTerm 
                  ? `No materials found matching "${searchTerm}"`
                  : "No materials available in inventory"}
              </p>
            ) : (
              <div className="material-list">
                {filteredItems.map((item) => (
                  <div
                    key={item.material_id}
                    onClick={() => handleMaterialSelect(item)}
                    className={`material-item ${selectedMaterial?.material_id === item.material_id ? 'selected' : ''}`}
                  >
                    <strong>{item.material_name}</strong>
                    <div className="material-details">
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
          <div className="panel">
            <h3 className="panel-title">Write-off Details</h3>
            {selectedMaterial ? (
              <form onSubmit={handleSubmit}>
                <div className="selected-material-info">
                  <strong>Selected Material:</strong><br />
                  {selectedMaterial.material_name}<br />
                  Available: {selectedMaterial.available_quantity} {selectedMaterial.unit}<br />
                  Cost: ₹{selectedMaterial.weighted_avg_cost.toFixed(2)}/{selectedMaterial.unit}
                </div>

                <div className="form-group">
                  <label className="form-label">
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
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Write-off Reason: *</label>
                  <select
                    name="reason_code"
                    value={writeoffData.reason_code}
                    onChange={handleInputChange}
                    required
                    className="form-select"
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

                <div className="form-group">
                  <label className="form-label">Scrap Recovery Value (₹):</label>
                  <input
                    type="number"
                    name="scrap_value"
                    value={writeoffData.scrap_value}
                    onChange={handleInputChange}
                    step="0.01"
                    min="0"
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Write-off Date: *</label>
                  <input
                    type="date"
                    name="writeoff_date"
                    value={writeoffData.writeoff_date}
                    onChange={handleInputChange}
                    required
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Authorized By:</label>
                  <input
                    type="text"
                    name="created_by"
                    value={writeoffData.created_by}
                    onChange={handleInputChange}
                    placeholder="Name of person authorizing"
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Notes:</label>
                  <textarea
                    name="notes"
                    value={writeoffData.notes}
                    onChange={handleInputChange}
                    rows="3"
                    className="form-textarea"
                  />
                </div>

                {/* Value Summary */}
                {writeoffData.quantity && (
                  <div className="value-summary">
                    <div className="value-grid">
                      <span>Material Value:</span>
                      <span className="value-amount">₹{values.total}</span>
                      
                      <span>Less: Scrap Recovery:</span>
                      <span className="value-amount">₹{values.scrap}</span>
                      
                      <span className="value-total">Net Loss:</span>
                      <span className="value-amount value-total">₹{values.net}</span>
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className={`submit-button ${loading ? 'disabled' : ''}`}
                >
                  {loading ? 'Recording...' : 'Record Write-off'}
                </button>
              </form>
            ) : (
              <p className="empty-state-center">
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
            <div className="summary-grid">
              <div className="summary-card">
                <div className="summary-label">Total Write-offs</div>
                <div className="summary-value error">
                  {summary.total_writeoffs}
                </div>
              </div>
              
              <div className="summary-card">
                <div className="summary-label">Total Cost</div>
                <div className="summary-value error">
                  ₹{summary.total_cost.toFixed(2)}
                </div>
              </div>
              
              <div className="summary-card">
                <div className="summary-label">Scrap Recovered</div>
                <div className="summary-value success">
                  ₹{summary.total_scrap_recovered.toFixed(2)}
                </div>
              </div>
              
              <div className="summary-card">
                <div className="summary-label">Net Loss</div>
                <div className="summary-value error">
                  ₹{summary.total_net_loss.toFixed(2)}
                </div>
              </div>
            </div>
          )}

          {/* History Table */}
          <div className="panel">
            <h3 className="panel-title">Write-off History</h3>
            <div className="table-container">
              <table className="history-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Material</th>
                    <th>Category</th>
                    <th className="text-center">Quantity</th>
                    <th className="text-center">Reason</th>
                    <th className="text-right">Total Cost</th>
                    <th className="text-right">Scrap Value</th>
                    <th className="text-right">Net Loss</th>
                    <th>Authorized By</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.isArray(writeoffHistory) && writeoffHistory.map((writeoff) => (
                    <tr key={writeoff.writeoff_id}>
                      <td>{writeoff.writeoff_date_display}</td>
                      <td>{writeoff.material_name}</td>
                      <td>{writeoff.category}</td>
                      <td className="text-center">
                        {writeoff.quantity} {writeoff.unit}
                      </td>
                      <td className="text-center">
                        <span className="reason-badge">
                          {writeoff.reason_description || writeoff.reason_code}
                        </span>
                      </td>
                      <td className="text-right">
                        ₹{writeoff.total_cost.toFixed(2)}
                      </td>
                      <td className="text-right">
                        ₹{writeoff.scrap_value.toFixed(2)}
                      </td>
                      <td className="text-right net-loss">
                        ₹{writeoff.net_loss.toFixed(2)}
                      </td>
                      <td>{writeoff.created_by || '-'}</td>
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

/* End of MaterialWriteoff Component v2.0.0 - August 8, 2025 */
