import React, { createContext, useState, useContext } from 'react';
// We import auditService but we will also use direct fetch for the final report to be safe
import { auditService } from '../services/api';

const AuditContext = createContext();

export const useAudit = () => useContext(AuditContext);

export const AuditProvider = ({ children }) => {
  // 1. BACKGROUND RUNNER STATE (The Engine)
  // This keeps track of the active audit, even if you are looking at something else.
  const [runner, setRunner] = useState({
    status: 'IDLE', // IDLE, PROCESSING, COMPLETED, ERROR
    company: '',
    progressMsg: '',
    progress: 0,    // Added numeric progress for the wheel
    result: null,
    error: null
  });

  // 2. VIEWER STATE (The Display)
  // This controls what is currently shown on the Dashboard card.
  const [viewer, setViewer] = useState(null); // null means show Search or Runner

  // --- ACTIONS ---

  const updateProgress = (msg) => {
    setRunner(prev => {
        if(prev.status === 'PROCESSING') return { ...prev, progressMsg: msg };
        return prev;
    });
  };

  // --- REAL-TIME WEBSOCKET AUDIT ---
  const startAudit = (companyName) => {
    // Clear the viewer so we see the progress immediately
    setViewer(null);
    
    // Start the Runner with clean state
    setRunner({
      status: 'PROCESSING',
      company: companyName,
      progressMsg: 'Initializing Secure Connection...',
      progress: 0,
      result: null,
      error: null
    });

    try {
      // 1. Establish WebSocket Connection to Backend
      const ws = new WebSocket("wss://auto-labor-compliance-agent-production.up.railway.app/ws/audit");

      // 2. Send Start Command
      ws.onopen = () => {
        console.log("🔌 Connected to Neural Core");
        ws.send(JSON.stringify({ company_name: companyName }));
      };

      // 3. Listen for Live Updates
      ws.onmessage = async (event) => {
        const data = JSON.parse(event.data);
        
        // Update Progress & Message
        setRunner(prev => ({
            ...prev,
            status: 'PROCESSING',
            progress: data.progress || prev.progress,
            progressMsg: data.message || prev.progressMsg
        }));

        // 4. Handle Completion
        if (data.status === 'completed') {
            ws.close();
            setRunner(prev => ({ ...prev, progressMsg: 'Finalizing Report...' }));

            try {
                // Fetch the final generated JSON report
                // We reuse the compare endpoint logic since it fetches by company name
                const response = await fetch('https://auto-labor-compliance-agent-production.up.railway.app/api/compare', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ companies: [companyName] })
                });

                const resData = await response.json();

                if (resData.status === 'success' && resData.data.length > 0) {
                    const finalReport = resData.data[0];
                    
                    // Success: Update Runner and Show Result
                    setRunner(prev => ({
                        ...prev,
                        status: 'COMPLETED',
                        progress: 100,
                        result: finalReport,
                        progressMsg: 'Audit Complete!'
                    }));
                    setViewer(finalReport);
                } else {
                    throw new Error("Report generated but could not be retrieved.");
                }
            } catch (err) {
                console.error("Fetch Error:", err);
                setRunner(prev => ({
                    ...prev,
                    status: 'ERROR',
                    error: "Audit finished, but report fetch failed.",
                    progressMsg: 'Error'
                }));
            }
        }

        // Handle Backend Errors
        if (data.status === 'error') {
            ws.close();
            setRunner(prev => ({
                ...prev,
                status: 'ERROR',
                error: data.message || "Unknown Backend Error",
                progressMsg: 'Failed'
            }));
        }
      };

      ws.onerror = (err) => {
        console.error("WebSocket Error:", err);
        setRunner(prev => ({
            ...prev,
            status: 'ERROR',
            error: "Connection to Audit Core failed. Is the backend running?",
            progressMsg: 'Connection Failed'
        }));
      };

    } catch (err) {
      setRunner(prev => ({
        ...prev,
        status: 'ERROR',
        error: err.message || "Client Error",
        progressMsg: 'Failed'
      }));
    }
  };

  // Called from Compare Page
  const viewHistoryReport = (data) => {
    setViewer(data); // Just update the viewer, leave the runner alone!
  };

  // Called "Back to Search"
  const clearViewer = () => {
    setViewer(null);
    // Note: We do NOT reset the runner here. 
    // If an audit is running, clearing viewer will reveal the progress screen.
  };

  // Completely reset everything (e.g. "New Audit" after one is done)
  const resetAll = () => {
    setViewer(null);
    setRunner({
      status: 'IDLE',
      company: '',
      progressMsg: '',
      progress: 0,
      result: null,
      error: null
    });
  };

  return (
    <AuditContext.Provider value={{ 
      runner, 
      setRunner, // Exposed for flexibility if needed
      viewer, 
      setViewer,
      startAudit, 
      viewHistoryReport, 
      clearViewer,
      resetAll 
    }}>
      {children}
    </AuditContext.Provider>
  );
};