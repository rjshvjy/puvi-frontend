// Time Tracker Component for PUVI Oil Manufacturing System
// File Path: puvi-frontend/src/modules/CostManagement/TimeTracker.js

import React, { useState, useEffect } from 'react';

const TimeTracker = ({ batchId, onTimeCalculated, showCostBreakdown = true }) => {
  const [startDateTime, setStartDateTime] = useState('');
  const [endDateTime, setEndDateTime] = useState('');
  const [duration, setDuration] = useState(null);
  const [operatorName, setOperatorName] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    calculateDuration();
  }, [startDateTime, endDateTime]);

  const calculateDuration = () => {
    if (!startDateTime || !endDateTime) {
      setDuration(null);
      return;
    }

    const start = new Date(startDateTime);
    const end = new Date(endDateTime);
    
    if (end <= start) {
      setDuration(null);
      return;
    }

    const diffMs = end - start;
    const diffHours = diffMs / (1000 * 60 * 60);
    const roundedHours = Math.ceil(diffHours);

    const calculatedDuration = {
      actual_hours: diffHours.toFixed(2),
      rounded_hours: roundedHours,
      crushing_labour_cost: roundedHours * 150,
      electricity_cost: roundedHours * 75,
      total_time_cost: roundedHours * (150 + 75)
    };

    setDuration(calculatedDuration);

    // Pass data to parent
    if (onTimeCalculated) {
      onTimeCalculated({
        batch_id: batchId,
        start_datetime: startDateTime,
        end_datetime: endDateTime,
        actual_hours: calculatedDuration.actual_hours,
        rounded_hours: calculatedDuration.rounded_hours,
        operator_name: operatorName,
        notes: notes,
        costs: {
          crushing_labour: calculatedDuration.crushing_labour_cost,
          electricity: calculatedDuration.electricity_cost,
          total: calculatedDuration.total_time_cost
        }
      });
    }
  };

  const formatDateTime = (date) => {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const styles = {
    container: {
      padding: '20px',
      backgroundColor: '#f8f9fa',
      borderRadius: '8px',
      marginBottom: '20px'
    },
    title: {
      fontSize: '18px',
      fontWeight: '600',
      marginBottom: '15px',
      color: '#495057'
    },
    grid: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '15px',
      marginBottom: '15px'
    },
    formGroup: {
      marginBottom: '15px'
    },
    label: {
      display: 'block',
      marginBottom: '5px',
      fontWeight: '600',
      color: '#495057',
      fontSize: '14px'
    },
    input: {
      width: '100%',
      padding: '10px',
      border: '1px solid #ced4da',
      borderRadius: '4px',
      fontSize: '15px'
    },
    textarea: {
      width: '100%',
      padding: '10px',
      border: '1px solid #ced4da',
      borderRadius: '4px',
      fontSize: '15px',
      minHeight: '60px',
      resize: 'vertical'
    },
    durationBox: {
      padding: '15px',
      backgroundColor: '#cce5ff',
      borderRadius: '5px',
      marginBottom: '15px'
    },
    warningBox: {
      padding: '15px',
      backgroundColor: '#fff3cd',
      borderRadius: '5px',
      marginBottom: '15px',
      color: '#856404'
    },
    costBreakdown: {
      marginTop: '10px',
      paddingTop: '10px',
      borderTop: '1px solid rgba(0,0,0,0.1)'
    },
    costRow: {
      display: 'flex',
      justifyContent: 'space-between',
      marginBottom: '5px'
    },
    totalRow: {
      display: 'flex',
      justifyContent: 'space-between',
      fontWeight: 'bold',
      fontSize: '16px',
      marginTop: '10px',
      paddingTop: '10px',
      borderTop: '2px solid rgba(0,0,0,0.2)'
    },
    helpText: {
      fontSize: '12px',
      color: '#6c757d',
      marginTop: '5px'
    }
  };

  return (
    <div style={styles.container}>
      <h4 style={styles.title}>⏱️ Crushing Time Tracking</h4>
      
      <div style={styles.grid}>
        <div style={styles.formGroup}>
          <label style={styles.label}>
            Start Date & Time *
          </label>
          <input
            type="datetime-local"
            style={styles.input}
            value={startDateTime}
            onChange={(e) => setStartDateTime(e.target.value)}
          />
          {startDateTime && (
            <div style={styles.helpText}>
              {formatDateTime(startDateTime)}
            </div>
          )}
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>
            End Date & Time *
          </label>
          <input
            type="datetime-local"
            style={styles.input}
            value={endDateTime}
            onChange={(e) => setEndDateTime(e.target.value)}
            min={startDateTime}
          />
          {endDateTime && (
            <div style={styles.helpText}>
              {formatDateTime(endDateTime)}
            </div>
          )}
        </div>
      </div>

      {startDateTime && endDateTime && endDateTime <= startDateTime && (
        <div style={styles.warningBox}>
          ⚠️ End time must be after start time
        </div>
      )}

      {duration && (
        <div style={styles.durationBox}>
          <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '10px' }}>
            ⏱️ Duration Calculated
          </div>
          <div style={styles.costRow}>
            <span>Actual Duration:</span>
            <strong>{duration.actual_hours} hours</strong>
          </div>
          <div style={styles.costRow}>
            <span>Billable Hours (Rounded Up):</span>
            <strong>{duration.rounded_hours} hours</strong>
          </div>

          {showCostBreakdown && (
            <div style={styles.costBreakdown}>
              <div style={{ fontWeight: '600', marginBottom: '8px' }}>
                💰 Time-Based Costs:
              </div>
              <div style={styles.costRow}>
                <span>Crushing Labour ({duration.rounded_hours} hrs × ₹150):</span>
                <span>₹{duration.crushing_labour_cost.toFixed(2)}</span>
              </div>
              <div style={styles.costRow}>
                <span>Electricity ({duration.rounded_hours} hrs × ₹75):</span>
                <span>₹{duration.electricity_cost.toFixed(2)}</span>
              </div>
              <div style={styles.totalRow}>
                <span>Total Time-Based Costs:</span>
                <span>₹{duration.total_time_cost.toFixed(2)}</span>
              </div>
            </div>
          )}
        </div>
      )}

      <div style={styles.grid}>
        <div style={styles.formGroup}>
          <label style={styles.label}>
            Operator Name (Optional)
          </label>
          <input
            type="text"
            style={styles.input}
            value={operatorName}
            onChange={(e) => setOperatorName(e.target.value)}
            placeholder="Enter operator name"
          />
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>
            Notes (Optional)
          </label>
          <textarea
            style={styles.textarea}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any additional notes..."
          />
        </div>
      </div>

      {!batchId && (
        <div style={{ 
          padding: '10px', 
          backgroundColor: '#e9ecef', 
          borderRadius: '4px',
          fontSize: '14px',
          color: '#6c757d'
        }}>
          ℹ️ Time tracking will be saved when batch is created
        </div>
      )}
    </div>
  );
};

export default TimeTracker;
