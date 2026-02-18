import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuditProvider } from './context/AuditContext';
import Background from './components/effects/Background';
import Dashboard from './components/dashboard/Dashboard';
import ComparePage from './components/dashboard/ComparePage';
import SectorAnalysis from './components/dashboard/SectorAnalysis'; // ✅ Import

import './index.css';

function App() {
  return (
    <AuditProvider>
      <Router>
        <div className="min-h-screen relative font-sans text-slate-100 flex flex-col items-center">
          <Background />
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/compare" element={<ComparePage />} />
            <Route path="/sector" element={<SectorAnalysis />} /> {/* ✅ New Route */}
          </Routes>
        </div>
      </Router>
    </AuditProvider>
  );
}

export default App;