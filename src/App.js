import React, { useState } from 'react';
import './App.css';
import Purchase from './modules/Purchase';
import MaterialWriteoff from './modules/MaterialWriteoff';
import BatchProduction from './modules/BatchProduction';
import Blending from './modules/Blending';

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
      </nav>

      {activeModule === 'info' && (
        <div className="info-section">
          <h3>System Status</h3>
          <ul>
            <li>✅ Purchase Module - With Traceability</li>
            <li>✅ Material Writeoff - Functional</li>
            <li>✅ Batch Production - With Traceability</li>
            <li>✅ Blending Module - Functional</li>
            <li>🔄 Traceability System - Partially Implemented</li>
            <li>📋 Material Sales - To be implemented</li>
            <li>📋 SKU Production/Packaging - To be implemented</li>
            <li>📋 Reports & Analytics - To be implemented</li>
          </ul>
          
          <h3 style={{ marginTop: '30px' }}>Traceability Status</h3>
          <ul>
            <li>✅ Purchase Traceable Codes (e.g., GNS-AK-1-05082025-ABC)</li>
            <li>✅ Batch Production Traceable Codes (e.g., GNO-AK-05082025-PUV)</li>
            <li>✅ Blending Traceable Codes (e.g., BLEND-Groundnut-05082025)</li>
            <li>📋 Package/Bottle Codes - Pending</li>
            <li>📋 Master Data Management UI - Pending</li>
          </ul>
          
          <h3 style={{ marginTop: '30px' }}>Recent Updates</h3>
          <ul>
            <li>🔔 Blending Module implemented with multi-oil support</li>
            <li>🔔 Dynamic percentage allocation for blend components</li>
            <li>🔔 Real-time weighted average cost calculation</li>
            <li>🔔 Inventory deduction from source batches</li>
          </ul>
        </div>
      )}

      {activeModule === 'purchase' && <Purchase />}
      {activeModule === 'writeoff' && <MaterialWriteoff />}
      {activeModule === 'batch' && <BatchProduction />}
      {activeModule === 'blending' && <Blending />}
    </div>
  );
}

export default App;
