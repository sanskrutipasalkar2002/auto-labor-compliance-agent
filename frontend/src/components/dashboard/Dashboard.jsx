import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAudit } from '../../context/AuditContext';
import { auditService } from '../../services/api';
import GlassCard from '../ui/GlassCard';
import {
    Search, Loader2, XCircle, ShieldCheck, AlertTriangle, Download, History,
    ChevronRight, Users, Factory, DollarSign, BarChart2, CheckCircle,
    FileWarning, Briefcase, Truck, PieChart, RefreshCw, ArrowUpRight, Activity,
    Scan, FileDown, FileText, FileCheck, Database, Cpu
} from 'lucide-react';

// --- 1. UI HELPER COMPONENTS (UNCHANGED) ---

const StatusBadge = ({ status }) => {
    if (!status) return <span className="text-slate-500 text-xs font-mono">N/A</span>;
    const s = status.toLowerCase();
    
    let colorClass = "bg-slate-800 text-slate-300 border-slate-600";
    if (s.includes('compliant') || s.includes('positive') || s.includes('low')) 
        colorClass = "bg-emerald-500/20 text-emerald-300 border-emerald-500/40";
    if (s.includes('risk') || s.includes('non') || s.includes('high')) 
        colorClass = "bg-rose-500/20 text-rose-300 border-rose-500/40";
    if (s.includes('medium')) 
        colorClass = "bg-amber-500/20 text-amber-300 border-amber-500/40";

    return (
        <span className={`px-3 py-1 rounded text-xs font-bold uppercase tracking-wide border ${colorClass}`}>
            {status}
        </span>
    );
};

const StatBox = ({ label, value, icon: Icon, color = "text-white" }) => (
    <div className="bg-white/[0.05] p-5 rounded-xl border border-white/10 flex flex-col justify-between hover:bg-white/[0.08] transition-colors group h-full">
        <div className="flex justify-between items-start mb-2">
            <span className="text-slate-400 text-xs font-bold uppercase tracking-widest">{label}</span>
            {Icon && <Icon className="w-5 h-5 text-slate-500 group-hover:text-slate-300 transition-colors" />}
        </div>
        <div className={`text-xl font-mono font-bold break-all ${color}`}>{value || "—"}</div>
    </div>
);

const SmartEvidence = ({ label, text }) => {
    if (!text) return null;
    const wagePattern = /([\d,]+)\s+([\d,]+)\s+([\d.]+%)\s+([\d,]+)\s+([\d.]+%)/;
    
    if (label.includes("Minimum Wage") && wagePattern.test(text)) {
        const match = text.match(wagePattern);
        const complianceRate = parseFloat(match[5]);
        return (
            <div className="mt-3 bg-slate-950/40 p-4 rounded border border-white/10">
                <div className="flex justify-between text-sm mb-2">
                    <span className="text-slate-300">Staff Compliance Rate</span>
                    <span className="text-emerald-300 font-mono font-bold text-base">{match[5]}</span>
                </div>
                <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden mb-2">
                    <div className="bg-emerald-500 h-full rounded-full transition-all duration-1000" style={{ width: `${complianceRate}%` }}></div>
                </div>
                <div className="text-xs text-slate-400 font-mono break-words opacity-80">{text}</div>
            </div>
        );
    }

    if (label.includes("Equal Pay") && text.includes("|")) {
        const parts = text.split("|").map(s => s.trim());
        if (parts.length >= 4) {
            return (
                <div className="mt-3 grid grid-cols-2 gap-px bg-white/20 rounded overflow-hidden border border-white/10">
                    <div className="bg-slate-900/90 p-3">
                        <div className="text-xs text-blue-300 uppercase font-bold mb-1">Male</div>
                        <div className="text-white font-mono text-sm font-semibold">{parts[2] || "-"}</div>
                    </div>
                    <div className="bg-slate-900/90 p-3">
                        <div className="text-xs text-pink-300 uppercase font-bold mb-1">Female</div>
                        <div className="text-white font-mono text-sm font-semibold">{parts[4] || "-"}</div>
                    </div>
                </div>
            );
        }
    }

    return (
        <div className="mt-3 pl-3 border-l-4 border-slate-600/50">
            <p className="text-sm text-slate-300 leading-relaxed font-light italic">"{text}"</p>
        </div>
    );
};

const ComplianceRow = ({ label, data }) => (
    <div className="group py-5 border-b border-white/10 last:border-0 hover:bg-white/[0.04] transition-colors px-3 -mx-3 rounded-lg">
        <div className="flex justify-between items-center mb-2">
            <span className="text-white text-base font-medium flex items-center gap-2">
                {label}
            </span>
            <StatusBadge status={data?.status} />
        </div>
        <SmartEvidence label={label} text={data?.evidence_snippet} />
    </div>
);

// --- 2. ROTATING RADAR WHEEL COMPONENT (UNCHANGED) ---
const ScanningWheel = ({ percentage, stage }) => {
    const radius = 70;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    return (
        <div className="relative w-64 h-64 flex items-center justify-center">
            {/* 1. Outer Rotating Ring */}
            <div className="absolute inset-0 border-[3px] border-transparent border-t-blue-500/50 border-r-blue-500/30 rounded-full animate-spin duration-[3s]"></div>
            <div className="absolute inset-2 border-[1px] border-transparent border-b-purple-500/40 border-l-purple-500/20 rounded-full animate-spin duration-[5s] direction-reverse"></div>
            
            {/* 2. Static Background Circle */}
            <svg className="w-full h-full transform -rotate-90">
                <circle
                    cx="128" cy="128" r={radius}
                    stroke="rgba(255,255,255,0.05)"
                    strokeWidth="8"
                    fill="transparent"
                />
                {/* 3. Progress Fill Circle */}
                <circle
                    cx="128" cy="128" r={radius}
                    stroke="#3b82f6"
                    strokeWidth="8"
                    fill="transparent"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    className="transition-all duration-1000 ease-linear shadow-[0_0_15px_#3b82f6]"
                />
            </svg>

            {/* 4. Center Data */}
            <div className="absolute flex flex-col items-center justify-center text-center">
                <span className="text-5xl font-mono font-bold text-white tracking-tighter">
                    {Math.floor(percentage)}<span className="text-2xl text-slate-500">%</span>
                </span>
                <span className="text-[10px] uppercase tracking-widest text-blue-400 font-semibold mt-2 animate-pulse">
                    {stage}
                </span>
            </div>
        </div>
    );
};

// --- MAIN DASHBOARD COMPONENT ---

const Dashboard = () => {
    const [inputCompany, setInputCompany] = useState('');
    
    // NEW: Real-time State
    const [progress, setProgress] = useState(0);
    const [wsStatus, setWsStatus] = useState("Initializing...");
    const wsRef = useRef(null);

    const navigate = useNavigate();

    // Context & State
    // We import setRunner directly to update global state from WebSocket events
    const { runner, viewer, setRunner, setViewer, clearViewer, resetAll } = useAudit();
    
    const activeReport = viewer;
    const isScanning = runner.status === 'PROCESSING';
    const isRunnerError = runner.status === 'ERROR';

    // --- WEBSOCKET HANDLER ---
    const startRealtimeAudit = (companyName) => {
        // 1. Reset State
        setProgress(0);
        setWsStatus("Connecting to Neural Core...");
        
        // Safety check: Update global context to show scanning UI
        if (typeof setRunner === 'function') {
            setRunner({ status: 'PROCESSING', company: companyName, progress: 0, progressMsg: "Initializing..." });
        }

        // 2. Open WebSocket
        const ws = new WebSocket("ws://localhost:8000/ws/audit");
        wsRef.current = ws;

        ws.onopen = () => {
            console.log("✅ WS Connected");
            ws.send(JSON.stringify({ company_name: companyName }));
        };

        ws.onmessage = async (event) => {
            const data = JSON.parse(event.data);
            
            // Update Local State (Wheel Animation)
            if (data.progress) setProgress(data.progress);
            if (data.message) setWsStatus(data.message);

            // Update Global Context (Syncs Runner Bar)
            if (typeof setRunner === 'function') {
                setRunner(prev => ({ 
                    ...prev, 
                    progress: data.progress, 
                    progressMsg: data.message 
                }));
            }

            // Handle Completion
            if (data.status === "completed") {
                ws.close();
                
                // If backend sent data directly (Optimization)
                if (data.report_data) {
                    if (typeof setViewer === 'function') setViewer(data.report_data);
                    if (typeof setRunner === 'function') setRunner({ status: 'COMPLETED', company: companyName });
                } 
                // Fallback: Fetch if data missing
                else {
                    try {
                        const result = await auditService.fetchReport(companyName);
                        if (result.status === 'success') {
                            setViewer(result.data);
                            setRunner({ status: 'COMPLETED', company: companyName });
                        } else {
                            throw new Error("Report fetch failed");
                        }
                    } catch (err) {
                        setRunner({ status: 'ERROR', company: companyName, error: "Report generated but could not be loaded." });
                    }
                }
            }
            
            // Handle Backend Error
            if (data.status === "error") {
                ws.close();
                setRunner({ status: 'ERROR', company: companyName, error: data.message || "Audit Aborted." });
            }
        };

        ws.onerror = (error) => {
            console.error("WebSocket Error:", error);
            setRunner({ status: 'ERROR', company: companyName, error: "Connection to Audit Core failed. Is the backend running?" });
        };
    };

    // Mapping percentage to textual stages for the wheel
    const getStageLabel = (p) => {
        if (p < 10) return "INITIALIZING";
        if (p < 40) return "HUNTING";
        if (p < 60) return "VALIDATING";
        if (p < 80) return "ANALYZING";
        if (p < 95) return "GENERATING";
        return "FINALIZING";
    };

    const getStageIcon = (p) => {
        if (p < 10) return Loader2;
        if (p < 40) return Search;
        if (p < 60) return Scan;
        if (p < 80) return Cpu;
        if (p < 95) return FileText;
        return CheckCircle;
    };

    const StageIcon = getStageIcon(progress);
    const stageLabel = getStageLabel(progress);

    const handleSearch = (e) => {
        e.preventDefault();
        if (!inputCompany) return;
        startRealtimeAudit(inputCompany);
    };

    const handleDownload = async () => {
        if (!activeReport) return;
        try {
            const blob = await auditService.downloadReport(activeReport.company_name);
            const url = window.URL.createObjectURL(new Blob([blob]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `${activeReport.company_name.replace(/\s+/g, '_')}_Audit_Report.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (err) {
            alert("Download failed.");
        }
    };

    return (
        <div className={`w-full max-w-7xl px-6 transition-all duration-500 ${activeReport ? 'py-8' : 'py-24 flex flex-col items-center'}`}>

            {/* --- VIEW 1: LANDING & SEARCH --- */}
            {!activeReport && (
                <div className="w-full max-w-3xl animate-fade-in relative z-10">
                    
                    {/* Header - ALWAYS VISIBLE */}
                    <div className="text-center mb-12">
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-sm font-semibold mb-6 backdrop-blur-sm shadow-lg">
                            <ShieldCheck className="w-4 h-4" /> Enterprise Forensic Protocol
                        </div>
                        <h1 className="text-5xl md:text-7xl font-bold mb-6 tracking-tight text-white drop-shadow-2xl">
                            AutoLabor <span className="text-slate-500">Compliance</span>
                        </h1>
                        <p className="text-xl text-slate-300 font-light max-w-xl mx-auto leading-relaxed">
                            Autonomous AI agent for financial & labor compliance auditing.
                        </p>
                        
                        <div className="mt-8 text-sm text-slate-400 bg-slate-900/50 p-4 rounded-xl border border-white/10 inline-block max-w-2xl">
                            <p className="flex items-center justify-center gap-2">
                                <Activity className="w-4 h-4 text-blue-400" />
                                <span>Deep-scans <b>Annual Reports, BRSR, EHS & Financials</b>.</span>
                            </p>
                            <p className="mt-2 text-slate-500">
                                Expected runtime: <span className="text-white font-bold">20-25 minutes</span> per company.
                            </p>
                        </div>
                    </div>

                    {/* Search Bar - Disabled but visible during scan */}
                    <div className={`bg-slate-900/90 backdrop-blur-2xl rounded-2xl border border-white/20 p-3 shadow-2xl mb-8 transform transition-all ${isScanning ? 'opacity-50 pointer-events-none' : 'focus-within:scale-[1.02] focus-within:border-blue-500/50'}`}>
                        <form onSubmit={handleSearch} className="flex items-center">
                            <Search className="w-6 h-6 text-slate-400 ml-4" />
                            <input
                                type="text"
                                value={inputCompany}
                                onChange={(e) => setInputCompany(e.target.value)}
                                disabled={isScanning}
                                placeholder={isScanning ? `Audit in progress for ${runner.company}...` : "Enter listed entity name (e.g. Tata Motors Ltd)"}
                                className="w-full bg-transparent border-none outline-none text-lg px-6 py-4 text-white placeholder:text-slate-500 focus:ring-0"
                            />
                            <button
                                type="submit"
                                disabled={isScanning}
                                className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-xl font-bold text-base transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-900/20"
                            >
                                {isScanning ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Start Audit'}
                            </button>
                        </form>
                    </div>

                    {/* Action Buttons - Always Visible and Enabled */}
                    <div className="flex justify-center gap-6 mb-10">
                        <button onClick={() => navigate('/compare')} className="flex items-center gap-2 px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-sm font-semibold transition-all border border-white/10 hover:border-white/20 shadow-lg cursor-pointer">
                            <History className="w-5 h-5 text-emerald-400" /> Audit History
                        </button>
                        <button onClick={() => navigate('/sector')} className="flex items-center gap-2 px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-sm font-semibold transition-all border border-white/10 hover:border-white/20 shadow-lg cursor-pointer">
                            <PieChart className="w-5 h-5 text-purple-400" /> Comparative View
                        </button>
                    </div>

                    {/* --- 2. ACTIVE SCANNING WHEEL (Appears Below Search) --- */}
                    {isScanning && (
                        <div className="flex flex-col items-center justify-center animate-fade-in pb-8">
                            <GlassCard className="p-12 flex flex-col items-center border-blue-500/30 shadow-[0_0_100px_rgba(30,58,138,0.2)] bg-slate-900/90 backdrop-blur-2xl w-full max-w-lg">
                                
                                <ScanningWheel percentage={progress} stage={stageLabel} />
                                
                                <div className="mt-10 text-center w-full">
                                    <div className="flex items-center justify-center gap-3 mb-3">
                                        <StageIcon className="w-6 h-6 text-blue-400 animate-bounce" />
                                        <h3 className="text-2xl font-bold text-white tracking-wide">{stageLabel}</h3>
                                    </div>
                                    {/* Real-time Message from WebSocket */}
                                    <p className="text-slate-300 text-sm font-medium mb-6">{wsStatus}</p> 
                                    
                                    <div className="mt-4 p-4 bg-black/40 rounded-xl border border-white/5 text-left w-full">
                                        <div className="flex justify-between items-center mb-1">
                                            <p className="text-xs text-slate-500 uppercase font-bold">Target Entity</p>
                                            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping"></div>
                                        </div>
                                        <p className="text-white font-mono font-bold tracking-wide">{runner.company}</p>
                                        
                                        <div className="h-px bg-white/10 my-3"></div>
                                        
                                        <p className="text-xs text-slate-500 uppercase font-bold mb-1">Agent Status Log</p>
                                        <p className="text-emerald-400 font-mono text-xs animate-pulse">
                                            {">"} {runner.progressMsg || "Initializing agents..."}
                                        </p>
                                    </div>

                                    <p className="text-[10px] text-slate-500 mt-8 uppercase tracking-widest font-bold opacity-60">
                                        Forensic Protocol Active • Do not close window
                                    </p>
                                </div>
                            </GlassCard>
                        </div>
                    )}

                    {/* Error State */}
                    {isRunnerError && (
                        <div className="mt-8 p-6 bg-red-950/40 border border-red-500/30 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-6 backdrop-blur-xl animate-slide-up">
                            <div className="flex items-center gap-5">
                                <div className="p-3 bg-red-500/20 rounded-full"><XCircle className="w-8 h-8 text-red-400" /></div>
                                <div>
                                    <span className="font-bold block text-xl text-white mb-1">Audit Failed</span>
                                    <p className="text-red-200 text-sm leading-relaxed max-w-md">
                                        {runner.error.includes("not found") 
                                            ? `Could not locate reliable documents for "${runner.company}". Please try adding "Ltd" or check the company spelling.` 
                                            : runner.error}
                                    </p>
                                </div>
                            </div>
                            <button onClick={resetAll} className="px-8 py-3 bg-red-600 hover:bg-red-500 text-white text-sm font-bold uppercase tracking-wider rounded-xl transition-colors flex items-center gap-2 shadow-lg shadow-red-900/30">
                                <RefreshCw className="w-4 h-4" /> Retry
                            </button>
                        </div>
                    )}
                </div>
            )}


            {/* --- VIEW 2: REPORT DASHBOARD --- */}
            {activeReport && (
                <div className="animate-slide-up w-full">
                    {/* Sticky Navigation Bar */}
                    <header className="flex justify-between items-center mb-8 bg-slate-900/90 p-4 rounded-2xl border border-white/10 backdrop-blur-xl sticky top-6 z-40 shadow-2xl">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => runner.status === 'COMPLETED' ? resetAll() : clearViewer()}
                                className="text-slate-300 hover:text-white flex items-center gap-2 text-sm font-bold transition-colors px-3 py-2 hover:bg-white/5 rounded-lg"
                            >
                                <ChevronRight className="w-5 h-5 rotate-180" /> Back
                            </button>
                            <div className="h-8 w-px bg-white/10 mx-2"></div>
                            <h2 className="text-xl font-bold text-white tracking-tight">{activeReport.company_name}</h2>
                        </div>
                        
                        <div className="flex items-center gap-3">
                            <button onClick={handleDownload} className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-lg hover:shadow-blue-500/25">
                                <Download className="w-4 h-4" /> PDF Report
                            </button>
                            <div className={`px-5 py-2.5 rounded-xl border text-xs font-bold uppercase tracking-wider flex items-center gap-2 ${activeReport.overall_risk_score?.includes("Low") ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : activeReport.overall_risk_score?.includes("High") ? "bg-rose-500/10 border-rose-500/20 text-rose-400" : "bg-amber-500/10 border-amber-500/20 text-amber-400"}`}>
                                <ShieldCheck className="w-5 h-5" /> {activeReport.overall_risk_score} Risk
                            </div>
                        </div>
                    </header>

                    <div className="grid grid-cols-12 gap-8 pb-20">
                        {/* LEFT COLUMN */}
                        <div className="col-span-12 lg:col-span-8 space-y-8">
                            <GlassCard className="p-8 relative overflow-hidden group border-white/10">
                                <div className="absolute top-0 right-0 p-8 opacity-[0.05] group-hover:opacity-[0.08] transition-opacity">
                                    <Activity className="w-56 h-56 text-white" />
                                </div>
                                <div className="relative z-10">
                                    <div className="flex items-center justify-between mb-6">
                                        <div>
                                            <div className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-1">Audit Period</div>
                                            <div className="text-lg text-white font-mono font-semibold">{activeReport.report_period}</div>
                                        </div>
                                    </div>
                                    <h3 className="text-xl font-bold text-white mb-4">Executive Summary</h3>
                                    <div className="prose prose-invert max-w-none mb-8">
                                        <p className="text-slate-200 leading-relaxed text-base font-light break-words">
                                            {activeReport.executive_summary?.overview}
                                        </p>
                                    </div>
                                    <div className="bg-blue-500/10 border border-blue-500/30 p-5 rounded-xl flex gap-5 items-start">
                                        <div className="mt-1 p-2 bg-blue-500/20 rounded-full"><AlertTriangle className="w-5 h-5 text-blue-400" /></div>
                                        <div>
                                            <div className="text-xs uppercase font-bold text-blue-300 tracking-wider mb-2">Forensic Insight</div>
                                            <p className="text-base text-white italic leading-relaxed">{activeReport.executive_summary?.key_finding}</p>
                                        </div>
                                    </div>
                                </div>
                            </GlassCard>

                            <GlassCard className="bg-gradient-to-br from-slate-900 via-slate-900 to-rose-950/40 border-rose-500/30 relative overflow-hidden p-8">
                                <div className="absolute right-0 top-0 h-full w-2 bg-rose-500/60"></div>
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-4 text-rose-400">
                                            <FileWarning className="w-6 h-6" />
                                            <h3 className="text-lg font-bold uppercase tracking-wider">Labour Code Liability Impact</h3>
                                        </div>
                                        <p className="text-base text-slate-300 leading-relaxed font-light">
                                            {activeReport.Labour_Provision_Desc || "Provision details extracted from Q3 Financial Notes regarding new wage code implementation."}
                                        </p>
                                    </div>
                                    <div className="text-right min-w-[200px] bg-black/20 p-4 rounded-xl border border-white/5">
                                        <div className="text-xs text-slate-400 uppercase font-bold mb-2 tracking-widest">Estimated Provision</div>
                                        <div className="text-4xl font-mono font-bold text-white tracking-tight">
                                            {activeReport.Labour_Provision || "N/A"}
                                        </div>
                                    </div>
                                </div>
                            </GlassCard>

                            <GlassCard className="p-8">
                                <div className="flex items-center gap-3 mb-8 pb-4 border-b border-white/10">
                                    <ShieldCheck className="w-6 h-6 text-emerald-400" />
                                    <h3 className="text-white text-lg font-bold uppercase tracking-wider">Regulatory Compliance Framework</h3>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-12">
                                    <div>
                                        <h4 className="text-blue-300 text-sm font-bold uppercase mb-5 flex items-center gap-2">
                                            <DollarSign className="w-4 h-4" /> Wages & Benefits
                                        </h4>
                                        <div className="space-y-4">
                                            <ComplianceRow label="Minimum Wage" data={activeReport.labor_code_analysis?.wages?.minimum_wage_status} />
                                            <ComplianceRow label="Equal Pay" data={activeReport.labor_code_analysis?.wages?.equal_pay_status} />
                                        </div>
                                    </div>
                                    <div>
                                        <h4 className="text-blue-300 text-sm font-bold uppercase mb-5 flex items-center gap-2">
                                            <Activity className="w-4 h-4" /> OSH & Relations
                                        </h4>
                                        <div className="space-y-4">
                                            <ComplianceRow label="Safety Systems" data={activeReport.labor_code_analysis?.osh?.safety_systems_status} />
                                            <ComplianceRow label="Unionization" data={activeReport.labor_code_analysis?.ir?.unionization_status} />
                                        </div>
                                    </div>
                                </div>
                            </GlassCard>

                            <GlassCard className="p-8">
                                <div className="flex items-center gap-3 mb-8 pb-4 border-b border-white/10">
                                    <Factory className="w-6 h-6 text-indigo-400" />
                                    <h3 className="text-white text-lg font-bold uppercase tracking-wider">Supply Chain Liability</h3>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                    <div className="bg-indigo-500/10 p-6 rounded-2xl border border-indigo-500/30">
                                        <strong className="block text-indigo-300 text-sm font-bold uppercase tracking-wider mb-3">Principal Employer Risk</strong>
                                        <p className="text-base text-white leading-relaxed font-light">
                                            {activeReport.supply_chain_compliance?.principal_employer_liability}
                                        </p>
                                    </div>
                                    <div className="space-y-4">
                                        <ComplianceRow label="Due Diligence" data={activeReport.supply_chain_compliance?.due_diligence} />
                                        <ComplianceRow label="Forced Labor" data={activeReport.supply_chain_compliance?.forced_labor_policies} />
                                    </div>
                                </div>
                            </GlassCard>
                        </div>

                        {/* RIGHT COLUMN */}
                        <div className="col-span-12 lg:col-span-4 space-y-8">
                            <GlassCard className="p-6">
                                <h3 className="text-slate-300 text-sm font-bold uppercase tracking-wider mb-6 flex items-center gap-2">
                                    <DollarSign className="w-5 h-5 text-emerald-400" /> Financial Intelligence
                                </h3>
                                <div className="space-y-4">
                                    <StatBox label="Total Revenue" value={activeReport.api_financials?.revenue} color="text-white" />
                                    <div className="grid grid-cols-2 gap-4">
                                        <StatBox label="EBITDA" value={activeReport.api_financials?.ebitda} color="text-emerald-400" />
                                        <StatBox label="Net Income" value={activeReport.api_financials?.net_income} color="text-blue-400" />
                                    </div>
                                    <StatBox label="Employee Cost" value={activeReport.api_financials?.employee_cost} color="text-slate-200" />
                                </div>
                            </GlassCard>

                            <GlassCard className="p-6">
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="text-slate-300 text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                                        <Users className="w-5 h-5 text-pink-400" /> Workforce
                                    </h3>
                                </div>
                                {activeReport.workforce_profile && activeReport.workforce_profile.length > 0 ? (
                                    <div className="space-y-3">
                                        {activeReport.workforce_profile.slice(0, 5).map((row, idx) => (
                                            <div key={idx} className="flex justify-between items-start p-3 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
                                                <div className="text-sm font-medium text-slate-200 w-2/3 break-words pr-2 leading-tight">
                                                    {row.category.replace('Permanent', 'Perm.')}
                                                </div>
                                                <div className="text-sm font-mono font-bold text-white whitespace-nowrap">{row.total_count}</div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-sm text-slate-500 italic text-center py-8 border border-dashed border-slate-700 rounded-lg">Detailed census data not extracted</div>
                                )}
                            </GlassCard>

                            <GlassCard className="p-6">
                                <h3 className="text-slate-300 text-sm font-bold uppercase tracking-wider mb-6 flex items-center gap-2">
                                    <Briefcase className="w-5 h-5 text-amber-400" /> Business Intelligence
                                </h3>
                                <div className="mb-8">
                                    <div className="text-xs text-slate-500 uppercase font-bold mb-3 tracking-wide">Key Products</div>
                                    <div className="flex flex-wrap gap-2">
                                        {activeReport.Top_Products && activeReport.Top_Products !== "N/A" ? (
                                            activeReport.Top_Products.split(",").slice(0, 8).map((p, i) => (
                                                <span key={i} className="px-3 py-1.5 bg-slate-800 border border-slate-700 text-slate-200 text-xs font-medium rounded-lg hover:bg-slate-700 transition-colors cursor-default break-words max-w-full leading-normal">
                                                    {p.trim()}
                                                </span>
                                            ))
                                        ) : <span className="text-slate-500 text-sm italic">-</span>}
                                    </div>
                                </div>
                                <div>
                                    <div className="text-xs text-slate-500 uppercase font-bold mb-3 tracking-wide">Key Suppliers</div>
                                    <div className="space-y-2">
                                        {activeReport.Top_Vendors && activeReport.Top_Vendors !== "N/A" ? (
                                            activeReport.Top_Vendors.split(",").slice(0, 5).map((v, i) => (
                                                <div key={i} className="flex items-start gap-2 text-sm text-slate-300 py-2 border-b border-white/5 last:border-0">
                                                    <ArrowUpRight className="w-4 h-4 text-slate-500 mt-0.5 shrink-0" /> 
                                                    <span className="break-words leading-tight">{v.trim()}</span>
                                                </div>
                                            ))
                                        ) : <span className="text-slate-500 text-sm italic">-</span>}
                                    </div>
                                </div>
                            </GlassCard>

                            <GlassCard className="bg-gradient-to-b from-emerald-950/20 to-slate-900 border-emerald-500/20 p-6">
                                <h3 className="text-emerald-400 text-sm font-bold uppercase tracking-wider mb-6 flex items-center gap-2">
                                    <CheckCircle className="w-5 h-5" /> Strategic Actions
                                </h3>
                                <div className="space-y-4">
                                    {activeReport.strategic_plan?.recommendations?.slice(0, 3).map((rec, i) => (
                                        <div key={i} className="flex gap-4 items-start p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/10 hover:bg-emerald-500/10 transition-colors">
                                            <div className="text-emerald-500 font-bold text-sm mt-0.5 shrink-0">0{i+1}</div>
                                            <p className="text-sm text-slate-200 leading-relaxed font-light">{rec}</p>
                                        </div>
                                    ))}
                                </div>
                            </GlassCard>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Dashboard;