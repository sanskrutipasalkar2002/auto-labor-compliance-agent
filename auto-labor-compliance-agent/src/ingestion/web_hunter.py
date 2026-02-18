import os
import requests
import time
import re
import shutil
import pypdf
from dotenv import load_dotenv
from tavily import TavilyClient
from yahooquery import Ticker
from urllib.parse import unquote
from typing import List, Optional, Dict

load_dotenv()

class WebHunter:
    def __init__(self):
        api_key = os.getenv("TAVILY_API_KEY")
        if not api_key:
            raise ValueError("❌ Missing TAVILY_API_KEY. Please add it to .env")
            
        self.client = TavilyClient(api_key=api_key)
        self.headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
        self.seen_urls = set()

        # Hardcoded Poison Map for Conglomerates (The "Do Not Touch" List)
        self.conglomerate_map = {
            "bajaj auto": ["finance", "finserv", "holdings", "electricals", "consumer", "allianz", "housing"],
            "tata motors": ["steel", "power", "consultancy", "chemicals", "communications", "elxsi"],
            "mahindra": ["tech", "finance", "lifespace", "holidays", "logistics"],
            "godrej": ["properties", "agrovet", "consumer"]
        }

    def _get_poison_keywords(self, company_name: str) -> List[str]:
        """Returns list of forbidden keywords based on the target company."""
        company_lower = company_name.lower()
        for key, poisons in self.conglomerate_map.items():
            if key in company_lower:
                return poisons
        return []

    def get_financial_truth(self, company_name: str):
        """
        🚀 Fetches 'Financial Truth' using yahooquery (More stable than yfinance)
        """
        print(f"   💰 Financial API: Hunting truth data for {company_name}...")
        
        ticker_symbol = self._find_ticker(company_name)
        if not ticker_symbol:
            print("   ⚠️ Could not resolve ticker symbol.")
            return None

        try:
            stock = Ticker(ticker_symbol)
            income_stmt = stock.income_statement()
            
            if isinstance(income_stmt, str) or income_stmt.empty:
                print(f"   ⚠️ No financial data found for {ticker_symbol}")
                return None

            recent_data = income_stmt.iloc[-1]
            financials = {"Ticker": ticker_symbol}

            # Extract Metrics
            rev = recent_data.get('TotalRevenue') or recent_data.get('OperatingRevenue')
            financials['API_Revenue'] = self._format_currency(rev)

            financials['API_EBITDA'] = self._format_currency(recent_data.get('NormalizedEBITDA') or recent_data.get('EBITDA'))
            financials['API_NetIncome'] = self._format_currency(recent_data.get('NetIncome'))
            
            emp_cost = recent_data.get('SalariesAndWages') or recent_data.get('EmployeeBenefits')
            financials['API_Employee_Cost'] = self._format_currency(emp_cost) if emp_cost else "N/A"

            print(f"   ✅ Financial Truth Acquired for {ticker_symbol}")
            return financials

        except Exception as e:
            print(f"   ❌ Financial API Error: {e}")
            return None

    def _find_ticker(self, company_name):
        try:
            query = f"{company_name} yahoo finance ticker symbol India"
            results = self.client.search(query, max_results=1)
            
            if results['results']:
                url = results['results'][0]['url']
                if "quote/" in url:
                    parts = url.split("quote/")
                    if len(parts) > 1:
                        raw_ticker = parts[1].split("/")[0].split("?")[0]
                        return unquote(raw_ticker)
            return None
        except Exception:
            return None

    def _format_currency(self, value):
        try:
            if value is None or isinstance(value, str): return "N/A"
            val_cr = float(value) / 10000000
            return f"₹{val_cr:,.2f} Cr"
        except:
            return "N/A"

    def _verify_pdf_content(self, file_path: str, target_company: str, poison_keywords: List[str]) -> bool:
        """
        THE SURE SHOT VALIDATOR:
        Reads the first page of the PDF. Checks for:
        1. Encrypted files (Reject)
        2. Poison words (Reject)
        3. Target name presence (Confirm)
        """
        try:
            reader = pypdf.PdfReader(file_path)
            
            # Security Check
            if reader.is_encrypted:
                print("     ⛔ REJECTED CONTENT: PDF is encrypted/locked.")
                return False

            if len(reader.pages) < 1: return False
            
            # Read first 2 pages (Title pages usually)
            text = ""
            for i in range(min(2, len(reader.pages))):
                text += reader.pages[i].extract_text().lower() + " "
            
            # Normalize text (remove newlines/tabs)
            text = re.sub(r'\s+', ' ', text)
            
            # 1. Poison Check
            for poison in poison_keywords:
                if f" {poison} " in text: # Check for whole words e.g. " finance "
                    print(f"     ⛔ REJECTED CONTENT: Found poison term '{poison}' in document.")
                    return False
            
            # 2. Positive Confirmation
            core_name = target_company.lower().replace("limited", "").replace("ltd", "").strip()
            if core_name not in text:
                print(f"     ⛔ REJECTED CONTENT: Target '{core_name}' NOT found in first pages.")
                return False
                
            return True

        except Exception as e:
            print(f"     ⚠️ PDF Validation Error (Corrupt file?): {e}")
            return False

    def hunt_for_company(self, company_name: str, output_folder: str = "data/01_raw", exclusions: Optional[List[str]] = None):
        """
        Enhanced Hunter with Ticker-Enforced Queries and Content Verification.
        """
        # 1. Get Ticker for "Nuclear" precision
        ticker = self._find_ticker(company_name)
        ticker_query_part = f'"{ticker}"' if ticker else ""
        
        # 2. Build Exclusion List (Conglomerate Map + Dynamic Exclusions)
        base_poisons = self._get_poison_keywords(company_name)
        dynamic_exclusions = exclusions if exclusions else []
        all_exclusions = list(set(base_poisons + dynamic_exclusions))
        
        exclusion_str = " ".join([f"-{w}" for w in all_exclusions])
        
        print(f"🕵️ Tavily Agent Hunting for: {company_name} [{ticker}] (Filters: {exclusion_str})")
        
        # 3. Strict Queries with Ticker
        targets = [
            {
                "type": "Financial_Results_Q3", 
                "query": f'"{company_name}" {ticker_query_part} Q3 FY26 Financial Results "Exceptional Item" "Labour Code" {exclusion_str} filetype:pdf'
            },
            {
                "type": "Investor_Presentation", 
                "query": f'"{company_name}" {ticker_query_part} Investor Presentation 2025 {exclusion_str} filetype:pdf'
            },
            {
                "type": "Annual_Report_Vendors", 
                "query": f'"{company_name}" {ticker_query_part} Annual Report 2024-25 "Related Party" {exclusion_str} filetype:pdf'
            },
            {
                "type": "BRSR_Report", 
                "query": f'"{company_name}" {ticker_query_part} Business Responsibility Sustainability Report 2024-25 {exclusion_str} filetype:pdf'
            }
        ]
        
        found_files = []
        for target in targets:
            safe_name = company_name.replace(' ', '_').replace('"', '')
            final_filename = f"{safe_name}_{target['type']}.pdf"
            final_path = os.path.join(output_folder, final_filename)
            
            # Skip if valid file exists
            if os.path.exists(final_path):
                print(f"   ✅ Local copy exists: {final_filename}")
                found_files.append(final_path)
                continue
            
            print(f"   🔍 Searching for {target['type']}...")
            try:
                # Use "Advanced" depth for better financial results
                response = self.client.search(query=target['query'], search_depth="advanced", max_results=5)
                
                if 'results' in response:
                    for result in response['results']:
                        url = result['url']
                        if url in self.seen_urls: continue
                        if not url.lower().endswith('.pdf'): continue
                        
                        # --- THE SURE SHOT DOWNLOAD PROTOCOL ---
                        # 1. Download to Temp
                        print(f"   ⬇️ Inspecting: {url.split('/')[-1][:30]}...")
                        temp_path = os.path.join(output_folder, "temp_download.pdf")
                        
                        try:
                            # Added verify=False for robustness against corporate firewalls (optional)
                            r = requests.get(url, headers=self.headers, timeout=15)
                            if r.status_code == 200:
                                with open(temp_path, 'wb') as f:
                                    f.write(r.content)
                                
                                # 2. Verify Content (The Gatekeeper)
                                if self._verify_pdf_content(temp_path, company_name, all_exclusions):
                                    # 3. Accept & Rename
                                    shutil.move(temp_path, final_path)
                                    print(f"   ✅ Verified & Saved: {final_filename}")
                                    self.seen_urls.add(url)
                                    found_files.append(final_path)
                                    break # Stop searching for this target, we found a good one
                                else:
                                    # 4. Reject & Delete
                                    os.remove(temp_path)
                                    print("     ❌ File rejected by Content Validator.")
                        except Exception as e:
                            print(f"     ⚠️ Download/Read Error: {e}")
                            if os.path.exists(temp_path): os.remove(temp_path)
                            
            except Exception as e:
                print(f"   ❌ Search Error: {e}")
            time.sleep(1)
        return found_files

    def fetch_sector_provisions(self, custom_targets: Optional[Dict[str, List[str]]] = None):
        """
        SECTOR SCRAPER: Scans companies for Q3 FY26 Labour Code Provisions.
        """
        print("   🕵️ SECTOR WATCH: Initiating multi-agent scan...")
        targets = custom_targets if custom_targets else {
            "OEMs": ["Tata Motors", "Maruti Suzuki", "Bajaj Auto", "Hero MotoCorp", "TVS Motor"],
            "Ancillaries": ["Bharat Forge", "Motherson Sumi", "Bosch Ltd", "Uno Minda"]
        }
        
        sector_data = {key: [] for key in targets.keys()}
        for category, companies in targets.items():
            for company in companies:
                print(f"     > Scanning {company}...")
                result = self._scan_single_provision(company)
                sector_data[category].append(result)
        return sector_data

    def _scan_single_provision(self, company_name: str) -> Dict:
        # Enhanced regex to capture '₹' symbol as well
        query = f'"{company_name}" Q3 FY26 financial results "exceptional item" "labour code" provision amount crore'
        try:
            response = self.client.search(query=query, search_depth="basic", max_results=1)
            impact, status, source_url = "Not Disclosed", "Stable", "#"
            
            if 'results' in response and response['results']:
                content = response['results'][0]['content']
                source_url = response['results'][0]['url']
                if "provision" in content.lower() or "exceptional" in content.lower():
                    impact = "Provision Likely"
                    status = "Medium Impact"
                    # UPDATED: Matches "₹ 50 Cr", "Rs 50 Cr", "INR 50 Cr"
                    match = re.search(r'(?:Rs\.?|INR|₹)\s?(\d+[\.,]?\d*)\s?([Cc]rore|[Cc]r)', content, re.IGNORECASE)
                    if match:
                        impact = f"₹ {match.group(1)} Cr"
                        status = "High Impact"
            
            return {"name": company_name, "impact": impact, "status": status, "source": source_url}
        except Exception:
            return {"name": company_name, "impact": "Error", "status": "Unknown", "source": "#"}