import sys
import os
import json
import streamlit as st
import pandas as pd
import time
import re

# --- SANE-AI PATH FIX ---
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
# ------------------------

from src.orchestration.pipeline import ComplianceOrchestrator
from src.ingestion.web_hunter import WebHunter

# --- Config & Session State ---
st.set_page_config(page_title="ALCA: AutoLabor Compliance Agent", page_icon="🛡️", layout="wide")

if 'session_companies' not in st.session_state: st.session_state['session_companies'] = []
if 'financial_truth' not in st.session_state: st.session_state['financial_truth'] = None

st.title("🛡️ AutoLabor Compliance Agent")
st.markdown("### 🤖 Consolidated Strategic Auditor")

# --- Sidebar ---
with st.sidebar:
    st.header("🎮 Audit Controls")
    mode = st.radio("Input Mode", ["🌐 Web Hunt (Auto)", "📂 Upload Files"])
    
    # 1. LIVE FINANCIAL TRUTH (New Feature)
    if st.session_state['financial_truth']:
        ft = st.session_state['financial_truth']
        st.divider()
        st.subheader("💰 Live Market Data")
        st.caption(f"Source: Yahoo Finance ({ft.get('Ticker')})")
        st.metric("Revenue", ft.get('API_Revenue'))
        st.metric("EBITDA", ft.get('API_EBITDA'))
        st.metric("Net Profit", ft.get('API_NetIncome'))
        st.metric("Emp Cost", ft.get('API_Employee_Cost'))
        st.divider()

    # MODE 1: WEB HUNT
    if mode == "🌐 Web Hunt (Auto)":
        company_name = st.text_input("Target Company", placeholder="e.g. Bajaj Auto Ltd")
        
        if st.button("🦅 Hunt & Audit"):
            if company_name:
                # Get Financials First
                hunter = WebHunter()
                with st.spinner("💰 Fetching Financial Truth..."):
                    truth = hunter.get_financial_truth(company_name)
                    if truth: st.session_state['financial_truth'] = truth
                
                # Start Hunt
                with st.status("🕵️ Hunting Documents...") as status:
                    os.makedirs("data/01_raw", exist_ok=True)
                    found_paths = hunter.hunt_for_company(company_name)
                    
                    if not found_paths:
                        status.update(label="❌ No relevant reports found.", state="error")
                    else:
                        status.update(label=f"✅ Found {len(found_paths)} docs. Auditing...", state="running")
                        
                        # Run Consolidated Pipeline
                        orchestrator = ComplianceOrchestrator()
                        orchestrator.run_pipeline(specific_files=found_paths, target_company=company_name)
                        
                        if company_name not in st.session_state['session_companies']:
                            st.session_state['session_companies'].append(company_name)
                        
                        status.update(label="✅ Consolidated Report Ready!", state="complete")
                        st.rerun()

    # MODE 2: UPLOAD FILES
    elif mode == "📂 Upload Files":
        manual_name = st.text_input("Entity Name", "Uploaded Entity")
        uploaded_files = st.file_uploader("Upload PDFs", type=["pdf"], accept_multiple_files=True)
        
        if st.button("🚀 Start Audit"):
            if uploaded_files:
                os.makedirs("data/01_raw", exist_ok=True)
                paths = []
                for f in uploaded_files:
                    p = os.path.join("data/01_raw", f.name)
                    with open(p, "wb") as w: w.write(f.getbuffer())
                    paths.append(p)
                
                with st.spinner("📚 Synthesizing..."):
                    ComplianceOrchestrator().run_pipeline(specific_files=paths, target_company=manual_name)
                
                if manual_name not in st.session_state['session_companies']:
                    st.session_state['session_companies'].append(manual_name)
                st.success("Done!")
                st.rerun()

# --- Main Dashboard ---
csv_path = "data/03_structured/Master_Compliance_Tracker.csv"

if os.path.exists(csv_path):
    full_df = pd.read_csv(csv_path)
    
    # Filter for current session if active
    if st.session_state['session_companies']:
        pattern = '|'.join([re.escape(str(c)) for c in st.session_state['session_companies']])
        df_to_show = full_df[full_df['Company'].astype(str).str.contains(pattern, case=False, na=False)]
    else:
        df_to_show = full_df.tail(5)

    if not df_to_show.empty:
        # Scorecard
        c1, c2, c3 = st.columns(3)
        c1.metric("Entity", df_to_show['Company'].iloc[-1])
        c2.metric("Risk Level", df_to_show['Risk Score'].iloc[-1])
        c3.metric("50% Wage Rule", df_to_show['Wage_Status'].iloc[-1])

        st.dataframe(df_to_show, use_container_width=True)

        # Report Viewer
        st.markdown("---")
        selected = st.selectbox("View Detailed Report", df_to_show['Company'].unique())
        
        if selected:
            safe_name = selected.replace(" ", "_")
            # Look for Consolidated Report first
            json_path = os.path.join("data/03_structured", f"{safe_name}_Consolidated_Report.json")
            
            if os.path.exists(json_path):
                with open(json_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                
                t1, t2, t3, t4 = st.tabs(["📊 Workforce", "⚖️ Legal Checks", "🔗 Supply Chain", "📥 Download"])
                
                with t1:
                    st.subheader("Workforce Demographics")
                    wf = data.get('workforce_profile', [])
                    if wf: st.dataframe(pd.DataFrame(wf), use_container_width=True)
                    else: st.info("No workforce data extracted.")

                with t2:
                    st.subheader("Compliance Audit")
                    # Wage
                    w = data.get('financial_impact', {}).get('statutory_wage_base', {})
                    st.write(f"**Wage Rule:** {w.get('status')}")
                    st.info(f"Evidence: {w.get('evidence_snippet')}")
                    
                    # Gratuity
                    g = data.get('financial_impact', {}).get('gratuity_liability', {})
                    st.write(f"**Gratuity:** {g.get('status')}")
                    st.caption(g.get('evidence_snippet'))

                with t3:
                    st.subheader("Subsidiary Intelligence")
                    sc = data.get('supply_chain_profile', [])
                    if sc: st.dataframe(pd.DataFrame(sc), use_container_width=True)

                with t4:
                    pdf_name = f"{safe_name}_Consolidated_Report.pdf"
                    pdf_path = os.path.join("data/03_structured", pdf_name)
                    if os.path.exists(pdf_path):
                        with open(pdf_path, "rb") as f:
                            st.download_button("Download PDF Report", f, file_name=pdf_name)