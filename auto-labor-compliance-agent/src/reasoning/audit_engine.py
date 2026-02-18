import os
from langchain_google_genai import ChatGoogleGenerativeAI
from pydantic import BaseModel, Field
from typing import Optional, List, Literal, Dict, Any

# --- 1. Data Schemas (Fully Aligned with Pipeline) ---

class Evidence(BaseModel):
    status: Literal["Compliant", "Non-Compliant", "Risk Identified", "Not Disclosed", "Gap", "Positive", "Negative", "N/A"] = Field(..., description="The status of the finding.")
    evidence_snippet: str = Field(..., description="Verbatim text extracted from the document.")
    metric_value: Optional[str] = Field(None, description="Extracted number (e.g., '220.4%', 'ISO 45001').")
    source_ref: str = Field(..., description="Strict citation format: '[Source: DocName, Page X]'.")

class WagesCompliance(BaseModel):
    minimum_wage_status: Evidence = Field(description="Check for minimum wage compliance")
    equal_pay_status: Evidence = Field(description="Check for equal pay ratios")
    profit_sharing_status: Evidence = Field(description="Check for profit sharing or performance bonuses")

class OSHCompliance(BaseModel):
    safety_systems_status: Evidence = Field(description="ISO 45001, Safety Committees, Management Systems")
    accident_records_status: Evidence = Field(description="Fatality/Injury counts, LTIFR")
    audit_scores_status: Evidence = Field(description="Internal audit scores (e.g. SEMS)")

class IndustrialRelations(BaseModel):
    unionization_status: Evidence = Field(description="Union membership rates")
    collective_bargaining_status: Evidence = Field(description="CBA coverage percentage")
    disputes_strikes_status: Evidence = Field(description="Strikes, lockouts, or work stoppages")

class SocialSecurityWelfare(BaseModel):
    leave_policy_status: Evidence = Field(description="Parental leave, sick leave, family care leave")
    retirement_benefits_status: Evidence = Field(description="Pension, Gratuity, PF compliance")
    healthcare_welfare_status: Evidence = Field(description="In-house clinics, gyms, mental health support.")

class ExecutiveSummary(BaseModel):
    overview: str = Field(description="High-level summary of the company's labor compliance posture.")
    key_finding: str = Field(description="The single most critical insight or correlation found.")

class LaborCodeAnalysis(BaseModel):
    wages: WagesCompliance
    osh: OSHCompliance
    ir: IndustrialRelations
    social_security: SocialSecurityWelfare

class SupplyChainCompliance(BaseModel):
    due_diligence: Evidence = Field(description="Supplier ESG assessments and audits.")
    forced_labor_policies: Evidence = Field(description="Zero tolerance policies for forced/child labor")
    conflict_minerals: Evidence = Field(description="Responsible mineral sourcing status")
    principal_employer_liability: str = Field(description="Analysis of liability risks regarding contract labor")

class BusinessImpact(BaseModel):
    operational_efficiency: str = Field(description="Impact of labor relations on productivity.")
    financial_performance: str = Field(description="Cost of compliance vs ROI.")
    brand_reputation: str = Field(description="Impact on ESG indices.")
    innovation_rnd: str = Field(description="Link between diversity/talent retention and R&D")

class StrategicPlan(BaseModel):
    recommendations: List[str] = Field(description="3-4 actionable strategic recommendations")

class WorkforceData(BaseModel):
    category: str = Field(description="e.g., 'Permanent Employees', 'Contract Workers'")
    total_count: str = Field(default="N/A")
    male_count: str = Field(default="N/A")
    female_count: str = Field(default="N/A")
    turnover_rate: str = Field(default="N/A")

class FinancialMetrics(BaseModel):
    revenue: str = Field(default="N/A")
    ebitda: str = Field(default="N/A")
    net_income: str = Field(default="N/A")
    employee_cost: str = Field(default="N/A")

class VendorProfile(BaseModel):
    vendor_name: str
    relationship: str
    compliance_status: str
    key_metrics: str

# New Business Intel and Provision Models
class BusinessIntelligence(BaseModel):
    key_products: List[str] = Field(default_factory=list)
    major_customers: List[str] = Field(default_factory=list)
    market_position: str = Field(default="N/A")

class LabourCodeProvision(BaseModel):
    provision_amount: str = Field(default="N/A")
    impact_description: str = Field(default="N/A")
    fiscal_period: str = Field(default="Q3 FY26")

class AuditReport(BaseModel):
    company_name: str
    report_period: str
    overall_risk_score: str
    executive_summary: ExecutiveSummary
    labor_code_analysis: LaborCodeAnalysis
    supply_chain_compliance: SupplyChainCompliance
    business_impact: BusinessImpact
    strategic_plan: StrategicPlan
    workforce_profile: List[WorkforceData]
    supply_chain_profile: List[VendorProfile]
    api_financials: FinancialMetrics = Field(default_factory=FinancialMetrics)
    
    # ✅ Corrected: Updated fields to match new outputs.py model
    labour_code_impact: Optional[LabourCodeProvision] = Field(default_factory=LabourCodeProvision)
    business_intel: Optional[BusinessIntelligence] = Field(default_factory=BusinessIntelligence)
    vendors: Optional[List[str]] = Field(default=[])

# --- 2. The Monolithic Engine ---

class AuditEngine:
    def __init__(self, model_name="gemini-2.0-flash"):
        api_key = os.getenv("GOOGLE_API_KEY")
        if not api_key: raise ValueError("❌ Missing GOOGLE_API_KEY")
        
        self.llm = ChatGoogleGenerativeAI(
            model=model_name,
            temperature=0.0,
            google_api_key=api_key
        )

    def analyze_document(self, text_content: str, filename: str, financial_data: dict = None) -> AuditReport:
        """
        Analyzes the FULL consolidated text in one shot using the Multi-Vector Forensic Protocol.
        """
        print(f"   🧠 AI Auditor: Analyzing {filename} using 'Forensic-Lock' Protocol...")
        
        if len(text_content) < 500:
            return self._get_dummy_report(filename, "Insufficient Data")

        # --- THE MULTI-VECTOR FORENSIC PROMPT ---
        # Designed to search Financials AND BRSR Sustainability data simultaneously.
        prompt = f"""
        You are a **Forensic Compliance Auditor**. Extract specific hard data from this text dump.
        
        **TARGET DOCUMENT:** {filename}
        
        --- **1. FORENSIC FINANCIALS (Look in 'Notes to Financial Results' or 'Exceptional Items')** ---
        * **Labour Code Provision:** Search specifically for "Impact of new Labour Codes", "provision for gratuity", or "one-time charge".
           - **ACTION:** Extract the EXACT number associated with this text (e.g., "308.48 Crores", "61 Crores").
           - Set 'provision_amount' to this number. 
        
        --- **2. BUSINESS INTELLIGENCE (Look in 'Management Discussion', 'Press Release' or 'About Us')** ---
        * **Key Products:** List specific vehicle brands/models (e.g., "AVTR", "Bada Dost", "Switch", "Viking", "Boss Electric").
        * **Major Customers:** List institutional buyers mentioned in 'Project' or 'Order' sections (e.g., "Indian Army", "Amazon", "Adani", "Reliance", "NTPC").
        
        --- **3. WORKFORCE & DEMOGRAPHICS (Look in 'BRSR' / 'Social' Section)** ---
        * **Gender Split:** Scan the ENTIRE text for a table titled "Employees and workers" or similar.
           - EXTRACT the count for "Permanent Employees" -> Male & Female columns.
           - (Expected format: "Male: 4886, Female: 392").
        * **Turnover:** Look for "Turnover rate for permanent employees" -> Extract the % (e.g., 7.86%).

        --- **4. WAGES & PAY GAP (Look in 'BRSR' Section)** ---
        * **Target:** Search for table "Ratio of Remuneration".
           - EXTRACT: "MCTC / Median Remuneration" percentage increase.
           - CHECK: Is there a row for "Ratio of remuneration of women to men"? 
           - IF ratio is found (e.g., "0.75" or "0.80"), status = "RISK IDENTIFIED".
           - IF table is missing, status = "NOT DISCLOSED".

        --- **5. SUPPLY CHAIN (Look in 'Related Party Disclosures')** ---
        * **ACTION:** List top industrial vendors where transaction value is high (e.g., "TVS", "Hinduja Tech", "Switch Mobility").
        * **IGNORE:** Banks (HDFC, SBI) and purely financial transactions.

        --- **OUTPUT FORMAT** ---
        Return a valid JSON matching the `AuditReport` schema.
        
        **INPUT CONTEXT (First 1.5M chars):**
        {text_content[:1500000]} 
        """
        
        structured_llm = self.llm.with_structured_output(AuditReport)
        
        try:
            # 1. Run AI Analysis
            report = structured_llm.invoke(prompt)

            # 2. SMART API PATCHING (Only if AI fails)
            if financial_data:
                ai_rev = report.api_financials.revenue
                ai_pat = report.api_financials.net_income
                
                # Only patch if AI returned N/A, None, or 0
                if ai_rev in ["N/A", "0", None, ""]:
                    report.api_financials.revenue = str(financial_data.get('API_Revenue', 'N/A')) + " (API)"
                
                if report.api_financials.ebitda in ["N/A", "0", None, ""]:
                    report.api_financials.ebitda = str(financial_data.get('API_EBITDA', 'N/A')) + " (API)"

                if ai_pat in ["N/A", "0", None, ""]:
                    report.api_financials.net_income = str(financial_data.get('API_NetIncome', 'N/A')) + " (API)"
                
                if report.api_financials.employee_cost in ["N/A", "0", None, ""]:
                    report.api_financials.employee_cost = str(financial_data.get('API_Employee_Cost', 'N/A')) + " (API)"
            
            # 3. Vendor Safety Net
            if not report.vendors:
                 report.vendors = ["Refer to Annual Report Note: Related Party Disclosures"]
            
            return report

        except Exception as e:
            print(f"   ❌ AI Reasoning Failed: {e}")
            return self._get_dummy_report(filename, str(e))

    def _get_dummy_report(self, filename, error_msg):
        dummy_ev = Evidence(status="Gap", evidence_snippet=error_msg, source_ref="System")
        return AuditReport(
            company_name=filename, report_period="N/A", overall_risk_score="High",
            executive_summary=ExecutiveSummary(overview="Failed.", key_finding=error_msg),
            labor_code_analysis=LaborCodeAnalysis(
                wages=WagesCompliance(minimum_wage_status=dummy_ev, equal_pay_status=dummy_ev, profit_sharing_status=dummy_ev),
                osh=OSHCompliance(safety_systems_status=dummy_ev, accident_records_status=dummy_ev, audit_scores_status=dummy_ev),
                ir=IndustrialRelations(unionization_status=dummy_ev, collective_bargaining_status=dummy_ev, disputes_strikes_status=dummy_ev),
                social_security=SocialSecurityWelfare(leave_policy_status=dummy_ev, retirement_benefits_status=dummy_ev, healthcare_welfare_status=dummy_ev)
            ),
            supply_chain_compliance=SupplyChainCompliance(
                due_diligence=dummy_ev, forced_labor_policies=dummy_ev, conflict_minerals=dummy_ev, principal_employer_liability="N/A"
            ),
            business_impact=BusinessImpact(
                operational_efficiency="N/A", financial_performance="N/A", brand_reputation="N/A", innovation_rnd="N/A"
            ),
            strategic_plan=StrategicPlan(recommendations=["Retry Audit"]),
            workforce_profile=[],
            supply_chain_profile=[],
            api_financials=FinancialMetrics(),
            # ✅ Updated defaults for dummy
            labour_code_impact=LabourCodeProvision(),
            business_intel=BusinessIntelligence(),
            vendors=[]
        )