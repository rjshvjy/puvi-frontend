// Cost Management Module for PUVI Oil Manufacturing System
// File Path: puvi-frontend/src/modules/CostManagement/index.js

import React, { useState, useEffect } from 'react';
import api from '../../services/api';

const CostManagement = () => {
  const [activeTab, setActiveTab] = useState('elements');
  const [costElements, setCostElements] = useState([]);
  const [batches, setBatches] = useState([]);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [batchCostSummary, setBatchCostSummary] = useState(null);
  const [validationReport, setValidationReport] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // Time tracking state
  const [timeTracking, setTimeTracking] = useState({
    start_datetime: '',
    end_datetime: '',
    process_type: 'crushing',
    operator_name: '',
    notes: ''
  });

  // Cost override state
  const [costOverrides, setCostOverrides] = useState({});
  const [showOverridePanel, setShowOverridePanel] = useState(false);
  const [selectedElement, setSelectedElement] = useState(null);

  useEffect(() => {
    fetchCostElements();
    if (activeTab === 'batch') {
      fetchBatches();
    } else if (activeTab === 'validation') {
      fetchValidationReport();
    }
  }, [activeTab]);

  const fetchCostElements = async () => {
    try {
      setLoading(true);
      const response = await api.costManagement.getCostElementsMaster();
      if (response.success) {
        setCostElements(response.cost_elements);
      }
    } catch (error) {
      setMessage(`Error loading cost elements: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchBatches = async () => {
    try {
      setLoading(true);
      const response = await api.batch.getBatchHistory({ limit: 50 });
      if (response.success) {
        setBatches(response.batches);
      }
    } catch (error) {
      setMessage(`Error loading batches: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchBatchCostSummary = async (batchId) => {
    try {
      setLoading(true);
      const response = await api.costManagement.getBatchCostSummary(batchId);
      if (response.success) {
        setBatchCostSummary(response.summary);
        // Check for warnings
        if (response.summary.validation?.has_warnings) {
          setMessage(`⚠️ ${response.summary.validation.warning_count} cost warnings found`);
        }
      }
    } catch (error) {
      setMessage(`Error loading batch costs: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchValidationReport = async () => {
    try {
      setLoading(true);
      const response = await api.costManagement.getValidationReport({ days: 30 });
      if (response.success) {
        setValidationReport(response.batches_with_warnings);
      }
    } catch (error) {
      setMessage(`Error loading validation report: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleTimeTracking = async () => {
    if (!selectedBatch) {
      setMessage('Please select a batch first');
      return;
    }

    try {
      setLoading(true);
      const response = await api.costManagement.saveTimeTracking({
        batch_id: selectedBatch.batch_id,
        ...timeTracking
      });
      
      if (response.success) {
        setMessage(`✅ Time tracking saved: ${response.rounded_hours} hours (₹${response.total_time_cost})`);
        // Refresh batch cost summary
        fetchBatchCostSummary(selectedBatch.batch_id);
      }
    } catch (error) {
      setMessage(`Error saving time tracking: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCostOverride = async (elementId, overrideRate, reason) => {
    if (!selectedBatch) return;

    try {
      const costs = [{
        element_id: elementId,
        element_name: selectedElement.element_name,
        quantity: calculateQuantity(selectedElement, selectedBatch),
        rate: selectedElement.default_rate,
        override_rate: overrideRate,
        override_reason: reason,
        is_applied: true
      }];

      const response = await api.costManagement.saveBatchCosts({
        batch_id: selectedBatch.batch_id,
        costs: costs,
        created_by: 'User'
      });

      if (response.success) {
        setMessage(`✅ Cost override saved for ${selectedElement.element_name}`);
        setShowOverridePanel(false);
        fetchBatchCostSummary(selectedBatch.batch_id);
      }
    } catch (error) {
      setMessage(`Error saving override: ${error.message}`);
    }
  };

  const calculateQuantity = (element, batch) => {
    if (element.calculation_method === 'per_kg') {
      return batch.seed_quantity || batch.oil_yield || 0;
    } else if (element.calculation_method === 'per_hour') {
      return batch.crushing_hours || 0;
    } else {
      return 1; // Fixed costs
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB');
  };

  const calculateDuration = () => {
    if (!timeTracking.start_datetime || !timeTracking.end_datetime) return null;
    
    const start = new Date(timeTracking.start_datetime);
    const end = new Date(timeTracking.end_datetime);
    const hours = (end - start) / (1000 * 60 * 60);
    const roundedHours = Math.ceil(hours);
    
    return {
      actual: hours.toFixed(2),
      billed: roundedHours
    };
  };

  const duration = calculateDuration();

  const styles = {
    container: {
      padding: '20px',
      maxWidth: '1200px',
      margin: '0 auto',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    },
    header: {
      marginBottom: '20px'
    },
    title: {
      fontSize: '24px',
      fontWeight: 'bold',
      color: '#333',
      marginBottom: '10px'
    },
    subtitle: {
      fontSize: '14px',
      color: '#6c757d'
    },
    message: {
      padding: '15px',
      marginBottom: '20px',
      borderRadius: '4px',
      backgroundColor: message?.includes('✅') ? '#d4edda' : message?.includes('⚠️') ? '#fff3cd' : '#f8d7da',
      color: message?.includes('✅') ? '#155724' : message?.includes('⚠️') ? '#856404' : '#721c24',
      border: `1px solid ${message?.includes('✅') ? '#c3e6cb' : message?.includes('⚠️') ? '#ffeaa7' : '#f5c6cb'}`
    },
    tabNav: {
      display: 'flex',
      gap: '10px',
      marginBottom: '20px',
      borderBottom: '2px solid #dee2e6',
      paddingBottom: '10px'
    },
    tabButton: {
      padding: '10px 20px',
      border: 'none',
      backgroundColor: 'transparent',
      cursor: 'pointer',
      fontSize: '16px',
      fontWeight: '500',
      color: '#495057',
      borderRadius: '4px 4px 0 0',
      transition: 'all 0.2s'
    },
    activeTab: {
      backgroundColor: '#007bff',
      color: 'white'
    },
    content: {
      backgroundColor: '#f8f9fa',
      padding: '25px',
      borderRadius: '8px',
      minHeight: '400px'
    },
    card: {
      backgroundColor: 'white',
      padding: '20px',
      borderRadius: '5px',
      marginBottom: '15px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
    },
    table: {
      width: '100%',
      borderCollapse: 'collapse',
      backgroundColor: 'white'
    },
    th: {
      padding: '12px',
      textAlign: 'left',
      borderBottom: '2px solid #dee2e6',
      backgroundColor: '#e9ecef',
      fontWeight: '600'
    },
    td: {
      padding: '12px',
      borderBottom: '1px solid #e9ecef'
    },
    badge: {
      padding: '4px 8px',
      borderRadius: '4px',
      fontSize: '12px',
      fontWeight: '600'
    },
    formGroup: {
      marginBottom: '15px'
    },
    label: {
      display: 'block',
      marginBottom: '5px',
      fontWeight: '600',
      color: '#495057'
    },
    input: {
      width: '100%',
      padding: '10px',
      border: '1px solid #ced4da',
      borderRadius: '4px',
      fontSize: '15px'
    },
    button: {
      padding: '10px 20px',
      backgroundColor: '#007bff',
      color: 'white',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
      fontSize: '16px',
      fontWeight: '500'
    },
    secondaryButton: {
      padding: '10px 20px',
      backgroundColor: '#6c757d',
      color: 'white',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
      fontSize: '16px',
      fontWeight: '500'
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>Cost Management Module</h2>
        <p style={styles.subtitle}>Phase 1: Warnings Only - Operations Not Blocked</p>
      </div>

      {message && (
        <div style={styles.message}>
          {message}
        </div>
      )}

      {/* Tab Navigation */}
      <div style={styles.tabNav}>
        <button
          style={{
            ...styles.tabButton,
            ...(activeTab === 'elements' ? styles.activeTab : {})
          }}
          onClick={() => setActiveTab('elements')}
        >
          Cost Elements
        </button>
        <button
          style={{
            ...styles.tabButton,
            ...(activeTab === 'batch' ? styles.activeTab : {})
          }}
          onClick={() => setActiveTab('batch')}
        >
          Batch Costs
        </button>
        <button
          style={{
            ...styles.tabButton,
            ...(activeTab === 'validation' ? styles.activeTab : {})
          }}
          onClick={() => setActiveTab('validation')}
        >
          Validation Report
        </button>
      </div>

      {/* Tab Content */}
      <div style={styles.content}>
        {loading && (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            Loading...
          </div>
        )}

        {/* Cost Elements Tab */}
        {activeTab === 'elements' && !loading && (
          <div>
            <h3 style={{ marginBottom: '20px' }}>Master Cost Elements (14 Active)</h3>
            
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Element Name</th>
                  <th style={styles.th}>Category</th>
                  <th style={styles.th}>Unit Type</th>
                  <th style={styles.th}>Default Rate (₹)</th>
                  <th style={styles.th}>Method</th>
                  <th style={styles.th}>Optional</th>
                  <th style={styles.th}>Applies To</th>
                </tr>
              </thead>
              <tbody>
                {costElements.map(element => (
                  <tr key={element.element_id}>
                    <td style={styles.td}>
                      <strong>{element.element_name}</strong>
                    </td>
                    <td style={styles.td}>
                      <span style={{
                        ...styles.badge,
                        backgroundColor: 
                          element.category === 'Labor' ? '#d4edda' :
                          element.category === 'Utilities' ? '#cce5ff' :
                          element.category === 'Consumables' ? '#fff3cd' :
                          element.category === 'Transport' ? '#f8d7da' :
                          '#e9ecef',
                        color: '#495057'
                      }}>
                        {element.category}
                      </span>
                    </td>
                    <td style={styles.td}>{element.unit_type}</td>
                    <td style={styles.td}>₹{element.default_rate.toFixed(2)}</td>
                    <td style={styles.td}>{element.calculation_method}</td>
                    <td style={styles.td}>
                      {element.is_optional ? (
                        <span style={{ color: '#ffc107' }}>Optional</span>
                      ) : (
                        <span style={{ color: '#28a745' }}>Required</span>
                      )}
                    </td>
                    <td style={styles.td}>{element.applicable_to}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#e9ecef', borderRadius: '5px' }}>
              <strong>Cost Categories:</strong>
              <ul style={{ marginTop: '10px' }}>
                <li><strong>Labor:</strong> Drying, Loading, Crushing, Filtering labour costs</li>
                <li><strong>Utilities:</strong> Electricity for crushing, Common costs</li>
                <li><strong>Consumables:</strong> Filter cloth, Cleaning materials, Sacks/Bags</li>
                <li><strong>Quality:</strong> Testing and certification costs</li>
                <li><strong>Maintenance:</strong> Machine maintenance (optional)</li>
                <li><strong>Transport:</strong> Inward/Outward transportation costs</li>
              </ul>
            </div>
          </div>
        )}

        {/* Batch Costs Tab */}
        {activeTab === 'batch' && !loading && (
          <div>
            <h3 style={{ marginBottom: '20px' }}>Batch Cost Management</h3>
            
            <div style={styles.card}>
              <h4>Select Batch</h4>
              <select 
                style={{ ...styles.input, marginBottom: '20px' }}
                onChange={(e) => {
                  const batch = batches.find(b => b.batch_id === parseInt(e.target.value));
                  setSelectedBatch(batch);
                  if (batch) fetchBatchCostSummary(batch.batch_id);
                }}
                value={selectedBatch?.batch_id || ''}
              >
                <option value="">-- Select a Batch --</option>
                {batches.map(batch => (
                  <option key={batch.batch_id} value={batch.batch_id}>
                    {batch.batch_code} - {batch.oil_type} ({formatDate(batch.production_date)})
                  </option>
                ))}
              </select>
            </div>

            {selectedBatch && batchCostSummary && (
              <>
                {/* Batch Summary */}
                <div style={styles.card}>
                  <h4>Batch Summary</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                    <div>
                      <strong>Batch Code:</strong> {batchCostSummary.batch_code}
                    </div>
                    <div>
                      <strong>Oil Type:</strong> {batchCostSummary.oil_type}
                    </div>
                    <div>
                      <strong>Production Date:</strong> {batchCostSummary.production_date}
                    </div>
                    <div>
                      <strong>Oil Yield:</strong> {batchCostSummary.oil_yield} kg
                    </div>
                    <div>
                      <strong>Base Cost:</strong> ₹{batchCostSummary.base_production_cost.toFixed(2)}
                    </div>
                    <div>
                      <strong>Oil Cost/kg:</strong> ₹{batchCostSummary.oil_cost_per_kg.toFixed(2)}
                    </div>
                  </div>
                </div>

                {/* Time Tracking */}
                <div style={styles.card}>
                  <h4>Time Tracking (Crushing Process)</h4>
                  
                  {batchCostSummary.time_tracking?.length > 0 ? (
                    <div style={{ marginBottom: '15px', padding: '10px', backgroundColor: '#d4edda', borderRadius: '4px' }}>
                      <strong>Existing Time Tracking:</strong>
                      {batchCostSummary.time_tracking.map((track, idx) => (
                        <div key={idx}>
                          {track.process_type}: {track.actual_hours} hours (Billed: {track.billed_hours} hours)
                        </div>
                      ))}
                    </div>
                  ) : null}

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>Start Time</label>
                      <input
                        type="datetime-local"
                        style={styles.input}
                        value={timeTracking.start_datetime}
                        onChange={(e) => setTimeTracking({...timeTracking, start_datetime: e.target.value})}
                      />
                    </div>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>End Time</label>
                      <input
                        type="datetime-local"
                        style={styles.input}
                        value={timeTracking.end_datetime}
                        onChange={(e) => setTimeTracking({...timeTracking, end_datetime: e.target.value})}
                      />
                    </div>
                  </div>

                  {duration && (
                    <div style={{ marginBottom: '15px', padding: '10px', backgroundColor: '#cce5ff', borderRadius: '4px' }}>
                      <strong>Duration:</strong> {duration.actual} hours (Billed: {duration.billed} hours)
                      <br />
                      <strong>Crushing Labour Cost:</strong> ₹{(duration.billed * 150).toFixed(2)}
                      <br />
                      <strong>Electricity Cost:</strong> ₹{(duration.billed * 75).toFixed(2)}
                    </div>
                  )}

                  <div style={styles.formGroup}>
                    <label style={styles.label}>Operator Name (Optional)</label>
                    <input
                      type="text"
                      style={styles.input}
                      value={timeTracking.operator_name}
                      onChange={(e) => setTimeTracking({...timeTracking, operator_name: e.target.value})}
                      placeholder="Enter operator name"
                    />
                  </div>

                  <button 
                    style={styles.button}
                    onClick={handleTimeTracking}
                    disabled={!timeTracking.start_datetime || !timeTracking.end_datetime}
                  >
                    Save Time Tracking
                  </button>
                </div>

                {/* Extended Costs */}
                {batchCostSummary.extended_costs?.length > 0 && (
                  <div style={styles.card}>
                    <h4>Extended Costs Applied</h4>
                    <table style={styles.table}>
                      <thead>
                        <tr>
                          <th style={styles.th}>Cost Element</th>
                          <th style={styles.th}>Category</th>
                          <th style={styles.th}>Quantity/Hours</th>
                          <th style={styles.th}>Rate (₹)</th>
                          <th style={styles.th}>Total (₹)</th>
                          <th style={styles.th}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {batchCostSummary.extended_costs.map((cost, idx) => (
                          <tr key={idx}>
                            <td style={styles.td}>{cost.element_name}</td>
                            <td style={styles.td}>{cost.category}</td>
                            <td style={styles.td}>{cost.quantity.toFixed(2)}</td>
                            <td style={styles.td}>₹{cost.rate.toFixed(2)}</td>
                            <td style={styles.td}>₹{cost.total_cost.toFixed(2)}</td>
                            <td style={styles.td}>
                              <button
                                style={{ ...styles.button, padding: '5px 10px', fontSize: '14px' }}
                                onClick={() => {
                                  setSelectedElement(cost);
                                  setShowOverridePanel(true);
                                }}
                              >
                                Override
                              </button>
                            </td>
                          </tr>
                        ))}
                        <tr style={{ backgroundColor: '#f8f9fa', fontWeight: 'bold' }}>
                          <td colSpan="4" style={styles.td}>Total Extended Costs</td>
                          <td style={styles.td}>₹{batchCostSummary.total_extended_costs.toFixed(2)}</td>
                          <td style={styles.td}></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Validation Warnings */}
                {batchCostSummary.validation?.has_warnings && (
                  <div style={styles.card}>
                    <h4 style={{ color: '#856404' }}>⚠️ Cost Validation Warnings</h4>
                    <ul>
                      {batchCostSummary.validation.warnings.map((warning, idx) => (
                        <li key={idx} style={{ marginBottom: '8px' }}>
                          {warning.message}
                          {warning.amount && <strong> (₹{warning.amount.toFixed(2)})</strong>}
                        </li>
                      ))}
                    </ul>
                    <div style={{ marginTop: '15px', padding: '10px', backgroundColor: '#fff3cd', borderRadius: '4px' }}>
                      <strong>Total Unallocated Costs:</strong> ₹{batchCostSummary.validation.total_unallocated.toFixed(2)}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Validation Report Tab */}
        {activeTab === 'validation' && !loading && (
          <div>
            <h3 style={{ marginBottom: '20px' }}>Cost Validation Report (Last 30 Days)</h3>
            
            {validationReport.length === 0 ? (
              <div style={styles.card}>
                <p style={{ textAlign: 'center', color: '#28a745', fontSize: '18px' }}>
                  ✅ All batches have complete cost allocations!
                </p>
              </div>
            ) : (
              <>
                <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#fff3cd', borderRadius: '5px' }}>
                  <strong>⚠️ {validationReport.length} batches with missing cost elements</strong>
                  <p style={{ marginTop: '5px', marginBottom: 0 }}>
                    Phase 1 Mode: These are warnings only. Operations are not blocked.
                  </p>
                </div>

                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Batch Code</th>
                      <th style={styles.th}>Oil Type</th>
                      <th style={styles.th}>Production Date</th>
                      <th style={styles.th}>Costs Captured</th>
                      <th style={styles.th}>Expected</th>
                      <th style={styles.th}>Missing</th>
                      <th style={styles.th}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {validationReport.map(batch => (
                      <tr key={batch.batch_id}>
                        <td style={styles.td}>
                          <strong>{batch.batch_code}</strong>
                        </td>
                        <td style={styles.td}>{batch.oil_type}</td>
                        <td style={styles.td}>{batch.production_date}</td>
                        <td style={styles.td}>
                          <span style={{
                            ...styles.badge,
                            backgroundColor: '#d4edda',
                            color: '#155724'
                          }}>
                            {batch.costs_captured}
                          </span>
                        </td>
                        <td style={styles.td}>
                          <span style={{
                            ...styles.badge,
                            backgroundColor: '#cce5ff',
                            color: '#004085'
                          }}>
                            {batch.costs_expected}
                          </span>
                        </td>
                        <td style={styles.td}>
                          <span style={{
                            ...styles.badge,
                            backgroundColor: '#fff3cd',
                            color: '#856404'
                          }}>
                            {batch.missing_count}
                          </span>
                        </td>
                        <td style={styles.td}>
                          <button
                            style={{ ...styles.button, padding: '5px 10px', fontSize: '14px' }}
                            onClick={() => {
                              setActiveTab('batch');
                              setSelectedBatch(batch);
                              fetchBatchCostSummary(batch.batch_id);
                            }}
                          >
                            Review
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#e9ecef', borderRadius: '5px' }}>
                  <strong>Common Missing Elements:</strong>
                  <ul style={{ marginTop: '10px' }}>
                    <li>Time tracking for crushing (affects labour and electricity costs)</li>
                    <li>Common costs allocation (₹2/kg for all oil)</li>
                    <li>Quality testing costs (₹1000 per batch)</li>
                    <li>Filter cloth and cleaning materials</li>
                  </ul>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Override Panel Modal */}
      {showOverridePanel && selectedElement && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '30px',
            borderRadius: '8px',
            width: '500px',
            maxWidth: '90%'
          }}>
            <h3>Override Cost Element</h3>
            <p><strong>{selectedElement.element_name}</strong></p>
            
            <div style={styles.formGroup}>
              <label style={styles.label}>Current Rate: ₹{selectedElement.rate}</label>
            </div>
            
            <div style={styles.formGroup}>
              <label style={styles.label}>Override Rate (₹)</label>
              <input
                type="number"
                style={styles.input}
                placeholder="Enter new rate"
                onChange={(e) => setCostOverrides({...costOverrides, rate: e.target.value})}
              />
            </div>
            
            <div style={styles.formGroup}>
              <label style={styles.label}>Reason for Override</label>
              <textarea
                style={{ ...styles.input, minHeight: '80px' }}
                placeholder="Enter reason for override"
                onChange={(e) => setCostOverrides({...costOverrides, reason: e.target.value})}
              />
            </div>
            
            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button
                style={styles.button}
                onClick={() => handleCostOverride(
                  selectedElement.element_id || selectedElement.element_name,
                  costOverrides.rate,
                  costOverrides.reason
                )}
              >
                Save Override
              </button>
              <button
                style={styles.secondaryButton}
                onClick={() => {
                  setShowOverridePanel(false);
                  setSelectedElement(null);
                  setCostOverrides({});
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CostManagement;
