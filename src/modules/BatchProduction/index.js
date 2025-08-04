import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import './BatchProduction.css';

const BatchProduction = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [availableSeeds, setAvailableSeeds] = useState([]);
  const [costElements, setCostElements] = useState([]);
  const [oilCakeRates, setOilCakeRates] = useState({});
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  
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
    cost_overrides: {}
  });

  const [selectedSeed, setSelectedSeed] = useState(null);

  // Load initial data
  useEffect(() => {
    fetchAvailableSeeds();
    fetchCostElements();
    fetchOilCakeRates();
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

  // Helper function to safely parse numeric values
  const safeParseFloat = (value, defaultValue = 0) => {
    if (value === null || value === undefined || value === '') {
      return defaultValue;
    }
    const parsed = parseFloat(value);
    return isNaN(parsed) ? defaultValue : parsed;
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
    
    // Calculate cost for each element
    costElements.forEach(element => {
      let quantity = 0;
      
      // Check if there's an override value
      const overrideValue = batchData.cost_overrides[element.element_id];
      // Use override if it exists and is not empty/null, otherwise use default
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
    
    // Calculate revenues
    const cakeRevenue = safeParseFloat(batchData.cake_yield) * safeParseFloat(batchData.cake_estimated_rate);
    const sludgeRevenue = safeParseFloat(batchData.sludge_yield) * safeParseFloat(batchData.sludge_estimated_rate);
    
    const netOilCost = totalCost - cakeRevenue - sludgeRevenue;
    const oilQty = safeParseFloat(batchData.oil_yield);
    const perKgOilCost = oilQty > 0 ? netOilCost / oilQty : 0;
    
    return {
      seedCost,
      costDetails,
      totalCost,
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
      oil_type: seed.material_name.split(' ')[0] // Extract oil type from seed name
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
        estimated_sludge_revenue: costs.sludgeRevenue
      };
      
      // Debug logging
      console.log('Payload being sent:', JSON.stringify(payload, null, 2));
      
      const response = await api.batch.addBatch(payload);
      
      if (response.success) {
        setMessage(`✅ Batch ${response.batch_code} created successfully! Oil cost: ₹${response.oil_cost_per_kg.toFixed(2)}/kg`);
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
          cost_overrides: {}
        });
        setSelectedSeed(null);
        setCurrentStep(1);
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

  return (
    <div style={{ padding: '20px', maxWidth: '900px', margin: '0 auto' }}>
      <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '20px', color: '#333' }}>
        Batch Production Module
      </h2>

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

      {/* Progress Steps */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '30px' }}>
        {['Basic Info', 'Seed & Drying', 'Outputs', 'Cost Review'].map((step, index) => (
          <div
            key={index}
            style={{
              flex: 1,
              textAlign: 'center',
              padding: '10px',
              backgroundColor: currentStep === index + 1 ? '#007BFF' : '#e9ecef',
              color: currentStep === index + 1 ? 'white' : '#6c757d',
              borderRadius: '5px',
              margin: '0 5px',
              cursor: currentStep > index + 1 ? 'pointer' : 'default'
            }}
            onClick={() => currentStep > index + 1 && setCurrentStep(index + 1)}
          >
            {step}
          </div>
        ))}
      </div>

      {/* Step 1: Basic Information */}
      {currentStep === 1 && (
        <div style={{ backgroundColor: '#f8f9fa', padding: '20px', borderRadius: '8px' }}>
          <h3 style={{ fontSize: '18px', marginBottom: '15px', color: '#495057' }}>
            Batch Identification
          </h3>
          
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>
              Production Date *
            </label>
            <input
              type="date"
              value={batchData.production_date}
              onChange={e => setBatchData({ ...batchData, production_date: e.target.value })}
              style={{ width: '100%', padding: '10px', border: '1px solid #ced4da', borderRadius: '4px' }}
            />
          </div>
          
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>
              Batch Description *
            </label>
            <input
              type="text"
              placeholder="e.g., Morning, Premium, Test"
              value={batchData.batch_description}
              onChange={e => setBatchData({ ...batchData, batch_description: e.target.value })}
              style={{ width: '100%', padding: '10px', border: '1px solid #ced4da', borderRadius: '4px' }}
            />
            <small style={{ color: '#6c757d' }}>
              Batch Code: BATCH-{batchData.production_date.split('-').reverse().join('')}-{batchData.batch_description || '[Description]'}
            </small>
          </div>
          
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '10px', fontWeight: '600' }}>
              Select Seed Material *
            </label>
            <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
              {availableSeeds.map(seed => (
                <div
                  key={seed.material_id}
                  onClick={() => handleSeedSelection(seed)}
                  style={{
                    padding: '15px',
                    marginBottom: '10px',
                    backgroundColor: selectedSeed?.material_id === seed.material_id ? '#007BFF' : 'white',
                    color: selectedSeed?.material_id === seed.material_id ? 'white' : 'black',
                    borderRadius: '5px',
                    cursor: 'pointer',
                    border: '1px solid #ddd'
                  }}
                >
                  <strong>{seed.material_name}</strong>
                  <div style={{ fontSize: '14px', marginTop: '5px' }}>
                    Available: {seed.available_quantity} kg @ ₹{seed.weighted_avg_cost.toFixed(2)}/kg
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <button
            onClick={() => setCurrentStep(2)}
            disabled={!selectedSeed || !batchData.batch_description}
            style={{
              width: '100%',
              padding: '12px',
              backgroundColor: (!selectedSeed || !batchData.batch_description) ? '#6c757d' : '#007BFF',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: (!selectedSeed || !batchData.batch_description) ? 'not-allowed' : 'pointer'
            }}
          >
            Next: Seed & Drying
          </button>
        </div>
      )}

      {/* Step 2: Seed Input & Drying */}
      {currentStep === 2 && (
        <div style={{ backgroundColor: '#f8f9fa', padding: '20px', borderRadius: '8px' }}>
          <h3 style={{ fontSize: '18px', marginBottom: '15px', color: '#495057' }}>
            Seed Input & Drying Process
          </h3>
          
          {selectedSeed && (
            <div style={{ marginBottom: '15px', padding: '10px', backgroundColor: '#e9ecef', borderRadius: '5px' }}>
              <strong>Selected Material:</strong> {selectedSeed.material_name}<br />
              Available: {selectedSeed.available_quantity} kg @ ₹{selectedSeed.weighted_avg_cost.toFixed(2)}/kg
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
          
          <div style={{ display: 'flex', gap: '10px' }}>
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

      {/* Step 3: Production Outputs */}
      {currentStep === 3 && (
        <div style={{ backgroundColor: '#f8f9fa', padding: '20px', borderRadius: '8px' }}>
          <h3 style={{ fontSize: '18px', marginBottom: '15px', color: '#495057' }}>
            Production Outputs
          </h3>
          
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

      {/* Step 4: Cost Review & Override */}
      {currentStep === 4 && costs && (
        <div style={{ backgroundColor: '#f8f9fa', padding: '20px', borderRadius: '8px' }}>
          <h3 style={{ fontSize: '18px', marginBottom: '15px', color: '#495057' }}>
            Cost Review & Adjustments
          </h3>
          
          <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: 'white' }}>
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
                        onBlur={e => {
                          // Clean up on blur - remove if empty
                          if (e.target.value === '') {
                            const newOverrides = { ...batchData.cost_overrides };
                            delete newOverrides[element.element_id];
                            setBatchData({
                              ...batchData,
                              cost_overrides: newOverrides
                            });
                          }
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
                <td colSpan="5" style={{ padding: '10px' }}>Total Production Cost</td>
                <td style={{ padding: '10px', textAlign: 'right' }}>₹{costs.totalCost.toFixed(2)}</td>
              </tr>
              
              <tr style={{ backgroundColor: '#d4edda' }}>
                <td style={{ padding: '10px' }}>Less: Oil Cake Revenue</td>
                <td colSpan="3" style={{ padding: '10px', textAlign: 'center' }}>
                  {batchData.cake_yield} kg × ₹{batchData.cake_estimated_rate}
                </td>
                <td style={{ padding: '10px', textAlign: 'center' }}>-</td>
                <td style={{ padding: '10px', textAlign: 'right' }}>₹{costs.cakeRevenue.toFixed(2)}</td>
              </tr>
              
              {batchData.sludge_yield && (
                <tr style={{ backgroundColor: '#d4edda' }}>
                  <td style={{ padding: '10px' }}>Less: Sludge Revenue</td>
                  <td colSpan="3" style={{ padding: '10px', textAlign: 'center' }}>
                    {batchData.sludge_yield} kg × ₹{batchData.sludge_estimated_rate}
                  </td>
                  <td style={{ padding: '10px', textAlign: 'center' }}>-</td>
                  <td style={{ padding: '10px', textAlign: 'right' }}>₹{costs.sludgeRevenue.toFixed(2)}</td>
                </tr>
              )}
              
              <tr style={{ backgroundColor: '#343a40', color: 'white', fontSize: '18px' }}>
                <td colSpan="5" style={{ padding: '15px' }}>Net Oil Cost</td>
                <td style={{ padding: '15px', textAlign: 'right' }}>₹{costs.netOilCost.toFixed(2)}</td>
              </tr>
              
              <tr style={{ backgroundColor: '#495057', color: 'white' }}>
                <td colSpan="5" style={{ padding: '10px' }}>
                  Cost per kg Oil ({batchData.oil_yield} kg)
                </td>
                <td style={{ padding: '10px', textAlign: 'right' }}>
                  ₹{costs.perKgOilCost.toFixed(2)}/kg
                </td>
              </tr>
            </tbody>
          </table>
          
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
    </div>
  );
};

export default BatchProduction;
