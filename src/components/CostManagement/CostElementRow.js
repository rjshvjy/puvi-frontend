// File Path: puvi-frontend/src/components/CostManagement/CostElementRow.js
// CostElementRow Component - Reusable cost element UI component
// Created: Session 3 - UI Standardization Phase

import React, { useState, useEffect } from 'react';
import './CostElementRow.css';

/**
 * CostElementRow Component
 * 
 * A reusable component for displaying cost elements with override capability
 * Supports multiple display variants and automatic calculations
 * 
 * @param {Object} props
 * @param {string} props.elementName - Name of the cost element
 * @param {number} props.masterRate - Default rate from cost_elements_master
 * @param {string} props.unitType - Unit type (Per Kg, Per Bag, etc.)
 * @param {number} props.quantity - Quantity for calculation
 * @param {boolean} props.enabled - Whether element is enabled
 * @param {string} props.category - Category for color coding (Labor, Transport, etc.)
 * @param {string} props.overrideRate - User-entered override rate
 * @param {Function} props.onToggle - Callback when enabled/disabled
 * @param {Function} props.onOverrideChange - Callback when override rate changes
 * @param {string} props.variant - Display variant: 'default', 'compact', 'inline'
 * @param {string} props.icon - Optional icon/emoji for the element
 * @param {string} props.helpText - Optional help text
 * @param {boolean} props.showWarning - Show override warning
 */
const CostElementRow = ({
  elementName = '',
  masterRate = 0,
  unitType = 'Per Unit',
  quantity = 0,
  enabled = false,
  category = 'General',
  overrideRate = '',
  onToggle = () => {},
  onOverrideChange = () => {},
  variant = 'default',
  icon = '📋',
  helpText = '',
  showWarning = true,
  className = ''
}) => {
  const [localOverrideRate, setLocalOverrideRate] = useState(overrideRate || '');
  const [showOverrideWarning, setShowOverrideWarning] = useState(false);
  
  // Calculate effective rate and total
  const effectiveRate = localOverrideRate && parseFloat(localOverrideRate) > 0 
    ? parseFloat(localOverrideRate) 
    : masterRate;
  
  const totalCost = quantity * effectiveRate;
  
  // Check for significant override deviation (>20%)
  useEffect(() => {
    if (localOverrideRate && parseFloat(localOverrideRate) > 0) {
      const deviation = Math.abs((parseFloat(localOverrideRate) - masterRate) / masterRate) * 100;
      setShowOverrideWarning(showWarning && deviation > 20);
    } else {
      setShowOverrideWarning(false);
    }
  }, [localOverrideRate, masterRate, showWarning]);
  
  // Update local state when prop changes
  useEffect(() => {
    setLocalOverrideRate(overrideRate || '');
  }, [overrideRate]);
  
  // Handle rate change
  const handleRateChange = (e) => {
    const value = e.target.value;
    setLocalOverrideRate(value);
    onOverrideChange(value);
  };
  
  // Get category color class
  const getCategoryClass = () => {
    const categoryMap = {
      'Labor': 'category-labor',
      'Labour': 'category-labor',
      'Transport': 'category-transport',
      'Material': 'category-material',
      'Utility': 'category-utility',
      'Maintenance': 'category-maintenance',
      'Quality': 'category-quality',
      'General': 'category-general'
    };
    return categoryMap[category] || 'category-general';
  };
  
  // Render based on variant
  if (variant === 'inline') {
    return (
      <div className={`cost-element-row inline ${getCategoryClass()} ${enabled ? 'enabled' : 'disabled'} ${className}`}>
        <label className="cost-element-inline-label">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => onToggle(e.target.checked)}
            className="cost-element-checkbox"
          />
          <span className="element-icon">{icon}</span>
          <span className="element-name">{elementName}</span>
        </label>
        
        {enabled && (
          <>
            <div className="inline-rates">
              <span className="master-rate">₹{masterRate}/{unitType}</span>
              <input
                type="number"
                value={localOverrideRate}
                onChange={handleRateChange}
                placeholder={masterRate.toString()}
                step="0.01"
                className="override-input inline"
              />
            </div>
            <div className="inline-calculation">
              <span className="quantity">{quantity.toFixed(2)} {unitType}</span>
              <span className="total-cost">₹{totalCost.toFixed(2)}</span>
            </div>
          </>
        )}
      </div>
    );
  }
  
  if (variant === 'compact') {
    return (
      <div className={`cost-element-row compact ${getCategoryClass()} ${enabled ? 'enabled' : 'disabled'} ${className}`}>
        <div className="compact-header">
          <label className="element-toggle">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => onToggle(e.target.checked)}
              className="cost-element-checkbox"
            />
            <span className="element-icon">{icon}</span>
            <span className="element-name">{elementName}</span>
          </label>
          {enabled && (
            <span className="compact-total">₹{totalCost.toFixed(2)}</span>
          )}
        </div>
        
        {enabled && (
          <div className="compact-details">
            <div className="rate-group">
              <span className="rate-label">Rate:</span>
              <span className="master-rate">₹{masterRate}</span>
              <input
                type="number"
                value={localOverrideRate}
                onChange={handleRateChange}
                placeholder="Override"
                step="0.01"
                className="override-input compact"
              />
              <span className="unit-label">/{unitType}</span>
            </div>
            <div className="quantity-group">
              <span className="quantity-label">Qty:</span>
              <span className="quantity-value">{quantity.toFixed(2)}</span>
            </div>
          </div>
        )}
      </div>
    );
  }
  
  // Default variant
  return (
    <div className={`cost-element-row default ${getCategoryClass()} ${enabled ? 'enabled' : 'disabled'} ${className}`}>
      <div className="cost-element-header">
        <label className="element-toggle">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => onToggle(e.target.checked)}
            className="cost-element-checkbox"
          />
          <span className="element-icon">{icon}</span>
          <span className="element-name">{elementName}</span>
          {unitType && <span className="unit-type">({unitType})</span>}
        </label>
        {helpText && (
          <span className="help-text" title={helpText}>ⓘ</span>
        )}
      </div>
      
      {enabled && (
        <div className="cost-element-body">
          <div className="cost-element-grid">
            <div className="grid-item">
              <label className="field-label">Master Rate</label>
              <div className="field-value master-rate-display">
                ₹{masterRate.toFixed(2)}
                <span className="unit-suffix">/{unitType}</span>
              </div>
            </div>
            
            <div className="grid-item">
              <label className="field-label">Override Rate</label>
              <div className="field-value">
                <input
                  type="number"
                  value={localOverrideRate}
                  onChange={handleRateChange}
                  placeholder={masterRate.toFixed(2)}
                  step="0.01"
                  className={`override-input ${localOverrideRate ? 'has-override' : ''}`}
                />
                {showOverrideWarning && (
                  <span className="override-warning" title="Rate differs by more than 20% from master">
                    ⚠️
                  </span>
                )}
              </div>
            </div>
            
            <div className="grid-item">
              <label className="field-label">Quantity</label>
              <div className="field-value quantity-display">
                {quantity.toFixed(2)}
                <span className="unit-suffix">{unitType}</span>
              </div>
            </div>
            
            <div className="grid-item highlight">
              <label className="field-label">Total Cost</label>
              <div className="field-value total-cost-display">
                ₹{totalCost.toFixed(2)}
              </div>
            </div>
          </div>
          
          {localOverrideRate && (
            <div className="override-info">
              <span className="override-indicator">
                ✓ Using override rate: ₹{parseFloat(localOverrideRate).toFixed(2)} 
                {masterRate !== parseFloat(localOverrideRate) && (
                  <span className="deviation">
                    ({((parseFloat(localOverrideRate) - masterRate) / masterRate * 100).toFixed(0)}% 
                    {parseFloat(localOverrideRate) > masterRate ? ' higher' : ' lower'})
                  </span>
                )}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CostElementRow;
