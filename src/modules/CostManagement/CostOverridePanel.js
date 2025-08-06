// Cost Override Panel Component for PUVI Oil Manufacturing System
// File Path: puvi-frontend/src/modules/CostManagement/CostOverridePanel.js
// Purpose: Modal interface for overriding cost rates with audit logging

import React, { useState, useEffect } from 'react';
import { 
  formatCurrency, 
  isSignificantOverride, 
  calculateDeviation,
  safeParseFloat 
} from './utils';

const CostOverridePanel = ({
  isOpen = false,
  onClose = null,
  onSave = null,
  costElement = null,
  currentQuantity = 0,
  batchId = null,
  userName = 'User'
}) => {
  
  const [overrideData, setOverrideData] = useState({
    overrideRate: '',
    reason: '',
    applyToFuture: false
  });
  
  const [validation, setValidation] = useState({
    rateError: '',
    reasonError: '',
    showReasonWarning: false
  });
  
  // Reset form when modal opens with new cost element
  useEffect(() => {
    if (isOpen && costElement) {
      setOverrideData({
        overrideRate: costElement.override_rate || costElement.rate_used || '',
        reason: '',
        applyToFuture: false
      });
      setValidation({
        rateError: '',
        reasonError: '',
        showReasonWarning: false
      });
    }
  }, [isOpen, costElement]);
  
  // Check if reason is required (>20% deviation)
  useEffect(() => {
    if (overrideData.overrideRate && costElement) {
      const originalRate = costElement.default_rate || costElement.rate || 0;
      const newRate = safeParseFloat(overrideData.overrideRate);
      const requiresReason = isSignificantOverride(originalRate, newRate);
      
      setValidation(prev => ({
        ...prev,
        showReasonWarning: requiresReason
      }));
    }
  }, [overrideData.overrideRate, costElement]);
  
  if (!isOpen || !costElement) {
    return null;
  }
  
  const originalRate = costElement.default_rate || costElement.rate || 0;
  const currentRate = costElement.rate_used || originalRate;
  const newRate = safeParseFloat(overrideData.overrideRate, currentRate);
  const deviation = calculateDeviation(originalRate, newRate);
  
  // Calculate impact
  const originalCost = currentQuantity * originalRate;
  const newCost = currentQuantity * newRate;
  const costDifference = newCost - originalCost;
  
  const handleRateChange = (value) => {
    setOverrideData(prev => ({ ...prev, overrideRate: value }));
    
    // Validate rate
    if (value && safeParseFloat(value) <= 0) {
      setValidation(prev => ({ ...prev, rateError: 'Rate must be greater than 0' }));
    } else {
      setValidation(prev => ({ ...prev, rateError: '' }));
    }
  };
  
  const handleReasonChange = (value) => {
    setOverrideData(prev => ({ ...prev, reason: value }));
    setValidation(prev => ({ ...prev, reasonError: '' }));
  };
  
  const handleSave = () => {
    // Validation
    let isValid = true;
    const newValidation = { ...validation };
    
    if (!overrideData.overrideRate || safeParseFloat(overrideData.overrideRate) <= 0) {
      newValidation.rateError = 'Please enter a valid rate';
      isValid = false;
    }
    
    if (validation.showReasonWarning && !overrideData.reason.trim()) {
      newValidation.reasonError = 'Reason required for >20% deviation';
      isValid = false;
    }
    
    setValidation(newValidation);
    
    if (!isValid) return;
    
    // Prepare data for save
    const saveData = {
      element_id: costElement.element_id,
      element_name: costElement.element_name,
      original_rate: originalRate,
      override_rate: newRate,
      reason: overrideData.reason || `Rate changed from ${formatCurrency(originalRate)} to ${formatCurrency(newRate)}`,
      quantity: currentQuantity,
      total_cost: newCost,
      overridden_by: userName,
      batch_id: batchId,
      apply_to_future: overrideData.applyToFuture
    };
    
    if (onSave) {
      onSave(saveData);
    }
    
    handleClose();
  };
  
  const handleClose = () => {
    setOverrideData({
      overrideRate: '',
      reason: '',
      applyToFuture: false
    });
    setValidation({
      rateError: '',
      reasonError: '',
      showReasonWarning: false
    });
    
    if (onClose) {
      onClose();
    }
  };
  
  const styles = {
    overlay: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    },
    modal: {
      backgroundColor: 'white',
      borderRadius: '8px',
      width: '600px',
      maxWidth: '90%',
      maxHeight: '90vh',
      overflow: 'auto',
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
    },
    header: {
      padding: '20px',
      borderBottom: '1px solid #dee2e6',
      backgroundColor: '#f8f9fa'
    },
    title: {
      fontSize: '18px',
      fontWeight: '600',
      color: '#495057',
      marginBottom: '5px'
    },
    elementName: {
      fontSize: '14px',
      color: '#6c757d'
    },
    body: {
      padding: '20px'
    },
    section: {
      marginBottom: '20px'
    },
    sectionTitle: {
      fontSize: '14px',
      fontWeight: '600',
      color: '#495057',
      marginBottom: '10px'
    },
    rateComparison: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr 1fr',
      gap: '15px',
      padding: '15px',
      backgroundColor: '#f8f9fa',
      borderRadius: '5px',
      marginBottom: '15px'
    },
    rateBox: {
      textAlign: 'center'
    },
    rateLabel: {
      fontSize: '12px',
      color: '#6c757d',
      marginBottom: '5px'
    },
    rateValue: {
      fontSize: '18px',
      fontWeight: '600',
      color: '#495057'
    },
    formGroup: {
      marginBottom: '15px'
    },
    label: {
      display: 'block',
      marginBottom: '5px',
      fontWeight: '600',
      fontSize: '14px',
      color: '#495057'
    },
    input: {
      width: '100%',
      padding: '10px',
      border: '1px solid #ced4da',
      borderRadius: '4px',
      fontSize: '15px'
    },
    inputError: {
      borderColor: '#dc3545'
    },
    textarea: {
      width: '100%',
      padding: '10px',
      border: '1px solid #ced4da',
      borderRadius: '4px',
      fontSize: '15px',
      minHeight: '80px',
      resize: 'vertical'
    },
    error: {
      color: '#dc3545',
      fontSize: '13px',
      marginTop: '5px'
    },
    warning: {
      padding: '10px',
      backgroundColor: '#fff3cd',
      color: '#856404',
      borderRadius: '4px',
      fontSize: '13px',
      marginTop: '10px'
    },
    impactBox: {
      padding: '15px',
      borderRadius: '5px',
      marginBottom: '15px'
    },
    impactPositive: {
      backgroundColor: '#d4edda',
      color: '#155724'
    },
    impactNegative: {
      backgroundColor: '#f8d7da',
      color: '#721c24'
    },
    impactNeutral: {
      backgroundColor: '#cce5ff',
      color: '#004085'
    },
    checkbox: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      marginTop: '10px'
    },
    footer: {
      padding: '20px',
      borderTop: '1px solid #dee2e6',
      backgroundColor: '#f8f9fa',
      display: 'flex',
      justifyContent: 'flex-end',
      gap: '10px'
    },
    button: {
      padding: '10px 20px',
      borderRadius: '4px',
      border: 'none',
      fontSize: '15px',
      fontWeight: '500',
      cursor: 'pointer',
      transition: 'background-color 0.2s'
    },
    primaryButton: {
      backgroundColor: '#007bff',
      color: 'white'
    },
    secondaryButton: {
      backgroundColor: '#6c757d',
      color: 'white'
    },
    badge: {
      padding: '4px 8px',
      borderRadius: '4px',
      fontSize: '12px',
      fontWeight: '600',
      marginLeft: '10px'
    }
  };
  
  // Determine impact style
  let impactStyle = styles.impactNeutral;
  if (costDifference > 0) {
    impactStyle = styles.impactNegative;
  } else if (costDifference < 0) {
    impactStyle = styles.impactPositive;
  }
  
  // Determine deviation badge color
  let deviationColor = '#28a745';
  if (Math.abs(deviation) > 20) {
    deviationColor = '#dc3545';
  } else if (Math.abs(deviation) > 10) {
    deviationColor = '#ffc107';
  }
  
  return (
    <div style={styles.overlay} onClick={handleClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.title}>
            Override Cost Element
            {costElement.is_optional && (
              <span style={{ ...styles.badge, backgroundColor: '#fff3cd', color: '#856404' }}>
                Optional
              </span>
            )}
          </div>
          <div style={styles.elementName}>
            {costElement.element_name} - {costElement.category}
          </div>
        </div>
        
        {/* Body */}
        <div style={styles.body}>
          {/* Rate Comparison */}
          <div style={styles.section}>
            <div style={styles.sectionTitle}>Rate Comparison</div>
            <div style={styles.rateComparison}>
              <div style={styles.rateBox}>
                <div style={styles.rateLabel}>Master Rate</div>
                <div style={styles.rateValue}>{formatCurrency(originalRate)}</div>
              </div>
              <div style={styles.rateBox}>
                <div style={styles.rateLabel}>Current Rate</div>
                <div style={styles.rateValue}>{formatCurrency(currentRate)}</div>
              </div>
              <div style={styles.rateBox}>
                <div style={styles.rateLabel}>
                  New Rate
                  {deviation !== 0 && (
                    <span style={{ ...styles.badge, backgroundColor: deviationColor, color: 'white' }}>
                      {deviation > 0 ? '+' : ''}{deviation}%
                    </span>
                  )}
                </div>
                <div style={styles.rateValue}>
                  {formatCurrency(newRate)}
                </div>
              </div>
            </div>
          </div>
          
          {/* Override Rate Input */}
          <div style={styles.formGroup}>
            <label style={styles.label}>
              Override Rate (₹) *
            </label>
            <input
              type="number"
              style={{
                ...styles.input,
                ...(validation.rateError ? styles.inputError : {})
              }}
              value={overrideData.overrideRate}
              onChange={(e) => handleRateChange(e.target.value)}
              placeholder={`Current: ${formatCurrency(currentRate, false)}`}
              step="0.01"
            />
            {validation.rateError && (
              <div style={styles.error}>{validation.rateError}</div>
            )}
          </div>
          
          {/* Cost Impact */}
          {currentQuantity > 0 && (
            <div style={{ ...styles.impactBox, ...impactStyle }}>
              <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>
                Cost Impact
              </div>
              <div style={{ fontSize: '13px' }}>
                Quantity: {currentQuantity.toFixed(2)} {costElement.unit_type}
              </div>
              <div style={{ fontSize: '13px' }}>
                Original Cost: {formatCurrency(originalCost)}
              </div>
              <div style={{ fontSize: '13px' }}>
                New Cost: {formatCurrency(newCost)}
              </div>
              <div style={{ fontSize: '14px', fontWeight: '600', marginTop: '5px' }}>
                Difference: {costDifference >= 0 ? '+' : ''}{formatCurrency(Math.abs(costDifference))}
              </div>
            </div>
          )}
          
          {/* Reason Input */}
          <div style={styles.formGroup}>
            <label style={styles.label}>
              Reason for Override {validation.showReasonWarning && '*'}
            </label>
            <textarea
              style={{
                ...styles.textarea,
                ...(validation.reasonError ? styles.inputError : {})
              }}
              value={overrideData.reason}
              onChange={(e) => handleReasonChange(e.target.value)}
              placeholder={
                validation.showReasonWarning 
                  ? 'Required: Deviation is >20%. Please provide justification.'
                  : 'Optional: Provide reason for override'
              }
            />
            {validation.reasonError && (
              <div style={styles.error}>{validation.reasonError}</div>
            )}
          </div>
          
          {/* Warning for significant deviation */}
          {validation.showReasonWarning && (
            <div style={styles.warning}>
              ⚠️ Significant deviation detected ({Math.abs(deviation).toFixed(1)}%). 
              A detailed reason is required for audit purposes.
            </div>
          )}
          
          {/* Apply to Future Batches */}
          <div style={styles.checkbox}>
            <input
              type="checkbox"
              id="applyToFuture"
              checked={overrideData.applyToFuture}
              onChange={(e) => setOverrideData(prev => ({ 
                ...prev, 
                applyToFuture: e.target.checked 
              }))}
            />
            <label htmlFor="applyToFuture" style={{ fontSize: '14px', cursor: 'pointer' }}>
              Apply this rate to future batches (updates master rate)
            </label>
          </div>
        </div>
        
        {/* Footer */}
        <div style={styles.footer}>
          <button
            style={{ ...styles.button, ...styles.secondaryButton }}
            onClick={handleClose}
          >
            Cancel
          </button>
          <button
            style={{ ...styles.button, ...styles.primaryButton }}
            onClick={handleSave}
          >
            Save Override
          </button>
        </div>
      </div>
    </div>
  );
};

export default CostOverridePanel;
