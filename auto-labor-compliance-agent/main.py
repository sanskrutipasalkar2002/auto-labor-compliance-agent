import sys
import os
import re  # --- ADDED: For deduplication logic ---

# --- CRITICAL PATH SETUP ---
# 1. Get the absolute path of the folder containing this script (auto-labor-compliance-agent)
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# 2. Add it to the start of sys.path
# This ensures Python sees 'src' as a package inside this folder.
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

import json
import glob
import uvicorn
import asyncio
import threading
import queue
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse 
from pydantic import BaseModel
from typing import List

# --- IMPORTS (MATCHING YOUR FOLDER STRUCTURE) ---
try:
    # Your pipeline.py is inside src/orchestration/
    from src.orchestration.pipeline import ComplianceOrchestrator
    # Your web_hunter.py is inside src/ingestion/
    from src.ingestion.web_hunter import WebHunter
    print("✅ Successfully imported ComplianceOrchestrator and WebHunter")
except ModuleNotFoundError as e:
    print(f"\n❌ CRITICAL IMPORT ERROR: {e}")
    print(f"   Looking in: {BASE_DIR}")
    print("   Please verify that 'src/orchestration/pipeline.py' exists.\n")
    raise e

app = FastAPI(title="AutoLabor Compliance API")

# Allow Frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- GLOBAL QUEUE FOR REAL-TIME UPDATES ---
msg_queue = queue.Queue()

def pipeline_callback(data):
    """Bridge function to put pipeline updates into the queue"""
    msg_queue.put(data)

class AuditRequest(BaseModel):
    company_name: str

class CompareRequest(BaseModel):
    companies: List[str]

# Define paths relative to BASE_DIR to avoid "file not found" errors
DATA_DIR = os.path.join(BASE_DIR, "data", "03_structured")
RAW_DIR = os.path.join(BASE_DIR, "data", "01_raw")

@app.get("/")
def health_check():
    return {"status": "System Online", "module": "SANE-AI Auditor"}

# --- WEBSOCKET ENDPOINT (The Real-Time Bridge) ---
@app.websocket("/ws/audit")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    
    audit_thread = None
    
    try:
        # 1. Wait for frontend to send company name
        data = await websocket.receive_json()
        company_name = data.get("company_name")
        print(f"🔌 WebSocket received audit request for: {company_name}")
        
        # 2. Define the job wrapper
        def run_job():
            try:
                # Initialize Orchestrator
                orchestrator = ComplianceOrchestrator()
                
                # Ensure directories exist
                os.makedirs(RAW_DIR, exist_ok=True)
                os.makedirs(DATA_DIR, exist_ok=True)
                
                # Run the pipeline with the callback
                orchestrator.run_pipeline(
                    target_company=company_name, 
                    specific_files=None,
                    progress_callback=pipeline_callback 
                )
                
                # --- LOAD DATA IMMEDIATELY ---
                # This fixes the "Audit Failed" race condition by sending data with the completion signal
                safe_name = company_name.replace(" ", "_")
                json_path = os.path.join(DATA_DIR, f"{safe_name}_Consolidated_Report.json")
                report_payload = None
                
                # Robust load: If strict filename fails, check for fuzzy matches created by pipeline
                if not os.path.exists(json_path):
                    # Try finding any file that starts with the same first word (e.g. "Tata" for "Tata Motors")
                    # This handles cases where pipeline saved as "Tata_Motors_Ltd" but API looks for "Tata_Motors"
                    clean_start = safe_name.split("_")[0]
                    candidates = glob.glob(os.path.join(DATA_DIR, f"*{clean_start}*_Consolidated_Report.json"))
                    if candidates:
                        json_path = candidates[0]

                if os.path.exists(json_path):
                    with open(json_path, "r", encoding="utf-8") as f:
                        report_payload = json.load(f)

                # Signal completion WITH DATA
                msg_queue.put({
                    "status": "completed", 
                    "progress": 100, 
                    "message": "Audit Finalized.",
                    "report_data": report_payload 
                })
                
            except Exception as e:
                print(f"❌ Thread Error: {e}")
                msg_queue.put({"status": "error", "message": str(e)})

        # 3. Start the thread
        audit_thread = threading.Thread(target=run_job, daemon=True)
        audit_thread.start()

        # 4. Listen to Queue and Broadcast to Frontend
        while True:
            try:
                # Use get_nowait to keep the loop responsive
                while not msg_queue.empty():
                    msg = msg_queue.get_nowait()
                    await websocket.send_json(msg)
                    
                    if msg.get("status") in ["completed", "error"]:
                        return # Exit cleanly
                
                # Yield control to allow async tasks to run
                await asyncio.sleep(0.1)
                
            except queue.Empty:
                await asyncio.sleep(0.1)
            except Exception as e:
                print(f"❌ Queue Error: {e}")
                break
            
    except WebSocketDisconnect:
        print("⚠️ WebSocket Disconnected by client")
    except Exception as e:
        print(f"❌ WebSocket Critical Error: {e}")
    finally:
        try:
            await websocket.close()
        except:
            pass

# --- REST Endpoints ---

@app.get("/api/download_report")
async def download_report(company: str):
    try:
        clean_company = company.strip().rstrip('.')
        safe_name = clean_company.replace(" ", "_")
        filename = f"{safe_name}_Consolidated_Report.pdf"
        file_path = os.path.join(DATA_DIR, filename)

        # Fuzzy Fallback
        if not os.path.exists(file_path):
            base_pattern = safe_name.split("_")[0] + "*"
            search_pattern = os.path.join(DATA_DIR, f"*{base_pattern}*_Consolidated_Report.pdf")
            candidates = glob.glob(search_pattern)
            if candidates:
                file_path = candidates[0]
                filename = os.path.basename(file_path)
            else:
                # Try iterating all files to find partial match
                all_pdfs = glob.glob(os.path.join(DATA_DIR, "*_Consolidated_Report.pdf"))
                found = False
                for pdf in all_pdfs:
                    # Check if company name is inside the filename (case insensitive)
                    if clean_company.lower() in os.path.basename(pdf).lower().replace("_", " "):
                        file_path = pdf
                        filename = os.path.basename(pdf)
                        found = True
                        break
                
                if not found:
                    raise HTTPException(status_code=404, detail="Report not found")

        return FileResponse(path=file_path, filename=filename, media_type='application/pdf')
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- DEDUPLICATED REPORT LISTING ---
@app.get("/api/reports")
def list_reports():
    """
    Returns a unique list of companies based on the INTERNAL company name 
    inside the JSON, removing duplicate files (e.g. 'tata.json' vs 'tata_motors.json').
    """
    if not os.path.exists(DATA_DIR):
        return {"reports": []}
    
    files = glob.glob(os.path.join(DATA_DIR, "*_Consolidated_Report.json"))
    
    # Dictionary to track unique entities: { normalized_name: report_metadata }
    unique_entities = {}
    
    for f in files:
        try:
            with open(f, "r", encoding="utf-8") as json_file:
                data = json.load(json_file)
                
                # 1. Extract the OFFICIAL name from inside the report
                # (e.g., "Tata Motors Ltd" instead of the filename "tatu_motors")
                official_name = data.get("company_name") or data.get("Company")
                
                if official_name:
                    # 2. Normalize to create a unique key (removes spaces/case/Ltd)
                    # "Tata Motors Ltd" -> "tatamotors"
                    norm_key = re.sub(r'[^a-z0-9]', '', official_name.lower().replace("ltd", "").replace("limited", "").replace("india", ""))
                    
                    # 3. Store only the first occurrence (or overwrite if you prefer latest)
                    if norm_key not in unique_entities:
                        unique_entities[norm_key] = {
                            "filename": os.path.basename(f), # Keep filename for download link
                            "name": official_name,           # Display the Official Name
                        }
        except Exception as e:
            print(f"⚠️ Error reading {f}: {e}")
            continue

    # Convert values back to list
    deduplicated_reports = list(unique_entities.values())
    
    # Sort alphabetically
    deduplicated_reports.sort(key=lambda x: x['name'])
        
    return {"status": "success", "reports": deduplicated_reports}

# --- ROBUST COMPARISON ENDPOINT (FIXED) ---
@app.post("/api/compare")
def compare_reports(request: CompareRequest):
    """
    FIXED: Finds reports by checking the internal content of files, 
    fixing the issue where filename != company name causes 404s.
    """
    comparison_data = []
    
    # 1. Load all available reports into a lookup map
    if not os.path.exists(DATA_DIR):
        return {"status": "success", "data": []}
        
    all_files = glob.glob(os.path.join(DATA_DIR, "*_Consolidated_Report.json"))
    report_map = {} # Key: Company Name, Value: JSON Data
    
    # Pre-load mapping: "Tata Motors Ltd" -> {json_data}
    for f in all_files:
        try:
            with open(f, "r", encoding="utf-8") as file:
                data = json.load(file)
                name = data.get("company_name") or data.get("Company")
                if name:
                    report_map[name] = data
        except:
            continue

    # 2. Find requested companies in the map
    for req_company in request.companies:
        # A. Try Direct Match
        if req_company in report_map:
            comparison_data.append(report_map[req_company])
        else:
            # B. Fallback: Try fuzzy matching if direct name match fails
            # This handles cases where frontend asks for "Ford" but map has "Ford Motor Co"
            match_found = False
            for map_name, data in report_map.items():
                # Case insensitive substring matching
                if req_company.lower() in map_name.lower() or map_name.lower() in req_company.lower():
                    comparison_data.append(data)
                    match_found = True
                    break
            
            if not match_found:
                print(f"⚠️ Report not found for: {req_company}")

    return {"status": "success", "data": comparison_data}

@app.post("/api/audit")
def run_audit(request: AuditRequest):
    # REST Fallback endpoint (if WebSocket fails)
    company = request.company_name
    print(f"🚀 REST API received request for: {company}")
    try:
        orchestrator = ComplianceOrchestrator()
        os.makedirs(RAW_DIR, exist_ok=True)
        os.makedirs(DATA_DIR, exist_ok=True)
        
        orchestrator.run_pipeline(target_company=company, specific_files=None)
        
        safe_name = company.replace(" ", "_")
        json_path = os.path.join(DATA_DIR, f"{safe_name}_Consolidated_Report.json")
        
        if os.path.exists(json_path):
            with open(json_path, "r", encoding="utf-8") as f:
                return {"status": "success", "data": json.load(f)}
        return {"status": "error", "message": "Report generation failed"}
    except Exception as e:
        print(f"❌ API Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8000)