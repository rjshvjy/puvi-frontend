import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import TimeTracker from '../CostManagement/TimeTracker';
import CostCapture from '../CostManagement/CostCapture'; // NEW - Import CostCapture
import './BatchProduction.css';

const BatchProduction = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [availableSeeds, setAvailableSeeds] = useState([]);
  const [costElements, setCostElements] = useState([]);
  const [oilCakeRates, setOilCakeRates] = useState({});
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [batchHistory, setBatchHistory] = useState([]);
  
  // NEW - Time tracking data
  const [timeTrackingData, setTimeTrackingData] = useState(null);
  const [extendedCostElements, setExtendedCostElements] = useState([]);
  
  // NEW - Drying stage costs
  const [dryingCosts, setDryingCosts] = useState([]);
  
  // Form data
  const [batchData, setBatchData] = useState({
    oil_type: '',
    batch_description: '',
    production_date: new Date().toISOString().split('T')[0],
    material_id: '',
    seed_quantity_before_drying: '',
    seed_quantity_after_drying: '',
    oil_yield: '',
    cake_yield: '',
    sludge_yield: '',
    cake_estimated_rate: '',
    sludge_estimated_rate: '',
    cost_overrides: {},
    seed_purchase_code: '', // Added for traceability
    // NEW - Time tracking fields
    crushing_start: '',
    crushing_end: '',
    crushing_hours: 0
  });

  const [selectedSeed, setSelectedSeed] = useState(null);

  // Load initial data
  useEffect(() => {
    fetchAvailableSeeds();
    fetchCostElements();
    fetchOilCakeRates();
    fetchExtendedCostElements(); // NEW
  }, []);

  const fetchAvailableSeeds = async () => {
    try {
      const response = await api.batch.getSeedsForBatch();
      if (response.success) {
        setAvailableSeeds(response.seeds);
      }
    } catch (error) {
      console.error('Error fetching seeds:', error);
    }
  };

  const fetchCostElements = async () => {
    try {
      const response = await api.batch.getCostElementsForBatch();
      if (response.success) {
        setCostElements(response.cost_elements);
      }
    } catch (error) {
      console.error('Error fetching cost elements:', error);
    }
  };

  // NEW - Fetch extended cost elements
  const fetchExtendedCostElements = async () => {
    try {
      const response = await api.costManagement.getCostElementsByStage('batch');
      if (response.success) {
        setExtendedCostElements(response.cost_elements);
      }
    } catch (error) {
      console.error('Error fetching extended cost elements:', error);
    }
  };

  const fetchOilCakeRates = async () => {
    try {
      const response = await api.batch.getOilCakeRates();
      if (response.success) {
        setOilCakeRates(response.rates);
      }
    } catch (error) {
      console.error('Error fetching oil cake rates:', error);
    }
  };

  const fetchBatchHistory = async () => {
    try {
      const response = await api.batch.getBatchHistory({ limit: 20 });
      if (response.success) {
        setBatchHistory(response.batches);
      }
    } catch (error) {
      console.error('Error fetching batch history:', error);
    }
  };

  // Helper function to safely parse numeric values
  const safeParseFloat = (value, defaultValue = 0) => {
    if (value === null || value === undefined || value === '') {
      return defaultValue;
    }
    const parsed = parseFloat(value);
    return isNaN(parsed) ? defaultValue : parsed;
  };

  // NEW - Handle time tracking data
  const handleTimeTracking = (timeData) => {
    setTimeTrackingData(timeData);
    setBatchData(prev => ({
      ...prev,
      crushing_start: timeData.start_datetime,
      crushing_end: timeData.end_datetime,
      crushing_hours: timeData.rounded_hours
    }));
  };

  // NEW - Calculate extended costs (including drying costs)
  const calculateExtendedCosts = () => {
    if (!extendedCostElements || extendedCostElements.length === 0) return [];
    
    const seedQty = safeParseFloat(batchData.seed_quantity_before_drying);
    const seedQtyAfter = safeParseFloat(batchData.seed_quantity_after_drying);
    const crushingHours = timeTrackingData?.rounded_hours || 0;
    
    const costs = [];
    
    // Include drying costs from Step 2
    if (dryingCosts && dryingCosts.length > 0) {
      dryingCosts.forEach(cost => {
        costs.push(cost);
      });
    }
    
    extendedCostElements.forEach(element => {
      // Skip drying stage costs as they're already included
      if (element.element_name.includes('Drying') || element.element_name.includes('Loading After Drying')) {
        return;
      }
      
      let quantity = 0;
      let cost = 0;
      let included = true;
      
      switch (element.calculation_method) {
        case 'per_kg':
          if (element.element_name.includes('Common')) {
            quantity = safeParseFloat(batchData.oil_yield);
          } else {
            quantity = seedQty;
          }
          cost = quantity * element.default_rate;
          break;
          
        case 'per_hour':
          quantity = crushingHours;
          cost = quantity * element.default_rate;
          included = crushingHours > 0;
          break;
          
        case 'fixed':
          quantity = 1;
          cost = element.default_rate;
          break;
          
        default:
          quantity = 0;
          cost = 0;
      }
      
      if (included && (cost > 0 || !element.is_optional)) {
        costs.push({
          element_name: element.element_name,
          category: element.category,
          quantity: quantity,
          rate: element.default_rate,
          total_cost: cost,
          is_optional: element.is_optional,
          calculation_method: element.calculation_method
        });
      }
    });
    
    return costs;
  };

  // Calculate derived values
  const calculateDryingLoss = () => {
    const before = safeParseFloat(batchData.seed_quantity_before_drying);
    const after = safeParseFloat(batchData.seed_quantity_after_drying);
    const loss = before - after;
    const lossPercent = before > 0 ? (loss / before * 100) : 0;
    return { loss, lossPercent };
  };

  const calculateYieldPercentages = () => {
    const after = safeParseFloat(batchData.seed_quantity_after_drying);
    const oil = safeParseFloat(batchData.oil_yield);
    const cake = safeParseFloat(batchData.cake_yield);
    const sludge = safeParseFloat(batchData.sludge_yield);
    
    return {
      oilPercent: after > 0 ? (oil / after * 100) : 0,
      cakePercent: after > 0 ? (cake / after * 100) : 0,
      sludgePercent: after > 0 ? (sludge / after * 100) : 0,
      totalPercent: after > 0 ? ((oil + cake + sludge) / after * 100) : 0
    };
  };

  const calculateCosts = () => {
    if (!selectedSeed) return null;
    
    const seedQty = safeParseFloat(batchData.seed_quantity_before_drying);
    const seedCost = seedQty * selectedSeed.weighted_avg_cost;
    
    let totalCost = seedCost;
    const costDetails = [];
    
    // Calculate cost for each element (basic costs)
    costElements.forEach(element => {
      let quantity = 0;
      
      // Check if there's an override value
      const overrideValue = batchData.cost_overrides[element.element_id];
      let rate;
      if (overrideValue !== null && overrideValue !== undefined && overrideValue !== '') {
        rate = safeParseFloat(overrideValue);
      } else {
        rate = element.default_rate;
      }
      
      // Determine quantity based on calculation method
      if (element.unit_type === 'Per Kg') {
        quantity = seedQty;
      } else if (element.unit_type === 'Per Bag') {
        quantity = seedQty / 50; // Convert to bags
        rate = rate / 50; // Convert rate to per kg
      }
      
      const cost = quantity * rate;
      totalCost += cost;
      
      costDetails.push({
        element_name: element.element_name,
        master_rate: element.default_rate,
        override_rate: overrideValue !== null && overrideValue !== undefined && overrideValue !== '' 
          ? safeParseFloat(overrideValue) 
          : element.default_rate,
        quantity: quantity,
        total_cost: cost
      });
    });
    
    // NEW - Add extended costs
    const extendedCosts = calculateExtendedCosts();
    const extendedCostTotal = extendedCosts.reduce((sum, cost) => sum + cost.total_cost, 0);
    
    // Calculate revenues
    const cakeRevenue = safeParseFloat(batchData.cake_yield) * safeParseFloat(batchData.cake_estimated_rate);
    const sludgeRevenue = safeParseFloat(batchData.sludge_yield) * safeParseFloat(batchData.sludge_estimated_rate);
    
    const netOilCost = totalCost + extendedCostTotal - cakeRevenue - sludgeRevenue;
    const oilQty = safeParseFloat(batchData.oil_yield);
    const perKgOilCost = oilQty > 0 ? netOilCost / oilQty : 0;
    
    return {
      seedCost,
      costDetails,
      extendedCosts, // NEW
      totalCost,
      extendedCostTotal, // NEW
      cakeRevenue,
      sludgeRevenue,
      netOilCost,
      perKgOilCost
    };
  };

  const handleSeedSelection = (seed) => {
    setSelectedSeed(seed);
    setBatchData({
      ...batchData,
      material_id: seed.material_id,
      oil_type: seed.material_name.split(' ')[0], // Extract oil type from seed name
      seed_purchase_code: seed.latest_purchase_code || '' // Set the purchase traceable code
    });
    
    // Set default cake rates if available
    const oilType = seed.material_name.split(' ')[0];
    if (oilCakeRates[oilType]) {
      setBatchData(prev => ({
        ...prev,
        cake_estimated_rate: oilCakeRates[oilType].cake_rate.toString(),
        sludge_estimated_rate: oilCakeRates[oilType].sludge_rate.toString()
      }));
    }
  };

  // Clean and validate data before submission
  const prepareDataForSubmission = () => {
    const cleanedData = { ...batchData };
    
    // Clean numeric fields - convert empty strings to proper values
    const numericFields = [
      'seed_quantity_before_drying',
      'seed_quantity_after_drying',
      'oil_yield',
      'cake_yield',
      'sludge_yield',
      'cake_estimated_rate',
      'sludge_estimated_rate'
    ];
    
    numericFields.forEach(field => {
      if (cleanedData[field] === '' || cleanedData[field] === null || cleanedData[field] === undefined) {
        cleanedData[field] = '0';
      }
    });
    
    return cleanedData;
  };

  const handleSubmit = async () => {
    setLoading(true);
    setMessage('');
    
    try {
      const costs = calculateCosts();
      const cleanedBatchData = prepareDataForSubmission();
      
      const payload = {
        ...cleanedBatchData,
        seed_cost_total: costs.seedCost,
        cost_details: costs.costDetails,
        estimated_cake_revenue: costs.cakeRevenue,
        estimated_sludge_revenue: costs.sludgeRevenue,
        // NEW - Include time tracking data
        time_tracking: timeTrackingData ? {
          start_datetime: timeTrackingData.start_datetime,
          end_datetime: timeTrackingData.end_datetime,
          operator_name: timeTrackingData.operator_name,
          notes: timeTrackingData.notes
        } : null
      };
      
      const response = await api.batch.addBatch(payload);
      
      if (response.success) {
        // NEW - Save time tracking if available
        if (timeTrackingData && response.batch_id) {
          await api.costManagement.saveTimeTracking({
            ...timeTrackingData,
            batch_id: response.batch_id
          });
        }
        
        // NEW - Save extended costs (including drying costs)
        if (costs.extendedCosts.length > 0 && response.batch_id) {
          await api.costManagement.saveBatchCosts({
            batch_id: response.batch_id,
            costs: costs.extendedCosts.map(cost => ({
              element_name: cost.element_name,
              quantity: cost.quantity,
              rate: cost.rate,
              is_applied: true
            })),
            created_by: 'BatchProduction'
          });
        }
        
        setMessage(`✅ Batch created successfully!
Batch Code: ${response.batch_code}
Traceable Code: ${response.traceable_code}
Oil Cost: ₹${response.oil_cost_per_kg.toFixed(2)}/kg
Total Oil Produced: ${response.total_oil_produced} kg
${timeTrackingData ? `Time Tracked: ${timeTrackingData.rounded_hours} hours` : ''}`);
        
        // Reset form
        setBatchData({
          oil_type: '',
          batch_description: '',
          production_date: new Date().toISOString().split('T')[0],
          material_id: '',
          seed_quantity_before_drying: '',
          seed_quantity_after_drying: '',
          oil_yield: '',
          cake_yield: '',
          sludge_yield: '',
          cake_estimated_rate: '',
          sludge_estimated_rate: '',
          cost_overrides: {},
          seed_purchase_code: '',
          crushing_start: '',
          crushing_end: '',
          crushing_hours: 0
        });
        setSelectedSeed(null);
        setTimeTrackingData(null);
        setDryingCosts([]); // Reset drying costs
        setCurrentStep(1);
        
        // Refresh history if visible
        if (showHistory) {
          fetchBatchHistory();
        }
      }
    } catch (error) {
      console.error('Error submitting batch:', error);
      setMessage(`❌ Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const { loss, lossPercent } = calculateDryingLoss();
  const yields = calculateYieldPercentages();
  const costs = calculateCosts();

  // Format date for display
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB'); // DD/MM/YYYY format
  };

  return (
    <div className="batch-production-container">
      <div className="batch-header">
        <h2>Batch Production Module</h2>
        <button
          className="view-history-btn"
          onClick={() => {
            setShowHistory(!showHistory);
            if (!showHistory && batchHistory.length === 0) {
              fetchBatchHistory();
            }
          }}
        >
          {showHistory ? 'Hide History' : 'View History'}
        </button>
      </div>

      {message && (
        <div className={`message ${message.includes('✅') ? 'success' : 'error'}`}>
          {message}
        </div>
      )}

      {!showHistory ? (
        <>
          {/* Progress Steps */}
          <div className="progress-steps">
            {['Basic Info', 'Seed & Drying', 'Outputs', 'Cost Review'].map((step, index) => (
              <div
                key={index}
                className={`progress-step ${currentStep === index + 1 ? 'active' : 'inactive'} ${currentStep > index + 1 ? 'clickable' : ''}`}
                onClick={() => currentStep > index + 1 && setCurrentStep(index + 1)}
              >
                {step}
              </div>
            ))}
          </div>

          {/* Step 1: Basic Information */}
          {currentStep === 1 && (
            <div className="step-content">
              <h3>Batch Identification</h3>
              
              <div className="form-group">
                <label>Production Date *</label>
                <input
                  type="date"
                  className="form-control"
                  value={batchData.production_date}
                  onChange={e => setBatchData({ ...batchData, production_date: e.target.value })}
                />
              </div>
              
              <div className="form-group">
                <label>Batch Description *</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g., Morning, Premium, Test"
                  value={batchData.batch_description}
                  onChange={e => setBatchData({ ...batchData, batch_description: e.target.value })}
                />
                <small className="batch-code-preview">
                  Batch Code: BATCH-{batchData.production_date.split('-').reverse().join('')}-{batchData.batch_description || '[Description]'}
                </small>
              </div>
              
              <div className="form-group">
                <label className="seed-selection-label">Select Seed Material *</label>
                <div className="seed-selection-container">
                  {availableSeeds.length === 0 ? (
                    <div className="seed-selection-empty">
                      <p>No seeds available in inventory</p>
                      <small>Please create a purchase first to add seed inventory</small>
                    </div>
                  ) : (
                    availableSeeds.map(seed => (
                      <div
                        key={seed.material_id}
                        onClick={() => handleSeedSelection(seed)}
                        className={`seed-item ${selectedSeed?.material_id === seed.material_id ? 'selected' : ''}`}
                      >
                        <strong>
                          {seed.material_name}
                          {seed.short_code && <span className="short-code">({seed.short_code})</span>}
                        </strong>
                        <div className="details">
                          Available: {seed.available_quantity} kg @ ₹{seed.weighted_avg_cost.toFixed(2)}/kg
                        </div>
                        {seed.latest_purchase_code && (
                          <div className="purchase-code">
                            Purchase Code: {seed.latest_purchase_code}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
              
              <button
                onClick={() => setCurrentStep(2)}
                disabled={!selectedSeed || !batchData.batch_description}
                className="btn btn-primary"
                style={{ width: '100%' }}
              >
                Next: Seed & Drying
              </button>
            </div>
          )}

          {/* Step 2: Seed Input & Drying - WITH COST CAPTURE */}
          {currentStep === 2 && (
            <div style={{ backgroundColor: '#f8f9fa', padding: '20px', borderRadius: '8px' }}>
              <h3 style={{ fontSize: '18px', marginBottom: '15px', color: '#495057' }}>
                Seed Input & Drying Process
              </h3>
              
              {selectedSeed && (
                <div style={{ marginBottom: '15px', padding: '10px', backgroundColor: '#e9ecef', borderRadius: '5px' }}>
                  <strong>Selected Material:</strong> {selectedSeed.material_name}
                  {selectedSeed.short_code && <span style={{ marginLeft: '10px' }}>({selectedSeed.short_code})</span>}
                  <br />
                  Available: {selectedSeed.available_quantity} kg @ ₹{selectedSeed.weighted_avg_cost.toFixed(2)}/kg
                  {batchData.seed_purchase_code && (
                    <>
                      <br />
                      <span style={{ fontSize: '12px', fontFamily: 'monospace' }}>
                        Tracing from: {batchData.seed_purchase_code}
                      </span>
                    </>
                  )}
                </div>
              )}
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>
                    Quantity Before Drying (kg) *
                  </label>
                  <input
                    type="number"
                    value={batchData.seed_quantity_before_drying}
                    onChange={e => setBatchData({ ...batchData, seed_quantity_before_drying: e.target.value })}
                    max={selectedSeed?.available_quantity}
                    step="0.01"
                    style={{ width: '100%', padding: '10px', border: '1px solid #ced4da', borderRadius: '4px' }}
                  />
                </div>
                
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>
                    Quantity After Drying (kg) *
                  </label>
                  <input
                    type="number"
                    value={batchData.seed_quantity_after_drying}
                    onChange={e => setBatchData({ ...batchData, seed_quantity_after_drying: e.target.value })}
                    max={batchData.seed_quantity_before_drying}
                    step="0.01"
                    style={{ width: '100%', padding: '10px', border: '1px solid #ced4da', borderRadius: '4px' }}
                  />
                </div>
              </div>
              
              {batchData.seed_quantity_before_drying && batchData.seed_quantity_after_drying && (
                <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#fff3cd', borderRadius: '5px' }}>
                  <strong>Drying Loss:</strong> {loss.toFixed(2)} kg ({lossPercent.toFixed(2)}%)
                </div>
              )}
              
              {/* NEW - Cost Capture Component for Drying Stage */}
              {batchData.seed_quantity_before_drying && (
                <CostCapture
                  module="batch"
                  stage="drying"
                  quantity={safeParseFloat(batchData.seed_quantity_before_drying)}
                  onCostsUpdate={(costs) => setDryingCosts(costs)}
                  showSummary={true}
                  allowOverride={true}
                />
              )}
              
              {/* Drying Costs Summary */}
              {dryingCosts.length > 0 && (
                <div style={{ 
                  marginTop: '15px', 
                  padding: '15px', 
                  backgroundColor: '#d4edda', 
                  borderRadius: '5px',
                  fontSize: '14px' 
                }}>
                  <strong>Drying Stage Costs Applied:</strong>
                  <ul style={{ marginTop: '10px', marginBottom: 0 }}>
                    {dryingCosts.map((cost, idx) => (
                      <li key={idx}>
                        {cost.element_name}: ₹{cost.total_cost.toFixed(2)}
                      </li>
                    ))}
                  </ul>
                  <div style={{ marginTop: '10px', fontWeight: 'bold' }}>
                    Total Drying Costs: ₹{dryingCosts.reduce((sum, c) => sum + c.total_cost, 0).toFixed(2)}
                  </div>
                </div>
              )}
              
              <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                <button
                  onClick={() => setCurrentStep(1)}
                  style={{
                    flex: 1,
                    padding: '12px',
                    backgroundColor: '#6c757d',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  Previous
                </button>
                <button
                  onClick={() => setCurrentStep(3)}
                  disabled={!batchData.seed_quantity_before_drying || !batchData.seed_quantity_after_drying}
                  style={{
                    flex: 1,
                    padding: '12px',
                    backgroundColor: (!batchData.seed_quantity_before_drying || !batchData.seed_quantity_after_drying) ? '#6c757d' : '#007BFF',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: (!batchData.seed_quantity_before_drying || !batchData.seed_quantity_after_drying) ? 'not-allowed' : 'pointer'
                  }}
                >
                  Next: Production Outputs
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Production Outputs - WITH TIME TRACKING */}
          {currentStep === 3 && (
            <div style={{ backgroundColor: '#f8f9fa', padding: '20px', borderRadius: '8px' }}>
              <h3 style={{ fontSize: '18px', marginBottom: '15px', color: '#495057' }}>
                Production Outputs & Time Tracking
              </h3>
              
              {/* NEW - Time Tracking Component */}
              <TimeTracker 
                batchId={null} // Don't save yet - will save after batch creation
                onTimeCalculated={handleTimeTracking}
                showCostBreakdown={true}
              />
              
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>
                  Oil Yield (kg) *
                </label>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <input
                    type="number"
                    value={batchData.oil_yield}
                    onChange={e => setBatchData({ ...batchData, oil_yield: e.target.value })}
                    step="0.01"
                    style={{ flex: 1, padding: '10px', border: '1px solid #ced4da', borderRadius: '4px' }}
                  />
                  <span style={{ color: yields.oilPercent > 50 ? '#dc3545' : '#28a745' }}>
                    {yields.oilPercent.toFixed(2)}%
                  </span>
                </div>
              </div>
              
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>
                  Oil Cake Yield (kg) *
                </label>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <input
                    type="number"
                    value={batchData.cake_yield}
                    onChange={e => setBatchData({ ...batchData, cake_yield: e.target.value })}
                    step="0.01"
                    style={{ flex: 1, padding: '10px', border: '1px solid #ced4da', borderRadius: '4px' }}
                  />
                  <span>{yields.cakePercent.toFixed(2)}%</span>
                </div>
              </div>
              
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>
                  Estimated Oil Cake Rate (₹/kg) *
                </label>
                <input
                  type="number"
                  value={batchData.cake_estimated_rate}
                  onChange={e => setBatchData({ ...batchData, cake_estimated_rate: e.target.value })}
                  step="0.01"
                  style={{ width: '100%', padding: '10px', border: '1px solid #ced4da', borderRadius: '4px' }}
                />
              </div>
              
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>
                  Sludge Yield (kg) - Optional
                </label>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <input
                    type="number"
                    value={batchData.sludge_yield}
                    onChange={e => setBatchData({ ...batchData, sludge_yield: e.target.value })}
                    step="0.01"
                    style={{ flex: 1, padding: '10px', border: '1px solid #ced4da', borderRadius: '4px' }}
                  />
                  <span>{yields.sludgePercent.toFixed(2)}%</span>
                </div>
              </div>
              
              {batchData.sludge_yield && (
                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>
                    Estimated Sludge Rate (₹/kg)
                  </label>
                  <input
                    type="number"
                    value={batchData.sludge_estimated_rate}
                    onChange={e => setBatchData({ ...batchData, sludge_estimated_rate: e.target.value })}
                    step="0.01"
                    style={{ width: '100%', padding: '10px', border: '1px solid #ced4da', borderRadius: '4px' }}
                  />
                </div>
              )}
              
              {yields.totalPercent > 0 && (
                <div style={{
                  marginBottom: '20px',
                  padding: '15px',
                  backgroundColor: yields.totalPercent > 110 ? '#f8d7da' : yields.totalPercent > 105 ? '#fff3cd' : '#d4edda',
                  borderRadius: '5px'
                }}>
                  <strong>Total Yield:</strong> {yields.totalPercent.toFixed(2)}%
                  {yields.totalPercent > 110 && ' (Warning: Unusually high yield - please verify)'}
                  {yields.totalPercent > 100 && yields.totalPercent <= 110 && ' (Includes processing additions)'}
                </div>
              )}
              
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => setCurrentStep(2)}
                  style={{
                    flex: 1,
                    padding: '12px',
                    backgroundColor: '#6c757d',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  Previous
                </button>
                <button
                  onClick={() => setCurrentStep(4)}
                  disabled={!batchData.oil_yield || !batchData.cake_yield || !batchData.cake_estimated_rate}
                  style={{
                    flex: 1,
                    padding: '12px',
                    backgroundColor: (!batchData.oil_yield || !batchData.cake_yield || !batchData.cake_estimated_rate) ? '#6c757d' : '#007BFF',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: (!batchData.oil_yield || !batchData.cake_yield || !batchData.cake_estimated_rate) ? 'not-allowed' : 'pointer'
                  }}
                >
                  Next: Cost Review
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Cost Review & Override - WITH EXTENDED COSTS INCLUDING DRYING */}
          {currentStep === 4 && costs && (
            <div style={{ backgroundColor: '#f8f9fa', padding: '20px', borderRadius: '8px' }}>
              <h3 style={{ fontSize: '18px', marginBottom: '15px', color: '#495057' }}>
                Complete Cost Review & Adjustments
              </h3>
              
              {/* Basic Costs Table */}
              <h4 style={{ fontSize: '16px', marginBottom: '10px', color: '#495057' }}>
                Basic Production Costs
              </h4>
              <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: 'white', marginBottom: '20px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#e9ecef' }}>
                    <th style={{ padding: '10px', textAlign: 'left' }}>Item</th>
                    <th style={{ padding: '10px', textAlign: 'center' }}>Unit</th>
                    <th style={{ padding: '10px', textAlign: 'center' }}>Master Rate</th>
                    <th style={{ padding: '10px', textAlign: 'center' }}>Override</th>
                    <th style={{ padding: '10px', textAlign: 'center' }}>Quantity</th>
                    <th style={{ padding: '10px', textAlign: 'right' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ padding: '10px' }}>{selectedSeed?.material_name}</td>
                    <td style={{ padding: '10px', textAlign: 'center' }}>kg</td>
                    <td style={{ padding: '10px', textAlign: 'center' }}>₹{selectedSeed?.weighted_avg_cost.toFixed(2)}</td>
                    <td style={{ padding: '10px', textAlign: 'center' }}>-</td>
                    <td style={{ padding: '10px', textAlign: 'center' }}>{batchData.seed_quantity_before_drying}</td>
                    <td style={{ padding: '10px', textAlign: 'right' }}>₹{costs.seedCost.toFixed(2)}</td>
                  </tr>
                  
                  {costElements.map(element => {
                    const detail = costs.costDetails.find(d => d.element_name === element.element_name);
                    return (
                      <tr key={element.element_id}>
                        <td style={{ padding: '10px' }}>{element.element_name}</td>
                        <td style={{ padding: '10px', textAlign: 'center' }}>{element.unit_type}</td>
                        <td style={{ padding: '10px', textAlign: 'center' }}>₹{element.default_rate.toFixed(2)}</td>
                        <td style={{ padding: '10px', textAlign: 'center' }}>
                          <input
                            type="number"
                            value={batchData.cost_overrides[element.element_id] || ''}
                            onChange={e => {
                              const value = e.target.value;
                              setBatchData({
                                ...batchData,
                                cost_overrides: {
                                  ...batchData.cost_overrides,
                                  [element.element_id]: value === '' ? null : value
                                }
                              });
                            }}
                            placeholder={element.default_rate.toString()}
                            style={{ width: '80px', padding: '5px', border: '1px solid #ced4da', borderRadius: '3px' }}
                          />
                        </td>
                        <td style={{ padding: '10px', textAlign: 'center' }}>{detail?.quantity.toFixed(2)}</td>
                        <td style={{ padding: '10px', textAlign: 'right' }}>₹{detail?.total_cost.toFixed(2)}</td>
                      </tr>
                    );
                  })}
                  
                  <tr style={{ backgroundColor: '#f8f9fa', fontWeight: 'bold' }}>
                    <td colSpan="5" style={{ padding: '10px' }}>Subtotal Basic Costs</td>
                    <td style={{ padding: '10px', textAlign: 'right' }}>₹{costs.totalCost.toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>

              {/* NEW - Extended Costs Table (Including Drying Costs) */}
              {costs.extendedCosts.length > 0 && (
                <>
                  <h4 style={{ fontSize: '16px', marginBottom: '10px', color: '#495057' }}>
                    Extended Cost Elements (Including Drying Stage)
                  </h4>
                  <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: 'white', marginBottom: '20px' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#e9ecef' }}>
                        <th style={{ padding: '10px', textAlign: 'left' }}>Cost Element</th>
                        <th style={{ padding: '10px', textAlign: 'center' }}>Category</th>
                        <th style={{ padding: '10px', textAlign: 'center' }}>Quantity/Hours</th>
                        <th style={{ padding: '10px', textAlign: 'center' }}>Rate</th>
                        <th style={{ padding: '10px', textAlign: 'right' }}>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {costs.extendedCosts.map((cost, idx) => (
                        <tr key={idx} style={{ backgroundColor: cost.element_name.includes('Drying') ? '#f0f8ff' : 'white' }}>
                          <td style={{ padding: '10px' }}>
                            {cost.element_name}
                            {cost.is_optional && <span style={{ color: '#6c757d', fontSize: '12px' }}> (Optional)</span>}
                            {cost.element_name.includes('Drying') && <span style={{ color: '#007bff', fontSize: '12px' }}> 🔵 Step 2</span>}
                          </td>
                          <td style={{ padding: '10px', textAlign: 'center' }}>
                            <span style={{
                              padding: '2px 6px',
                              borderRadius: '3px',
                              fontSize: '12px',
                              backgroundColor: 
                                cost.category === 'Labor' ? '#d4edda' :
                                cost.category === 'Utilities' ? '#cce5ff' :
                                cost.category === 'Consumables' ? '#fff3cd' :
                                cost.category === 'Transport' ? '#f8d7da' :
                                '#e9ecef',
                              color: '#495057'
                            }}>
                              {cost.category}
                            </span>
                          </td>
                          <td style={{ padding: '10px', textAlign: 'center' }}>
                            {cost.quantity.toFixed(2)}
                            {cost.calculation_method === 'per_hour' && ' hrs'}
                            {cost.calculation_method === 'per_kg' && ' kg'}
                          </td>
                          <td style={{ padding: '10px', textAlign: 'center' }}>₹{cost.rate.toFixed(2)}</td>
                          <td style={{ padding: '10px', textAlign: 'right' }}>₹{cost.total_cost.toFixed(2)}</td>
                        </tr>
                      ))}
                      <tr style={{ backgroundColor: '#f8f9fa', fontWeight: 'bold' }}>
                        <td colSpan="4" style={{ padding: '10px' }}>Subtotal Extended Costs</td>
                        <td style={{ padding: '10px', textAlign: 'right' }}>₹{costs.extendedCostTotal.toFixed(2)}</td>
                      </tr>
                    </tbody>
                  </table>
                </>
              )}

              {/* Final Cost Summary */}
              <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: 'white' }}>
                <tbody>
                  <tr style={{ backgroundColor: '#343a40', color: 'white', fontSize: '16px' }}>
                    <td colSpan="4" style={{ padding: '12px' }}>Total Production Cost (Basic + Extended)</td>
                    <td style={{ padding: '12px', textAlign: 'right' }}>
                      ₹{(costs.totalCost + costs.extendedCostTotal).toFixed(2)}
                    </td>
                  </tr>
                  
                  <tr style={{ backgroundColor: '#d4edda' }}>
                    <td style={{ padding: '10px' }}>Less: Oil Cake Revenue</td>
                    <td colSpan="2" style={{ padding: '10px', textAlign: 'center' }}>
                      {batchData.cake_yield} kg × ₹{batchData.cake_estimated_rate}
                    </td>
                    <td style={{ padding: '10px', textAlign: 'center' }}>-</td>
                    <td style={{ padding: '10px', textAlign: 'right' }}>₹{costs.cakeRevenue.toFixed(2)}</td>
                  </tr>
                  
                  {batchData.sludge_yield && (
                    <tr style={{ backgroundColor: '#d4edda' }}>
                      <td style={{ padding: '10px' }}>Less: Sludge Revenue</td>
                      <td colSpan="2" style={{ padding: '10px', textAlign: 'center' }}>
                        {batchData.sludge_yield} kg × ₹{batchData.sludge_estimated_rate}
                      </td>
                      <td style={{ padding: '10px', textAlign: 'center' }}>-</td>
                      <td style={{ padding: '10px', textAlign: 'right' }}>₹{costs.sludgeRevenue.toFixed(2)}</td>
                    </tr>
                  )}
                  
                  <tr style={{ backgroundColor: '#343a40', color: 'white', fontSize: '18px' }}>
                    <td colSpan="4" style={{ padding: '15px' }}>Net Oil Cost</td>
                    <td style={{ padding: '15px', textAlign: 'right' }}>₹{costs.netOilCost.toFixed(2)}</td>
                  </tr>
                  
                  <tr style={{ backgroundColor: '#495057', color: 'white' }}>
                    <td colSpan="4" style={{ padding: '10px' }}>
                      Cost per kg Oil ({batchData.oil_yield} kg)
                    </td>
                    <td style={{ padding: '10px', textAlign: 'right' }}>
                      ₹{costs.perKgOilCost.toFixed(2)}/kg
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Time Tracking Summary */}
              {timeTrackingData && (
                <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#cce5ff', borderRadius: '5px' }}>
                  <strong>⏱️ Time Tracking Summary:</strong>
                  <ul style={{ marginTop: '10px', marginBottom: 0 }}>
                    <li>Duration: {timeTrackingData.actual_hours} hours (Billed: {timeTrackingData.rounded_hours} hours)</li>
                    <li>Crushing Labour: ₹{timeTrackingData.costs.crushing_labour.toFixed(2)}</li>
                    <li>Electricity: ₹{timeTrackingData.costs.electricity.toFixed(2)}</li>
                    <li>Total Time Costs: ₹{timeTrackingData.costs.total.toFixed(2)}</li>
                  </ul>
                </div>
              )}

              {/* Drying Costs Summary */}
              {dryingCosts.length > 0 && (
                <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#d4edda', borderRadius: '5px' }}>
                  <strong>🌾 Drying Stage Costs (from Step 2):</strong>
                  <ul style={{ marginTop: '10px', marginBottom: 0 }}>
                    {dryingCosts.map((cost, idx) => (
                      <li key={idx}>{cost.element_name}: ₹{cost.total_cost.toFixed(2)}</li>
                    ))}
                  </ul>
                  <div style={{ marginTop: '10px', fontWeight: 'bold', borderTop: '1px solid #c3e6cb', paddingTop: '10px' }}>
                    Total Drying Costs: ₹{dryingCosts.reduce((sum, c) => sum + c.total_cost, 0).toFixed(2)}
                  </div>
                </div>
              )}
              
              <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                <button
                  onClick={() => setCurrentStep(3)}
                  style={{
                    flex: 1,
                    padding: '12px',
                    backgroundColor: '#6c757d',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  Previous
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  style={{
                    flex: 2,
                    padding: '12px',
                    backgroundColor: loading ? '#6c757d' : '#28a745',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    fontWeight: 'bold'
                  }}
                >
                  {loading ? 'Creating Batch...' : 'Create Batch'}
                </button>
              </div>
            </div>
          )}
        </>
      ) : (
        <div style={{ backgroundColor: '#f8f9fa', padding: '20px', borderRadius: '8px' }}>
          <h3 style={{ fontSize: '18px', marginBottom: '20px', color: '#495057' }}>
            Batch Production History
          </h3>
          
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: 'white' }}>
              <thead>
                <tr style={{ backgroundColor: '#e9ecef' }}>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>Date</th>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>Batch Code</th>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>Traceable Code</th>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>Oil Type</th>
                  <th style={{ padding: '12px', textAlign: 'center', borderBottom: '2px solid #dee2e6' }}>Oil Yield</th>
                  <th style={{ padding: '12px', textAlign: 'center', borderBottom: '2px solid #dee2e6' }}>Yield %</th>
                  <th style={{ padding: '12px', textAlign: 'right', borderBottom: '2px solid #dee2e6' }}>Cost/kg</th>
                  <th style={{ padding: '12px', textAlign: 'center', borderBottom: '2px solid #dee2e6' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {batchHistory.map((batch) => (
                  <tr key={batch.batch_id} style={{ borderBottom: '1px solid #e9ecef' }}>
                    <td style={{ padding: '12px' }}>{formatDate(batch.production_date)}</td>
                    <td style={{ padding: '12px' }}>{batch.batch_code}</td>
                    <td style={{ 
                      padding: '12px', 
                      fontFamily: 'monospace', 
                      fontSize: '13px',
                      backgroundColor: '#f8f9fa'
                    }}>
                      {batch.traceable_code || '-'}
                    </td>
                    <td style={{ padding: '12px' }}>{batch.oil_type}</td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      {batch.oil_yield} kg
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        backgroundColor: batch.oil_yield_percent > 40 ? '#d4edda' : '#fff3cd',
                        color: batch.oil_yield_percent > 40 ? '#155724' : '#856404'
                      }}>
                        {batch.oil_yield_percent.toFixed(1)}%
                      </span>
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right' }}>
                      ₹{batch.oil_cost_per_kg.toFixed(2)}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <button style={{
                        padding: '6px 12px',
                        backgroundColor: '#17a2b8',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        fontSize: '13px',
                        cursor: 'pointer'
                      }}>
                        View
                      </button>
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

export default BatchProduction;
