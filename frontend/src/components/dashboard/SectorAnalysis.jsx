import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    ArrowLeft, RefreshCw, ShieldCheck, DollarSign, Users, Truck, SearchX, Activity
} from 'lucide-react';
import { auditService } from '../../services/api';

const SectorAnalysis = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [reports, setReports] = useState([]);

    useEffect(() => {
        const fetchAllReports = async () => {
            try {
                setLoading(true);
                const listRes = await auditService.fetchReports();
                if (listRes.status === 'success' && listRes.reports.length > 0) {
                    const companyNames = listRes.reports.map(r => r.name);
                    const detailsRes = await auditService.fetchReportDetails(companyNames);
                    if (detailsRes.status === 'success') {
                        setReports(detailsRes.data);
                    }
                }
            } catch (err) {
                console.error("Forensic Load Error:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchAllReports();
    }, []);

    const getRiskStyles = (risk) => {
        const r = (risk || "").toLowerCase();
        if (r.includes('high')) return "bg-rose-500/10 text-rose-400 border-rose-500/30";
        if (r.includes('mod') || r.includes('med')) return "bg-amber-500/10 text-amber-400 border-amber-500/30";
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
    };

    return (
        <div className="min-h-screen bg-[#020617] text-slate-200 font-sans selection:bg-blue-500/30">
            <div className="fixed inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-blue-900/10 via-transparent to-transparent pointer-events-none" />
            
            <div className="relative z-10 p-6 max-w-[1800px] mx-auto"> {/* Increased max-width for better view */}
                
                {/* --- COMPACT HEADER --- */}
                <div className="flex justify-between items-center mb-8 border-b border-white/10 pb-6">
                    <div className="flex items-center gap-5">
                        <button onClick={() => navigate('/')} className="group p-2 bg-slate-900 border border-white/10 rounded-lg hover:border-blue-500/50 transition-all shadow-lg">
                            <ArrowLeft className="w-5 h-5 text-slate-400 group-hover:text-blue-400 transition-colors" />
                        </button>
                        <div>
                            <div className="flex items-center gap-2 mb-0.5">
                                <ShieldCheck className="w-4 h-4 text-blue-500" />
                                <span className="text-blue-500 font-black text-[10px] uppercase tracking-[0.3em]">Institutional Protocol</span>
                            </div>
                            <h1 className="text-3xl font-extrabold text-white tracking-tight">
                                Forensic <span className="text-slate-500 font-light italic">Sector Analysis</span>
                            </h1>
                        </div>
                    </div>
                    
                    <button onClick={() => window.location.reload()} className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold text-sm shadow-xl transition-all active:scale-95">
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        Sync Dataset
                    </button>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center h-[40vh]">
                        <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
                        <p className="mt-4 text-slate-500 font-mono text-[10px] uppercase tracking-[0.5em] animate-pulse">Aggregating Disclosures</p>
                    </div>
                ) : reports.length === 0 ? (
                    <div className="py-20 text-center">
                        <SearchX className="w-12 h-12 text-slate-800 mx-auto mb-4" />
                        <h3 className="text-lg font-bold text-slate-600 uppercase tracking-widest">No Intelligence Data</h3>
                    </div>
                ) : (
                    /* --- SCROLLABLE TABLE CONTAINER --- */
                    <div className="overflow-hidden rounded-xl border border-white/10 bg-slate-900/20 backdrop-blur-md shadow-2xl">
                        <div className="overflow-x-auto custom-scrollbar"> {/* Horizontal Scroll Enabled */}
                            <table className="w-full text-left border-collapse min-w-[1600px]"> {/* Min-Width forces scroll instead of squish */}
                                <thead>
                                    {/* Top Level Headers */}
                                    <tr className="bg-slate-950 text-xs font-bold uppercase tracking-widest text-slate-500 border-b border-white/10">
                                        <th className="px-6 py-4 sticky left-0 bg-[#020617] z-20 border-r border-white/10 shadow-[4px_0_24px_rgba(0,0,0,0.5)]">
                                            Primary Entity
                                        </th>
                                        <th colSpan="2" className="px-6 py-4 text-center border-r border-white/10 text-cyan-400 bg-cyan-950/10">
                                            Financial Intelligence
                                        </th>
                                        <th className="px-6 py-4 text-center border-r border-white/10 text-indigo-400 bg-indigo-950/10">
                                            Personnel Census
                                        </th>
                                        <th colSpan="2" className="px-6 py-4 text-center text-emerald-400 bg-emerald-950/10">
                                            Audit Protocol
                                        </th>
                                    </tr>
                                    
                                    {/* Sub Headers */}
                                    <tr className="border-b border-white/10 text-[11px] font-bold uppercase tracking-wider text-slate-400 bg-slate-900/60">
                                        <th className="px-6 py-4 sticky left-0 bg-[#0f172a] z-20 border-r border-white/10 shadow-[4px_0_24px_rgba(0,0,0,0.5)]">
                                            Legal Name
                                        </th>
                                        <th className="px-6 py-4">Consolidated Revenue</th>
                                        <th className="px-6 py-4 border-r border-white/10 text-rose-400">Forensic Provision</th>
                                        <th className="px-6 py-4 border-r border-white/10">Workforce Matrix</th>
                                        <th className="px-6 py-4 text-center border-r border-white/10">Wage Status</th>
                                        <th className="px-6 py-4 text-center">Ind. Relations</th>
                                    </tr>
                                </thead>
                                
                                <tbody className="divide-y divide-white/5">
                                    {reports.map((report, idx) => (
                                        <tr key={idx} className="group hover:bg-white/[0.03] transition-colors">
                                            
                                            {/* Sticky Company Name Column */}
                                            <td className="px-6 py-6 sticky left-0 bg-[#020617] group-hover:bg-[#0b1121] transition-colors z-20 border-r border-white/10 shadow-[4px_0_24px_rgba(0,0,0,0.5)]">
                                                <div className="flex flex-col gap-2">
                                                    <span className="text-lg font-bold text-white tracking-tight group-hover:text-blue-400 transition-colors">
                                                        {report.company_name}
                                                    </span>
                                                    <div className={`w-fit px-3 py-1 rounded text-[10px] font-bold uppercase border tracking-wider ${getRiskStyles(report.overall_risk_score)}`}>
                                                        {report.overall_risk_score || "MODERATE"} RISK
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Revenue */}
                                            <td className="px-6 py-6 bg-cyan-500/[0.01]">
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-2 text-white font-mono text-base font-bold">
                                                        <DollarSign size={16} className="text-cyan-500" />
                                                        {report.api_financials?.revenue || "N/A"}
                                                    </div>
                                                    <div className="text-xs text-slate-500 font-medium">
                                                        Profit: <span className="text-slate-300 font-mono">{report.api_financials?.net_income || "N/A"}</span>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Provisions */}
                                            <td className="px-6 py-6 border-r border-white/10 bg-cyan-500/[0.01]">
                                                <div className={`font-mono text-lg font-bold ${report.Labour_Provision && report.Labour_Provision !== "N/A" ? "text-rose-400" : "text-slate-600"}`}>
                                                    {report.Labour_Provision || "0.00"}
                                                </div>
                                                <div className="text-[10px] text-slate-500 font-bold uppercase mt-1 tracking-wider">Gratuity Adj.</div>
                                            </td>

                                            {/* Workforce Breakdown */}
                                            <td className="px-6 py-6 border-r border-white/10 bg-indigo-500/[0.01]">
                                                <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                                                    <div className="flex items-center justify-between text-xs font-medium text-slate-300">
                                                        <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-blue-500"></span> Male</span>
                                                        <span className="font-mono">{report.workforce_profile?.[0]?.male_count || "—"}</span>
                                                    </div>
                                                    <div className="flex items-center justify-between text-xs font-medium text-slate-300">
                                                        <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-pink-500"></span> Female</span>
                                                        <span className="font-mono">{report.workforce_profile?.[0]?.female_count || "—"}</span>
                                                    </div>
                                                    <div className="flex items-center justify-between text-xs font-medium text-emerald-400">
                                                        <span>Permanent</span>
                                                        <span className="font-mono font-bold">{report.workforce_profile?.[0]?.total_count || "—"}</span>
                                                    </div>
                                                    <div className="flex items-center justify-between text-xs font-medium text-amber-400">
                                                        <span>Contract</span>
                                                        <span className="font-mono font-bold">{report.workforce_profile?.[1]?.total_count || "—"}</span>
                                                    </div>
                                                </div>
                                                <div className="mt-3 pt-2 border-t border-white/5 text-[10px] text-slate-500 uppercase font-bold tracking-wide flex justify-between">
                                                    <span>Cost of Labor</span>
                                                    <span className="text-indigo-300 font-mono">{report.api_financials?.employee_cost || "N/A"}</span>
                                                </div>
                                            </td>

                                            {/* Wage Compliance */}
                                            <td className="px-6 py-6 bg-emerald-500/[0.01] text-center border-r border-white/10 align-middle">
                                                <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border text-xs font-bold uppercase tracking-wide ${
                                                    (report.labor_code_analysis?.wages?.minimum_wage_status?.status || "").toLowerCase().includes('compliant')
                                                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                                                    : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                                                }`}>
                                                    <div className={`w-2 h-2 rounded-full ${ (report.labor_code_analysis?.wages?.minimum_wage_status?.status || "").toLowerCase().includes('compliant') ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : 'bg-rose-500'}`} />
                                                    {report.labor_code_analysis?.wages?.minimum_wage_status?.status || "N/A"}
                                                </div>
                                            </td>

                                            {/* IR Compliance */}
                                            <td className="px-6 py-6 bg-emerald-500/[0.01] text-center align-middle">
                                                <span className={`text-xs font-bold uppercase tracking-wider ${
                                                    (report.labor_code_analysis?.ir?.disputes_strikes_status?.status || "").toLowerCase().includes('compliant') || (report.labor_code_analysis?.ir?.disputes_strikes_status?.status || "").toLowerCase() === 'stable'
                                                    ? 'text-emerald-400' 
                                                    : 'text-rose-400'
                                                }`}>
                                                    {report.labor_code_analysis?.ir?.disputes_strikes_status?.status || "Compliant"}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* --- COMPACT FOOTER --- */}
                <div className="mt-8 flex items-center justify-between px-6 py-5 bg-slate-900/50 rounded-xl border border-white/10 shadow-inner">
                    <div className="flex gap-8">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_6px_#10b981]" />
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Compliant</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_6px_#f43f5e]" />
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Material Risk</span>
                        </div>
                    </div>
                    <div className="text-[9px] font-bold text-slate-600 uppercase tracking-widest flex items-center gap-2">
                        <Activity className="w-3 h-3 text-blue-500" />
                        Forensic Integrity Verified
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SectorAnalysis;