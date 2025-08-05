// Main App Component for PUVI Oil Manufacturing System
// File Path: puvi-frontend/src/App.js

import React, { useState } from 'react';
import './App.css';
import Purchase from './modules/Purchase';
import MaterialWriteoff from './modules/MaterialWriteoff';
import BatchProduction from './modules/BatchProduction';
import Blending from './modules/Blending';
import MaterialSales from './modules/MaterialSales';  // NEW - Import Material Sales

function App() {
  const [activeModule, setActiveModule] = useState('info');

  return (
    <div className="app">
      <header>
        <h1>PUVI Oil Manufacturing System</h1>
        <p>Cost Management & Inventory Tracking</p>
      </header>

      <nav style={{ 
        display: 'flex', 
        gap: '10px', 
        marginBottom: '20px',
        flexWrap: 'wrap',
        justifyContent: 'center'
      }}>
        <button 
          onClick={() => setActiveModule('info')}
          style={{
            padding: '10px 20px',
            backgroundColor: activeModule === 'info' ? '#2c3e50' : '#ecf0f1',
            color: activeModule === 'info' ? 'white' : '#2c3e50',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            fontWeight: activeModule === 'info' ? 'bold' : 'normal',
            transition: 'all 0.2s ease'
          }}
        >
          System Info
        </button>
        
        <button 
          onClick={() => setActiveModule('purchase')}
          style={{
            padding: '10px 20px',
            backgroundColor: activeModule === 'purchase' ? '#3498db' : '#ecf0f1',
            color: activeModule === 'purchase' ? 'white' : '#2c3e50',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            fontWeight: activeModule === 'purchase' ? 'bold' : 'normal',
            transition: 'all 0.2s ease'
          }}
        >
          Purchase
        </button>
        
        <button 
          onClick={() => setActiveModule('writeoff')}
          style={{
            padding: '10px 20px',
            backgroundColor: activeModule === 'writeoff' ? '#e74c3c' : '#ecf0f1',
            color: activeModule === 'writeoff' ? 'white' : '#2c3e50',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            fontWeight: activeModule === 'writeoff' ? 'bold' : 'normal',
            transition: 'all 0.2s ease'
          }}
        >
          Material Writeoff
        </button>
        
        <button 
          onClick={() => setActiveModule('batch')}
          style={{
            padding: '10px 20px',
            backgroundColor: activeModule === 'batch' ? '#27ae60' : '#ecf0f1',
            color: activeModule === 'batch' ? 'white' : '#2c3e50',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            fontWeight: activeModule === 'batch' ? 'bold' : 'normal',
            transition: 'all 0.2s ease'
          }}
        >
          Batch Production
        </button>
        
        <button 
          onClick={() => setActiveModule('blending')}
          style={{
            padding: '10px 20px',
            backgroundColor: activeModule === 'blending' ? '#9b59b6' : '#ecf0f1',
            color: activeModule === 'blending' ? 'white' : '#2c3e50',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            fontWeight: activeModule === 'blending' ? 'bold' : 'normal',
            transition: 'all 0.2s ease'
          }}
        >
          Blending
        </button>
        
        <button 
          onClick={() => setActiveModule('sales')}
          style={{
            padding: '10px 20px',
            backgroundColor: activeModule === 'sales' ? '#e67e22' : '#ecf0f1',
            color: activeModule === 'sales' ? 'white' : '#2c3e50',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            fontWeight: activeModule === 'sales' ? 'bold' : 'normal',
            transition: 'all 0.2s ease'
          }}
        >
          Material Sales
        </button>
      </nav>

      {activeModule === 'info' && (
        <div className="info-section">
          <h3>System Status</h3>
          <ul>
            <li>✅ Purchase Module - With Traceability</li>
            <li>✅ Material Writeoff - Functional</li>
            <li>✅ Batch Production - With Traceability</li>
            <li>✅ Blending Module - Functional</li>
            <li>✅ Material Sales - With FIFO & Cost Reconciliation (NEW)</li>
            <li>🔄 Traceability System - Partially Implemented</li>
            <li>📋 SKU Production/Packaging - To be implemented</li>
            <li>📋 Reports & Analytics - To be implemented</li>
          </ul>
          
          <h3 style={{ marginTop: '30px' }}>Traceability Status</h3>
          <ul>
            <li>✅ Purchase Traceable Codes (e.g., GNS-AK-1-05082025-ABC)</li>
            <li>✅ Batch Production Traceable Codes (e.g., GNO-AK-05082025-PUV)</li>
            <li>✅ Blending Traceable Codes (e.g., BLEND-Groundnut-05082025)</li>
            <li>✅ Material Sales Tracking with Batch Allocation</li>
            <li>📋 Package/Bottle Codes - Pending</li>
            <li>📋 Master Data Management UI - Pending</li>
          </ul>
          
          <h3 style={{ marginTop: '30px' }}>Recent Updates - Material Sales Module</h3>
          <ul>
            <li>🔔 <strong>NEW:</strong> Material Sales Module implemented</li>
            <li>🔔 FIFO allocation for by-product sales (Oil Cake, Sludge)</li>
            <li>🔔 Retroactive cost adjustments to batch production</li>
            <li>🔔 Real-time cost impact preview before sale</li>
            <li>🔔 Complete audit trail with batch allocations</li>
            <li>🔔 Cost reconciliation report showing oil cost adjustments</li>
            <li>🔔 Support for multiple by-product types (expandable for future items)</li>
          </ul>
          
          <h3 style={{ marginTop: '30px' }}>Key Features - Material Sales</h3>
          <ul>
            <li>📊 <strong>FIFO Allocation:</strong> Automatically allocates from oldest inventory first</li>
            <li>💰 <strong>Cost Reconciliation:</strong> Adjusts batch oil costs based on actual vs estimated by-product revenue</li>
            <li>📈 <strong>Real-time Preview:</strong> Shows cost impact before confirming sale</li>
            <li>📋 <strong>Complete History:</strong> Track all sales with batch allocations and adjustments</li>
            <li>🔄 <strong>Flexible System:</strong> Handles Oil Cake, Sludge, and future by-products</li>
          </ul>
        </div>
      )}

      {activeModule === 'purchase' && <Purchase />}
      {activeModule === 'writeoff' && <MaterialWriteoff />}
      {activeModule === 'batch' && <BatchProduction />}
      {activeModule === 'blending' && <Blending />}
      {activeModule === 'sales' && <MaterialSales />}
    </div>
  );
}

export default App;
