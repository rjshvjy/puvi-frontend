// Time Tracking Component for Cost Management
// File Path: puvi-frontend/src/modules/CostManagement/TimeTracker.js

import React, { useState, useEffect } from 'react';

const TimeTracker = ({ batchId, onTimeCalculated, onTimeSaved }) => {
  const [timeData, setTimeData] = useState({
    start_datetime: '',
    end_datetime: '',
    process_type: 'crushing',
    operator_name: '',
    notes: ''
  });
  
  const [calculatedTime, setCalculatedTime] = useState({
    actual_hours: 0,
    rounded_hours: 0,
    time_costs: []
  });
  
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  
  // Calculate hours when datetime changes
  useEffect(() => {
    if (timeData.start_datetime && timeData.end_datetime) {
      calculateDuration();
    }
  }, [timeData.start_datetime, timeData.end_datetime]);
  
  const calculateDuration = () => {
    const start = new Date(timeData.start_datetime);
    const end = new Date(timeData.end_datetime);
    
    if (end <= start) {
      setMessage('End time must be after start time');
      setCalculatedTime({ actual_hours: 0, rounded_hours: 0, time_costs: [] });
      return;
    }
    
    setMessage('');
    
    // Calculate actual hours
    const diffMs = end - start;
    const actualHours = diffMs / (1000 * 60 * 60);
    const roundedHours = Math.ceil(actualHours); // Round up for billing
    
    // Calculate time-based costs
    const timeCosts = [
      {
        element_name: 'Crushing Labour',
        rate: 150,
        hours: roundedHours,
        total_cost: roundedHours * 150
      },
      {
        element_name: 'Electricity - Crushing',
        rate: 75,
        hours: roundedHours,
        total_cost: roundedHours * 75
      }
    ];
    
    const calculated = {
      actual_hours: actualHours.toFixed(2),
      rounded_hours: roundedHours,
      time_costs: timeCosts
    };
    
    setCalculatedTime(calculated);
    
    // Notify parent component
    if (onTimeCalculated) {
      onTimeCalculated(calculated);
    }
  };
  
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setTimeData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const formatDateTimeLocal = (date) => {
    if (!date) return '';
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };
  
  const setCurrentTime = (field) => {
    const now = formatDateTimeLocal(new Date());
    setTimeData(prev => ({
      ...prev,
      [field]: now
    }));
  };
  
  const handleSaveTimeTracking = async () => {
    if (!batchId) {
      setMessage('Batch ID is required');
      return;
    }
    
    if (!timeData.start_datetime || !timeData.end_datetime) {
      setMessage('Please enter both start and end times');
      return;
    }
    
    setLoading(true);
    setMessage('');
    
    try {
      // Format datetime for backend (YYYY-MM-DD HH:MM)
      const formatForBackend = (datetime) => {
        const d = new Date(datetime);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const hours = String(d.getHours()).padStart(2, '0');
        const minutes = String(d.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day} ${hours}:${minutes}`;
      };
      
      const payload = {
        batch_id: batchId,
        process_type: timeData.process_type,
        start_datetime: formatForBackend(timeData.start_datetime),
        end_datetime: formatForBackend(timeData.end_datetime),
        operator_name: timeData.operator_name,
        notes: timeData.notes
      };
      
      // Here you would call the API
      // const response = await api.costManagement.saveTimeTracking(payload);
      
      // For now, simulate success
      setMessage(`✅ Time tracking saved: ${calculatedTime.actual_hours} hours (billed as ${calculatedTime.rounded_hours} hours)`);
      
      if (onTimeSaved) {
        onTimeSaved({
          ...payload,
          ...calculatedTime
        });
      }
      
    } catch (error) {
      setMessage(`❌ Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  const totalTimeCost = calculatedTime.time_costs.reduce((sum, cost) => sum + cost.total_cost, 0);
  
  return (
    <div className="time-tracker-container">
      <style jsx>{`
        .time-tracker-container {
          background-color: #f8f9fa;
          padding: 20px;
          border-radius: 8px;
          border: 1px solid #dee2e6;
        }
        
        .tracker-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }
        
        .tracker-title {
          font-size: 18px;
          font-weight: 600;
          color: #495057;
        }
        
        .time-inputs {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin-bottom: 20px;
        }
        
        .input-group {
          display: flex;
          flex-direction: column;
        }
        
        .input-label {
          font-weight: 600;
          font-size: 14px;
          color: #495057;
          margin-bottom: 8px;
        }
        
        .datetime-wrapper {
          display: flex;
          gap: 8px;
        }
        
        .datetime-input {
          flex: 1;
          padding: 10px;
          border: 1px solid #ced4da;
          border-radius: 4px;
          font-size: 14px;
        }
        
        .datetime-input:focus {
          outline: none;
          border-color: #80bdff;
          box-shadow: 0 0 0 3px rgba(0,123,255,.1);
        }
        
        .now-button {
          padding: 10px 15px;
          background-color: #6c757d;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 13px;
          white-space: nowrap;
        }
        
        .now-button:hover {
          background-color: #5a6268;
        }
        
        .duration-display {
          background-color: #e7f3ff;
          padding: 15px;
          border-radius: 6px;
          border: 1px solid #b3d9ff;
          margin-bottom: 20px;
        }
        
        .duration-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 8px;
        }
        
        .duration-label {
          color: #495057;
          font-size: 14px;
        }
        
        .duration-value {
          font-weight: 600;
          color: #0066cc;
        }
        
        .cost-breakdown {
          background-color: #fff3cd;
          padding: 15px;
          border-radius: 6px;
          border: 1px solid #ffeaa7;
          margin-bottom: 20px;
        }
        
        .cost-item {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          border-bottom: 1px solid #f0e5c0;
        }
        
        .cost-item:last-child {
          border-bottom: none;
        }
        
        .cost-total {
          font-weight: 700;
          font-size: 16px;
          padding-top: 10px;
          margin-top: 10px;
          border-top: 2px solid #f0e5c0;
        }
        
        .additional-fields {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin-bottom: 20px;
        }
        
        .text-input {
          padding: 10px;
          border: 1px solid #ced4da;
          border-radius: 4px;
          font-size: 14px;
        }
        
        .text-input:focus {
          outline: none;
          border-color: #80bdff;
          box-shadow: 0 0 0 3px rgba(0,123,255,.1);
        }
        
        .message {
          padding: 12px;
          border-radius: 4px;
          margin-bottom: 15px;
          font-size: 14px;
        }
        
        .message.success {
          background-color: #d4edda;
          color: #155724;
          border: 1px solid #c3e6cb;
        }
        
        .message.error {
          background-color: #f8d7da;
          color: #721c24;
          border: 1px solid #f5c6cb;
        }
        
        .save-button {
          width: 100%;
          padding: 12px;
          background-color: #007bff;
          color: white;
          border: none;
          border-radius: 4px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: background-color 0.2s;
        }
        
        .save-button:hover:not(:disabled) {
          background-color: #0056b3;
        }
        
        .save-button:disabled {
          background-color: #6c757d;
          cursor: not-allowed;
        }
      `}</style>
      
      <div className="tracker-header">
        <h4 className="tracker-title">⏱️ Crushing Time Entry (Post-Production)</h4>
      </div>
      
      {message && (
        <div className={`message ${message.includes('✅') ? 'success' : 'error'}`}>
          {message}
        </div>
      )}
      
      <div style={{ marginBottom: '15px', padding: '10px', backgroundColor: '#e3f2fd', borderRadius: '4px', fontSize: '13px', color: '#1565c0' }}>
        📝 Enter the actual start and end times of the crushing process. Time-based costs will be calculated automatically based on hours worked.
      </div>
      
      <div className="time-inputs">
        <div className="input-group">
          <label className="input-label">Crushing Started At *</label>
          <div className="datetime-wrapper">
            <input
              type="datetime-local"
              name="start_datetime"
              value={timeData.start_datetime}
              onChange={handleInputChange}
              className="datetime-input"
              title="Enter when crushing process started"
            />
            <button 
              type="button"
              onClick={() => setCurrentTime('start_datetime')}
              className="now-button"
              title="Click only if entering current time"
            >
              Now
            </button>
          </div>
        </div>
        
        <div className="input-group">
          <label className="input-label">Crushing Ended At *</label>
          <div className="datetime-wrapper">
            <input
              type="datetime-local"
              name="end_datetime"
              value={timeData.end_datetime}
              onChange={handleInputChange}
              className="datetime-input"
              title="Enter when crushing process ended"
            />
            <button 
              type="button"
              onClick={() => setCurrentTime('end_datetime')}
              className="now-button"
              title="Click only if entering current time"
            >
              Now
            </button>
          </div>
        </div>
      </div>
      
      {calculatedTime.actual_hours > 0 && (
        <>
          <div className="duration-display">
            <div className="duration-row">
              <span className="duration-label">Actual Duration:</span>
              <span className="duration-value">{calculatedTime.actual_hours} hours</span>
            </div>
            <div className="duration-row">
              <span className="duration-label">Billed Hours (Rounded Up):</span>
              <span className="duration-value">{calculatedTime.rounded_hours} hours</span>
            </div>
          </div>
          
          <div className="cost-breakdown">
            <h5 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#856404' }}>
              Time-Based Costs (Auto-calculated)
            </h5>
            {calculatedTime.time_costs.map((cost, index) => (
              <div key={index} className="cost-item">
                <span>{cost.element_name}: {cost.hours} hrs × ₹{cost.rate}</span>
                <span>₹{cost.total_cost.toFixed(2)}</span>
              </div>
            ))}
            <div className="cost-item cost-total">
              <span>Total Time-Based Costs:</span>
              <span>₹{totalTimeCost.toFixed(2)}</span>
            </div>
          </div>
        </>
      )}
      
      <div className="additional-fields">
        <div className="input-group">
          <label className="input-label">Operator Name</label>
          <input
            type="text"
            name="operator_name"
            value={timeData.operator_name}
            onChange={handleInputChange}
            placeholder="Enter operator name"
            className="text-input"
          />
        </div>
        
        <div className="input-group">
          <label className="input-label">Notes</label>
          <input
            type="text"
            name="notes"
            value={timeData.notes}
            onChange={handleInputChange}
            placeholder="Any additional notes"
            className="text-input"
          />
        </div>
      </div>
      
      {batchId && (
        <button
          onClick={handleSaveTimeTracking}
          disabled={loading || !timeData.start_datetime || !timeData.end_datetime}
          className="save-button"
        >
          {loading ? 'Saving...' : 'Save Time Tracking'}
        </button>
      )}
    </div>
  );
};

export default TimeTracker;
