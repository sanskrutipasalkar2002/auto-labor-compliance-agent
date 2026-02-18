import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAudit } from '../../context/AuditContext'; // Adjusted path if needed
import { auditService } from '../../services/api';
import { ArrowLeft, FileText, Loader2, Eye } from 'lucide-react';

const ComparePage = () => {
  const navigate = useNavigate();
  
  // Access global state and actions
  const { runner, viewHistoryReport } = useAudit();
  
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null); // Track specific button loading

  // --- 1. Load History on Mount ---
  useEffect(() => {
    const loadHistory = async () => {
      try {
        const data = await auditService.fetchReports();
        if (data.status === 'success') {
          setReports(data.reports);
        }
      } catch (err) {
        console.error("Failed to load reports", err);
      } finally {
        setLoading(false);
      }
    };
    loadHistory();
  }, []);

  // --- 2. Handle Viewing a Report ---
  const handleViewReport = async (companyName) => {
    setActionLoading(companyName); // Show loader only on the clicked card
    try {
      // Fetch the full flattened JSON from the backend
      const data = await auditService.fetchReportDetails([companyName]);
      
      if (data.status === 'success' && data.data.length > 0) {
        const fullReport = data.data[0];
        
        // CRITICAL: Load the flat data into the Global Context
        // This ensures the Dashboard sees keys like 'Labour_Provision' immediately
        viewHistoryReport(fullReport);
        
        // Redirect to Main Dashboard
        navigate('/');
      } else {
        alert("Report data is empty or unavailable.");
      }
    } catch (err) {
      console.error("Error loading report:", err);
      alert("Failed to load report. Check console for details.");
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="min-h-screen relative font-sans text-slate-100 p-8 flex flex-col items-center">
      {/* Background Ambience */}
      <div className="fixed inset-0 bg-[#0B1120] -z-10" />
      <div className="fixed top-0 left-0 right-0 h-[500px] bg-blue-500/10 blur-[120px] rounded-full -z-10" />

      <div className="w-full max-w-6xl">
        
        {/* --- Active Job Indicator (If Backend is busy) --- */}
        {runner.status === 'PROCESSING' && (
            <div className="mb-8 p-4 bg-blue-600/20 border border-blue-500/30 rounded-xl flex items-center justify-between animate-pulse">
                <div className="flex items-center gap-3">
                    <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
                    <span className="text-blue-200 font-medium">Audit Running: {runner.company}</span>
                </div>
                <div className="text-xs text-blue-300 bg-blue-900/50 px-3 py-1 rounded-full">Background Task Active</div>
            </div>
        )}

        {/* --- Header --- */}
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => navigate('/')} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <ArrowLeft className="w-6 h-6 text-slate-400" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-white">Audit History</h1>
            <p className="text-slate-400">Select a past audit to view forensic details.</p>
          </div>
        </div>

        {/* --- Report Grid --- */}
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
          </div>
        ) : reports.length === 0 ? (
          <div className="text-center py-20 text-slate-500 bg-white/5 rounded-xl border border-white/10">
            <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No audit reports found. Run a new audit to see history here.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {reports.map((r, idx) => (
              <div key={idx} className="relative p-6 rounded-xl border bg-white/5 border-white/10 hover:border-blue-500/50 hover:bg-white/10 transition-all duration-300 group">
                <div>
                  <div className="w-12 h-12 rounded-lg bg-slate-800 flex items-center justify-center mb-4 border border-white/5 group-hover:border-blue-500/30 transition-colors">
                    <FileText className="w-6 h-6 text-blue-400" />
                  </div>
                  
                  {/* Cleaned up: Removed the filename line */}
                  <h3 className="text-lg font-bold text-white mb-4 truncate" title={r.name}>
                    {r.name}
                  </h3>
                  
                  <button 
                    onClick={() => handleViewReport(r.name)} 
                    disabled={actionLoading === r.name} 
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-lg bg-white/5 hover:bg-blue-600 hover:text-white text-slate-300 text-sm font-medium transition-all group/btn"
                  >
                    {actionLoading === r.name ? <Loader2 className="w-4 h-4 animate-spin"/> : <Eye className="w-4 h-4" />}
                    View Full Report
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ComparePage;